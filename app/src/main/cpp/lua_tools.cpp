// Runs Lua code in a fresh Luau state for every run: sandboxed (the standard libraries are
// read-only, there is no io, no file or network access and no require), with limits on real
// time, memory and output, and a stop that works from another thread.
//
// Preludes (assets/lua/*.luau) run first, in the main state, before it is sandboxed. Each is
// called with the "oa" table:
//   oa.emit(kind, text [, game_seconds])  an output line: "out", "warn", "err" or "info"
//   oa.write(text)                        output without a line break (io.write)
//   oa.newobject(metatable)               a userdata with that metatable (typeof reads __type)
//   oa.setvectormetatable(metatable)      methods and fields for Luau's vector type (Vector3)
//   oa.clock()                            real milliseconds since the run started
//   oa.settings                           numbers the app passes along (RunOptions::settings)
// and may return a table of hooks:
//   env(source, index, name) -> globals, name   extra globals for one script (script, _G,
//                                               shared...) and what its errors are reported as
//   run(mains) -> game_seconds, reason          runs the scripts' main functions itself (a
//                                               scheduler); false for one that did not compile
#include "lua_tools.h"

#include "lua.h"
#include "luacode.h"
#include "lualib.h"
#include "Luau/Compiler.h"

#include <nlohmann/json.hpp>

#include <atomic>
#include <chrono>
#include <cstdlib>
#include <cstring>

using json = nlohmann::ordered_json;

