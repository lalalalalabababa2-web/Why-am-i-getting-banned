package app.offlineai.chat

import android.os.SystemClock
import app.offlineai.chat.data.Attachment
import app.offlineai.chat.data.ChatMessage
import app.offlineai.chat.data.Conversation
import app.offlineai.chat.data.Version
import app.offlineai.chat.data.Device
import app.offlineai.chat.data.Family
import app.offlineai.chat.data.recommended
import app.offlineai.chat.engine.ChatOutcome
import app.offlineai.chat.engine.LoadedModel
import app.offlineai.chat.engine.ReplyListener
import app.offlineai.chat.data.WebResult
import app.offlineai.chat.data.WebSearch
import org.json.JSONArray
import org.json.JSONObject
import java.util.Locale
import java.util.concurrent.atomic.AtomicBoolean

/** Pages read back from storage in one turn above which the model plainly does not fit in free memory. */
private const val SLOW_MEMORY_FAULTS = 2000L

/** Versions of one reply kept by Write again (the oldest go first). */
private const val MAX_VERSIONS = 10

/** Stands for the next message when the engine reads the conversation ahead of it (Engine::read_ahead). */
private const val NEXT_MESSAGE = "<<the next message>>"

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

    /**
     * The conversation the reply being written belongs to. It is saved into that one even when
     * another chat is opened meanwhile; null once that conversation has been deleted.
     */
    private var replyConversation: Conversation? = null

    var promptDone = 0
        private set
    var promptTotal = 0
        private set
    var generated = 0
        private set
    private var genStartedAt = 0L
    private var promptT0 = 0L
    private var promptDone0 = 0
    private var faults0 = 0L

    /** The model is being read again from storage during this reply: it does not fit in free memory. */
    fun thrashing(): Boolean = generating && Device.majorFaults() - faults0 > SLOW_MEMORY_FAULTS

    /** Seconds left reading the message, from the speed so far; -1 until there is a speed to go by. */
    fun promptSecondsLeft(): Int {
        if (promptT0 == 0L || promptDone <= promptDone0 || promptTotal <= promptDone) return -1
        val ms = SystemClock.elapsedRealtime() - promptT0
        if (ms < 300) return -1
        val perMs = (promptDone - promptDone0).toDouble() / ms
        return ((promptTotal - promptDone) / perMs / 1000.0).toInt() + 1
    }

    /** " · about 20 s left" while reading a long message, else "". */
    fun promptEtaLabel(): String {
        val s = promptSecondsLeft()
        return when {
            s < 0 -> ""
            s < 90 -> " · about $s s left"
            else -> " · about ${(s + 30) / 60} min left"
        }
    }

    /** What a web search for the reply is doing ("Searching the web…", "Reading 3 pages…"); null otherwise. */
    var webStatus: String? = null
        private set
    /** Stops the web search under way (set while one runs). */
    private var webCancel: AtomicBoolean? = null
    private val main = android.os.Handler(android.os.Looper.getMainLooper())

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
        app.chats.load(id)?.let { conversation = settleInterrupted(it) }
    }

    /**
     * A reply that was still being written when the app was closed (Android ended it, the phone
     * restarted) keeps what it had, marked as cut short; one with nothing yet is dropped.
     */
    private fun settleInterrupted(c: Conversation): Conversation {
        var changedAny = false
        for (m in c.messages.toList()) {
            if (!m.partial) continue
            m.partial = false
            changedAny = true
            if (m.content.isBlank() && m.reasoning.isBlank()) {
                c.messages.remove(m)
            } else {
                m.stats = "cut short: the app was closed while it was writing · use Write again for a full reply"
            }
        }
        if (changedAny) app.chats.saveAsync(c)
        return c
    }

    /** Attachments picked but never sent are dropped, files and all, when you leave the chat. */
    private fun discardDraft() {
        if (draftAttachments.isEmpty()) return
        app.chats.deleteFiles(conversation.id, draftAttachments)
        draftAttachments.clear()
    }

    fun open(id: String) {
        // already open, with a reply being written into it
        if (generating && id == conversation.id) return
        val writing = replyConversation
        // The chat a reply is still being written into (after New chat, in the second before the
        // stop lands) is the copy in memory: the one on disk is a few seconds old and would be
        // marked "cut short" as if the app had been closed.
        val c = if (writing != null && writing.id == id) writing else app.chats.load(id)?.let { settleInterrupted(it) }
        if (c == null) return
        if (id != conversation.id) discardDraft()
        // Another chat while a reply is being written: the reply stops there and keeps what it
        // has, as with New chat. Tapping a chat used to do nothing at all until the reply was done.
        if (generating && c !== writing) stop()
        conversation = c
        app.settings.lastChatId = c.id
        switched()
    }

    fun newChat() {
        if (generating) stop()
        discardDraft()
        conversation = Conversation()
        app.settings.lastChatId = conversation.id
        switched()
    }

    /** A new chat with [c]: it brings its own system prompt, and opens with its greeting, if it has one. */
    fun newChatWith(c: app.offlineai.chat.data.Character) {
        if (generating) stop()
        discardDraft()
        conversation = Conversation(title = c.name, characterName = c.name, characterPrompt = c.prompt())
        if (c.greeting.isNotBlank()) {
            conversation.messages.add(ChatMessage(role = "assistant", content = c.greeting.trim(), model = c.name, greeting = true))
            save()
        }
        app.settings.lastChatId = conversation.id
        switched()
    }

    /** A conversation is being deleted elsewhere: nothing may save it again. */
    fun forget(id: String) {
        if (replyConversation?.id == id) replyConversation = null
        if (conversation.id == id) newChat()
    }

    /** Every conversation is being deleted. */
    fun forgetAll() {
        replyConversation = null
        newChat()
    }

    /** The open conversation was renamed or changed elsewhere; reload it from disk. */
    fun reloadIfOpen(id: String) {
        if (conversation.id != id || generating) return
        app.chats.load(id)?.let {
            conversation = it
            switched()
        }
    }

    fun tokensPerSecond(): Double {
        val ms = SystemClock.uptimeMillis() - genStartedAt
        return if (generated > 1 && genStartedAt > 0 && ms > 0) (generated - 1) * 1000.0 / ms else 0.0
    }

    fun send(text: String): Boolean {
        val model = app.engine.loaded ?: return false
        val attachments = draftAttachments.toList()
        if (generating || (text.isBlank() && attachments.isEmpty())) return false
        val mine = ChatMessage(role = "user", content = text.trim(), attachments = attachments)
        conversation.messages.add(mine)
        draftAttachments.clear()
        if (conversation.title.isBlank()) {
            conversation.title = text.trim().lineSequence().firstOrNull()?.take(60)?.ifBlank { null }
                ?: when (attachments.firstOrNull()?.kind) { "video" -> "A video"; "audio" -> "A recording"; else -> "A picture" }
        }
        app.settings.lastChatId = conversation.id
        save()
        // search on: every message (Always) or the ones that need facts (Auto)
        val s = app.settings
        val afterSearch = conversation.messages.dropLast(1).lastOrNull { it.role == "user" }?.sources?.isNotEmpty() == true
        val search = s.webSearch && mine.content.isNotBlank() && (s.webAlways || WebSearch.needsSearch(mine.content, afterSearch))
        startReply(model, searchFor = mine.takeIf { search })
        return true
    }

    /** Something done on the phone from the message box (PhoneActions): your message and what was done, without the model. */
    fun addLocal(text: String, done: String) {
        if (generating) return
        conversation.messages.add(ChatMessage(role = "user", content = text.trim()))
        conversation.messages.add(ChatMessage(role = "assistant", content = done, model = "Nyx", greeting = true))
        if (conversation.title.isBlank()) conversation.title = text.trim().take(60)
        save()
        changed()
    }

    /**
     * What to search the web for: your message, and the one before it when this one is short (a
     * follow-up like "and tomorrow?" means little on its own).
     */
    private fun searchQuery(m: ChatMessage): String {
        val words = m.content.split(Regex("\\s+")).count { it.isNotBlank() }
        if (words >= 5) return m.content
        val msgs = conversation.messages
        val before = msgs.subList(0, msgs.indexOf(m).coerceAtLeast(0)).lastOrNull { it.role == "user" && !it.error }
        return if (before == null) m.content else before.content.take(120) + " " + m.content
    }

    /**
     * Searches the web for [user] (off the main thread), keeps what it found with the message, then
     * [begin]s the reply. Stopping meanwhile drops the reply ([stop]).
     */
    private fun searchThen(model: LoadedModel, user: ChatMessage, begin: () -> Unit) {
        val cancel = AtomicBoolean(false)
        webCancel = cancel
        webStatus = "Searching the web…"
        status()
        replyUpdated()
        val query = searchQuery(user)
        // a few hundred tokens (Settings, Web search): the model reads all of it before it writes
        val budget = app.settings.webBudget().coerceAtMost(model.nCtx)
        val engine = app.settings.webEngineNow()
        Thread({
            val r = runCatching {
                WebSearch.run(query, budget, engine, cancel) { s ->
                    main.post {
                        if (webCancel === cancel) {
                            webStatus = s
                            status()
                            replyUpdated()
                        }
                    }
                }
            }.getOrElse { WebResult(query, emptyList(), "", it.message ?: "the search failed") }
            main.post {
                if (webCancel !== cancel) return@post  // stopped meanwhile
                webCancel = null
                webStatus = null
                if (r.context.isNotBlank()) {
                    user.web = r.context
                    user.sources = r.sources
                    user.webError = ""
                } else {
                    user.webError = r.error ?: "The web search found nothing."
                }
                replyConversation?.let { app.chats.saveAsync(it) }
                changed()
                // another chat opened while it searched: the reply is for this one's model and memory
                if (replyConversation !== conversation) {
                    dropReply()
                    return@post
                }
                begin()
            }
        }, "web-search").start()
    }

    /** Ends a reply that never reached the model (its web search was stopped). */
    private fun dropReply() {
        val reply = streaming ?: return
        streaming = null
        replyConversation?.messages?.remove(reply)
        replyConversation = null
        GenerationService.stop(app)
        changed()
        status()
    }

    /** The open conversation, for files that belong to it (pictures, sounds, video frames). */
    fun mediaDir() = app.chats.mediaDir(conversation.id)

    fun removeDraftAttachment(a: Attachment) {
        if (draftAttachments.remove(a)) app.chats.deleteFiles(conversation.id, listOf(a))
    }

    /** Writes the last reply again. */
    fun regenerate() {
        val model = app.engine.loaded ?: return
        if (generating) return
        val msgs = conversation.messages
        // the reply written now joins the earlier versions of the one it replaces (flip back with ‹ ›)
        val old = msgs.lastOrNull()?.takeIf { it.role == "assistant" && !it.greeting }
        val earlier = when {
            old == null -> emptyList()
            old.versions.isNotEmpty() -> old.also { if (!it.error) it.syncVersion() }.versions.toList()
            !old.error && old.content.isNotBlank() -> listOf(old.asVersion())
            else -> emptyList()
        }
        // (a character's greeting stays: it is not a reply)
        while (msgs.isNotEmpty() && msgs.last().role == "assistant" && !msgs.last().greeting) msgs.removeAt(msgs.size - 1)
        if (msgs.none { it.role == "user" }) return
        startReply(model, earlier = earlier.takeLast(MAX_VERSIONS - 1))
    }

    /** Shows another version of the last reply ([delta] -1: the one before, +1: the one after). */
    fun flipVersion(m: ChatMessage, delta: Int) {
        if (generating || conversation.messages.lastOrNull() !== m || m.versions.size < 2) return
        m.show((m.shown + delta).coerceIn(0, m.versions.size - 1))
        save()
        changed()
    }

    /** Takes back your last message (and the reply to it) so it can be changed and sent again. */
    fun takeBackLast(): String? {
        if (generating) return null
        val msgs = conversation.messages
        val i = msgs.indexOfLast { it.role == "user" }
        if (i < 0) return null
        val text = msgs[i].content
        // its attachments go back into the composer with the text, next to any already waiting
        // there (those used to be dropped, their files left behind)
        draftAttachments.addAll(0, msgs[i].attachments)
        while (msgs.size > i) msgs.removeAt(msgs.size - 1)
        save()
        changed()
        return text
    }

    fun delete(message: ChatMessage) {
        if (generating) return
        conversation.messages.remove(message)
        app.chats.deleteFiles(conversation.id, message.attachments)
        save()
        changed()
    }

    fun stop() {
        val searching = webCancel
        if (searching != null) {
            // still searching the web: nothing has gone to the model yet
            searching.set(true)
            webCancel = null
            webStatus = null
            dropReply()
            return
        }
        if (generating) app.engine.stop()
    }

    /**
     * Has the model read, ahead of your next message, what that reply's prompt will start with:
     * mostly the last reply as the model will see it from now on (without its thinking, which
     * the templates of thinking models leave out of the history, so it cannot simply be kept).
     * Called when a reply finishes and when you start typing; costs nothing when it is all in the
     * model's memory already, and sending a message takes over from wherever it has got to.
     */
    fun readAhead() {
        if (!app.settings.readAhead || generating) return
        val model = app.engine.loaded ?: return
        // an empty chat without a system prompt has nothing to get ready
        if (conversation.messages.none { !it.error } && systemPrompt().isEmpty()) return
        app.engine.readAhead(buildRequest(model, NEXT_MESSAGE).put("probe", NEXT_MESSAGE))
    }

    /**
     * Whether [m] can be carried on: the last reply, cut off by its length limit or stopped, with
     * words in it (a team reply is settled by its review; it is written again instead).
     */
    fun canContinue(m: ChatMessage): Boolean =
        !generating && app.engine.loaded != null && m.role == "assistant" && !m.error && m.team == 0 && m.content.isNotBlank() &&
            conversation.messages.lastOrNull() === m && (m.stats.contains("length limit") || m.stats.contains("stopped"))

    /** Carries on the last reply from where it stopped, into the same message. */
    fun continueLast() {
        val model = app.engine.loaded ?: return
        val m = conversation.messages.lastOrNull() ?: return
        if (!canContinue(m)) return
        startReply(model, continuing = m)
    }

    /** What the reply being carried on had before (content, thinking); null for a new reply. */
    private var continuedFrom: Pair<String, String>? = null

    /** The engine returns the whole reply when carrying one on; this keeps it whole either way. */
    private fun whole(content: String): String {
        val before = continuedFrom?.first ?: return content
        return if (content.startsWith(before)) content else before + content
    }

    private fun startReply(model: LoadedModel, continuing: ChatMessage? = null, earlier: List<Version> = emptyList(),
                           searchFor: ChatMessage? = null) {
        val team = if (continuing != null) 0 else teamSize()
        val partner = app.engine.partner?.takeIf { team > 0 && it.key == app.settings.teamPartner && it.key != model.key }
        val reply = continuing?.apply { partial = true } ?: ChatMessage(
            role = "assistant", content = "", partial = true, team = team,
            model = if (partner != null) "${model.displayName} + ${partner.displayName}" else model.displayName,
        )
        continuedFrom = continuing?.let { it.content to it.reasoning }
        if (continuing == null && earlier.isNotEmpty()) {
            reply.versions.addAll(earlier)
            reply.shown = earlier.size  // where the reply written now goes
        }
        if (continuing == null) conversation.messages.add(reply)
        streaming = reply
        replyConversation = conversation
        lastPartialSave = SystemClock.uptimeMillis()
        promptDone = 0
        promptTotal = 0
        promptT0 = 0L
        promptDone0 = 0
        faults0 = Device.majorFaults()
        generated = 0
        genStartedAt = 0L
        mediaIndex = -2
        mediaTotal = 0
        changed()
        status()
        if (app.settings.backgroundWriting) GenerationService.start(app)
        if (searchFor != null) {
            searchThen(model, searchFor) { ask(model, reply) }
        } else {
            ask(model, reply)
        }
    }

    /** Hands the conversation to the model, the reply [reply] streaming into it. */
    private fun ask(model: LoadedModel, reply: ChatMessage) {
        // (the reply has no words yet, unless it is being carried on: an empty reply is left out)
        val request = buildRequest(model)
        if (continuedFrom != null) {
            request.put("continue", true)
            request.remove("team")
            request.remove("partner")
        }
        app.engine.setThreads(app.threadsNow())

        app.engine.reply(request, object : ReplyListener {
            override fun onPromptProgress(done: Int, total: Int) {
                if (promptT0 == 0L || done < promptDone) {
                    // the speed is measured from the first progress report on
                    promptT0 = SystemClock.elapsedRealtime()
                    promptDone0 = done
                }
                promptDone = done
                promptTotal = total
                status()
            }

            override fun onUpdate(reasoning: String, content: String, generated: Int) {
                if (genStartedAt == 0L) genStartedAt = SystemClock.uptimeMillis()
                this@ChatController.generated = generated
                reply.reasoning = reasoning.ifBlank { continuedFrom?.second ?: "" }
                reply.content = whole(content)
                replyUpdated()
                // kept every few seconds, so a reply cut off by Android is not lost
                val now = SystemClock.uptimeMillis()
                if (now - lastPartialSave > 3000) {
                    lastPartialSave = now
                    replyConversation?.let { app.chats.saveAsync(it) }
                }
            }

            override fun onMedia(index: Int, total: Int) {
                mediaIndex = index
                mediaTotal = total
                status()
            }

            override fun onDone(outcome: ChatOutcome) {
                mediaIndex = -2
                finish(reply, outcome)
            }
        })
    }

    private fun finish(reply: ChatMessage, o: ChatOutcome) {
        streaming = null
        val convo = replyConversation
        replyConversation = null
        reply.partial = false
        GenerationService.stop(app)
        if (!o.ok && continuedFrom != null) {
            // carrying it on failed: the reply keeps what it had, and says why it did not go on
            val (content, reasoning) = continuedFrom!!
            reply.content = content
            reply.reasoning = reasoning
            reply.stats = "could not continue: ${o.error.ifBlank { "something went wrong" }}"
        } else if (!o.ok && reply.versions.isNotEmpty()) {
            // writing it again failed: the last version comes back, saying why there is no new one
            reply.show(reply.versions.size - 1)
            reply.stats = "could not write again: ${o.error.ifBlank { "something went wrong" }}"
        } else if (!o.ok) {
            reply.error = true
            reply.reasoning = ""
            reply.content = o.error.ifBlank { "Something went wrong." }
        } else {
            val carried = continuedFrom
            reply.content = whole(o.content).trim()
            reply.reasoning = o.reasoning.trim().ifBlank { carried?.second?.trim() ?: "" }
            if (reply.content.isEmpty() && reply.reasoning.isEmpty() && o.stopReason == "stopped") {
                // stopped before a word: the earlier version stays, or the empty reply goes
                if (reply.versions.isNotEmpty()) reply.show(reply.versions.size - 1) else convo?.messages?.remove(reply)
            } else {
                reply.stats = describe(o) + (if (carried != null) " · continued" else "")
                if (o.team > 0) reply.team = o.team
                when {
                    reply.versions.isEmpty() -> {}
                    carried != null -> reply.syncVersion()
                    else -> {
                        reply.versions.add(reply.asVersion())
                        reply.shown = reply.versions.size - 1
                    }
                }
            }
        }
        continuedFrom = null
        // into the chat it was written for, which may not be the one open now
        convo?.let { app.chats.saveAsync(it) }
        changed()
        status()
        if (o.lostPhone) {
            // a phone holding part of the model went away: it loads again with the phones still there
            app.reloadFresh()
        } else if (app.inFront && app.needsReload()) {
            // a setting changed while it wrote (context size, memory mode, picture support) could not
            // reload the model then; it does now, instead of waiting for the next visit to Settings
            // (in the background it waits for the chat to come back: a big load there can get the app closed)
            app.reloadIfNeeded()
        } else if (!reply.error && app.inFront && convo === conversation) {
            // while you read the reply, the model gets ready for your next message
            readAhead()
        }
        if (!app.inFront && app.settings.replyNotifications && o.stopReason != "stopped") {
            val text = (if (reply.content.isNotBlank()) reply.content else reply.reasoning).take(300)
            GenerationService.replyReady(app, if (reply.error) "The reply failed" else "Reply ready", text.ifBlank { "Open the chat to see it." })
        }
    }

    private fun describe(o: ChatOutcome): String {
        val parts = mutableListOf<String>()
        if (o.team > 0) parts += "${o.team} answers, then a review"
        if (o.tGenMs > 0 && o.nGenerated > 1) {
            parts += String.format(Locale.US, "%.1f tok/s", (o.nGenerated - 1) * 1000.0 / o.tGenMs)
        }
        parts += "${o.nGenerated} tokens"
        if (o.tFirstMs > 0) parts += String.format(Locale.US, "first word %.1fs", o.tFirstMs / 1000.0)
        if (o.nDrafted > 0 && o.nSteps > 0) {
            // how much drafting ahead helped: tokens written per model step (1.0 without it)
            parts += String.format(Locale.US, "%.1f tokens per step", o.nGenerated.toDouble() / o.nSteps)
        }
        if (o.nMedia > 0) {
            app.mediaUsed()
            val what = if (o.nMedia == 1) "1 attachment" else "${o.nMedia} attachments"
            parts += String.format(Locale.US, "read %s in %.1fs", what, o.tMediaMs / 1000.0)
        }
        if (o.nEvaluated > 0 && o.tPromptMs > 500) {
            parts += String.format(Locale.US, "read %d in %.1fs", o.nEvaluated, o.tPromptMs / 1000.0)
        }
        if (o.nDropped > 0) parts += "${o.nDropped} oldest messages left out to fit"
        if (o.nMajflt > SLOW_MEMORY_FAULTS) {
            // the context already shrinks to fit at load: what is left is the model itself, or apps opened since
            parts += "slow: the model did not fit in free memory. Close other apps or pick a smaller model"
        }
        when (o.stopReason) {
            "stopped" -> parts += "stopped"
            "context" -> parts += "context full"
            "length" -> parts += "length limit"
        }
        return parts.joinToString(" · ")
    }

    private fun familyOf(model: LoadedModel): Family = app.models.find(model.key)?.family ?: Family.OTHER

    /**
     * The request for a reply to the conversation as it stands, or (with [nextMessage]) for the
     * reply to a message of yours that is not written yet, for reading ahead.
     */
    private fun buildRequest(model: LoadedModel, nextMessage: String? = null): JSONObject {
        val s = app.settings
        val messages = JSONArray()
        val system = systemPrompt()
        if (system.isNotEmpty()) messages.put(JSONObject().put("role", "system").put("content", system))

        // Templates expect turns to alternate; a failed reply leaves two of yours in a row, so
        // those are joined. Failed replies themselves are never sent back to the model.
        var last: JSONObject? = null
        val turns = if (nextMessage == null) conversation.messages
        else conversation.messages + ChatMessage(role = "user", content = nextMessage)
        // only your last message goes with what its web search found: older results stay out (they
        // cost tokens on every turn, and the model answered later questions from them)
        val lastUser = turns.lastOrNull { it.role == "user" && !it.error }
        for (m in turns) {
            if (m.error || m.greeting) continue
            if (m.role == "assistant" && m.content.isBlank()) continue
            val media = if (m.role == "user") mediaJson(m.attachments) else null
            val prev = last
            if (prev != null && prev.getString("role") == m.role) {
                prev.put("content", prev.getString("content") + "\n\n" +
                    (if (m === lastUser && m.web.isNotBlank()) WebSearch.prompt(m.web, m.content) else m.content))
                if (media != null) {
                    val into = prev.optJSONArray("media") ?: JSONArray().also { prev.put("media", it) }
                    for (k in 0 until media.length()) into.put(media.get(k))
                }
                continue
            }
            // a message searched on the web goes to the model with what the search found in front of it
            val text = if (m === lastUser && m.web.isNotBlank()) WebSearch.prompt(m.web, m.content) else m.content
            val j = JSONObject().put("role", m.role).put("content", text)
            // a team reply's separate answers stay out of the conversation; only its reply goes back
            if (m.role == "assistant" && m.reasoning.isNotBlank() && m.team == 0) j.put("reasoning", m.reasoning)
            if (media != null) j.put("media", media)
            messages.put(j)
            last = j
        }

        val catalog = app.models.find(model.key)?.catalog
        val sampling = if (s.useRecommendedSampling) {
            val r = catalog?.sampling ?: familyOf(model).recommended()
            JSONObject().put("temp", r.temp.toDouble()).put("top_p", r.topP.toDouble())
                .put("top_k", r.topK).put("min_p", r.minP.toDouble()).put("repeat_penalty", r.repeat.toDouble())
        } else {
            JSONObject().put("temp", s.temperature.toDouble()).put("top_p", s.topP.toDouble())
                .put("top_k", s.topK).put("min_p", s.minP.toDouble()).put("repeat_penalty", s.repeatPenalty.toDouble())
        }
        sampling.put("max_tokens", s.maxTokens).put("seed", -1)
        val thinking = s.thinking && catalog?.noThinking != true
        if (thinking) sampling.put("thinking_budget", s.thinkingBudget)

        val request = JSONObject()
            .put("messages", messages)
            .put("thinking", thinking)
            .put("now_ms", conversation.createdAt)
            .put("sampling", sampling)
        val team = teamSize()
        if (team > 0) {
            request.put("team", team)
            val p = app.engine.partner
            if (p != null && p.key == s.teamPartner && p.key != model.key) {
                request.put("partner", true).put("partner_name", p.displayName)
            }
        }
        return request
    }

    /** The system prompt: the one set in Settings, and what Nyx remembers about you (Memory). */
    private fun systemPrompt(): String =
        listOf(conversation.characterPrompt.ifBlank { app.settings.systemPrompt.trim() }, app.memory.prompt())
            .filter { it.isNotEmpty() }.joinToString("\n\n")

    /** Answers a team reply is written from (0: answered once). */
    fun teamSize(): Int = app.settings.teamSize.let { if (it >= 2) it.coerceAtMost(3) else 0 }

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
