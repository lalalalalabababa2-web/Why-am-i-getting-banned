// Audio I/O for HumKiller: two independent miniaudio devices (headphones out, mic in), each
// calling straight into the DSP core from its real-time callback. They're separate devices on
// purpose: the mic and the headphones can be different hardware with different sample rates,
// and the core never needs their samples lined up, only counted.
#include "hk_core.h"
#include "ma_config.h"

#include <cstring>
#include <string>
#include <vector>

#ifdef __APPLE__
#include <CoreAudio/CoreAudio.h>
#include <CoreFoundation/CoreFoundation.h>
#endif

namespace {

struct Dev {
    ma_device_id id;
    std::string name;
    bool is_default = false;
    int transport = HK_TRANSPORT_UNKNOWN;
    unsigned clock = 0;
};

ma_context g_ctx;
bool g_ctx_ok = false;
std::vector<Dev> g_outs, g_ins;
ma_device g_play, g_cap;
bool g_play_on = false, g_cap_on = false;

void play_cb(ma_device* d, void* out, const void*, ma_uint32 n) {
    hk_render(static_cast<float*>(out), (int)n, (int)d->playback.channels);
}
void cap_cb(ma_device* d, void*, const void* in, ma_uint32 n) {
    hk_capture(static_cast<const float*>(in), (int)n, (int)d->capture.channels);
}

#ifdef __APPLE__
AudioObjectID uid_to_device(const char* uid) {
    CFStringRef s = CFStringCreateWithCString(kCFAllocatorDefault, uid, kCFStringEncodingUTF8);
    if (!s) return kAudioObjectUnknown;
    AudioObjectID dev = kAudioObjectUnknown;
    AudioObjectPropertyAddress a = {kAudioHardwarePropertyTranslateUIDToDevice, kAudioObjectPropertyScopeGlobal,
                                    kAudioObjectPropertyElementMain};
    UInt32 sz = sizeof(dev);
    OSStatus st = AudioObjectGetPropertyData(kAudioObjectSystemObject, &a, sizeof(s), &s, &sz, &dev);
    CFRelease(s);
    return st == noErr ? dev : kAudioObjectUnknown;
}

void mac_info(Dev& d) {
    const AudioObjectID dev = uid_to_device(d.id.coreaudio);
    if (dev == kAudioObjectUnknown) return;
    AudioObjectPropertyAddress a = {kAudioDevicePropertyTransportType, kAudioObjectPropertyScopeGlobal,
                                    kAudioObjectPropertyElementMain};
    UInt32 t = 0, sz = sizeof(t);
    if (AudioObjectGetPropertyData(dev, &a, 0, nullptr, &sz, &t) == noErr) {
        switch (t) {
            case kAudioDeviceTransportTypeBuiltIn: d.transport = HK_TRANSPORT_BUILTIN; break;
            case kAudioDeviceTransportTypeUSB: d.transport = HK_TRANSPORT_USB; break;
            case kAudioDeviceTransportTypeBluetooth:
            case kAudioDeviceTransportTypeBluetoothLE: d.transport = HK_TRANSPORT_BLUETOOTH; break;
            default: d.transport = HK_TRANSPORT_OTHER; break;
        }
    }
    a.mSelector = kAudioDevicePropertyClockDomain;
    UInt32 cd = 0;
    sz = sizeof(cd);
    if (AudioObjectGetPropertyData(dev, &a, 0, nullptr, &sz, &cd) == noErr) d.clock = cd;
}
#endif

void copy_list(std::vector<Dev>& dst, const ma_device_info* src, ma_uint32 n) {
    dst.clear();
    for (ma_uint32 i = 0; i < n; i++) {
        Dev d;
        d.id = src[i].id;
        d.name = src[i].name;
        d.is_default = src[i].isDefault != 0;
#ifdef __APPLE__
        mac_info(d);
#endif
        dst.push_back(d);
    }
}

const std::vector<Dev>& list(int output) { return output ? g_outs : g_ins; }
bool valid(int output, int idx) { return idx >= 0 && idx < (int)list(output).size(); }

}  // namespace

