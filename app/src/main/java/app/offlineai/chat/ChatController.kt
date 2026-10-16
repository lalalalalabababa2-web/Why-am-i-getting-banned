package app.offlineai.chat

import android.os.SystemClock
import app.offlineai.chat.data.ChatMessage
import app.offlineai.chat.data.Conversation
import app.offlineai.chat.data.Family
import app.offlineai.chat.data.recommended
import app.offlineai.chat.engine.ChatOutcome
import app.offlineai.chat.engine.LoadedModel
import app.offlineai.chat.engine.ReplyListener
import org.json.JSONArray
import org.json.JSONObject
import java.util.Locale

/**
 * The open conversation and the reply being written. Lives in the application, not in a
 * screen, so a reply keeps going (and is saved) when the screen goes away.
 */
class ChatController(private val app: App) {
    interface Listener {
        /** Messages were added or removed. */
        fun onMessagesChanged()
        /** The reply being written changed. */
        fun onReplyUpdate()
        /** Reading progress, speed or the busy state changed. */
        fun onStatus()
    }

    private val listeners = mutableListOf<Listener>()

    var conversation: Conversation = Conversation()
        private set
    var streaming: ChatMessage? = null
        private set
    val generating: Boolean get() = streaming != null

    var promptDone = 0
        private set
    var promptTotal = 0
        private set
    var generated = 0
        private set
    private var genStartedAt = 0L

    fun addListener(l: Listener) = listeners.add(l)
    fun removeListener(l: Listener) = listeners.remove(l)
    private fun changed() = listeners.toList().forEach { it.onMessagesChanged() }
    private fun status() = listeners.toList().forEach { it.onStatus() }

    fun restore() {
        val id = app.settings.lastChatId ?: return
        app.chats.load(id)?.let { conversation = it }
    }

    fun open(id: String) {
        if (generating) return
        app.chats.load(id)?.let {
            conversation = it
            app.settings.lastChatId = it.id
            changed()
        }
    }

    fun newChat() {
        if (generating) stop()
        conversation = Conversation()
        app.settings.lastChatId = conversation.id
        changed()
    }

    /** The current conversation was deleted elsewhere. */
    fun forget(id: String) {
        if (conversation.id == id) newChat()
    }

    fun tokensPerSecond(): Double {
        val ms = SystemClock.uptimeMillis() - genStartedAt
        return if (generated > 0 && ms > 0) generated * 1000.0 / ms else 0.0
    }

    fun send(text: String): Boolean {
        val model = app.engine.loaded ?: return false
        if (generating || text.isBlank()) return false
        conversation.messages.add(ChatMessage(role = "user", content = text.trim()))
        if (conversation.title.isBlank()) conversation.title = text.trim().lineSequence().first().take(60)
        app.settings.lastChatId = conversation.id
        app.chats.save(conversation)
        startReply(model)
        return true
    }

    /** Writes the last reply again. */
    fun regenerate() {
        val model = app.engine.loaded ?: return
        if (generating) return
        val msgs = conversation.messages
        while (msgs.isNotEmpty() && msgs.last().role == "assistant") msgs.removeAt(msgs.size - 1)
        if (msgs.isEmpty()) return
        startReply(model)
    }

    /** Takes back your last message (and the reply to it) so it can be changed and sent again. */
    fun takeBackLast(): String? {
        if (generating) return null
        val msgs = conversation.messages
        val i = msgs.indexOfLast { it.role == "user" }
        if (i < 0) return null
        val text = msgs[i].content
        while (msgs.size > i) msgs.removeAt(msgs.size - 1)
        app.chats.save(conversation)
        changed()
        return text
    }

    fun delete(message: ChatMessage) {
        if (generating) return
        conversation.messages.remove(message)
        app.chats.save(conversation)
        changed()
    }

    fun stop() {
        if (generating) app.engine.stop()
    }

