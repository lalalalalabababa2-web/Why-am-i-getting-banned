package app.offlineai.chat.lua

import android.content.Context
import android.os.Handler
import android.os.Looper
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.Executors

/** Where Lua code runs: plain Lua, Roblox's test place, or plain Lua for a game mod (its game's API is not here). */
enum class LuaEnv(val label: String, val key: String) {
    LUA("Lua", "lua"),
    ROBLOX("Roblox test place", "roblox"),
    MOD("Lua (game mod)", "mod"),
}

data class LuaScript(val name: String, val source: String)

data class OutputLine(val kind: String, val text: String, val seconds: Double?)

/** What a run printed and how it ended (app/src/main/cpp/lua_tools.h describes the fields). */
class RunResult(
    val ok: Boolean,
    val lines: List<OutputLine>,
    val error: String,
    val errorLine: Int,
    val errorScript: Int,
    val scripts: List<String>,
    val stopped: String,
    val ms: Double,
    val gameTime: Double,
    val errors: Int,
    val syntax: Boolean,
) {
    /** Something the AI could fix: an error, a stop for time or memory. */
    val failed: Boolean get() = errors > 0 || stopped == "time" || stopped == "memory"

    companion object {
        fun fromJson(s: String): RunResult {
            val j = JSONObject(s)
            val arr = j.optJSONArray("lines") ?: JSONArray()
            val lines = (0 until arr.length()).map {
                val l = arr.getJSONObject(it)
                OutputLine(l.optString("k", "out"), l.optString("t"), if (l.has("s")) l.optDouble("s") else null)
            }
            val names = j.optJSONArray("scripts") ?: JSONArray()
            return RunResult(
                ok = j.optBoolean("ok"),
                lines = lines,
                error = j.optString("error"),
                errorLine = j.optInt("error_line", 0),
                errorScript = j.optInt("error_script", -1),
                scripts = (0 until names.length()).map { names.getString(it) },
                stopped = j.optString("stopped"),
                ms = j.optDouble("ms", 0.0),
                gameTime = j.optDouble("game_time", -1.0),
                errors = j.optInt("errors", 0),
                syntax = j.optBoolean("syntax"),
            )
        }

        fun failure(message: String) = RunResult(false, emptyList(), message, 0, -1, emptyList(), "", 0.0, -1.0, 1, false)
    }
}

data class Problem(val line: Int, val col: Int, val severity: String, val code: String, val message: String)

class CheckResult(val ok: Boolean, val errors: Int, val problems: List<Problem>, val gameGlobals: List<String>) {
    companion object {
        fun fromJson(s: String): CheckResult {
            val j = JSONObject(s)
            val arr = j.optJSONArray("problems") ?: JSONArray()
            val problems = (0 until arr.length()).map {
                val p = arr.getJSONObject(it)
                Problem(p.optInt("line", 1), p.optInt("col", 1), p.optString("severity", "error"), p.optString("code"), p.optString("message"))
            }
            val g = j.optJSONArray("game_globals") ?: JSONArray()
            return CheckResult(j.optBoolean("ok"), j.optInt("errors"), problems, (0 until g.length()).map { g.getString(it) })
        }
    }
}

class RunOptions(
    val timeMs: Int = 5000,
    val gameSeconds: Int = 60,
    val autoplay: Boolean = true,
)

/**
 * Runs and checks Lua code on the phone with Luau, Roblox's Lua (app/src/main/cpp/lua_tools.cpp):
 * a fresh sandbox for every run, no files or network, limits on time, memory and output. Runs
 * happen one at a time on a thread of their own; results come back on the main thread.
 */
object LuaTools {
    private var loadError: String? = null
    private var loaded = false
    private val main = Handler(Looper.getMainLooper())

    // Luau's parser and checker recurse: a thread with room for that
    private val worker = Executors.newSingleThreadExecutor { r -> Thread(null, r, "lua", 16L shl 20) }
    private val preludes = HashMap<String, String>()

    @Volatile
    var busy = false
        private set

    @Synchronized
    private fun ensureLoaded(): String? {
        if (loaded) return null
        if (loadError != null) return loadError
        return try {
            System.loadLibrary("luatools")
            loaded = true
            null
        } catch (t: Throwable) {
            loadError = "The Lua tools could not start on this phone: ${t.message ?: t}"
            loadError
        }
    }

    private fun prelude(context: Context, name: String): String = synchronized(preludes) {
        preludes.getOrPut(name) { context.assets.open("lua/$name.luau").bufferedReader().use { it.readText() } }
    }

