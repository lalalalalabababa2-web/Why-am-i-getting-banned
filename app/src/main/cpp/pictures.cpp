// Making pictures: stable-diffusion.cpp on the same ggml as the chat engine. One picture model at
// a time; load, make and unload come from one thread at a time (PictureEngine.kt keeps them on
// its own thread), cancel from anywhere.
#include "engine.h"
#include "stable-diffusion.h"

#include <android/log.h>
#include <jni.h>
#include <nlohmann/json.hpp>

#include <atomic>
#include <mutex>
#include <string>
#include <vector>

using json = nlohmann::json;

#define TAG "OfflineAI.pictures"

namespace {

sd_ctx_t *          g_ctx = nullptr;
std::string         g_key;
std::string         g_error;
std::atomic<bool>   g_busy{false};
std::mutex          g_mu;

// While a picture is being made: who hears about its progress (only from the thread making it).
struct Listener {
    JNIEnv *  env = nullptr;
    jobject   obj = nullptr;
    jmethodID progress = nullptr;
    jmethodID preview = nullptr;
};
thread_local Listener * t_listener = nullptr;

std::string from_bytes(JNIEnv * env, jbyteArray arr) {
    if (!arr) return {};
    const jsize n = env->GetArrayLength(arr);
    std::string s((size_t) n, '\0');
    if (n > 0) env->GetByteArrayRegion(arr, 0, n, reinterpret_cast<jbyte *>(&s[0]));
    return s;
}

jbyteArray to_bytes(JNIEnv * env, const std::string & s) {
    jbyteArray arr = env->NewByteArray((jsize) s.size());
    if (arr && !s.empty()) env->SetByteArrayRegion(arr, 0, (jsize) s.size(), reinterpret_cast<const jbyte *>(s.data()));
    return arr;
}

void log_cb(enum sd_log_level_t level, const char * text, void *) {
    int prio = ANDROID_LOG_DEBUG;
    switch (level) {
        case SD_LOG_ERROR: prio = ANDROID_LOG_ERROR; break;
        case SD_LOG_WARN:  prio = ANDROID_LOG_WARN;  break;
        case SD_LOG_INFO:  prio = ANDROID_LOG_INFO;  break;
        default: return;
    }
    __android_log_write(prio, TAG, text);
    if (level == SD_LOG_ERROR && text) {
        g_error = text;
        // the library ends its messages with " --- file.cpp:123": not for people
        const size_t at = g_error.find(" --- ");
        if (at != std::string::npos) g_error.resize(at);
        while (!g_error.empty() && (g_error.back() == '\n' || g_error.back() == ' ')) g_error.pop_back();
    }
}

void progress_cb(const sd_generation_progress_t * p, void *) {
    Listener * l = t_listener;
    if (!l || !p) return;
    jstring stage = l->env->NewStringUTF(p->stage ? p->stage : "");
    l->env->CallVoidMethod(l->obj, l->progress, stage, (jlong) p->completed, (jlong) p->total);
    l->env->DeleteLocalRef(stage);
    if (l->env->ExceptionCheck()) l->env->ExceptionClear();
}

// Each step's picture so far, as the model sees it (a cheap projection of the latent, small and
// soft), so the picture can be watched coming together.
void preview_cb(int, int frame_count, sd_image_t * frames, bool, void *) {
    Listener * l = t_listener;
    if (!l || frame_count < 1 || !frames || !frames[0].data) return;
    const sd_image_t & im = frames[0];
    const int n = (int) (im.width * im.height);
    jintArray px = l->env->NewIntArray(n);
    if (!px) return;
    std::vector<jint> buf((size_t) n);
    for (int i = 0; i < n; i++) {
        const uint8_t * s = im.data + (size_t) i * im.channel;
        const int r = s[0], g = im.channel > 1 ? s[1] : s[0], b = im.channel > 2 ? s[2] : s[0];
        buf[(size_t) i] = (jint) (0xFF000000u | (uint32_t) (r << 16) | (uint32_t) (g << 8) | (uint32_t) b);
    }
    l->env->SetIntArrayRegion(px, 0, n, buf.data());
    l->env->CallVoidMethod(l->obj, l->preview, (jint) im.width, (jint) im.height, px);
    l->env->DeleteLocalRef(px);
    if (l->env->ExceptionCheck()) l->env->ExceptionClear();
}

void unload_locked() {
    if (g_ctx) free_sd_ctx(g_ctx);
    g_ctx = nullptr;
    g_key.clear();
}

}  // namespace

