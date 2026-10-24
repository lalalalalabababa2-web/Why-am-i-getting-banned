package app.offlineai.chat.data

import app.offlineai.chat.lua.LuaEnv

/**
 * What a chat is for. A coding mode adds instructions to the system prompt so the model writes
 * code the way that platform needs it, and decides where the chat's Lua code runs.
 */
enum class ChatMode(val label: String, val chip: String, val about: String, val hint: String, val env: LuaEnv?, val prompt: String) {
    GENERAL("Chat", "Chat", "", "Message", null, ""),

    ROBLOX(
        "Roblox", "Roblox game",
        "Luau for Roblox Studio. Run the scripts here in a test place with a test player: no physics or graphics, " +
            "but most of the API, in game time.",
        "Ask about your Roblox game",
        LuaEnv.ROBLOX,
        """
        You are an expert Roblox game developer. Write Luau for Roblox Studio.
        - Get services with game:GetService("..."). Use task.wait, task.spawn and task.delay, not wait, spawn or delay.
        - Put each script in its own ```lua code block. Its first line is a comment saying what it is and where it goes, for example "-- Script in ServerScriptService/RoundSystem", "-- LocalScript in StarterPlayerScripts/Controls" or "-- ModuleScript in ReplicatedStorage/Config".
        - Keep game logic, data and rewards on the server. The client only asks through RemoteEvents, and the server checks every request; never trust values sent by the client.
        - Create the RemoteEvents in a server script (or say exactly where to put them); client scripts get them with :WaitForChild.
        - Wrap DataStore calls in pcall, and save when a player leaves and in game:BindToClose.
        - Use real Roblox API names only. Say briefly what to put where in Studio, then give complete scripts.
        """.trimIndent(),
    ),

    MODS(
        "Lua mods", "Lua mod",
        "Mods for games that use Lua: Garry's Mod, LÖVE and Balatro, Factorio, World of Warcraft, Luanti, " +
            "Project Zomboid and more. Run checks the Lua itself; the game's own functions are not here.",
        "Which game is the mod for?",
        LuaEnv.MOD,
        """
        You help make mods for games that use Lua. Work out which game and mod loader it is for (ask if it is not clear) and use that game's real modding API; never invent functions.
        - Use the game's Lua version. Most (Garry's Mod, LÖVE, World of Warcraft, Don't Starve, Teardown, Project Zomboid) use Lua 5.1 or LuaJIT: no integer division //, no & | ~ operators, no goto outside LuaJIT. Factorio uses Lua 5.2.
        - Give every file the mod needs, each in its own ```lua block (or the right language for manifests) with its path as a comment on the first line, for example "-- lua/autorun/server/myaddon.lua", "-- control.lua" or "-- MyAddon/MyAddon.lua". Include the manifest the game needs (addon.json, info.json, .toc, modinfo.lua, mod.txt).
        - Say where the files go and how to turn the mod on in the game.
        - Write each file complete, never "rest of the code here".
        """.trimIndent(),
    ),

    LUA(
        "Lua", "Lua script",
        "Plain Lua that runs right here: print works; there are no files, network or require.",
        "Ask for some Lua",
        LuaEnv.LUA,
        """
        You write Lua. Unless asked for another version, write Lua 5.1 compatible code (it also runs in LuaJIT and Luau). Give complete, runnable code in ```lua blocks.
        The code can be run on this phone in a sandbox where print and io.write work but there are no files, no network and no require, so keep examples in one script and print their results.
        """.trimIndent(),
    ),
    ;

    companion object {
        fun of(name: String?): ChatMode = values().firstOrNull { it.name == name } ?: GENERAL
    }
}
