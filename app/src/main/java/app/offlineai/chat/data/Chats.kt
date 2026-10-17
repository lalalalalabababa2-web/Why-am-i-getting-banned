package app.offlineai.chat.data

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.UUID
import java.util.concurrent.Executors

/**
 * A picture, a sound or a video sent with a message, copied into the app's own storage. A video
 * is kept as a few frames (pictures), each with the time it was taken from.
 */
class Attachment(
    val kind: String,                       // "image", "video" or "audio"
    val files: List<String>,                // absolute paths; a video's frames in order
    val labels: List<String> = emptyList(), // per file: a video frame's time, e.g. "[0m4.0s]"
    val name: String = "",                  // what it was called on the phone
    val durationMs: Long = 0,
) {
    /** A picture to show for it: the picture itself, or a video's first frame. */
    val preview: String? get() = if (kind == "audio") null else files.firstOrNull()

    fun toJson(): JSONObject = JSONObject()
        .put("kind", kind).put("files", JSONArray(files)).put("labels", JSONArray(labels))
        .put("name", name).put("duration_ms", durationMs)

    companion object {
        fun fromJson(j: JSONObject): Attachment {
            val files = j.optJSONArray("files") ?: JSONArray()
            val labels = j.optJSONArray("labels") ?: JSONArray()
            return Attachment(
                kind = j.optString("kind", "image"),
                files = (0 until files.length()).map { files.getString(it) },
                labels = (0 until labels.length()).map { labels.getString(it) },
                name = j.optString("name"),
                durationMs = j.optLong("duration_ms"),
            )
        }
    }
}

class ChatMessage(
    val id: String = UUID.randomUUID().toString(),
    val role: String,               // user or assistant
    var content: String,
    var reasoning: String = "",
    var stats: String = "",
    var error: Boolean = false,
    var model: String = "",
    val createdAt: Long = System.currentTimeMillis(),
    val attachments: List<Attachment> = emptyList(),
) {
    fun toJson(): JSONObject {
        val j = JSONObject()
            .put("id", id).put("role", role).put("content", content).put("reasoning", reasoning)
            .put("stats", stats).put("error", error).put("model", model).put("created_at", createdAt)
        if (attachments.isNotEmpty()) j.put("attachments", JSONArray().apply { attachments.forEach { put(it.toJson()) } })
        return j
    }

    companion object {
        fun fromJson(j: JSONObject): ChatMessage {
            val att = j.optJSONArray("attachments")
            return ChatMessage(
                id = j.optString("id", UUID.randomUUID().toString()),
                role = j.optString("role", "user"),
                content = j.optString("content"),
                reasoning = j.optString("reasoning"),
                stats = j.optString("stats"),
                error = j.optBoolean("error"),
                model = j.optString("model"),
                createdAt = j.optLong("created_at", System.currentTimeMillis()),
                attachments = if (att == null) emptyList() else (0 until att.length()).mapNotNull {
                    runCatching { Attachment.fromJson(att.getJSONObject(it)) }.getOrNull()
                },
            )
        }
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
    private val media = File(context.filesDir, "media")

    /** Where the pictures, sounds and video frames of one conversation are kept. */
    fun mediaDir(chatId: String): File = File(media, chatId).apply { mkdirs() }
    private val io = Executors.newSingleThreadExecutor { r -> Thread(r, "chat-io") }

    /** Writes a conversation now (on the calling thread). */
    fun save(c: Conversation) {
        if (c.messages.isEmpty()) return
        c.updatedAt = System.currentTimeMillis()
        write(c.id, c.toJson().toString())
    }

    /**
     * Saves without blocking the screen: the conversation is turned into text here (so later
     * changes cannot tear it) and written on a background thread, in order.
     */
    fun saveAsync(c: Conversation) {
        if (c.messages.isEmpty()) return
        c.updatedAt = System.currentTimeMillis()
        val id = c.id
        val text = c.toJson().toString()
        io.execute { write(id, text) }
    }

    private fun write(id: String, text: String) {
        try {
            val tmp = File(dir, "$id.json.tmp")
            tmp.writeText(text)
            if (!tmp.renameTo(File(dir, "$id.json"))) tmp.delete()
        } catch (e: Exception) {
            // storage full or unavailable: keep going; the conversation is still on screen
        }
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

    /** Conversations whose title or any message contains [query] (ignoring case). */
    fun search(query: String): List<ChatSummary> {
        val q = query.trim()
        if (q.isEmpty()) return list()
        return (dir.listFiles { f -> f.name.endsWith(".json") } ?: emptyArray()).mapNotNull { f ->
            try {
                val c = Conversation.fromJson(JSONObject(f.readText()))
                val hit = c.title.contains(q, true) || c.messages.any { it.content.contains(q, true) }
                if (hit) ChatSummary(c.id, c.title, c.updatedAt, c.messages.size) else null
            } catch (e: Exception) {
                null
            }
        }.sortedByDescending { it.updatedAt }
    }

    fun rename(id: String, title: String) {
        val c = load(id) ?: return
        c.title = title
        write(id, c.toJson().toString())
    }

    fun delete(id: String) {
        File(dir, "$id.json").delete()
        File(media, id).deleteRecursively()
    }

    fun deleteAll() {
        dir.listFiles()?.forEach { it.delete() }
        media.deleteRecursively()
    }

    /** Removes the files of attachments no longer in the conversation. */
    fun deleteFiles(attachments: List<Attachment>) {
        attachments.flatMap { it.files }.forEach { runCatching { File(it).delete() } }
    }

    /** All conversations as one JSON document, for a backup. */
    fun exportAll(): String {
        val arr = JSONArray()
        list().forEach { s -> load(s.id)?.let { arr.put(it.toJson()) } }
        return JSONObject().put("app", "offline-ai").put("version", 1).put("chats", arr).toString(2)
    }

    /**
     * Reads a backup (or a single exported conversation). Conversations already here are kept;
     * an imported one with the same id gets a new id. Returns how many were added.
     */
    fun importJson(text: String): Int {
        val root = text.trim()
        val items = mutableListOf<JSONObject>()
        if (root.startsWith("[")) {
            val arr = JSONArray(root)
            for (i in 0 until arr.length()) items += arr.getJSONObject(i)
        } else {
            val o = JSONObject(root)
            val arr = o.optJSONArray("chats")
            if (arr != null) {
                for (i in 0 until arr.length()) items += arr.getJSONObject(i)
            } else {
                items += o
            }
        }
        var added = 0
        for (o in items) {
            val c = try {
                Conversation.fromJson(o)
            } catch (e: Exception) {
                continue
            }
            val id = if (File(dir, "${c.id}.json").exists()) UUID.randomUUID().toString() else c.id
            val copy = Conversation(id, c.title, c.createdAt, c.updatedAt, c.messages)
            write(id, copy.toJson().toString())
            added++
        }
        return added
    }

    companion object {
        /** One conversation as Markdown, for reading or sharing. */
        fun toMarkdown(c: Conversation): String = buildString {
            append("# ").append(c.title.ifBlank { "Chat" }).append("\n\n")
            for (m in c.messages) {
                if (m.error) continue
                append(if (m.role == "user") "**You:**\n\n" else "**${m.model.ifBlank { "AI" }}:**\n\n")
                for (a in m.attachments) {
                    val what = when (a.kind) { "video" -> "video"; "audio" -> "sound"; else -> "picture" }
                    append("_(").append(what).append(if (a.name.isNotBlank()) ": ${a.name}" else "").append(")_\n\n")
                }
                append(m.content.trim()).append("\n\n")
            }
        }
    }
}
