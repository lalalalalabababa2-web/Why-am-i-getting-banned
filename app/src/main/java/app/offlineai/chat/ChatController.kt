package app.offlineai.chat

import android.os.SystemClock
import app.offlineai.chat.data.Attachment
import app.offlineai.chat.data.ChatMessage
import app.offlineai.chat.data.Conversation
import app.offlineai.chat.data.Device
import app.offlineai.chat.data.Family
import app.offlineai.chat.data.recommended
import app.offlineai.chat.engine.ChatOutcome
import app.offlineai.chat.engine.LoadedModel
import app.offlineai.chat.engine.ReplyListener
import org.json.JSONArray
import org.json.JSONObject
import java.util.Locale

/** Pages read back from storage in one turn above which the model plainly does not fit in free memory. */
private const val SLOW_MEMORY_FAULTS = 2000L

/**
 * The open conversation and the reply being written. Lives in the application, not in a
 * screen, so a reply keeps going (and is saved) when the screen goes away.
 */
class ChatController(private val app: App) {
    interface Listener {
        /** Messages were added, removed or finished. */
        fun onMessagesChanged()
        /** The reply being written changed. */
        fun onReplyUpdate()
        /** Reading progress, speed or the busy state changed. */
        fun onStatus()
        /** A different conversation was opened. */
        fun onConversationSwitched() = onMessagesChanged()
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
    private var promptStartedAt = 0L
    private var promptT0 = 0L
    private var promptDone0 = 0
    private var faults0 = 0L

    /**
     * The model is being read again from storage during this reply: it does not fit in free memory.
     * Not with the pager, which reads the part that does not fit on purpose (and says so).
     */
    fun thrashing(): Boolean = generating && app.engine.loaded?.info?.pager != true &&
        Device.majorFaults() - faults0 > SLOW_MEMORY_FAULTS

    // ---- how long things will take
    //
    // Reading a message: from its speed so far, or before there is any, from how fast the last
    // message was read with this model (or, streaming from storage, from how long one step through
    // the model takes). Writing: the speed over the last several seconds (it changes as the phone
    // warms up or other apps take memory) and how long this model's replies usually are.

    /** Prompt tokens per second with the loaded model, from its last reply; 0 before there is one. */
    private val readSpeed = mutableMapOf<String, Double>()
    private val genSamples = ArrayDeque<Pair<Long, Int>>()  // (uptime ms, tokens written)
    private var thinkingNow = false

    /** Seconds left reading the message; -1 when there is nothing to go by yet. */
    fun promptSecondsLeft(): Int {
        if (promptTotal <= promptDone) return -1
        if (promptT0 != 0L && promptDone > promptDone0) {
            val ms = SystemClock.elapsedRealtime() - promptT0
            if (ms >= 300) {
                val perMs = (promptDone - promptDone0).toDouble() / ms
                return ((promptTotal - promptDone) / perMs / 1000.0).toInt() + 1
            }
        }
        // nothing measured in this reply yet
        val model = app.engine.loaded ?: return -1
        val pager = if (model.info.streaming) app.engine.pagerStats() else null
        if (pager != null && pager.active && pager.passMs > 0) {
            // every prompt step reads the streamed layers once; long prompts are slower to compute too
            val steps = (promptTotal - promptDone + model.config.nUbatch - 1) / model.config.nUbatch
            val tps = readSpeed[model.key] ?: 0.0
            val compute = if (tps > 0) (promptTotal - promptDone) / tps else 0.0
            val waited = (SystemClock.elapsedRealtime() - promptStartedAt) / 1000.0
            return (maxOf(steps * pager.passMs / 1000.0, compute) - waited).coerceAtLeast(1.0).toInt()
        }
        val tps = readSpeed[model.key] ?: return -1
        val waited = (SystemClock.elapsedRealtime() - promptStartedAt) / 1000.0
        return ((promptTotal - promptDone) / tps - waited).coerceAtLeast(1.0).toInt()
    }

    /** " · about 20 s left" while reading a message, else "". */
    fun promptEtaLabel(): String {
        val s = promptSecondsLeft()
        return if (s < 0) "" else " · about ${duration(s)} left"
    }

