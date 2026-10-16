// The Kotlin side talks to the engine through these few calls. Text crosses as UTF-8 byte
// arrays in both directions: JNI's own string functions use "modified UTF-8", which mangles
// emoji and other characters outside the basic plane.
#include "engine.h"

#include <android/log.h>
#include <jni.h>
#include <nlohmann/json.hpp>

#include "llama.h"

#include <string>

using json = nlohmann::ordered_json;

#define TAG "OfflineAI"

namespace {

oa::Engine & engine() {
    static oa::Engine * e = new oa::Engine();  // lives as long as the process
    return *e;
}

void log_callback(ggml_log_level level, const char * text, void *) {
    int prio = ANDROID_LOG_DEBUG;
    switch (level) {
        case GGML_LOG_LEVEL_ERROR: prio = ANDROID_LOG_ERROR; break;
        case GGML_LOG_LEVEL_WARN:  prio = ANDROID_LOG_WARN;  break;
        case GGML_LOG_LEVEL_INFO:  prio = ANDROID_LOG_INFO;  break;
        default: return;  // debug output from every layer is too much for logcat
    }
    __android_log_write(prio, TAG, text);
}

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

std::string dump(const json & j) {
    // Model output can hold stray bytes that are not UTF-8; replace them instead of throwing.
    return j.dump(-1, ' ', false, json::error_handler_t::replace);
}

bool take_exception(JNIEnv * env) {
    if (env->ExceptionCheck()) {
        env->ExceptionDescribe();
        env->ExceptionClear();
        return true;
    }
    return false;
}

}  // namespace