    private fun startReply(model: LoadedModel) {
        val reply = ChatMessage(role = "assistant", content = "", model = model.displayName)
        val request = buildRequest(model)
        conversation.messages.add(reply)
        streaming = reply
        promptDone = 0
        promptTotal = 0
        generated = 0
        genStartedAt = 0L
        changed()
        status()

        app.engine.reply(request, object : ReplyListener {
            override fun onPromptProgress(done: Int, total: Int) {
                promptDone = done
                promptTotal = total
                status()
            }

            override fun onUpdate(reasoning: String, content: String, generated: Int) {
                if (genStartedAt == 0L) genStartedAt = SystemClock.uptimeMillis()
                this@ChatController.generated = generated
                reply.reasoning = reasoning
                reply.content = content
                listeners.toList().forEach { it.onReplyUpdate() }
            }

            override fun onDone(outcome: ChatOutcome) {
                finish(reply, outcome)
            }
        })
    }

    private fun finish(reply: ChatMessage, o: ChatOutcome) {
        streaming = null
        if (!o.ok) {
            reply.error = true
            reply.reasoning = ""
            reply.content = o.error.ifBlank { "Something went wrong." }
        } else {
            reply.content = o.content.trim()
            reply.reasoning = o.reasoning.trim()
            if (reply.content.isEmpty() && reply.reasoning.isEmpty() && o.stopReason == "stopped") {
                conversation.messages.remove(reply)
            } else {
                reply.stats = describe(o)
            }
        }
        app.chats.save(conversation)
        changed()
        status()
    }

    private fun describe(o: ChatOutcome): String {
        val parts = mutableListOf<String>()
        if (o.tGenMs > 0 && o.nGenerated > 0) {
            parts += String.format(Locale.US, "%.1f tok/s", o.nGenerated * 1000.0 / o.tGenMs)
        }
        parts += "${o.nGenerated} tokens"
        if (o.nEvaluated > 0 && o.tPromptMs > 500) {
            parts += String.format(Locale.US, "read %d in %.1fs", o.nEvaluated, o.tPromptMs / 1000.0)
        }
        if (o.nDropped > 0) parts += "${o.nDropped} oldest messages left out to fit"
        when (o.stopReason) {
            "stopped" -> parts += "stopped"
            "context" -> parts += "context full"
            "length" -> parts += "length limit"
        }
        return parts.joinToString(" · ")
    }

    private fun familyOf(model: LoadedModel): Family {
        val local = app.models.find(java.io.File(model.path).name)
        return local?.family ?: Family.OTHER
    }

    private fun buildRequest(model: LoadedModel): JSONObject {
        val s = app.settings
        val messages = JSONArray()
        val system = s.systemPrompt.trim()
        if (system.isNotEmpty()) messages.put(JSONObject().put("role", "system").put("content", system))

        // Templates expect turns to alternate; a failed reply leaves two of yours in a row, so
        // those are joined. Failed replies themselves are never sent back to the model.
        var last: JSONObject? = null
        for (m in conversation.messages) {
            if (m.error) continue
            if (m.role == "assistant" && m.content.isBlank()) continue
            val prev = last
            if (prev != null && prev.getString("role") == m.role) {
                prev.put("content", prev.getString("content") + "\n\n" + m.content)
                continue
            }
            val j = JSONObject().put("role", m.role).put("content", m.content)
            if (m.role == "assistant" && m.reasoning.isNotBlank()) j.put("reasoning", m.reasoning)
            messages.put(j)
            last = j
        }

        val sampling = if (s.useRecommendedSampling) {
            val r = familyOf(model).recommended()
            JSONObject().put("temp", r.temp.toDouble()).put("top_p", r.topP.toDouble())
                .put("top_k", r.topK).put("min_p", r.minP.toDouble()).put("repeat_penalty", 1.0)
        } else {
            JSONObject().put("temp", s.temperature.toDouble()).put("top_p", s.topP.toDouble())
                .put("top_k", s.topK).put("min_p", s.minP.toDouble()).put("repeat_penalty", s.repeatPenalty.toDouble())
        }
        sampling.put("max_tokens", s.maxTokens).put("seed", -1)

        return JSONObject()
            .put("messages", messages)
            .put("thinking", s.thinking)
            .put("now_ms", conversation.createdAt)
            .put("sampling", sampling)
    }
}