    /**
     * Before there is a speed to show: "Starting…", or for a model streamed from storage (where
     * the second word can be seconds away) how long each step through the model takes.
     */
    fun startingLabel(): String {
        val model = app.engine.loaded
        val pager = if (model?.info?.streaming == true) app.engine.pagerStats() else null
        if (generated >= 1 && pager != null && pager.active && pager.passMs > 0) {
            return "Writing · about ${seconds(pager.passMs / 1000.0)} a step"
        }
        return "Starting…"
    }

    /** Tokens per second over the last several seconds (or the whole reply while it is short). */
    fun tokensPerSecond(): Double {
        val now = SystemClock.uptimeMillis()
        val first = genSamples.firstOrNull()
        if (first != null && generated - first.second >= 2 && now - first.first >= 1500) {
            return (generated - first.second) * 1000.0 / (now - first.first)
        }
        val ms = now - genStartedAt
        return if (generated > 1 && genStartedAt > 0 && ms > 0) (generated - 1) * 1000.0 / ms else 0.0
    }

    /**
     * Tokens this reply probably still has to go: from the lengths of this model's earlier
     * replies that were longer than this one is now (how much longer they went on), within the
     * reply length limit. -1 when there is nothing to go by.
     */
    fun tokensLeftEstimate(): Int {
        val model = app.engine.loaded ?: return -1
        val limit = app.settings.maxTokens
        val longer = app.settings.replyLengths(model.key, thinkingNow).filter { it > generated }
        if (longer.size < 2) return -1
        val left = longer.map { it - generated }.sorted()
        // the median: one very long reply in the past must not make every estimate long
        val mid = left[left.size / 2]
        return mid.coerceAtMost((limit - generated).coerceAtLeast(0))
    }

    /** Seconds this reply probably still takes; -1 when there is nothing to go by. */
    fun secondsLeftEstimate(): Int {
        val left = tokensLeftEstimate()
        val tps = tokensPerSecond()
        if (left < 0 || tps <= 0.0) return -1
        return (left / tps).toInt() + 1
    }

    /** "Writing · 1.4 tok/s · 120 tokens · about 40 s left" */
    fun writingLabel(): String {
        val sb = StringBuilder("Writing · ").append(tps(tokensPerSecond())).append(" tok/s · ").append(generated).append(" tokens")
        val s = secondsLeftEstimate()
        if (s >= 0) sb.append(" · about ").append(duration(s)).append(" left")
        return sb.toString()
    }

    /** Pictures being read: index of the current one (-1 while the picture part loads), and how many. */
    var mediaIndex = -2
        private set
    var mediaTotal = 0
        private set

    /** Attachments waiting in the composer, to go with the next message you send. */
    val draftAttachments: MutableList<Attachment> = mutableListOf()

    fun addListener(l: Listener) = listeners.add(l)
    fun removeListener(l: Listener) = listeners.remove(l)
    private fun changed() = listeners.toList().forEach { it.onMessagesChanged() }
    private fun switched() = listeners.toList().forEach { it.onConversationSwitched() }
    private fun status() = listeners.toList().forEach { it.onStatus() }
    private fun replyUpdated() = listeners.toList().forEach { it.onReplyUpdate() }

    private fun save() = app.chats.saveAsync(conversation)
    private var lastPartialSave = 0L

    fun restore() {
        val id = app.settings.lastChatId ?: return
        app.chats.load(id)?.let { conversation = it; settleInterrupted() }
    }

    /**
     * A reply that was still being written when the app was closed (Android ended it, the phone
     * restarted) keeps what it had, marked as cut short; one with nothing yet is dropped.
     */
    private fun settleInterrupted() {
        var changedAny = false
        for (m in conversation.messages.toList()) {
            if (!m.partial) continue
            m.partial = false
            changedAny = true
            if (m.content.isBlank() && m.reasoning.isBlank()) {
                conversation.messages.remove(m)
            } else {
                m.stats = "cut short: the app was closed while it was writing · use Write again for a full reply"
            }
        }
        if (changedAny) save()
    }

    /** Attachments picked but never sent are dropped, files and all, when you leave the chat. */
    private fun discardDraft() {
        if (draftAttachments.isEmpty()) return
        app.chats.deleteFiles(draftAttachments)
        draftAttachments.clear()
    }

