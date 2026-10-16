package app.offlineai.chat.data

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.UUID

class ChatMessage(
    val id: String = UUID.randomUUID().toString(),
    val role: String,               // user or assistant
    var content: String,
    var reasoning: String = "",
    var stats: String = "",
    var error: Boolean = false,
    var model: String = "",
    val createdAt: Long = System.currentTimeMillis(),
) {
    fun toJson(): JSONObject = JSONObject()
        .put("id", id).put("role", role).put("content", content).put("reasoning", reasoning)
        .put("stats", stats).put("error", error).put("model", model).put("created_at", createdAt)

    companion object {
        fun fromJson(j: JSONObject) = ChatMessage(
            id = j.optString("id", UUID.randomUUID().toString()),
            role = j.optString("role", "user"),
            content = j.optString("content"),
            reasoning = j.optString("reasoning"),
            stats = j.optString("stats"),
            error = j.optBoolean("error"),
            model = j.optString("model"),
            createdAt = j.optLong("created_at", System.currentTimeMillis()),
        )
    }
}

class Conversation(
    val id: String = UUID.randomUUID().toString(),
    var title: String = "",
    val createdAt: Long = System.currentTimeMillis(),
    var updatedAt: Long = System.currentTimeMillis(),
    val messages: MutableList<ChatMessage> = mutableListOf(),
) {
    fun toJson(): JSONObject {
        val arr = JSONArray()
        messages.forEach { arr.put(it.toJson()) }
        return JSONObject().put("id", id).put("title", title).put("created_at", createdAt)
            .put("updated_at", updatedAt).put("messages", arr)
    }

    companion object {
        fun fromJson(j: JSONObject): Conversation {
            val c = Conversation(
                id = j.getString("id"),
                title = j.optString("title"),
                createdAt = j.optLong("created_at"),
                updatedAt = j.optLong("updated_at"),
            )
            val arr = j.optJSONArray("messages") ?: JSONArray()
            for (i in 0 until arr.length()) c.messages.add(ChatMessage.fromJson(arr.getJSONObject(i)))
            return c
        }
    }
}

data class ChatSummary(val id: String, val title: String, val updatedAt: Long, val count: Int)

/** Conversations, one JSON file each, in the app's private storage. */
class ChatStore(context: Context) {
    private val dir = File(context.filesDir, "chats").apply { mkdirs() }

    fun save(c: Conversation) {
        if (c.messages.isEmpty()) return
        c.updatedAt = System.currentTimeMillis()
        val tmp = File(dir, "${c.id}.json.tmp")
        tmp.writeText(c.toJson().toString())
        tmp.renameTo(File(dir, "${c.id}.json"))
    }

    fun load(id: String): Conversation? = try {
        Conversation.fromJson(JSONObject(File(dir, "$id.json").readText()))
    } catch (e: Exception) {
        null
    }

    fun list(): List<ChatSummary> =
        (dir.listFiles { f -> f.name.endsWith(".json") } ?: emptyArray()).mapNotNull { f ->
            try {
                val j = JSONObject(f.readText())
                ChatSummary(j.getString("id"), j.optString("title"), j.optLong("updated_at"),
                    j.optJSONArray("messages")?.length() ?: 0)
            } catch (e: Exception) {
                null
            }
        }.sortedByDescending { it.updatedAt }

    fun delete(id: String) {
        File(dir, "$id.json").delete()
    }

    fun deleteAll() {
        dir.listFiles()?.forEach { it.delete() }
    }
}
