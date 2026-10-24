// Lua tools: runs and checks Lua code on the phone, with Luau (Roblox's Lua, which also runs
// most Lua 5.1 code). Nothing here touches llama.cpp; it is its own library (libluatools.so).
#pragma once

#include <string>
#include <utility>
#include <vector>

namespace oa::lua {

/** A script, or a prelude run before the scripts with the "oa" helper table as its argument (see lua_tools.cpp). */
struct Chunk {
    std::string name;    // what its errors are reported as: "script:12: ...", "RobloxTestPlace:40: ..."
    std::string source;
};

struct RunOptions {
    int time_ms = 5000;                // real time the script may take
    size_t memory_bytes = 64u << 20;
    size_t max_lines = 2000;           // output lines before the script is stopped
    size_t max_bytes = 256u << 10;
    std::vector<std::pair<std::string, double>> settings;  // oa.settings for the preludes (game time limit and the like)
};

/**
 * Runs [scripts] in a fresh, sandboxed Luau state (no files, no network, no OS) after the
 * [preludes]; each script has its own globals. Plain Lua runs them one after the other; a
 * prelude with a run hook (the Roblox test place) runs them together. Returns JSON:
 * {"ok", "lines": [{"k": "out"|"warn"|"err"|"info", "t": text, "s": game seconds}], "error",
 * "error_line", "error_script" (0-based), "scripts" (their names in errors), "stopped":
 * "time"|"memory"|"output"|"user"|"game_time"|"idle", "ms", "game_time", "errors", "syntax"}.
 */
std::string run(const std::vector<Chunk> & scripts, const std::vector<Chunk> & preludes, const RunOptions & options);

/** From any thread: the running script stops at its next safepoint. */
void stop();

/**
 * Checks [source] without running it (lua_check.cpp): syntax errors, type errors and lint
 * warnings. [env]: "lua", "roblox" (Roblox's globals are known) or "mod" (globals nobody
 * defines are taken for the game's and listed, not reported). Returns JSON: {"ok", "errors",
 * "syntax_ok", "problems": [{"line", "col", "end_line", "end_col", "severity": "error"|"warning",
 * "code", "message"}], "game_globals"}.
 */
std::string check(const std::string & source, const std::string & chunkname, const std::string & env);

}  // namespace oa::lua