    fun open(id: String) {
        if (generating) return
        if (id != conversation.id) discardDraft()
        app.chats.load(id)?.let {
            conversation = it
            settleInterrupted()
            app.settings.lastChatId = it.id
            switched()
        }
    }

    fun newChat() {
        if (generating) stop()
        discardDraft()
        conversation = Conversation()
        app.settings.lastChatId = conversation.id
        switched()
    }

    /** A conversation was deleted elsewhere. */
    fun forget(id: String) {
        if (conversation.id == id) newChat()
    }

    /** The open conversation was renamed or changed elsewhere; reload it from disk. */
    fun reloadIfOpen(id: String) {
        if (conversation.id != id || generating) return
        app.chats.load(id)?.let {
            conversation = it
            switched()
        }
    }

    fun send(text: String): Boolean {
        val model = app.engine.loaded ?: return false
        val attachments = draftAttachments.toList()
        if (generating || (text.isBlank() && attachments.isEmpty())) return false
        conversation.messages.add(ChatMessage(role = "user", content = text.trim(), attachments = attachments))
        draftAttachments.clear()
        if (conversation.title.isBlank()) {
            conversation.title = text.trim().lineSequence().firstOrNull()?.take(60)?.ifBlank { null }
                ?: when (attachments.firstOrNull()?.kind) { "video" -> "A video"; "audio" -> "A recording"; else -> "A picture" }
        }
        app.settings.lastChatId = conversation.id
        save()
        startReply(model)
        return true
    }

    /** The open conversation, for files that belong to it (pictures, sounds, video frames). */
    fun mediaDir() = app.chats.mediaDir(conversation.id)

    fun removeDraftAttachment(a: Attachment) {
        if (draftAttachments.remove(a)) app.chats.deleteFiles(listOf(a))
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
        // its attachments go back into the composer with the text
        draftAttachments.clear()
        draftAttachments.addAll(msgs[i].attachments)
        while (msgs.size > i) msgs.removeAt(msgs.size - 1)
        save()
        changed()
        return text
    }

    fun delete(message: ChatMessage) {
        if (generating) return
        conversation.messages.remove(message)
        app.chats.deleteFiles(message.attachments)
        save()
        changed()
    }

    fun stop() {
        if (generating) app.engine.stop()
    }

    private fun startReply(model: LoadedModel) {
        val reply = ChatMessage(role = "assistant", content = "", model = model.displayName, partial = true)
        val request = buildRequest(model)
        conversation.messages.add(reply)
        streaming = reply
        lastPartialSave = SystemClock.uptimeMillis()
        promptDone = 0
        promptTotal = 0
        promptT0 = 0L
        promptDone0 = 0
        promptStartedAt = SystemClock.elapsedRealtime()
        faults0 = Device.majorFaults()
        generated = 0
        genStartedAt = 0L
        genSamples.clear()
        thinkingNow = app.settings.thinkingFor(streamsNow(model)) && model.info.supportsThinking
        mediaIndex = -2
        mediaTotal = 0
        changed()
        status()

        app.engine.setThreads(app.threadsNow())
        if (app.settings.backgroundWriting) GenerationService.start(app)

        app.engine.reply(request, object : ReplyListener {
            override fun onPromptProgress(done: Int, total: Int) {
                if (promptT0 == 0L || done < promptDone) {
                    // the speed is measured from the first progress report on
                    promptT0 = android.os.SystemClock.elapsedRealtime()
                    promptDone0 = done
                }
                promptDone = done
                promptTotal = total
                status()
            }

            override fun onUpdate(reasoning: String, content: String, generated: Int) {
                val now = SystemClock.uptimeMillis()
                if (genStartedAt == 0L) genStartedAt = now
                this@ChatController.generated = generated
                // the speed now: the last ten seconds or so, at least two points
                genSamples.addLast(now to generated)
                while (genSamples.size > 2 && now - genSamples.first().first > 10_000) genSamples.removeFirst()
                reply.reasoning = reasoning
                reply.content = content
                replyUpdated()
                // kept every few seconds, so a reply cut off by Android is not lost
                if (now - lastPartialSave > 3000) {
                    lastPartialSave = now
                    save()
                }
            }

            override fun onMedia(index: Int, total: Int) {
                mediaIndex = index
                mediaTotal = total
                status()
            }

            override fun onDone(outcome: ChatOutcome) {
                mediaIndex = -2
                learn(model, outcome)
                finish(reply, outcome)
            }
        })
    }