extern "C" {

// Loads a picture model (the chat engine's backends must be loaded first: NativeEngine.init).
// Returns null, or why it could not be loaded.
JNIEXPORT jbyteArray JNICALL
Java_app_offlineai_chat_engine_PictureEngine_nativeLoad(JNIEnv * env, jclass, jbyteArray jpath, jbyteArray jtaesd, jint threads) {
    std::lock_guard<std::mutex> lock(g_mu);
    const std::string path = from_bytes(env, jpath);
    const std::string taesd = from_bytes(env, jtaesd);
    const std::string key = path + "|" + taesd + "|" + std::to_string(threads);
    if (g_ctx && g_key == key) return nullptr;
    unload_locked();
    sd_set_log_callback(log_cb, nullptr);
    g_error.clear();
    sd_ctx_params_t cp;
    sd_ctx_params_init(&cp);
    cp.model_path = path.c_str();
    if (!taesd.empty()) cp.taesd_path = taesd.c_str();
    cp.n_threads = threads > 0 ? threads : 4;
    cp.enable_mmap = true;   // the weights stay in the file: less memory, and loading is instant
    cp.diffusion_flash_attn = true;
    g_ctx = new_sd_ctx(&cp);
    if (!g_ctx) {
        return to_bytes(env, g_error.empty() ? std::string("The picture model could not be loaded.") : g_error);
    }
    g_key = key;
    return nullptr;
}

JNIEXPORT void JNICALL
Java_app_offlineai_chat_engine_PictureEngine_nativeUnload(JNIEnv *, jclass) {
    std::lock_guard<std::mutex> lock(g_mu);
    unload_locked();
}

JNIEXPORT void JNICALL
Java_app_offlineai_chat_engine_PictureEngine_nativeCancel(JNIEnv *, jclass) {
    // no lock: the picture being made holds it
    if (g_busy.load() && g_ctx) sd_cancel_generation(g_ctx, SD_CANCEL_ALL);
}

JNIEXPORT jbyteArray JNICALL
Java_app_offlineai_chat_engine_PictureEngine_nativeLastError(JNIEnv * env, jclass) {
    return to_bytes(env, g_error);
}

// Makes one picture. [request] is JSON: prompt, negative, width, height, steps, cfg, seed, sampler.
// Returns [width, height, pixels (ARGB)...], or null (nativeLastError says why; "" when cancelled).
JNIEXPORT jintArray JNICALL
Java_app_offlineai_chat_engine_PictureEngine_nativeGenerate(JNIEnv * env, jclass, jbyteArray jrequest, jobject listener) {
    std::lock_guard<std::mutex> lock(g_mu);
    g_error.clear();
    if (!g_ctx) {
        g_error = "No picture model is loaded.";
        return nullptr;
    }
    json req;
    try {
        req = json::parse(from_bytes(env, jrequest));
    } catch (...) {
        g_error = "Bad request.";
        return nullptr;
    }
    const std::string prompt = req.value("prompt", std::string());
    const std::string negative = req.value("negative", std::string());
    const std::string sampler = req.value("sampler", std::string());
    const std::string scheduler = req.value("scheduler", std::string());

    Listener l;
    if (listener) {
        jclass cls = env->GetObjectClass(listener);
        l.env = env;
        l.obj = listener;
        l.progress = env->GetMethodID(cls, "onProgress", "(Ljava/lang/String;JJ)V");
        l.preview = env->GetMethodID(cls, "onPreview", "(II[I)V");
        if (env->ExceptionCheck()) env->ExceptionClear();
        if (!l.progress || !l.preview) listener = nullptr;
    }
    t_listener = listener ? &l : nullptr;
    sd_set_generation_progress_callback(g_ctx, listener ? progress_cb : nullptr, nullptr);
    sd_set_preview_callback(listener && req.value("preview", true) ? preview_cb : nullptr, PREVIEW_PROJ, 1, true, false, nullptr);

    sd_img_gen_params_t gp;
    sd_img_gen_params_init(&gp);
    gp.prompt = prompt.c_str();
    gp.negative_prompt = negative.c_str();
    gp.width = req.value("width", 512);
    gp.height = req.value("height", 512);
    gp.seed = req.value("seed", (int64_t) 42);
    gp.batch_count = 1;
    gp.sample_params.sample_steps = req.value("steps", 4);
    gp.sample_params.guidance.txt_cfg = req.value("cfg", 1.0f);
    if (!sampler.empty()) {
        const sample_method_t m = str_to_sample_method(sampler.c_str());
        if (m != SAMPLE_METHOD_COUNT) gp.sample_params.sample_method = m;
    }
    if (!scheduler.empty()) {
        const scheduler_t sc = str_to_scheduler(scheduler.c_str());
        if (sc != SCHEDULER_COUNT) gp.sample_params.scheduler = sc;
    }
    // decoding the picture in tiles keeps the memory it needs small on a phone
    gp.vae_tiling_params.enabled = req.value("tiled", false);

    g_busy.store(true);
    sd_cancel_generation(g_ctx, SD_CANCEL_RESET);
    sd_image_generation_result_t * res = nullptr;
    const bool ok = generate_image(g_ctx, &gp, &res);
    g_busy.store(false);
    sd_set_generation_progress_callback(g_ctx, nullptr, nullptr);
    sd_set_preview_callback(nullptr, PREVIEW_NONE, 1, true, false, nullptr);
    t_listener = nullptr;

    if (!ok || !res || res->count < 1 || !res->items[0].image.data) {
        if (res) free_sd_image_generation_result(res);
        if (g_error.empty() && ok) g_error = "The picture model made nothing.";
        return nullptr;
    }
    const sd_image_t & im = res->items[0].image;
    const int n = (int) (im.width * im.height);
    std::vector<jint> buf((size_t) n + 2);
    buf[0] = (jint) im.width;
    buf[1] = (jint) im.height;
    for (int i = 0; i < n; i++) {
        const uint8_t * s = im.data + (size_t) i * im.channel;
        const int r = s[0], g = im.channel > 1 ? s[1] : s[0], b = im.channel > 2 ? s[2] : s[0];
        buf[(size_t) i + 2] = (jint) (0xFF000000u | (uint32_t) (r << 16) | (uint32_t) (g << 8) | (uint32_t) b);
    }
    free_sd_image_generation_result(res);
    jintArray out = env->NewIntArray((jsize) buf.size());
    if (out) env->SetIntArrayRegion(out, 0, (jsize) buf.size(), buf.data());
    return out;
}

}  // extern "C"