    /** Languages from a code fence that are Lua or Luau. */
    fun isLua(lang: String): Boolean = lang.lowercase().trim() in LUA_LANGS

    /** Code that uses Roblox's API (models often label Roblox code plain "lua"). */
    fun looksRoblox(code: String): Boolean = ROBLOX_HINTS.any { code.contains(it) }

    /** Where a code block runs: the chat's kind, else what the code itself looks like. */
    fun envFor(lang: String, code: String, chatEnv: LuaEnv?): LuaEnv = when {
        chatEnv == LuaEnv.ROBLOX -> LuaEnv.ROBLOX
        looksRoblox(code) -> LuaEnv.ROBLOX
        chatEnv == LuaEnv.MOD -> LuaEnv.MOD
        lang.lowercase().trim() in setOf("luau", "rbxlua", "roblox") -> LuaEnv.ROBLOX
        else -> LuaEnv.LUA
    }

    /** The request run() sends to the native side (also what the on-device tests check). */
    internal fun request(context: Context, scripts: List<LuaScript>, env: LuaEnv, options: RunOptions): JSONObject {
        val pre = JSONArray()
        val name = if (env == LuaEnv.ROBLOX) "roblox" else "base"
        pre.put(JSONObject().put("name", if (env == LuaEnv.ROBLOX) "RobloxTestPlace" else "Lua").put("source", prelude(context, name)))
        val arr = JSONArray()
        for (s in scripts) arr.put(JSONObject().put("name", s.name).put("source", s.source))
        return JSONObject()
            .put("scripts", arr)
            .put("preludes", pre)
            .put("time_ms", options.timeMs)
            .put("memory_mb", 64)
            .put("settings", JSONObject().put("game_seconds", options.gameSeconds).put("autoplay", options.autoplay))
    }

    fun run(context: Context, scripts: List<LuaScript>, env: LuaEnv, options: RunOptions, onDone: (RunResult) -> Unit) {
        val app = context.applicationContext
        busy = true
        worker.execute {
            val result = ensureLoaded()?.let { RunResult.failure(it) } ?: try {
                val req = request(app, scripts, env, options)
                RunResult.fromJson(String(nativeRun(req.toString().toByteArray()), Charsets.UTF_8))
            } catch (t: Throwable) {
                RunResult.failure("The run failed: ${t.message ?: t}")
            }
            main.post {
                busy = false
                onDone(result)
            }
        }
    }

    /** Runs on the calling thread (for the tests). */
    internal fun runNow(context: Context, scripts: List<LuaScript>, env: LuaEnv, options: RunOptions): RunResult {
        ensureLoaded()?.let { return RunResult.failure(it) }
        return RunResult.fromJson(String(nativeRun(request(context, scripts, env, options).toString().toByteArray()), Charsets.UTF_8))
    }

    fun check(source: String, env: LuaEnv, onDone: (CheckResult) -> Unit) {
        busy = true
        worker.execute {
            val result = ensureLoaded()?.let { CheckResult(false, 1, listOf(Problem(1, 1, "error", "Tools", it)), emptyList()) } ?: try {
                checkNow(source, env)
            } catch (t: Throwable) {
                CheckResult(false, 1, listOf(Problem(1, 1, "error", "Tools", "The check failed: ${t.message ?: t}")), emptyList())
            }
            main.post {
                busy = false
                onDone(result)
            }
        }
    }

    internal fun checkNow(source: String, env: LuaEnv): CheckResult {
        ensureLoaded()?.let { return CheckResult(false, 1, listOf(Problem(1, 1, "error", "Tools", it)), emptyList()) }
        return CheckResult.fromJson(String(nativeCheck(source.toByteArray(), "script".toByteArray(), env.key.toByteArray()), Charsets.UTF_8))
    }

    /** The running script stops at its next step. */
    fun stop() {
        if (loaded) nativeStop()
    }

    private val LUA_LANGS = setOf("lua", "luau", "rbxlua", "roblox", "glua", "luajit", "lua5.1", "lua51", "lua5.2", "lua5.3", "lua5.4", "pico8", "love")
    private val ROBLOX_HINTS = listOf(
        "game:GetService", "Instance.new(", "workspace.", "workspace:", "script.Parent", "game.Players", "game.Workspace",
        "game.ReplicatedStorage", ":WaitForChild(", "Vector3.new", "CFrame.new", "task.wait", "Enum.KeyCode", "leaderstats",
    )

    @JvmStatic private external fun nativeRun(request: ByteArray): ByteArray
    @JvmStatic private external fun nativeStop()
    @JvmStatic private external fun nativeCheck(source: ByteArray, chunk: ByteArray, env: ByteArray): ByteArray
}
