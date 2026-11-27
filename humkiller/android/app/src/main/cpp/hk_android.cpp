// Android audio for HumKiller: two AAudio streams (headphones out, mic in) whose real-time
// callbacks call straight into the shared DSP core, plus the JNI bindings the Kotlin UI uses.
//
// The mic is opened with the UNPROCESSED preset: the normal voice paths run noise suppression,
// and a steady hum is exactly what noise suppression removes.
#include <aaudio/AAudio.h>
#include <android/log.h>
#include <jni.h>

#include <atomic>
#include <mutex>

#include "hk_core.h"

#define LOG(...) __android_log_print(ANDROID_LOG_INFO, "HumKiller", __VA_ARGS__)

namespace {

AAudioStream* g_out = nullptr;
AAudioStream* g_in = nullptr;
std::atomic<int> g_need_reopen{0};
std::mutex g_mu;
int g_preset = 0;
bool g_inited = false;

aaudio_data_callback_result_t out_cb(AAudioStream* s, void*, void* data, int32_t frames) {
    hk_render(static_cast<float*>(data), frames, AAudioStream_getChannelCount(s));
    return AAUDIO_CALLBACK_RESULT_CONTINUE;
}

aaudio_data_callback_result_t in_cb(AAudioStream* s, void*, void* data, int32_t frames) {
    hk_capture(static_cast<const float*>(data), frames, AAudioStream_getChannelCount(s));
    return AAUDIO_CALLBACK_RESULT_CONTINUE;
}

// A device went away (dongle unplugged, Bluetooth dropped). Streams can't be reopened from
// this callback, so flag it; the UI's poll loop reopens.
void err_cb(AAudioStream*, void*, aaudio_result_t err) {
    LOG("stream error %d", (int)err);
    g_need_reopen.store(1);
}

aaudio_result_t open_stream(bool output, int32_t device, int32_t preset, AAudioStream** out) {
    AAudioStreamBuilder* b = nullptr;
    aaudio_result_t r = AAudio_createStreamBuilder(&b);
    if (r != AAUDIO_OK) return r;
    AAudioStreamBuilder_setDirection(b, output ? AAUDIO_DIRECTION_OUTPUT : AAUDIO_DIRECTION_INPUT);
    if (device > 0) AAudioStreamBuilder_setDeviceId(b, device);
    AAudioStreamBuilder_setFormat(b, AAUDIO_FORMAT_PCM_FLOAT);
    AAudioStreamBuilder_setChannelCount(b, output ? 2 : 1);
    AAudioStreamBuilder_setSharingMode(b, AAUDIO_SHARING_MODE_SHARED);
    AAudioStreamBuilder_setPerformanceMode(b, AAUDIO_PERFORMANCE_MODE_LOW_LATENCY);
    if (output) {
        AAudioStreamBuilder_setUsage(b, AAUDIO_USAGE_MEDIA);
        AAudioStreamBuilder_setContentType(b, AAUDIO_CONTENT_TYPE_MUSIC);
    } else {
        AAudioStreamBuilder_setInputPreset(b, preset);
    }
    AAudioStreamBuilder_setDataCallback(b, output ? out_cb : in_cb, nullptr);
    AAudioStreamBuilder_setErrorCallback(b, err_cb, nullptr);
    r = AAudioStreamBuilder_openStream(b, out);
    AAudioStreamBuilder_delete(b);
    return r;
}

void close_streams() {
    if (g_in) {
        AAudioStream_requestStop(g_in);
        AAudioStream_close(g_in);   // the capture callback is done after this...
        g_in = nullptr;
    }
    hk_set_input_active(0);         // ...so nothing re-publishes ANC weights after they're zeroed
    if (g_out) {
        AAudioStream_requestStop(g_out);
        AAudioStream_close(g_out);
        g_out = nullptr;
    }
}

// 0: both running. 1: headphones running, mic failed or not requested. <0: headphones failed.
int open_all(int out_dev, int in_dev, bool mic) {
    std::lock_guard<std::mutex> lk(g_mu);
    close_streams();
    g_need_reopen.store(0);

    AAudioStream* o = nullptr;
    aaudio_result_t r = open_stream(true, out_dev, 0, &o);
    if (r != AAUDIO_OK) {
        LOG("output open failed: %s", AAudio_convertResultToText(r));
        return -1;
    }
    hk_set_output_rate(AAudioStream_getSampleRate(o));
    if ((r = AAudioStream_requestStart(o)) != AAUDIO_OK) {
        LOG("output start failed: %s", AAudio_convertResultToText(r));
        AAudioStream_close(o);
        return -2;
    }
    g_out = o;
    LOG("output: device %d, %d Hz, %d ch, burst %d", AAudioStream_getDeviceId(o), AAudioStream_getSampleRate(o),
        AAudioStream_getChannelCount(o), AAudioStream_getFramesPerBurst(o));
    if (!mic) return 1;

    AAudioStream* i = nullptr;
    int preset = AAUDIO_INPUT_PRESET_UNPROCESSED;
    r = open_stream(false, in_dev, preset, &i);
    if (r != AAUDIO_OK) {   // not every phone offers an unprocessed mic; this one skips the noise suppressor too
        preset = AAUDIO_INPUT_PRESET_VOICE_RECOGNITION;
        r = open_stream(false, in_dev, preset, &i);
    }
    if (r != AAUDIO_OK) {
        LOG("input open failed: %s", AAudio_convertResultToText(r));
        return 1;
    }
    g_preset = preset;
    hk_set_input_rate(AAudioStream_getSampleRate(i));
    hk_set_input_active(1);
    if ((r = AAudioStream_requestStart(i)) != AAUDIO_OK) {
        LOG("input start failed: %s", AAudio_convertResultToText(r));
        AAudioStream_close(i);
        hk_set_input_active(0);
        return 1;
    }
    g_in = i;
    LOG("input: device %d, %d Hz, %d ch, preset %d", AAudioStream_getDeviceId(i), AAudioStream_getSampleRate(i),
        AAudioStream_getChannelCount(i), preset);
    return 0;
}

}  // namespace

