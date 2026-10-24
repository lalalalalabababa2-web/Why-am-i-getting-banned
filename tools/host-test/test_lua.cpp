// Host tests for the Lua tools (app/src/main/cpp/lua_tools.cpp, lua_check.cpp) and the Roblox
// test place (app/src/main/assets/lua/roblox.luau), run on a desktop by lua.sh.
//
// Plain Lua: output, loadstring, errors and their lines, and the limits (time, memory,
// output, a stop from another thread). The test place: game scripts as models write them, run
// alone and together (a Script, a LocalScript and a ModuleScript talking through a
// RemoteEvent), with the test player joining, touching parts and clicking buttons, and the
// mistakes it has to catch the way Roblox does. The checker: errors, lints, game globals.
#include "lua_tools.h"

#include <nlohmann/json.hpp>

#include <chrono>
#include <cstdio>
#include <fstream>
#include <sstream>
#include <string>
#include <thread>
#include <vector>

using json = nlohmann::json;

static int g_failures = 0;
#define CHECK(cond, ...)                                                \
    do {                                                                \
        if (!(cond)) {                                                  \
            std::fprintf(stderr, "  FAIL %s:%d: ", __FILE__, __LINE__); \
            std::fprintf(stderr, __VA_ARGS__);                          \
            std::fprintf(stderr, "\n");                                 \
            g_failures++;                                               \
        }                                                               \
    } while (0)

static std::string g_assets;

static std::string read_file(const std::string & path) {
    std::ifstream f(path);
    std::stringstream s;
    s << f.rdbuf();
    return s.str();
}

static json run(const std::vector<std::string> & sources, bool roblox, double game_seconds = 60, int time_ms = 5000,
                size_t memory_mb = 64) {
    std::vector<oa::lua::Chunk> scripts;
    for (const auto & s : sources) scripts.push_back({"script", s});
    std::vector<oa::lua::Chunk> pre;
    if (roblox) pre.push_back({"RobloxTestPlace", read_file(g_assets + "/roblox.luau")});
    else pre.push_back({"Lua", read_file(g_assets + "/base.luau")});
    oa::lua::RunOptions o;
    o.time_ms = time_ms;
    o.memory_bytes = memory_mb << 20;
    o.settings = {{"game_seconds", game_seconds}, {"autoplay", 1}};
    return json::parse(oa::lua::run(scripts, pre, o));
}

static json run1(const std::string & src, bool roblox, double game_seconds = 60) {
    return run(std::vector<std::string>{src}, roblox, game_seconds);
}

/** The output, one line per entry, for failure messages. */
static std::string dump(const json & r) {
    std::string s;
    for (const auto & l : r["lines"]) s += "    [" + l["k"].get<std::string>() + "] " + l["t"].get<std::string>() + "\n";
    if (r.contains("error")) s += "    error: " + r["error"].get<std::string>() + "\n";
    return s;
}

/** Whether a line of [kind] ("" for any) contains [text]. */
static bool has(const json & r, const std::string & kind, const std::string & text) {
    for (const auto & l : r["lines"]) {
        if ((kind.empty() || l["k"] == kind) && l["t"].get<std::string>().find(text) != std::string::npos) return true;
    }
    return false;
}

/** The game time of the first line containing [text], or -1. */
static double at(const json & r, const std::string & text) {
    for (const auto & l : r["lines"]) {
        if (l["t"].get<std::string>().find(text) != std::string::npos) return l.value("s", -1.0);
    }
    return -1;
}

