package app.offlineai.chat.lua

import android.content.Context
import org.json.JSONObject
import java.io.File
import java.util.UUID

/** A script kept in the Lua editor. */
class SavedScript(
    val id: String = UUID.randomUUID().toString(),
    var name: String,
    var env: LuaEnv,
    var source: String,
    var updatedAt: Long = System.currentTimeMillis(),
) {
    fun toJson(): JSONObject = JSONObject().put("id", id).put("name", name).put("env", env.name).put("source", source)
        .put("updated_at", updatedAt)

    /** A file name for it: "Leaderstats.luau" for Roblox, "fizzbuzz.lua" for the rest. */
    fun fileName(): String {
        val base = name.replace(Regex("[^A-Za-z0-9_. -]"), "_").trim().ifEmpty { "script" }
        val ext = if (env == LuaEnv.ROBLOX) ".luau" else ".lua"
        return if (base.endsWith(".lua") || base.endsWith(".luau")) base else base + ext
    }

    companion object {
        fun fromJson(j: JSONObject) = SavedScript(
            id = j.getString("id"),
            name = j.optString("name", "Script"),
            env = runCatching { LuaEnv.valueOf(j.optString("env", "LUA")) }.getOrDefault(LuaEnv.LUA),
            source = j.optString("source"),
            updatedAt = j.optLong("updated_at"),
        )

        /** A name from a script's first comment ("-- ServerScriptService/Leaderstats" gives Leaderstats). */
        fun nameFrom(source: String): String? {
            val first = source.lineSequence().firstOrNull { it.isNotBlank() }?.trim() ?: return null
            if (!first.startsWith("--")) return null
            val c = first.trimStart('-', '[', ' ').trim()
            val path = Regex("([A-Za-z_][\\w.]*(?:[/.>][\\s]*[A-Za-z_][\\w]*)+)").find(c)?.value
            val last = path?.split('/', '.', '>')?.map { it.trim() }?.filter { it.isNotEmpty() && it !in setOf("lua", "luau", "server", "client") }?.lastOrNull()
            return (last ?: c.take(40)).takeIf { it.isNotBlank() }
        }
    }
}

/** The Lua editor's scripts, one JSON file each in the app's private storage. */
class ScriptStore(context: Context) {
    private val dir = File(context.filesDir, "scripts").apply { mkdirs() }

    fun list(): List<SavedScript> = (dir.listFiles { f -> f.name.endsWith(".json") } ?: emptyArray()).mapNotNull { f ->
        runCatching { SavedScript.fromJson(JSONObject(f.readText())) }.getOrNull()
    }.sortedByDescending { it.updatedAt }

    fun load(id: String): SavedScript? = runCatching { SavedScript.fromJson(JSONObject(File(dir, "$id.json").readText())) }.getOrNull()

    fun save(s: SavedScript) {
        s.updatedAt = System.currentTimeMillis()
        try {
            val tmp = File(dir, "${s.id}.json.tmp")
            tmp.writeText(s.toJson().toString())
            if (!tmp.renameTo(File(dir, "${s.id}.json"))) tmp.delete()
        } catch (e: Exception) {
            // storage full: the script is still in the editor
        }
    }

    fun delete(id: String) {
        File(dir, "$id.json").delete()
    }

    /** A name not taken yet: "Script", "Script 2"... */
    fun freshName(base: String): String {
        val taken = list().map { it.name }.toSet()
        if (base !in taken) return base
        var i = 2
        while ("$base $i" in taken) i++
        return "$base $i"
    }
}