namespace oa::lua {

namespace {

std::atomic<bool> g_stop{false};

enum Stop { NONE = 0, TIME, USER, OUTPUT, MEMORY };

const char * stop_name(int s) {
    switch (s) {
        case TIME: return "time";
        case USER: return "user";
        case OUTPUT: return "output";
        case MEMORY: return "memory";
        default: return "";
    }
}

const char * stop_message(int s) {
    switch (s) {
        case TIME: return "stopped: the script ran out of time (it may never finish, e.g. a loop that does not wait)";
        case USER: return "stopped";
        case OUTPUT: return "stopped: too much output";
        case MEMORY: return "stopped: the script used too much memory";
        default: return "stopped";
    }
}

// io.write and os.exit end the script without an error; the runner tells them apart by this text
const char * EXIT_MARK = "\x01oa-exit\x01";

struct Line {
    std::string kind;
    std::string text;
    double t;
};

struct Run {
    RunOptions opt;
    std::chrono::steady_clock::time_point start;
    std::chrono::steady_clock::time_point deadline;
    size_t used = 0;
    bool over_memory = false;
    int stop = NONE;
    unsigned ticks = 0;
    std::vector<Line> lines;
    std::string pending;  // io.write text not yet ended by a line break
    double pending_t = -1;
    size_t bytes = 0;
    int errors = 0;
};

Run * of(lua_State * L) { return static_cast<Run *>(lua_callbacks(L)->userdata); }

void * alloc(void * ud, void * ptr, size_t osize, size_t nsize) {
    Run * r = static_cast<Run *>(ud);
    if (!ptr) osize = 0;
    if (nsize == 0) {
        free(ptr);
        r->used -= osize;
        return nullptr;
    }
    // past the limit the script is stopped; a little more is allowed after that, so the error
    // can still be raised and the stack unwound
    const size_t limit = r->opt.memory_bytes + (r->over_memory ? (8u << 20) : 0);
    if (nsize > osize && r->used + (nsize - osize) > limit) {
        if (!r->over_memory) {
            r->over_memory = true;
            if (r->stop == NONE) r->stop = MEMORY;
        }
        return nullptr;
    }
    void * p = realloc(ptr, nsize);
    if (!p) return nullptr;
    r->used = r->used - osize + nsize;
    return p;
}

void raise_stop(lua_State * L, int reason) {
    lua_rawcheckstack(L, 1);  // room for the message
    luaL_error(L, "%s", stop_message(reason));
}

void interrupt(lua_State * L, int gc) {
    if (gc >= 0) return;
    Run * r = of(L);
    if (r->stop == NONE && (++r->ticks & 255) == 0) {
        if (g_stop.load(std::memory_order_relaxed)) r->stop = USER;
        else if (std::chrono::steady_clock::now() > r->deadline) r->stop = TIME;
    }
    // once stopped, every safepoint raises again, so a pcall around the work cannot keep it going
    if (r->stop != NONE) raise_stop(L, r->stop);
}

void add_line(Run * r, const char * kind, std::string text, double t) {
    if (r->stop != NONE && r->stop != OUTPUT) return;
    if (r->lines.size() >= r->opt.max_lines || r->bytes + text.size() > r->opt.max_bytes) {
        if (r->stop == NONE) {
            r->stop = OUTPUT;
            r->lines.push_back({"info", "(output stopped here: more than " + std::to_string(r->opt.max_lines) +
                " lines or " + std::to_string(r->opt.max_bytes / 1024) + " KB)", -1});
        }
        return;
    }
    if (strcmp(kind, "err") == 0) r->errors++;
    r->bytes += text.size();
    r->lines.push_back({kind, std::move(text), t});
}

void flush_pending(Run * r) {
    if (r->pending.empty()) return;
    std::string s;
    s.swap(r->pending);
    add_line(r, "out", std::move(s), r->pending_t);
}

/** Text without a line break at the end goes on waiting for the rest of its line. */
void write_out(Run * r, const char * s, size_t n, double t) {
    if (r->pending.empty()) r->pending_t = t;
    for (size_t i = 0; i < n; i++) {
        if (s[i] == '\n') {
            std::string line;
            line.swap(r->pending);
            add_line(r, "out", std::move(line), r->pending_t);
            r->pending_t = t;
        } else {
            r->pending += s[i];
            if (r->pending.size() > 64 * 1024) flush_pending(r);
        }
    }
}

void check_output(lua_State * L) {
    Run * r = of(L);
    if (r->stop == OUTPUT) raise_stop(L, OUTPUT);
}

// ---- functions for the script

int l_print(lua_State * L) {
    Run * r = of(L);
    std::string line;
    const int n = lua_gettop(L);
    for (int i = 1; i <= n; i++) {
        size_t len = 0;
        const char * s = luaL_tolstring(L, i, &len);  // __tostring too
        if (i > 1) line += '\t';
        line.append(s, len);
        lua_pop(L, 1);
    }
    line += '\n';
    write_out(r, line.data(), line.size(), -1);
    check_output(L);
    return 0;
}

int l_write(lua_State * L) {
    Run * r = of(L);
    const int n = lua_gettop(L);
    for (int i = 1; i <= n; i++) {
        size_t len = 0;
        const char * s = luaL_checklstring(L, i, &len);
        write_out(r, s, len, -1);
    }
    check_output(L);
    return 0;
}

int l_exit(lua_State * L) {
    lua_rawcheckstack(L, 1);
    lua_pushstring(L, EXIT_MARK);
    lua_error(L);
}

Luau::CompileOptions compile_options() {
    // the Roblox test place has its own typeof (Vector3 for vectors); calls to it must not be
    // compiled into the built-in one
    static const char * const not_builtin[] = {"typeof", nullptr};
    // what can change under a script, as Roblox tells its compiler: without this, a chain like
    // workspace.Gravity is looked up once when the script loads and never again
    static const char * const mutable_globals[] = {"Game", "Workspace", "game", "plugin", "script", "shared", "workspace", "_G", nullptr};
    Luau::CompileOptions o;
    o.optimizationLevel = 1;
    o.debugLevel = 1;  // line numbers and function names, for errors and tracebacks
    o.disabledBuiltins = not_builtin;
    o.mutableGlobals = mutable_globals;
    return o;
}

/** load(chunk [, chunkname [, mode [, env]]]) and loadstring(s [, chunkname]); text only, no bytecode. */
int l_load(lua_State * L) {
    std::string src;
    if (lua_isfunction(L, 1)) {
        // Lua 5.2's load(function): called until it returns nil or ""
        for (;;) {
            lua_pushvalue(L, 1);
            lua_call(L, 0, 1);
            if (lua_isnil(L, -1)) { lua_pop(L, 1); break; }
            size_t len = 0;
            const char * piece = lua_tolstring(L, -1, &len);
            if (!piece) luaL_error(L, "reader function must return a string");
            if (len == 0) { lua_pop(L, 1); break; }
            src.append(piece, len);
            lua_pop(L, 1);
        }
    } else {
        size_t len = 0;
        const char * s = luaL_checklstring(L, 1, &len);
        src.assign(s, len);
    }
    std::string name = luaL_optstring(L, 2, src.c_str());
    if (name.size() > 60 && name[0] != '=' && name[0] != '@') name = name.substr(0, 60) + "...";

    // the environment: the one given, or the caller's (so loaded code sees the script's globals)
    int env = 0;
    if (lua_gettop(L) >= 4 && !lua_isnil(L, 4)) {
        luaL_checktype(L, 4, LUA_TTABLE);
        env = 4;
    } else {
        lua_Debug ar;
        if (lua_getinfo(L, 1, "f", &ar)) {
            lua_getfenv(L, -1);
            lua_remove(L, -2);
            if (lua_istable(L, -1)) env = lua_gettop(L);
            else lua_pop(L, 1);
        }
    }
    lua_setsafeenv(L, LUA_ENVIRONINDEX, false);
    const std::string bytecode = Luau::compile(src, compile_options());
    if (luau_load(L, name.c_str(), bytecode.data(), bytecode.size(), env) == 0) return 1;
    lua_pushnil(L);
    lua_insert(L, -2);  // nil, message
    return 2;
}

int l_require(lua_State * L) {
    luaL_error(L, "require is not available here: this runs one script on its own (paste the module into the same script)");
}

// ---- the oa table for the preludes

double game_t(lua_State * L, int idx) { return lua_isnumber(L, idx) ? lua_tonumber(L, idx) : -1; }

int oa_emit(lua_State * L) {
    Run * r = of(L);
    const char * kind = luaL_checkstring(L, 1);
    size_t len = 0;
    const char * text = luaL_checklstring(L, 2, &len);
    const double t = game_t(L, 3);
    if (strcmp(kind, "out") == 0) {
        std::string s(text, len);
        s += '\n';
        write_out(r, s.data(), s.size(), t);
    } else {
        flush_pending(r);
        add_line(r, kind, std::string(text, len), t);
    }
    check_output(L);
    return 0;
}

int oa_write(lua_State * L) {
    Run * r = of(L);
    size_t len = 0;
    const char * text = luaL_checklstring(L, 1, &len);
    write_out(r, text, len, game_t(L, 2));
    check_output(L);
    return 0;
}

int oa_newobject(lua_State * L) {
    luaL_checktype(L, 1, LUA_TTABLE);
    lua_newuserdatatagged(L, 0, 0);
    lua_pushvalue(L, 1);
    lua_setmetatable(L, -2);
    return 1;
}

int oa_setvectormetatable(lua_State * L) {
    luaL_checktype(L, 1, LUA_TTABLE);
    lua_pushvector(L, 0.0f, 0.0f, 0.0f);
    lua_pushvalue(L, 1);
    lua_setmetatable(L, -2);
    lua_pop(L, 1);
    return 0;
}

int oa_clock(lua_State * L) {
    Run * r = of(L);
    const auto ms = std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - r->start).count();
    lua_pushnumber(L, ms);
    return 1;
}

void push_oa(lua_State * L, const RunOptions & opt) {
    lua_newtable(L);
    static const luaL_Reg fns[] = {
        {"emit", oa_emit},
        {"write", oa_write},
        {"newobject", oa_newobject},
        {"setvectormetatable", oa_setvectormetatable},
        {"clock", oa_clock},
        {nullptr, nullptr},
    };
    luaL_register(L, nullptr, fns);
    lua_newtable(L);
    for (const auto & [k, v] : opt.settings) {
        lua_pushnumber(L, v);
        lua_setfield(L, -2, k.c_str());
    }
    lua_setfield(L, -2, "settings");
}

/** Error handler for protected calls: the message with where it happened. */
int traceback(lua_State * L) {
    const char * msg = lua_tostring(L, 1);
    if (msg && strcmp(msg, EXIT_MARK) == 0) return 1;
    std::string s = msg ? msg : (std::string("(error object is a ") + luaL_typename(L, 1) + " value)");
    const char * trace = lua_debugtrace(L);
    if (trace && *trace) s += std::string("\n") + trace;
    lua_pushlstring(L, s.data(), s.size());
    return 1;
}

/** The first line number in a message that points into the script ("script:12: ..."). */
int line_in(const std::string & msg, const std::string & chunk) {
    const std::string key = chunk + ":";
    for (size_t at = msg.find(key); at != std::string::npos; at = msg.find(key, at + 1)) {
        size_t p = at + key.size();
        int n = 0;
        bool digits = false;
        while (p < msg.size() && msg[p] >= '0' && msg[p] <= '9') {
            n = n * 10 + (msg[p] - '0');
            digits = true;
            p++;
        }
        if (digits && (at == 0 || msg[at - 1] == '\n' || msg[at - 1] == ' ' || msg[at - 1] == '"')) return n;
    }
    return 0;
}

/** Keeps a traceback's lines about the scripts themselves; the preludes' are noise to the reader. */
std::string script_lines_only(const std::string & msg, const std::vector<std::string> & chunks) {
    const size_t nl = msg.find('\n');
    if (nl == std::string::npos) return msg;
    std::string out = msg.substr(0, nl);
    size_t p = nl + 1;
    while (p < msg.size()) {
        size_t e = msg.find('\n', p);
        if (e == std::string::npos) e = msg.size();
        const std::string l = msg.substr(p, e - p);
        for (const std::string & chunk : chunks) {
            if (l.rfind(chunk + ":", 0) == 0) {
                out += "\n  " + l;
                break;
            }
        }
        p = e + 1;
    }
    return out;
}

}  // namespace