    /** What the next estimates go by: how fast this model read, and how long its reply was. */
    private fun learn(model: LoadedModel, o: ChatOutcome) {
        if (!o.ok) return
        // a short message says more about the fixed cost of a step than about reading speed
        if (o.nEvaluated >= 128 && o.tPromptMs > 0) readSpeed[model.key] = o.nEvaluated * 1000.0 / o.tPromptMs
        // only replies that ended by themselves say how long replies are
        if (o.stopReason == "eos" && o.nGenerated > 0) app.settings.addReplyLength(model.key, thinkingNow, o.nGenerated)
    }

    private fun finish(reply: ChatMessage, o: ChatOutcome) {
        streaming = null
        reply.partial = false
        GenerationService.stop(app)
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
        save()
        changed()
        status()
        if (!app.inFront && app.settings.replyNotifications && o.stopReason != "stopped") {
            val text = (if (reply.content.isNotBlank()) reply.content else reply.reasoning).take(300)
            GenerationService.replyReady(app, if (reply.error) "The reply failed" else "Reply ready", text.ifBlank { "Open the chat to see it." })
        }
    }

    private fun describe(o: ChatOutcome): String {
        val parts = mutableListOf<String>()
        if (o.tGenMs > 0 && o.nGenerated > 1) {
            parts += tps((o.nGenerated - 1) * 1000.0 / o.tGenMs) + " tok/s"
        }
        parts += "${o.nGenerated} tokens"
        val total = (o.tFirstMs.coerceAtLeast(o.tPromptMs) + o.tGenMs) / 1000.0
        if (total >= 1) parts += String.format(Locale.US, "%s in all", seconds(total))
        if (o.tFirstMs > 0) parts += String.format(Locale.US, "first word %s", seconds(o.tFirstMs / 1000.0))
        if (o.nDrafted > 0 && o.nSteps > 0) {
            // how much drafting ahead helped: tokens written per model step (1.0 without it)
            parts += String.format(Locale.US, "%.1f tokens per step", o.nGenerated.toDouble() / o.nSteps)
        }
        if (o.nMedia > 0) {
            val what = if (o.nMedia == 1) "1 attachment" else "${o.nMedia} attachments"
            parts += String.format(Locale.US, "read %s in %.1fs", what, o.tMediaMs / 1000.0)
        }
        if (o.nEvaluated > 0 && o.tPromptMs > 500) {
            parts += String.format(Locale.US, "read %d in %.1fs", o.nEvaluated, o.tPromptMs / 1000.0)
        }
        if (o.nDropped > 0) parts += "${o.nDropped} oldest messages left out to fit"
        if (o.streaming) {
            parts += String.format(Locale.US, "%.1f GB kept in memory, %.1f GB read from storage per step%s", o.residentGb,
                o.streamedGb, if (o.readMbps > 0) String.format(Locale.US, " (storage %.1f GB/s)", o.readMbps / 1000.0) else "")
        } else if (o.nMajflt > SLOW_MEMORY_FAULTS && app.engine.loaded?.info?.pager != true) {
            parts += "slow because the model did not fit in free memory and was read again from storage; close other " +
                "apps, lower the context size or pick a smaller model"
        }
        when (o.stopReason) {
            "stopped" -> parts += "stopped"
            "context" -> parts += "context full"
            "length" -> parts += "length limit"
        }
        return parts.joinToString(" · ")
    }

    /** Part of the model is read from storage on every step right now. */
    private fun streamsNow(model: LoadedModel): Boolean =
        model.info.streaming || app.engine.pagerStats()?.active == true