extern "C" {

JNIEXPORT void JNICALL
Java_app_offlineai_chat_engine_NativeEngine_nativeInit(JNIEnv * env, jclass, jstring lib_dir) {
    llama_log_set(log_callback, nullptr);
    const char * dir = env->GetStringUTFChars(lib_dir, nullptr);
    oa::Engine::backend_init(dir ? dir : "");
    if (dir) env->ReleaseStringUTFChars(lib_dir, dir);
}

JNIEXPORT jstring JNICALL
Java_app_offlineai_chat_engine_NativeEngine_nativeSystemInfo(JNIEnv * env, jclass) {
    return env->NewStringUTF(oa::Engine::system_info().c_str());
}

// Returns null on success, or the reason it failed (UTF-8).
JNIEXPORT jbyteArray JNICALL
Java_app_offlineai_chat_engine_NativeEngine_nativeLoad(JNIEnv * env, jclass, jbyteArray jpath, jint n_ctx,
                                                       jint n_threads, jint n_batch, jboolean use_mmap,
                                                       jobject listener) {
    oa::LoadParams p;
    p.n_ctx = n_ctx;
    p.n_threads = n_threads;
    p.n_batch = n_batch;
    p.use_mmap = use_mmap;

    jmethodID on_progress = nullptr;
    if (listener) {
        jclass cls = env->GetObjectClass(listener);
        on_progress = env->GetMethodID(cls, "onProgress", "(F)Z");
        env->DeleteLocalRef(cls);
    }
    std::function<bool(float)> progress;
    if (on_progress) {
        progress = [&](float f) {
            const jboolean go = env->CallBooleanMethod(listener, on_progress, (jfloat) f);
            return !take_exception(env) && go == JNI_TRUE;
        };
    }
    std::string err;
    if (engine().load(from_bytes(env, jpath), p, err, progress)) return nullptr;
    return to_bytes(env, err.empty() ? std::string("The model could not be loaded.") : err);
}

JNIEXPORT void JNICALL
Java_app_offlineai_chat_engine_NativeEngine_nativeUnload(JNIEnv *, jclass) {
    engine().unload();
}

JNIEXPORT jbyteArray JNICALL
Java_app_offlineai_chat_engine_NativeEngine_nativeInfo(JNIEnv * env, jclass) {
    const auto mi = engine().info();
    json j = {
        {"loaded", engine().loaded()},
        {"name", mi.name},
        {"arch", mi.arch},
        {"desc", mi.desc},
        {"size_bytes", mi.size_bytes},
        {"n_params", mi.n_params},
        {"n_ctx_train", mi.n_ctx_train},
        {"n_ctx", mi.n_ctx},
        {"n_threads", mi.n_threads},
        {"supports_thinking", mi.supports_thinking},
        {"has_template", mi.has_template},
        {"memory", mi.memory},
    };
    return to_bytes(env, dump(j));
}

JNIEXPORT void JNICALL
Java_app_offlineai_chat_engine_NativeEngine_nativeStop(JNIEnv *, jclass) {
    engine().request_stop();
}

JNIEXPORT void JNICALL
Java_app_offlineai_chat_engine_NativeEngine_nativeResetCache(JNIEnv *, jclass) {
    engine().reset_cache();
}

JNIEXPORT jbyteArray JNICALL
Java_app_offlineai_chat_engine_NativeEngine_nativeChat(JNIEnv * env, jclass, jbyteArray jrequest, jobject listener) {
    oa::ChatRequest req;
    try {
        const json j = json::parse(from_bytes(env, jrequest));
        for (const auto & m : j.at("messages")) {
            req.messages.push_back({m.value("role", std::string("user")), m.value("content", std::string()),
                                    m.value("reasoning", std::string())});
        }
        req.enable_thinking = j.value("thinking", true);
        req.now_ms = j.value("now_ms", (int64_t) 0);
        if (j.contains("sampling")) {
            const auto & s = j.at("sampling");
            req.sampling.temp = s.value("temp", req.sampling.temp);
            req.sampling.top_p = s.value("top_p", req.sampling.top_p);
            req.sampling.top_k = s.value("top_k", req.sampling.top_k);
            req.sampling.min_p = s.value("min_p", req.sampling.min_p);
            req.sampling.repeat_penalty = s.value("repeat_penalty", req.sampling.repeat_penalty);
            req.sampling.presence_penalty = s.value("presence_penalty", req.sampling.presence_penalty);
            req.sampling.max_tokens = s.value("max_tokens", req.sampling.max_tokens);
            const int64_t seed = s.value("seed", (int64_t) -1);
            req.sampling.seed = seed < 0 ? 0xFFFFFFFFu : (uint32_t) seed;
        }
    } catch (const std::exception & e) {
        json r = {{"ok", false}, {"error", std::string("Bad request: ") + e.what()}};
        return to_bytes(env, dump(r));
    }

    jmethodID on_prompt = nullptr, on_update = nullptr;
    if (listener) {
        jclass cls = env->GetObjectClass(listener);
        on_prompt = env->GetMethodID(cls, "onPromptProgress", "(II)V");
        on_update = env->GetMethodID(cls, "onUpdate", "([B[BI)V");
        env->DeleteLocalRef(cls);
        take_exception(env);
    }

    oa::ChatCallbacks cb;
    if (on_prompt) {
        cb.on_prompt_progress = [&](int done, int total) {
            env->CallVoidMethod(listener, on_prompt, (jint) done, (jint) total);
            if (take_exception(env)) engine().request_stop();
        };
    }
    if (on_update) {
        cb.on_update = [&](const std::string & reasoning, const std::string & content, int n) {
            jbyteArray r = to_bytes(env, reasoning);
            jbyteArray c = to_bytes(env, content);
            env->CallVoidMethod(listener, on_update, r, c, (jint) n);
            // One reply can run to thousands of tokens; local references must not pile up.
            env->DeleteLocalRef(r);
            env->DeleteLocalRef(c);
            if (take_exception(env)) engine().request_stop();
        };
    }

    const auto res = engine().chat(req, cb);
    json r = {
        {"ok", res.ok},
        {"content", res.content},
        {"reasoning", res.reasoning},
        {"error", res.error},
        {"stats", {
            {"n_prompt", res.stats.n_prompt},
            {"n_reused", res.stats.n_reused},
            {"n_evaluated", res.stats.n_evaluated},
            {"n_generated", res.stats.n_generated},
            {"t_prompt_ms", res.stats.t_prompt_ms},
            {"t_gen_ms", res.stats.t_gen_ms},
            {"n_dropped", res.stats.n_dropped},
            {"used_snapshot", res.stats.used_snapshot},
            {"stop_reason", res.stats.stop_reason},
        }},
    };
    return to_bytes(env, dump(r));
}

}  // extern "C"