static void test_plain() {
    std::printf("plain Lua\n");
    json r = run1(R"(
print("hello", 1, nil, true)
io.write("a", "b") io.write("c\n")
local f = loadstring("x = 5 return x * 2")
print(f(), x)
print(bit.band(-1, 0xFF), bit.tohex(255), math.pow(2, 10), table.getn({1, 2, 3}))
local t = setmetatable({}, {__tostring = function() return "T!" end})
print(t, select("#", 1, 2, 3), ("x"):rep(3))
)", false);
    CHECK(r["ok"] == true, "a plain script failed:\n%s", dump(r).c_str());
    CHECK(has(r, "out", "hello\t1\tnil\ttrue"), "print joins with tabs:\n%s", dump(r).c_str());
    CHECK(has(r, "out", "abc"), "io.write pieces make one line:\n%s", dump(r).c_str());
    CHECK(has(r, "out", "10\t5"), "loadstring sees and sets the script's globals:\n%s", dump(r).c_str());
    CHECK(has(r, "out", "255\t000000ff\t1024\t3"), "Lua 5.1 and LuaJIT names:\n%s", dump(r).c_str());
    CHECK(has(r, "out", "T!\t3\txxx"), "__tostring and the string library:\n%s", dump(r).c_str());

    r = run1("local a = 1\nlocal function f(t)\n  return t.field.x\nend\nf({})\n", false);
    CHECK(r["ok"] == false && r.value("error_line", 0) == 3, "an error points at its line:\n%s", dump(r).c_str());
    CHECK(r["error"].get<std::string>().find("attempt to index nil") != std::string::npos, "Luau's own message:\n%s", dump(r).c_str());

    r = run1("local x = = 1\n", false);
    CHECK(r.value("syntax", false) && r.value("error_line", 0) == 1, "a syntax error says so:\n%s", dump(r).c_str());

    r = run1("print('a') os.exit() print('b')\n", false);
    CHECK(r["ok"] == true && has(r, "out", "a") && !has(r, "out", "b"), "os.exit ends the script quietly:\n%s", dump(r).c_str());

    // the limits
    auto t0 = std::chrono::steady_clock::now();
    r = run({"while true do pcall(function() while true do end end) end"}, false, 60, 400);
    double ms = std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - t0).count();
    CHECK(r["stopped"] == "time" && ms < 3000, "a loop is stopped at the time limit, pcall or not (%s, %.0f ms)", r.dump().c_str(), ms);

    r = run({"local t = {} for i = 1, 1e9 do t[i] = string.rep('x', 100) .. i end"}, false, 60, 20000, 16);
    CHECK(r["stopped"] == "memory", "a script that eats memory is stopped: %s", r.dump().c_str());

    r = run1("for i = 1, 1e6 do print(i) end", false);
    CHECK(r["stopped"] == "output" && r["lines"].size() <= 2001, "endless output is stopped: %zu lines", r["lines"].size());

    // a stop from another thread, as the app's Stop button does
    std::thread stopper([] {
        std::this_thread::sleep_for(std::chrono::milliseconds(200));
        oa::lua::stop();
    });
    r = run({"local n = 0 while true do n = n + 1 end"}, false, 60, 20000);
    stopper.join();
    CHECK(r["stopped"] == "user", "Stop stops a running script: %s", r.dump().c_str());

    r = run1("local f, err = io.open('x')\nprint(f, err, os.getenv('HOME'))", false);
    CHECK(r["ok"] == true && has(r, "out", "files are not available here"), "no files, no environment:\n%s", dump(r).c_str());
    r = run1("require('socket')", false);
    CHECK(r["ok"] == false && r["error"].get<std::string>().find("require is not available") != std::string::npos,
          "require says why it fails:\n%s", dump(r).c_str());
}