    private fun familyOf(model: LoadedModel): Family = app.models.find(model.key)?.family ?: Family.OTHER

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
            val media = if (m.role == "user") mediaJson(m.attachments) else null
            val prev = last
            if (prev != null && prev.getString("role") == m.role) {
                prev.put("content", prev.getString("content") + "\n\n" + m.content)
                if (media != null) {
                    val into = prev.optJSONArray("media") ?: JSONArray().also { prev.put("media", it) }
                    for (k in 0 until media.length()) into.put(media.get(k))
                }
                continue
            }
            val j = JSONObject().put("role", m.role).put("content", m.content)
            if (m.role == "assistant" && m.reasoning.isNotBlank()) j.put("reasoning", m.reasoning)
            if (media != null) j.put("media", media)
            messages.put(j)
            last = j
        }

        val sampling = if (s.useRecommendedSampling) {
            val r = familyOf(model).recommended()
            JSONObject().put("temp", r.temp.toDouble()).put("top_p", r.topP.toDouble())
                .put("top_k", r.topK).put("min_p", r.minP.toDouble()).put("repeat_penalty", r.repeat.toDouble())
        } else {
            JSONObject().put("temp", s.temperature.toDouble()).put("top_p", s.topP.toDouble())
                .put("top_k", s.topK).put("min_p", s.minP.toDouble()).put("repeat_penalty", s.repeatPenalty.toDouble())
        }
        sampling.put("max_tokens", s.maxTokens).put("seed", -1)

        return JSONObject()
            .put("messages", messages)
            .put("thinking", s.thinkingFor(streamsNow(model)))
            .put("now_ms", conversation.createdAt)
            .put("sampling", sampling)
    }

    /** Attachments as the engine reads them; files that went missing are left out. */
    private fun mediaJson(list: List<Attachment>): JSONArray? {
        if (list.isEmpty()) return null
        val arr = JSONArray()
        for (a in list) {
            for ((k, path) in a.files.withIndex()) {
                if (!java.io.File(path).isFile) continue
                // a video says what it is before its first frame, then each frame its time
                val intro = if (a.kind == "video" && k == 0) {
                    String.format(Locale.US, "(a video of %.0f seconds, shown as %d frames) ", a.durationMs / 1000.0, a.files.size)
                } else {
                    ""
                }
                arr.put(JSONObject().put("path", path)
                    .put("label", intro + (a.labels.getOrNull(k) ?: ""))
                    .put("frame", a.kind == "video"))
            }
        }
        return if (arr.length() > 0) arr else null
    }

    // ---- for the on-device tests only: a reply streamed from text instead of from a model,
    // so the chat screen can be checked with exact, very long content.

    internal fun testStartReply(prompt: String): ChatMessage {
        conversation.messages.add(ChatMessage(role = "user", content = prompt))
        val reply = ChatMessage(role = "assistant", content = "", model = "test")
        conversation.messages.add(reply)
        streaming = reply
        generated = 0
        genStartedAt = SystemClock.uptimeMillis()
        changed()
        status()
        return reply
    }

    internal fun testUpdate(content: String, reasoning: String = "") {
        val reply = streaming ?: return
        reply.content = content
        reply.reasoning = reasoning
        generated++
        replyUpdated()
    }

    internal fun testFinish() {
        val reply = streaming ?: return
        streaming = null
        reply.stats = "test"
        changed()
        status()
    }
}

/** Tokens per second with the digits that mean something: 0.43, 3.7, 12. */
internal fun tps(v: Double): String = when {
    v < 1 -> String.format(Locale.US, "%.2f", v)
    v < 10 -> String.format(Locale.US, "%.1f", v)
    else -> String.format(Locale.US, "%.0f", v)
}

/** 4.2s, 38s, 2m 05s */
internal fun seconds(s: Double): String = when {
    s < 10 -> String.format(Locale.US, "%.1fs", s)
    s < 60 -> String.format(Locale.US, "%.0fs", s)
    else -> String.format(Locale.US, "%dm %02ds", (s / 60).toInt(), (s % 60).toInt())
}

/** A rough wait: "20 s", "3 min" */
internal fun duration(s: Int): String = when {
    s < 90 -> "$s s"
    s < 3600 -> "${(s + 30) / 60} min"
    else -> String.format(Locale.US, "%.1f h", s / 3600.0)
}
