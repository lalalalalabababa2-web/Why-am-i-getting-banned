package app.offlineai.chat.data

import android.content.Context
import org.json.JSONArray

/**
 * What Nyx remembers about you across chats: short notes you add yourself (Settings, Memory) or
 * from a message (Remember this). They go into every chat's system prompt, so every model sees
 * them; they stay on the phone like everything else.
 */
class MemoryStore(context: Context) {
    private val prefs = context.getSharedPreferences("memory", Context.MODE_PRIVATE)

    var enabled: Boolean
        get() = prefs.getBoolean("enabled", true)
        set(v) = prefs.edit().putBoolean("enabled", v).apply()

    fun list(): List<String> = try {
        val a = JSONArray(prefs.getString("notes", "[]"))
        (0 until a.length()).map { a.getString(it) }
    } catch (e: Exception) {
        emptyList()
    }

    private fun store(notes: List<String>) {
        prefs.edit().putString("notes", JSONArray(notes).toString()).apply()
    }

    /** Adds a note (trimmed, at most [MAX_CHARS]); false if it is empty or already there. */
    fun add(note: String): Boolean {
        val n = note.trim().replace(Regex("\\s+"), " ").let { if (it.length > MAX_CHARS) it.take(MAX_CHARS - 1) + "…" else it }
        if (n.isEmpty()) return false
        val all = list()
        if (all.any { it.equals(n, ignoreCase = true) }) return false
        store((all + n).takeLast(MAX_NOTES))
        return true
    }

    fun remove(index: Int) {
        val all = list().toMutableList()
        if (index in all.indices) {
            all.removeAt(index)
            store(all)
        }
    }

    fun clear() = store(emptyList())

    /** The part of the system prompt the notes make, or "" when there is nothing to add. */
    fun prompt(): String {
        if (!enabled) return ""
        val notes = list()
        if (notes.isEmpty()) return ""
        return "What you know about the person you are talking with (they asked you to remember it; use it when it " +
            "helps, without repeating it back unprompted):\n" + notes.joinToString("\n") { "- $it" }
    }

    companion object {
        const val MAX_CHARS = 300
        /** Every note is read with every message: a long list costs time on each reply. */
        const val MAX_NOTES = 40
    }
}