static void test_roblox_basics() {
    std::printf("Roblox test place: one script\n");
    json r = run1(R"(-- Script in ServerScriptService
local Players = game:GetService("Players")
Players.PlayerAdded:Connect(function(player)
	local leaderstats = Instance.new("Folder")
	leaderstats.Name = "leaderstats"
	leaderstats.Parent = player
	local coins = Instance.new("IntValue")
	coins.Name = "Coins"
	coins.Parent = leaderstats
	player.CharacterAdded:Connect(function(char)
		print(player.Name .. " spawned", char.Humanoid.Health)
	end)
	while player.Parent do
		task.wait(5)
		coins.Value += 10
	end
end)
print("started", workspace.Baseplate.Anchored, typeof(Vector3.new(1, 2, 3)), typeof(workspace))
)", true, 20);
    CHECK(r["ok"] == true, "the leaderstats script failed:\n%s", dump(r).c_str());
    CHECK(has(r, "out", "started true Vector3 Instance"), "print joins with spaces; typeof names Roblox's types:\n%s", dump(r).c_str());
    CHECK(has(r, "info", "Player1 joins") && has(r, "out", "Player1 spawned 100"), "the test player joins and spawns:\n%s", dump(r).c_str());
    CHECK(at(r, "Coins = 10") > 5.9 && at(r, "Coins = 10") < 6.1, "task.wait runs in game time:\n%s", dump(r).c_str());
    CHECK(r["stopped"] == "game_time" && r["scripts"][0] == "ServerScriptService.Script", "%s", r.dump().c_str());

    // the datatypes
    r = run1(R"(
local cf = CFrame.new(1, 2, 3) * CFrame.Angles(0, math.rad(90), 0)
local p = cf * Vector3.new(0, 0, -5)
print(math.round(p.X), p.Y, math.round(p.Z), math.round(cf.LookVector.X))
local back = cf:Inverse() * cf
print(back.Position.Magnitude < 1e-5)
print(Color3.fromRGB(255, 128, 0):ToHex(), UDim2.new(0.5, 10, 1, -20), Vector2.new(3, 4).Magnitude)
print(Enum.Material.Neon, Enum.KeyCode.E == Enum.KeyCode.E, Enum.Material.Neon.Name)
local H = game:GetService("HttpService")
local t = H:JSONDecode(H:JSONEncode({a = 1, list = {1, 2, 3}, s = "x\n"}))
print(t.a, #t.list, t.s == "x\n")
print(BrickColor.new("Really red").Name, Random.new(1):NextInteger(1, 1), NumberRange.new(2, 5).Max)
)", true, 5);
    CHECK(r["ok"] == true, "datatypes failed:\n%s", dump(r).c_str());
    CHECK(has(r, "out", "-4 2 3 -1"), "CFrame math (a point 5 studs ahead of a turned frame):\n%s", dump(r).c_str());
    CHECK(has(r, "out", "true"), "a CFrame times its inverse is the identity:\n%s", dump(r).c_str());
    CHECK(has(r, "out", "FF8000 {0.5, 10}, {1, -20} 5"), "Color3, UDim2, Vector2:\n%s", dump(r).c_str());
    CHECK(has(r, "out", "Enum.Material.Neon true Neon"), "Enum items:\n%s", dump(r).c_str());
    CHECK(has(r, "out", "1 3 true"), "JSON both ways:\n%s", dump(r).c_str());
    CHECK(has(r, "out", "Really red 1 5"), "BrickColor, Random, NumberRange:\n%s", dump(r).c_str());

    // properties of game and workspace read back what was set (Luau must not fold the chains)
    r = run1("workspace.Gravity = 50\ngame.Lighting.ClockTime = 20\nprint(workspace.Gravity, game.Lighting.TimeOfDay)\n", true, 3);
    CHECK(has(r, "out", "50 20:00:00"), "workspace.Gravity and game.Lighting after setting them:\n%s", dump(r).c_str());

    // tweens, frames and the time functions
    r = run1(R"(
local part = Instance.new("Part", workspace)
local tw = game:GetService("TweenService"):Create(part, TweenInfo.new(2), {Position = Vector3.new(0, 20, 0), Transparency = 1})
tw:Play()
tw.Completed:Wait()
print("tween", part.Position.Y, part.Transparency, math.floor(time()))
local frames = 0
local c
c = game:GetService("RunService").Heartbeat:Connect(function() frames += 1 if frames == 60 then c:Disconnect() end end)
task.wait(2)
print("frames", frames)
)", true, 10);
    CHECK(has(r, "out", "tween 20 1 2") && has(r, "out", "frames 60"), "tweens and Heartbeat in game time:\n%s", dump(r).c_str());
}

static void test_roblox_mistakes() {
    std::printf("Roblox test place: mistakes it catches\n");
    json r = run1("local p = Instance.new('Part')\np.Parent = workspace\nprint(p.Velocityy)\n", true, 5);
    CHECK(has(r, "err", "Velocityy is not a valid member of Part \"Workspace.Part\"") && r.value("error_line", 0) == 3,
          "a misspelt member, worded as Roblox does:\n%s", dump(r).c_str());
    CHECK(has(r, "info", "not all of it"), "and a note that the test place is not all of Roblox:\n%s", dump(r).c_str());

    r = run1("local p = Instance.new('Part', workspace)\np.CFrame = Vector3.new(0, 10, 0)\n", true, 5);
    CHECK(has(r, "err", "Unable to assign property CFrame. CFrame expected, got Vector3"), "a wrong type:\n%s", dump(r).c_str());

    r = run1("local p = Instance.new('Part', workspace)\np.Anchored = 'yes'\n", true, 5);
    CHECK(has(r, "err", "bool expected, got string"), "a string for a bool:\n%s", dump(r).c_str());

    r = run1("-- Script in ServerScriptService\nprint('server sees', game.Players.LocalPlayer)\n", true, 5);
    CHECK(has(r, "out", "server sees nil"), "LocalPlayer is nil on the server:\n%s", dump(r).c_str());

    r = run1("-- Script in ServerScriptService\nlocal e = Instance.new('RemoteEvent', game.ReplicatedStorage)\ne:FireServer()\n", true, 5);
    CHECK(has(r, "err", "FireServer can only be called from the client"), "a remote fired from the wrong side:\n%s", dump(r).c_str());

    r = run1("-- LocalScript in StarterPlayerScripts\nlocal s = game:GetService('DataStoreService'):GetDataStore('x')\n", true, 5);
    CHECK(has(r, "err", "DataStore can't be accessed from client"), "data stores from the client:\n%s", dump(r).c_str());

    r = run1("local ok, e = pcall(function() game:GetService('DataStoreService'):GetDataStore('d'):SetAsync('k', workspace) end)\nprint(ok, e)\n", true, 5);
    CHECK(has(r, "out", "Cannot store Instance in data store"), "an Instance in a data store:\n%s", dump(r).c_str());

    r = run1("local x = Instance.new('Partt')\n", true, 5);
    CHECK(has(r, "err", "Unable to create an Instance of type \"Partt\""), "a class that does not exist:\n%s", dump(r).c_str());

    r = run1("workspace:WaitForChild('Missing')\nprint('never')\n", true, 10);
    CHECK(has(r, "warn", "Infinite yield possible on 'Workspace:WaitForChild(\"Missing\")'") && !has(r, "out", "never"),
          "WaitForChild warns after 5 seconds:\n%s", dump(r).c_str());

    r = run1("game.Players.PlayerAdded:Connect(function(p) local n = nil print(n.Value) end)\nprint(require(1234))\n", true, 5);
    CHECK(has(r, "err", "require(1234)") && has(r, "err", "attempt to index nil with 'Value'") && has(r, "info", "Player1 joins"),
          "an error in a handler does not stop the place:\n%s", dump(r).c_str());

    r = run({"while true do end"}, true, 60, 500);
    CHECK(r["stopped"] == "time", "a loop that never waits is stopped in real time: %s", r.dump().c_str());

    r = run1("while true do task.wait(1) end", true, 15);
    CHECK(r["stopped"] == "game_time" && r["ok"] == true, "a loop that waits runs until the game time is up: %s", r.dump().c_str());
}

static void test_roblox_together() {
    std::printf("Roblox test place: scripts together\n");
    const std::string module = R"(-- ModuleScript in ReplicatedStorage/Modules/Config
local Config = {}
Config.Items = { Sword = 100 }
return Config
)";
    const std::string server = R"(-- Script in ServerScriptService
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage.Modules.Config)
local store = game:GetService("DataStoreService"):GetDataStore("PlayerData")
local buy = Instance.new("RemoteEvent")
buy.Name = "BuyItem"
buy.Parent = ReplicatedStorage
game.Players.PlayerAdded:Connect(function(player)
	local ls = Instance.new("Folder", player)
	ls.Name = "leaderstats"
	local cash = Instance.new("IntValue")
	cash.Name = "Cash"
	cash.Parent = ls
	local ok, data = pcall(function() return store:GetAsync("Player_" .. player.UserId) end)
	cash.Value = (ok and data and data.Cash) or 200
end)
buy.OnServerEvent:Connect(function(player, item)
	local price = Config.Items[item]
	local cash = player.leaderstats.Cash
	if price and cash.Value >= price then
		cash.Value -= price
		print("sold", item, "to", player.Name)
	end
end)
game.Players.PlayerRemoving:Connect(function(player)
	store:SetAsync("Player_" .. player.UserId, { Cash = player.leaderstats.Cash.Value })
end)
)";
    const std::string client = R"(-- LocalScript in StarterPlayerScripts