#define JNI(ret, name) extern "C" JNIEXPORT ret JNICALL Java_app_humkiller_Native_##name

JNI(void, init)(JNIEnv*, jclass) {
    std::lock_guard<std::mutex> lk(g_mu);
    if (!g_inited) {
        hk_init();
        g_inited = true;
    }
}

JNI(jint, open)(JNIEnv*, jclass, jint out_dev, jint in_dev, jboolean mic) { return open_all(out_dev, in_dev, mic); }

JNI(void, close)(JNIEnv*, jclass) {
    std::lock_guard<std::mutex> lk(g_mu);
    close_streams();
}

JNI(jboolean, needsReopen)(JNIEnv*, jclass) { return g_need_reopen.load() != 0; }
JNI(jint, inputPreset)(JNIEnv*, jclass) { return g_in ? g_preset : 0; }
JNI(jint, outputDeviceId)(JNIEnv*, jclass) { return g_out ? AAudioStream_getDeviceId(g_out) : 0; }
JNI(jint, inputDeviceId)(JNIEnv*, jclass) { return g_in ? AAudioStream_getDeviceId(g_in) : 0; }

JNI(void, setMode)(JNIEnv*, jclass, jint m) { hk_set_mode(m); }
JNI(void, setArmed)(JNIEnv*, jclass, jboolean a) { hk_set_armed(a ? 1 : 0); }
JNI(void, setFundamental)(JNIEnv*, jclass, jdouble hz) { hk_set_fundamental(hz); }
JNI(void, setHarmonic)(JNIEnv*, jclass, jint k, jboolean en, jfloat level, jfloat phase) {
    hk_set_harmonic(k, en ? 1 : 0, level, phase);
}
JNI(void, setMaster)(JNIEnv*, jclass, jfloat g) { hk_set_master(g); }
JNI(void, ancRestart)(JNIEnv*, jclass) { hk_anc_restart(); }
JNI(void, findStart)(JNIEnv*, jclass) { hk_find_start(); }

// [mode, armed, input_active, freq, locked, anc_state, anc_error, find_state, input_rms_db, dither_floor_db]
JNI(void, status)(JNIEnv* env, jclass, jdoubleArray out) {
    hk_status s;
    hk_get_status(&s);
    const jdouble v[10] = {(double)s.mode,      (double)s.armed,     (double)s.input_active, s.freq,
                           (double)s.locked,    (double)s.anc_state, (double)s.anc_error,    (double)s.find_state,
                           s.input_rms_db,      s.dither_floor_db};
    env->SetDoubleArrayRegion(out, 0, 10, v);
}

// per harmonic: [mic_db, snr_db, reduction_db, out_db, out_phase_deg, anc_active] x 4
JNI(void, harmonics)(JNIEnv* env, jclass, jfloatArray out) {
    jfloat v[HK_MAX_HARMONICS * 6];
    for (int k = 0; k < HK_MAX_HARMONICS; k++) {
        hk_harmonic_status h;
        hk_get_harmonic(k, &h);
        jfloat* p = v + k * 6;
        p[0] = h.mic_db;
        p[1] = h.snr_db;
        p[2] = h.reduction_db;
        p[3] = h.out_db;
        p[4] = h.out_phase_deg;
        p[5] = (float)h.anc_active;
    }
    env->SetFloatArrayRegion(out, 0, HK_MAX_HARMONICS * 6, v);
}

// [ok, f0, prominence x 4]. Runs an FFT: call it off the main thread.
JNI(void, findCompute)(JNIEnv* env, jclass, jdoubleArray out) {
    hk_find_result r;
    hk_find_compute(&r);
    jdouble v[2 + HK_MAX_HARMONICS] = {(double)r.ok, r.f0};
    for (int k = 0; k < HK_MAX_HARMONICS; k++) v[2 + k] = r.prominence_db[k];
    env->SetDoubleArrayRegion(out, 0, 2 + HK_MAX_HARMONICS, v);
}