extern "C" {

int hk_audio_init(void) {
    if (g_ctx_ok) return 0;
    hk_init();
#ifdef HK_NULL_BACKEND   // test builds on machines with no sound hardware
    ma_backend only[] = {ma_backend_null};
    if (ma_context_init(only, 1, nullptr, &g_ctx) != MA_SUCCESS) return -1;
#else
    if (ma_context_init(nullptr, 0, nullptr, &g_ctx) != MA_SUCCESS) return -1;
#endif
    g_ctx_ok = true;
    return hk_device_refresh();
}

int hk_device_refresh(void) {
    if (!g_ctx_ok) return -1;
    ma_device_info *p, *c;
    ma_uint32 np = 0, nc = 0;
    if (ma_context_get_devices(&g_ctx, &p, &np, &c, &nc) != MA_SUCCESS) return -1;
    copy_list(g_outs, p, np);
    copy_list(g_ins, c, nc);
    return 0;
}

int hk_device_count(int output) { return (int)list(output).size(); }
const char* hk_device_name(int output, int idx) { return valid(output, idx) ? list(output)[idx].name.c_str() : ""; }
int hk_device_is_default(int output, int idx) { return valid(output, idx) && list(output)[idx].is_default; }
int hk_device_transport(int output, int idx) { return valid(output, idx) ? list(output)[idx].transport : HK_TRANSPORT_UNKNOWN; }
unsigned hk_device_clock_domain(int output, int idx) { return valid(output, idx) ? list(output)[idx].clock : 0; }

void hk_audio_close(void) {
    if (g_cap_on) {
        ma_device_uninit(&g_cap);   // stops the capture thread first...
        g_cap_on = false;
    }
    hk_set_input_active(0);         // ...so nothing re-publishes ANC weights after they're zeroed
    if (g_play_on) {
        ma_device_uninit(&g_play);
        g_play_on = false;
    }
}

// 0: both running. 1: headphones running, mic failed or not requested. <0: headphones failed.
int hk_audio_open(int out_idx, int in_idx) {
    if (!g_ctx_ok) return -1;
    hk_audio_close();

    ma_device_config pc = ma_device_config_init(ma_device_type_playback);
    pc.playback.pDeviceID = valid(1, out_idx) ? &g_outs[out_idx].id : nullptr;
    pc.playback.format = ma_format_f32;
    pc.playback.channels = 2;
    pc.sampleRate = 0;                    // device native rate, no resampling
    pc.periodSizeInMilliseconds = 10;
    pc.dataCallback = play_cb;
    ma_result r = ma_device_init(&g_ctx, &pc, &g_play);
    if (r != MA_SUCCESS) return r < 0 ? (int)r : -1;
    hk_set_output_rate(g_play.sampleRate);
    if ((r = ma_device_start(&g_play)) != MA_SUCCESS) {
        ma_device_uninit(&g_play);
        return r < 0 ? (int)r : -1;
    }
    g_play_on = true;

    if (in_idx == -2) return 1;
    ma_device_config cc = ma_device_config_init(ma_device_type_capture);
    cc.capture.pDeviceID = valid(0, in_idx) ? &g_ins[in_idx].id : nullptr;
    cc.capture.format = ma_format_f32;
    cc.capture.channels = 1;              // miniaudio mixes a mic array down to one channel
    cc.sampleRate = 0;
    cc.periodSizeInMilliseconds = 10;
    cc.dataCallback = cap_cb;
    if (ma_device_init(&g_ctx, &cc, &g_cap) != MA_SUCCESS) return 1;
    hk_set_input_rate(g_cap.sampleRate);
    hk_set_input_active(1);
    if (ma_device_start(&g_cap) != MA_SUCCESS) {
        ma_device_uninit(&g_cap);
        hk_set_input_active(0);
        return 1;
    }
    g_cap_on = true;
    return 0;
}

double hk_audio_output_rate(void) { return g_play_on ? (double)g_play.sampleRate : 0.0; }
double hk_audio_input_rate(void) { return g_cap_on ? (double)g_cap.sampleRate : 0.0; }

}  // extern "C"