local UserInputService = game:GetService("UserInputService")
local buy = game.ReplicatedStorage:WaitForChild("BuyItem")
UserInputService.InputBegan:Connect(function(input, processed)
	if not processed and input.KeyCode == Enum.KeyCode.B then
		buy:FireServer("Sword")
	end
end)
print("client ready for", game.Players.LocalPlayer.Name)
)";
    json r = run({module, server, client}, true, 15);
    CHECK(r["ok"] == true, "three scripts together failed:\n%s", dump(r).c_str());
    CHECK(r["scripts"].size() == 3 && r["scripts"][0] == "ReplicatedStorage.Modules.Config" &&
              r["scripts"][2] == "Players.Player1.PlayerScripts.LocalScript",
          "each script where its first comment says: %s", r["scripts"].dump().c_str());
    CHECK(has(r, "out", "client ready for Player1"), "the LocalScript knows its player:\n%s", dump(r).c_str());
    CHECK(has(r, "info", "presses B") && has(r, "out", "sold Sword to Player1"),
          "the test player presses the key the script listens for; the remote reaches the server:\n%s", dump(r).c_str());
    CHECK(has(r, "info", "Cash = 100") && has(r, "info", "SetAsync(\"Player_1\", {\"Cash\":100})"),
          "the leaderboard changes and the data is saved on leaving:\n%s", dump(r).c_str());

    // things that sit in parts and buttons, found from script.Parent
    r = run1(R"(local part = script.Parent
part.Touched:Connect(function(hit)
	local humanoid = hit.Parent:FindFirstChild("Humanoid")
	if humanoid then
		humanoid.Health = 0
		print("killed", hit.Parent.Name)
	end
end)
)", true, 12);
    CHECK(r["scripts"][0] == "Workspace.Part.Script" && has(r, "out", "killed Player1") && has(r, "info", "Player1 dies") &&
              has(r, "info", "respawns"),
          "a kill brick kills the test player, who respawns:\n%s", dump(r).c_str());

    r = run1(R"(-- LocalScript in StarterGui/ShopGui/Frame/BuyButton
script.Parent.Activated:Connect(function()
	print("clicked", script.Parent.Name, script.Parent.ClassName)
end)
)", true, 10);
    CHECK(has(r, "out", "clicked BuyButton TextButton"), "a button script gets its button, and the button is clicked:\n%s", dump(r).c_str());

    r = run1(R"(local prompt = Instance.new("ProximityPrompt")
prompt.ActionText = "Open"
prompt.HoldDuration = 1
prompt.Parent = workspace.SpawnLocation
prompt.Triggered:Connect(function(player)
	local tool = Instance.new("Tool")
	Instance.new("Part", tool).Name = "Handle"
	tool.Parent = player.Backpack
	tool.Activated:Connect(function() print("swing") end)
	print("triggered by", player.Name)
end)
)", true, 10);
    CHECK(has(r, "out", "triggered by Player1") && has(r, "out", "swing"), "prompts are used and tools swung:\n%s", dump(r).c_str());

    r = run1(R"(-- Script inside the Sword tool (StarterPack/Sword)
local tool = script.Parent
local handle = tool:WaitForChild("Handle")
tool.Equipped:Connect(function() print("equipped by", tool.Parent.Name) end)
tool.Activated:Connect(function() print("swing with", handle.Name) end)
)", true, 10);
    CHECK(has(r, "out", "equipped by Player1") && has(r, "out", "swing with Handle"), "a tool script gets its tool, kept over spawning:\n%s", dump(r).c_str());

    // a long game: five minutes of 60 frames a second still takes little real time
    auto t0 = std::chrono::steady_clock::now();
    r = run1(R"(local t = 0
game:GetService("RunService").Heartbeat:Connect(function(dt) t += dt end)
task.wait(299)
print("frames for", math.floor(t + 0.5))
)", true, 300);
    double ms = std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - t0).count();
    CHECK(has(r, "out", "frames for 298") || has(r, "out", "frames for 299"), "five minutes of frames:\n%s", dump(r).c_str());
    std::printf("  five game minutes of Heartbeat in %.0f ms\n", ms);
}

