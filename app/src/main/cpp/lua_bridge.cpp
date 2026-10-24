// The Kotlin side of the Lua tools (app/.../lua/LuaTools.kt) calls these. Text crosses as UTF-8
// byte arrays both ways, as in jni_bridge.cpp.
#include "lua_tools.h"

#include <jni.h>
#include <nlohmann/json.hpp>

#include <string>

using json = nlohmann::ordered_json;

namespace {

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

std::vector<oa::lua::Chunk> chunks(const json & j) {
    std::vector<oa::lua::Chunk> out;
    if (!j.is_array()) return out;
    for (const json & c : j) out.push_back({c.value("name", "script"), c.value("source", "")});
    return out;
}

}  // namespace

extern "C" {

// request: {"scripts": [{"name", "source"}], "preludes": [{"name", "source"}], "time_ms",
// "memory_mb", "max_lines", "settings": {"game_seconds": 60, ...}}; the answer is run()'s JSON
JNIEXPORT jbyteArray JNICALL
Java_app_offlineai_chat_lua_LuaTools_nativeRun(JNIEnv * env, jclass, jbyteArray jrequest) {
    std::string out;
    try {
        const json req = json::parse(from_bytes(env, jrequest));
        oa::lua::RunOptions opt;
        opt.time_ms = req.value("time_ms", opt.time_ms);
        opt.memory_bytes = (size_t) req.value("memory_mb", 64) << 20;
        opt.max_lines = req.value("max_lines", opt.max_lines);
        if (req.contains("settings") && req["settings"].is_object()) {
            for (const auto & [k, v] : req["settings"].items()) {
                if (v.is_number()) opt.settings.push_back({k, v.get<double>()});
                else if (v.is_boolean()) opt.settings.push_back({k, v.get<bool>() ? 1.0 : 0.0});
            }
        }
        out = oa::lua::run(chunks(req["scripts"]), chunks(req["preludes"]), opt);
    } catch (const std::exception & e) {
        out = json{{"ok", false}, {"error", std::string("the Lua tools failed: ") + e.what()}, {"lines", json::array()}}.dump();
    }
    return to_bytes(env, out);
}

JNIEXPORT void JNICALL
Java_app_offlineai_chat_lua_LuaTools_nativeStop(JNIEnv *, jclass) {
    oa::lua::stop();
}

JNIEXPORT jbyteArray JNICALL
Java_app_offlineai_chat_lua_LuaTools_nativeCheck(JNIEnv * env, jclass, jbyteArray jsource, jbyteArray jchunk, jbyteArray jenv) {
    std::string out;
    try {
        out = oa::lua::check(from_bytes(env, jsource), from_bytes(env, jchunk), from_bytes(env, jenv));
    } catch (const std::exception & e) {
        out = json{{"ok", false}, {"errors", 1}, {"problems", json::array({{{"line", 1}, {"col", 1}, {"severity", "error"},
            {"code", "Analysis"}, {"message", std::string("the check failed: ") + e.what()}}})}}.dump();
    }
    return to_bytes(env, out);
}

}  // extern "C"
