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

// Returns null on success, or the reason it failed (UTF-8). The options are JSON (UTF-8).
JNIEXPORT jbyteArray JNICALL
Java_app_offlineai_chat_engine_NativeEngine_nativeLoad(JNIEnv * env, jclass, jbyteArray jpath, jbyteArray joptions,
                                                       jobject listener) {
    oa::LoadParams p;
    try {
        const json o = json::parse(from_bytes(env, joptions));
        p.n_ctx = o.value("n_ctx", p.n_ctx);
        p.n_threads = o.value("n_threads", p.n_threads);
        p.n_batch = o.value("n_batch", p.n_batch);
        p.n_ubatch = o.value("n_ubatch", p.n_ubatch);
        p.low_memory = o.value("low_memory", p.low_memory);
        p.kv_q8 = o.value("kv_q8", p.kv_q8);
        p.swa_full = o.value("swa_full", p.swa_full);
        p.spec_n_max = o.value("spec_n_max", p.spec_n_max);
        p.spec_ngram = o.value("spec_ngram", p.spec_ngram);
        p.drafter_path = o.value("drafter", std::string());
        p.mmproj_path = o.value("mmproj", std::string());
        p.image_max_tokens = o.value("image_max_tokens", p.image_max_tokens);
        p.pager = o.value("pager", p.pager);
        p.helper_path = o.value("helper", std::string());
        p.helper_n_max = o.value("helper_n_max", p.helper_n_max);
        p.mem_budget_mb = o.value("mem_budget_mb", p.mem_budget_mb);
        p.draft_vocab = o.value("draft_vocab", p.draft_vocab);
        p.spec_auto = o.value("spec_auto", p.spec_auto);
    } catch (const std::exception & e) {
        return to_bytes(env, std::string("Bad load options: ") + e.what());
    }

    jmethodID on_progress = nullptr, on_warmup_id = nullptr;
    if (listener) {
        jclass cls = env->GetObjectClass(listener);
        on_progress = env->GetMethodID(cls, "onProgress", "(F)Z");
        on_warmup_id = env->GetMethodID(cls, "onWarmup", "()V");
        env->DeleteLocalRef(cls);
        take_exception(env);
    }
    std::function<bool(float)> progress;
    if (on_progress) {
        progress = [&](float f) {
            const jboolean go = env->CallBooleanMethod(listener, on_progress, (jfloat) f);
            return !take_exception(env) && go == JNI_TRUE;
        };
    }
    std::function<void()> warm;
    if (on_warmup_id) {
        warm = [&]() {
            env->CallVoidMethod(listener, on_warmup_id);
            take_exception(env);
        };
    }
    std::string err;
    // nothing thrown in the engine may cross into Java: that would end the whole app
    try {
        if (engine().load(from_bytes(env, jpath), p, err, progress, warm)) return nullptr;
    } catch (const std::bad_alloc &) {
        try { engine().unload(); } catch (...) {}
        err = "There is not enough memory to load this model. Close other apps, use a smaller context size or "
              "low-memory mode in Settings, or pick a smaller model.";
    } catch (const std::exception & e) {
        try { engine().unload(); } catch (...) {}
        err = std::string("The model could not be loaded: ") + e.what();
    } catch (...) {
        try { engine().unload(); } catch (...) {}
        err = "The model could not be loaded.";
    }
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
        {"speculative", mi.speculative},
        {"spec_n_max", mi.spec_n_max},
        {"has_mtp", mi.has_mtp},
        {"vision", mi.vision},
        {"audio", mi.audio},
        {"compute_bytes", engine().compute_bytes()},
        {"helper", mi.helper},
        {"pager", mi.pager},
        {"streaming", mi.streaming},
        {"experts_storage", mi.experts_storage},
        {"draft_vocab", mi.draft_vocab},
        {"resident_bytes", mi.resident_bytes},
        {"streamed_bytes", mi.streamed_bytes},
        {"read_mbps", mi.read_mbps},
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

JNIEXPORT void JNICALL
Java_app_offlineai_chat_engine_NativeEngine_nativeReleaseMedia(JNIEnv *, jclass) {
    engine().release_media();
}

// Android asked for memory back: a paged model keeps fewer layers. Any thread.
JNIEXPORT void JNICALL
Java_app_offlineai_chat_engine_NativeEngine_nativeTrimMemory(JNIEnv *, jclass) {
    engine().trim_memory();
}

// Other apps closed or opened: a paged model looks again at how much it may keep. Any thread.
JNIEXPORT void JNICALL
Java_app_offlineai_chat_engine_NativeEngine_nativeMemoryChanged(JNIEnv *, jclass) {
    engine().memory_changed();
}

// What the pager is doing now, for the status line. Any thread.
JNIEXPORT jbyteArray JNICALL
Java_app_offlineai_chat_engine_NativeEngine_nativePagerStats(JNIEnv * env, jclass) {
    const auto ps = engine().pager_stats();
    json j = {
        {"planned", ps.planned},
        {"active", ps.active},
        {"pass_bytes", ps.pass_bytes},
        {"resident_bytes", ps.resident_bytes},
        {"streamed_bytes", ps.streamed_bytes},
        {"read_mbps", ps.read_mbps},
        {"resident_present", ps.resident_present},
        {"pass_ms", ps.pass_ms},
        {"n_replans", ps.n_replans},
    };
    return to_bytes(env, dump(j));
}

JNIEXPORT void JNICALL
Java_app_offlineai_chat_engine_NativeEngine_nativeSetThreads(JNIEnv *, jclass, jint n) {
    engine().set_threads(n);
}

JNIEXPORT void JNICALL
Java_app_offlineai_chat_engine_NativeEngine_nativeSetBackground(JNIEnv *, jclass, jboolean on, jint threads) {
    engine().set_background(on == JNI_TRUE, threads);
}

JNIEXPORT jbyteArray JNICALL
Java_app_offlineai_chat_engine_NativeEngine_nativeBench(JNIEnv * env, jclass, jintArray jthreads, jint n_prompt, jint n_gen) {
    std::vector<int> threads;
    const jsize n = env->GetArrayLength(jthreads);
    threads.resize((size_t) n);
    if (n > 0) env->GetIntArrayRegion(jthreads, 0, n, threads.data());
    std::string err;
    std::vector<oa::BenchResult> results;
    try {
        results = engine().bench(threads, n_prompt, n_gen, err);
    } catch (const std::exception & e) {
        err = std::string("The speed test failed: ") + e.what();
    } catch (...) {
        err = "The speed test failed.";
    }
    json arr = json::array();
    for (const auto & r : results) arr.push_back({{"threads", r.threads}, {"pp", r.pp_tps}, {"tg", r.tg_tps}});
    return to_bytes(env, dump(json{{"results", arr}, {"error", err}}));
}

JNIEXPORT jbyteArray JNICALL
Java_app_offlineai_chat_engine_NativeEngine_nativeChat(JNIEnv * env, jclass, jbyteArray jrequest, jobject listener) {
    oa::ChatRequest req;
    try {
        const json j = json::parse(from_bytes(env, jrequest));
        for (const auto & m : j.at("messages")) {
            oa::Message msg{m.value("role", std::string("user")), m.value("content", std::string()),
                            m.value("reasoning", std::string())};
            if (m.contains("media")) {
                for (const auto & md : m.at("media")) {
                    msg.media.push_back({md.value("path", std::string()), md.value("label", std::string()),
                                         md.value("frame", false)});
                }
            }
            req.messages.push_back(std::move(msg));
        }
        req.enable_thinking = j.value("thinking", true);
        req.spec_n_max = j.value("spec_n_max", -1);
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

    jmethodID on_prompt = nullptr, on_update = nullptr, on_media = nullptr;
    if (listener) {
        jclass cls = env->GetObjectClass(listener);
        on_prompt = env->GetMethodID(cls, "onPromptProgress", "(II)V");
        take_exception(env);
        on_update = env->GetMethodID(cls, "onUpdate", "([B[BI)V");
        take_exception(env);
        on_media = env->GetMethodID(cls, "onMedia", "(II)V");
        take_exception(env);
        env->DeleteLocalRef(cls);
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

    if (on_media) {
        cb.on_media = [&](int index, int total) {
            env->CallVoidMethod(listener, on_media, (jint) index, (jint) total);
            if (take_exception(env)) engine().request_stop();
        };
    }

    oa::ChatResult res;
    try {
        res = engine().chat(req, cb);
    } catch (const std::bad_alloc &) {
        res = oa::ChatResult();
        res.error = "The phone ran out of memory while writing. Close other apps, use a smaller context size, or "
                    "pick a smaller model.";
        res.stats.stop_reason = "error";
        try { engine().reset_cache(); } catch (...) {}
    } catch (const std::exception & e) {
        res = oa::ChatResult();
        res.error = std::string("Something went wrong while writing: ") + e.what();
        res.stats.stop_reason = "error";
        try { engine().reset_cache(); } catch (...) {}
    } catch (...) {
        res = oa::ChatResult();
        res.error = "Something went wrong while writing.";
        res.stats.stop_reason = "error";
        try { engine().reset_cache(); } catch (...) {}
    }
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
            {"t_first_ms", res.stats.t_first_ms},
            {"used_snapshot", res.stats.used_snapshot},
            {"n_drafted", res.stats.n_drafted},
            {"n_accepted", res.stats.n_accepted},
            {"n_steps", res.stats.n_steps},
            {"n_media", res.stats.n_media},
            {"t_media_ms", res.stats.t_media_ms},
            {"t_draft_ms", res.stats.t_draft_ms},
            {"t_verify_ms", res.stats.t_verify_ms},
            {"t_sync_ms", res.stats.t_sync_ms},
            {"n_majflt", res.stats.n_majflt},
            {"streaming", res.stats.streaming},
            {"resident_gb", res.stats.resident_gb},
            {"streamed_gb", res.stats.streamed_gb},
            {"read_gb", res.stats.read_gb},
            {"read_mbps", res.stats.read_mbps},
            {"t_pass_ms", res.stats.t_pass_ms},
            {"stop_reason", res.stats.stop_reason},
        }},
    };
    return to_bytes(env, dump(r));
}

}  // extern "C"