static void test_check() {
    std::printf("checker\n");
    json c = json::parse(oa::lua::check(R"(local Players = game:GetService("Players")
local function onJoin(player)
	pirnt(player.Name)
	local x = "a" + 1
end
Players.PlayerAdded:Connect(onJoin)
string.format("%d %s", 1)
)", "script", "roblox"));
    auto has_problem = [&](int line, const std::string & text) {
        for (const auto & p : c["problems"]) {
            if (p["line"] == line && p["message"].get<std::string>().find(text) != std::string::npos) return true;
        }
        return false;
    };
    CHECK(has_problem(3, "Unknown global 'pirnt'"), "a misspelt global: %s", c.dump().c_str());
    CHECK(has_problem(4, "number"), "a type error: %s", c.dump().c_str());
    CHECK(has_problem(7, "Argument count mismatch"), "a format string's arguments: %s", c.dump().c_str());
    CHECK(!has_problem(1, "game"), "Roblox's globals are known: %s", c.dump().c_str());

    c = json::parse(oa::lua::check("hook.Add('Think', 'x', function() print(LocalPlayer():Nick()) end)\n", "script", "mod"));
    CHECK(c["ok"] == true && c["game_globals"].size() == 2, "a mod's game globals are listed, not reported: %s", c.dump().c_str());

    c = json::parse(oa::lua::check("local x = = 1\n", "script", "lua"));
    CHECK(c["syntax_ok"] == false && c["problems"][0]["line"] == 1, "a syntax error: %s", c.dump().c_str());

    c = json::parse(oa::lua::check("print(bit.band(1, 3), io.write)\n", "script", "lua"));
    CHECK(c["ok"] == true, "the plain-Lua extras are known: %s", c.dump().c_str());
}

int main(int argc, char ** argv) {
    if (argc < 2) {
        std::fprintf(stderr, "usage: %s <app/src/main/assets/lua>\n", argv[0]);
        return 2;
    }
    g_assets = argv[1];
    test_plain();
    test_roblox_basics();
    test_roblox_mistakes();
    test_roblox_together();
    test_check();
    std::printf("\n%s (%d failures)\n", g_failures ? "FAILED" : "ALL PASSED", g_failures);
    return g_failures ? 1 : 0;
}