void stop() { g_stop.store(true); }

std::string run(const std::vector<Chunk> & scripts, const std::vector<Chunk> & preludes, const RunOptions & options) {
    g_stop.store(false);
    Run r;
    r.opt = options;
    r.start = std::chrono::steady_clock::now();
    r.deadline = r.start + std::chrono::milliseconds(options.time_ms);

    json result;
    std::string error;
    int error_line = 0;
    double game_time = -1;
    std::string game_stop;

    lua_State * L = lua_newstate(alloc, &r);
    if (!L) return json{{"ok", false}, {"error", "could not start Lua"}, {"lines", json::array()}}.dump();
    lua_callbacks(L)->userdata = &r;
    lua_callbacks(L)->interrupt = interrupt;

    luaL_openlibs(L);
    static const luaL_Reg base[] = {
        {"print", l_print},
        {"loadstring", l_load},
        {"load", l_load},
        {"require", l_require},
        {nullptr, nullptr},
    };
    lua_pushvalue(L, LUA_GLOBALSINDEX);
    luaL_register(L, nullptr, base);
    lua_pop(L, 1);
    // io.write for scripts that print without line breaks; os.exit ends the script
    lua_newtable(L);
    lua_pushcfunction(L, l_write, "write");
    lua_setfield(L, -2, "write");
    lua_setglobal(L, "io");
    lua_getglobal(L, "os");
    lua_pushcfunction(L, l_exit, "exit");
    lua_setfield(L, -2, "exit");
    lua_pop(L, 1);

    // the preludes, then the sandbox
    lua_pushcfunction(L, traceback, "traceback");
    const int handler = lua_gettop(L);
    int hooks = 0;
    bool ok = true;
    for (const Chunk & c : preludes) {
        const std::string bytecode = Luau::compile(c.source, compile_options());
        if (luau_load(L, ("=" + c.name).c_str(), bytecode.data(), bytecode.size(), 0) != 0) {
            error = std::string(c.name) + " did not load: " + lua_tostring(L, -1);
            lua_pop(L, 1);
            ok = false;
            break;
        }
        push_oa(L, options);
        if (lua_pcall(L, 1, 1, handler) != 0) {
            error = std::string(c.name) + " failed: " + (lua_tostring(L, -1) ? lua_tostring(L, -1) : "?");
            lua_pop(L, 1);
            ok = false;
            break;
        }
        if (lua_istable(L, -1)) {
            if (hooks) lua_remove(L, hooks);
            hooks = lua_gettop(L);
        } else {
            lua_pop(L, 1);
        }
    }

    std::vector<std::string> chunks;  // what each script's errors are reported as
    if (ok) {
        luaL_sandbox(L);
        int run_hook = 0;
        if (hooks) {
            lua_getfield(L, hooks, "run");
            if (lua_isfunction(L, -1)) run_hook = lua_gettop(L);
            else lua_pop(L, 1);
        }
        // every script in its own thread with its own globals, over the shared read-only ones
        std::vector<lua_State *> threads;
        for (size_t i = 0; i < scripts.size() && ok; i++) {
            const Chunk & sc = scripts[i];
            lua_State * T = lua_newthread(L);  // stays on L's stack, so it is not collected
            luaL_sandboxthread(T);
            // _G is the script's own globals, as in Lua; a prelude's env hook may change that
            lua_pushvalue(T, LUA_GLOBALSINDEX);
            lua_setglobal(T, "_G");
            std::string chunk = sc.name.empty() ? "script" : sc.name;
            if (hooks) {
                lua_getfield(L, hooks, "env");
                if (lua_isfunction(L, -1)) {
                    lua_pushlstring(L, sc.source.data(), sc.source.size());
                    lua_pushinteger(L, (int) i + 1);
                    lua_pushstring(L, chunk.c_str());
                    if (lua_pcall(L, 3, 2, handler) != 0) {
                        error = std::string("the test place did not start: ") + lua_tostring(L, -1);
                        lua_pop(L, 1);
                        ok = false;
                        break;
                    }
                    if (lua_isstring(L, -1)) chunk = lua_tostring(L, -1);
                    lua_pop(L, 1);
                    if (lua_istable(L, -1)) {
                        lua_pushnil(L);
                        while (lua_next(L, -2) != 0) {
                            lua_pushvalue(L, -2);
                            lua_insert(L, -2);
                            lua_xmove(L, T, 2);
                            lua_rawset(T, LUA_GLOBALSINDEX);
                        }
                    }
                }
                lua_pop(L, 1);
            }
            chunks.push_back(chunk);
            const std::string bytecode = Luau::compile(sc.source, compile_options());
            if (luau_load(T, ("=" + chunk).c_str(), bytecode.data(), bytecode.size(), 0) != 0) {
                // a syntax error: this script does not run
                const std::string msg = lua_tostring(T, -1) ? lua_tostring(T, -1) : "syntax error";
                lua_pop(T, 1);
                result["syntax"] = true;
                if (run_hook) {
                    add_line(&r, "err", msg, 0);
                    threads.push_back(nullptr);
                    continue;
                }
                error = msg;
                ok = false;
                break;
            }
            threads.push_back(T);
        }

        if (ok && run_hook) {
            // the scheduler gets every script's main function (false for one that did not compile)
            lua_pushvalue(L, run_hook);
            lua_createtable(L, (int) threads.size(), 0);
            for (size_t i = 0; i < threads.size(); i++) {
                if (threads[i]) lua_xmove(threads[i], L, 1);
                else lua_pushboolean(L, false);
                lua_rawseti(L, -2, (int) i + 1);
            }
            if (lua_pcall(L, 1, 2, handler) != 0) {
                error = lua_tostring(L, -1) ? lua_tostring(L, -1) : "error";
                lua_pop(L, 1);
                ok = false;
            } else {
                if (lua_isnumber(L, -2)) game_time = lua_tonumber(L, -2);
                if (lua_isstring(L, -1)) game_stop = lua_tostring(L, -1);
                lua_pop(L, 2);
            }
        } else if (ok) {
            // plain Lua: one after the other, until one fails
            for (lua_State * T : threads) {
                const int status = lua_resume(T, nullptr, 0);
                if (status == LUA_YIELD) {
                    error = "the script yielded outside a coroutine (coroutine.yield at the top level)";
                    ok = false;
                } else if (status != LUA_OK) {
                    const char * msg = lua_tostring(T, -1);
                    if (msg && strcmp(msg, EXIT_MARK) == 0) break;  // os.exit(): a normal end
                    error = msg ? msg : (std::string("(error object is a ") + luaL_typename(T, -1) + " value)");
                    const char * trace = lua_debugtrace(T);
                    if (trace && *trace) error += std::string("\n") + trace;
                    ok = false;
                }
                if (!ok) break;
            }
        }
    }
    flush_pending(&r);

    if (!ok && error.find(EXIT_MARK) != std::string::npos) {
        ok = true;
        error.clear();
    }
    if (r.stop == MEMORY) error = "stopped: the script used more than " + std::to_string(options.memory_bytes >> 20) + " MB of memory";
    else if (r.stop != NONE) error = stop_message(r.stop);
    int error_script = -1;
    auto locate = [&](const std::string & msg) {
        for (size_t i = 0; i < chunks.size() && error_line == 0; i++) {
            if ((error_line = line_in(msg, chunks[i])) > 0) error_script = (int) i;
        }
    };
    if (!error.empty() && r.stop == NONE) {
        error = script_lines_only(error, chunks);
        locate(error);
    }
    const double ms = std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - r.start).count();
    lua_close(L);

    json lines = json::array();
    for (const Line & l : r.lines) {
        json j = {{"k", l.kind}, {"t", l.text}};
        if (l.t >= 0) j["s"] = l.t;
        lines.push_back(std::move(j));
    }
    // errors the scheduler reported from the scripts' threads point at lines too
    for (const Line & l : r.lines) {
        if (error_line > 0) break;
        if (l.kind == "err") locate(l.text);
    }
    result["ok"] = ok && error.empty() && r.errors == 0 && r.stop == NONE;
    result["lines"] = std::move(lines);
    if (!error.empty()) result["error"] = error;
    if (error_line > 0) {
        result["error_line"] = error_line;
        result["error_script"] = error_script;
    }
    result["scripts"] = chunks;
    if (r.stop != NONE) result["stopped"] = stop_name(r.stop);
    else if (!game_stop.empty()) result["stopped"] = game_stop;
    result["ms"] = ms;
    if (game_time >= 0) result["game_time"] = game_time;
    result["errors"] = r.errors + (error.empty() ? 0 : 1);
    return result.dump(-1, ' ', false, json::error_handler_t::replace);
}

}  // namespace oa::lua
