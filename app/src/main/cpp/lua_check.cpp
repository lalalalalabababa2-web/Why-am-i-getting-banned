// Checks Lua code without running it, with Luau's own analysis: syntax errors, type errors (in
// Luau's lenient nonstrict mode unless the script asks for --!strict) and lint warnings. The
// lints are the ones Roblox Studio's Script Analysis shows. The globals a game provides are
// known as `any`: Roblox's for Roblox scripts; for a mod, the game's API is unknown here, so the
// globals it uses are listed instead of reported.
#include "lua_tools.h"

#include "Luau/BuiltinDefinitions.h"
#include "Luau/Frontend.h"
#include "Luau/Linter.h"

#include <nlohmann/json.hpp>

#include <set>

using json = nlohmann::ordered_json;

namespace oa::lua {

namespace {

// what the Roblox test place (assets/lua/roblox.luau) and Roblox itself give every script
const char * const ROBLOX_GLOBALS[] = {
    "game", "Game", "workspace", "Workspace", "script", "plugin", "shared", "Instance", "Vector3", "Vector2", "CFrame",
    "Color3", "BrickColor", "UDim", "UDim2", "TweenInfo", "Enum", "NumberRange", "NumberSequence",
    "NumberSequenceKeypoint", "ColorSequence", "ColorSequenceKeypoint", "Rect", "Ray", "Region3", "Region3int16",
    "Vector3int16", "Vector2int16", "PhysicalProperties", "Font", "Random", "DateTime", "RaycastParams",
    "OverlapParams", "PathWaypoint", "Axes", "Faces", "CatalogSearchParams", "SharedTable", "task", "wait", "Wait",
    "spawn", "Spawn", "delay", "Delay", "tick", "time", "elapsedTime", "warn", "settings", "UserSettings", "stats",
    "version", "printidentity", "require", "ypcall", "DebuggerManager", "PluginManager", "collectgarbage",
};

// what Offline AI's plain Lua (assets/lua/base.luau) adds to Luau
const char * const LUA_GLOBALS[] = {"bit", "io", "arg", "collectgarbage", "loadstring", "load"};

struct OneFile : Luau::FileResolver {
    std::string name;
    std::string source;

    std::optional<Luau::SourceCode> readSource(const Luau::ModuleName & n) override {
        if (n != name) return std::nullopt;
        return Luau::SourceCode{source, Luau::SourceCode::Script};
    }

    std::optional<Luau::ModuleInfo> resolveModule(const Luau::ModuleInfo *, Luau::AstExpr *, const Luau::TypeCheckLimits &) override {
        return std::nullopt;  // one script on its own: what it requires is unknown
    }

    std::string getHumanReadableModuleName(const Luau::ModuleName & n) const override { return n; }
};

json problem(const Luau::Location & at, const char * severity, const std::string & code, const std::string & message) {
    return {
        {"line", at.begin.line + 1},
        {"col", at.begin.column + 1},
        {"end_line", at.end.line + 1},
        {"end_col", at.end.column + 1},
        {"severity", severity},
        {"code", code},
        {"message", message},
    };
}

}  // namespace

std::string check(const std::string & source, const std::string & chunkname, const std::string & env) {
    const bool roblox = env == "roblox";
    const bool mod = env == "mod";

    OneFile files;
    files.name = chunkname;
    files.source = source;

    Luau::NullConfigResolver configs;
    configs.defaultConfig.mode = Luau::Mode::Nonstrict;
    Luau::LintOptions & lint = configs.defaultConfig.enabledLint;
    lint.setDefaults();
    // as in Roblox Studio; unknown globals come from the type checker instead
    for (auto code : {Luau::LintWarning::Code_UnknownGlobal, Luau::LintWarning::Code_LocalShadow,
             Luau::LintWarning::Code_SameLineStatement, Luau::LintWarning::Code_LocalUnused,
             Luau::LintWarning::Code_FunctionUnused, Luau::LintWarning::Code_ImportUnused,
             Luau::LintWarning::Code_ImplicitReturn}) {
        lint.disableWarning(code);
    }
    if (roblox) {
        for (const char * g : ROBLOX_GLOBALS) configs.defaultConfig.globals.push_back(g);
    } else {
        for (const char * g : LUA_GLOBALS) configs.defaultConfig.globals.push_back(g);
    }

    Luau::FrontendOptions options;
    options.runLintChecks = true;
    options.moduleTimeLimitSec = 5.0;

    json problems = json::array();
    std::set<std::string> game_globals;
    bool syntax_ok = true;
    try {
        Luau::Frontend frontend(&files, &configs, options);
        Luau::registerBuiltinGlobals(frontend, frontend.globals);
        Luau::freeze(frontend.globals.globalTypes);
        Luau::CheckResult result = frontend.check(chunkname);

        for (const Luau::TypeError & e : result.errors) {
            if (const auto * se = Luau::get_if<Luau::SyntaxError>(&e.data)) {
                syntax_ok = false;
                problems.push_back(problem(e.location, "error", "SyntaxError", se->message));
                continue;
            }
            if (Luau::get_if<Luau::UnknownRequire>(&e.data)) continue;  // only this script is here
            if (const auto * us = Luau::get_if<Luau::UnknownSymbol>(&e.data)) {
                if (mod && us->context == Luau::UnknownSymbol::Binding) {
                    game_globals.insert(us->name);
                    continue;
                }
            }
            problems.push_back(problem(e.location, "error", "TypeError", Luau::toString(e)));
        }
        for (const Luau::LintWarning & w : result.lintResult.errors) {
            problems.push_back(problem(w.location, "error", Luau::LintWarning::getName(w.code), w.text));
        }
        for (const Luau::LintWarning & w : result.lintResult.warnings) {
            problems.push_back(problem(w.location, "warning", Luau::LintWarning::getName(w.code), w.text));
        }
    } catch (const std::exception & e) {
        // the analysis gave up (too complex, out of time): say so rather than nothing
        problems.push_back(problem(Luau::Location(), "warning", "Analysis", std::string("the check stopped: ") + e.what()));
    }

    std::stable_sort(problems.begin(), problems.end(), [](const json & a, const json & b) {
        return a["line"].get<int>() < b["line"].get<int>();
    });
    int errors = 0;
    for (const json & p : problems) {
        if (p["severity"] == "error") errors++;
    }
    json out = {{"ok", errors == 0}, {"syntax_ok", syntax_ok}, {"errors", errors}, {"problems", std::move(problems)}};
    if (!game_globals.empty()) out["game_globals"] = game_globals;
    return out.dump(-1, ' ', false, json::error_handler_t::replace);
}

}  // namespace oa::lua
