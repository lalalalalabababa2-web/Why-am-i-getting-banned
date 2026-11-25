package app.offlineai.chat.ui

import app.offlineai.chat.data.MemoryStore
import android.content.Context
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.RecyclerView
import app.offlineai.chat.App
import app.offlineai.chat.R
import app.offlineai.chat.data.ChatMessage

/**
 * The messages of the open conversation. Changes are applied precisely: a reply that grows is
 * updated in place (only its own views), finished or added messages go through DiffUtil, and
 * nothing is ever rebuilt wholesale while you read.
 */
class MessageAdapter(
    private val app: App,
    private val actions: Actions,
) : RecyclerView.Adapter<RecyclerView.ViewHolder>() {

    /** Keeps [text] in Memory, after a chance to shorten it to what matters. */
    private fun remember(context: android.content.Context, text: String) {
        val field = android.widget.EditText(context).apply {
            setText(text.trim().replace(Regex("\\s+"), " ").take(MemoryStore.MAX_CHARS))
            setTextColor(Palette.text)
            textSize = 15f * Palette.fontScale
            background = rounded(Palette.surface2, context.dp(14).toFloat(), context.dp(1), Palette.border)
            setPadding(context.dp(14), context.dp(12), context.dp(14), context.dp(12))
            maxLines = 6
        }
        val box = android.widget.LinearLayout(context).apply {
            setPadding(context.dp(20), context.dp(8), context.dp(20), 0)
            addView(field, lp(MATCH, WRAP))
        }
        androidx.appcompat.app.AlertDialog.Builder(context)
            .setTitle("Remember this")
            .setMessage("Shorten it to what matters. Nyx keeps it in mind in every chat; Settings, Memory lists it.")
            .setView(box)
            .setPositiveButton("Remember") { _, _ ->
                val ok = app.memory.add(field.text.toString())
                android.widget.Toast.makeText(context, if (ok) "Remembered." else "Already remembered, or empty.", android.widget.Toast.LENGTH_SHORT).show()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    interface Actions {
        fun editLast(text: String)
        fun selectText(text: String)
        fun keepInPlace(anchor: View, change: () -> Unit)
        /** Whether the list is following the reply (you are at the bottom). */
        fun isFollowing(): Boolean
    }

    private val messages get() = app.chat.conversation.messages
    private val ids = HashMap<String, Long>()
    private var nextId = 1L

    /** What the list last showed: message id and a fingerprint of its content. */
    private var shown: List<Pair<String, String>> = emptyList()

    /** Thinking opened or closed by hand, and folded code blocks, per message. */
    private val thinkingOpen = HashMap<String, Boolean>()
    private val folded = HashMap<String, MutableSet<Int>>()

    var options = RenderOptions(markdown = true, wrapCode = false, highlight = true, fontScale = 1f)

    init {
        setHasStableIds(true)
    }

    override fun getItemCount() = messages.size
    override fun getItemViewType(position: Int) = if (messages[position].role == "user") 0 else 1
    override fun getItemId(position: Int): Long = ids.getOrPut(messages[position].id) { nextId++ }

    private fun fingerprint(m: ChatMessage) =
        "${m.content.length}|${m.content.hashCode()}|${m.reasoning.length}|${m.stats}|${m.error}|${app.chat.streaming === m}|${m.attachments.size}|${m.shown}/${m.versions.size}"

    /** Shows the conversation as it is now, changing only what changed. */
    fun submit() {
        val now = messages.map { it.id to fingerprint(it) }
        val old = shown
        val diff = DiffUtil.calculateDiff(object : DiffUtil.Callback() {
            override fun getOldListSize() = old.size
            override fun getNewListSize() = now.size
            override fun areItemsTheSame(o: Int, n: Int) = old[o].first == now[n].first
            override fun areContentsTheSame(o: Int, n: Int) = old[o].second == now[n].second
        }, false)
        shown = now
        diff.dispatchUpdatesTo(this)
    }

    /** Messages already on screen once: only ones that come after arrive with motion. */
    private val arrived = HashSet<String>()

    private fun arrive(view: View, m: ChatMessage) {
        if (arrived.add(m.id)) Motion.enter(view)
    }

    /** A different conversation: everything is new. */
    fun reset() {
        arrived.clear()
        messages.forEach { arrived.add(it.id) }
        shown = messages.map { it.id to fingerprint(it) }
        notifyDataSetChanged()
    }

    /** The reply being written grew; redraw only it. */
    fun replyChanged() {
        val i = messages.indexOfFirst { it === app.chat.streaming }
        if (i >= 0) {
            notifyItemChanged(i, PAYLOAD_STREAM)
            shown = messages.map { it.id to fingerprint(it) }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder =
        if (viewType == 0) UserHolder(parent.context) else ReplyHolder(parent.context)

    override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
        val m = messages[position]
        when (holder) {
            is UserHolder -> holder.bind(m, position == messages.indexOfLast { it.role == "user" })
            is ReplyHolder -> holder.bind(m, position == messages.size - 1)
        }
        arrive(holder.itemView, m)
    }

    override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int, payloads: MutableList<Any>) {
        // the same binding either way; the views it reuses make a growing reply cheap
        onBindViewHolder(holder, position)
    }

    inner class UserHolder(ctx: Context) : RecyclerView.ViewHolder(LinearLayout(ctx)) {
        private val row = itemView as LinearLayout
        private val media = android.widget.LinearLayout(ctx).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.END
        }
        private val bubble = ctx.text().apply {
            val r = ctx.dp(22).toFloat()
            background = android.graphics.drawable.GradientDrawable().apply {
                setColor(androidx.core.graphics.ColorUtils.blendARGB(Palette.surface2, Palette.accent, if (Palette.dark) 0.22f else 0.14f))
                cornerRadii = floatArrayOf(r, r, r, r, ctx.dp(6).toFloat(), ctx.dp(6).toFloat(), r, r)
            }
            setPadding(ctx.dp(16), ctx.dp(11), ctx.dp(16), ctx.dp(11))
            maxWidth = (ctx.resources.displayMetrics.widthPixels * 0.82).toInt()
        }
        private var mediaShown: List<app.offlineai.chat.data.Attachment>? = null

        init {
            row.orientation = LinearLayout.VERTICAL
            row.gravity = Gravity.END
            row.layoutParams = RecyclerView.LayoutParams(MATCH, WRAP)
            row.setPadding(ctx.dp(48), ctx.dp(12), ctx.dp(14), ctx.dp(4))
            row.addView(media, lp(WRAP, WRAP).apply { gravity = Gravity.END })
            row.addView(bubble, lp(WRAP, WRAP).apply { gravity = Gravity.END })
        }

        fun bind(m: ChatMessage, isLastUser: Boolean) {
            if (mediaShown !== m.attachments) {
                // pictures, videos and recordings sent with it, as small tiles; tap one to see it
                mediaShown = m.attachments
                media.removeAllViews()
                val ctx = itemView.context
                val shown = m.attachments.take(4)
                for (a in shown) {
                    media.addView(Thumbs.tile(ctx, a, if (m.attachments.size == 1) 132 else 72, onClick = { Thumbs.show(ctx, a) }),
                        lp(WRAP, WRAP).apply { marginStart = ctx.dp(6) })
                }
                if (m.attachments.size > shown.size) {
                    media.addView(ctx.text("+${m.attachments.size - shown.size}", 14f, Palette.text2, bold = true).apply {
                        gravity = Gravity.CENTER
                    }, lp(ctx.dp(40), ctx.dp(72)))
                }
                media.visibility = if (m.attachments.isEmpty()) View.GONE else View.VISIBLE
                (bubble.layoutParams as LinearLayout.LayoutParams).topMargin = if (m.attachments.isEmpty()) 0 else ctx.dp(6)
            }
            bubble.visibility = if (m.content.isBlank()) View.GONE else View.VISIBLE
            bubble.text = m.content
            val menu = View.OnClickListener { v ->
                val act = v.context as? android.app.Activity ?: return@OnClickListener
                val sheet = Sheet(act)
                    .item("Copy", R.drawable.ic_copy) { v.context.copyText("message", m.content) }
                    .item("Select text") { actions.selectText(m.content) }
                if (m.content.isNotBlank()) {
                    sheet.item("Remember this", R.drawable.ic_spark, "Nyx keeps it in mind in every chat (Settings, Memory)") {
                        remember(v.context, m.content)
                    }
                }
                if (isLastUser && !app.chat.generating) {
                    sheet.item("Edit and send again", R.drawable.ic_refresh) { app.chat.takeBackLast()?.let(actions::editLast) }
                }
                if (!app.chat.generating) sheet.item("Delete", R.drawable.ic_close, danger = true) { app.chat.delete(m) }
                sheet.show()
            }
            bubble.setOnClickListener(menu)
            bubble.setOnLongClickListener { menu.onClick(it); true }
            // a message of only attachments has no bubble: its tiles open the same menu on a long press
            for (i in 0 until media.childCount) media.getChildAt(i).setOnLongClickListener { menu.onClick(it); true }
        }
    }

    inner class ReplyHolder(ctx: Context) : RecyclerView.ViewHolder(LinearLayout(ctx)), Markdown.Host {
        private val col = itemView as LinearLayout
        private val chevron = ImageView(ctx)
        private val thinkLabel = ctx.text("", 13f, Palette.text3, bold = true)
        private val thinkHeader = LinearLayout(ctx)
        private val thinkBody = ctx.text("", 13.5f, Palette.text2)
        private val thinkWrap = LinearLayout(ctx)
        private val content = LinearLayout(ctx).apply { orientation = LinearLayout.VERTICAL }
        private val waiting = ctx.text("", 14f, Palette.text3)
        private val dots = TypingDots(ctx)
        private val errorText = ctx.text("", 14f, Palette.danger)
        private val stats = ctx.text("", 12f, Palette.text3).apply {
            // one line; a tap shows all of it
            maxLines = 1
            ellipsize = android.text.TextUtils.TruncateAt.END
            setOnClickListener { maxLines = if (maxLines == 1) 8 else 1 }
        }
        /** What went wrong or was left out (slow from memory, context full…): on its own line, in full. */
        private val note = ctx.text("", 12f, Palette.caution)
        private val copy = ctx.iconButton(R.drawable.ic_copy, "Copy reply", Palette.text3) {}
        private val again = ctx.iconButton(R.drawable.ic_refresh, "Write again", Palette.text3) {}
        /** A reply cut off by its length limit (or stopped): carry on from where it stopped. */
        private val cont = ctx.pill("Continue") { app.chat.continueLast() }.apply {
            minHeight = ctx.dp(32)
            setPadding(ctx.dp(14), ctx.dp(4), ctx.dp(14), ctx.dp(4))
        }
        private val more = ctx.iconButton(R.drawable.ic_more, "More", Palette.text3) {}
        /** The versions Write again kept of the last reply: earlier, "2/3", later. */
        private val prevVersion = ctx.iconButton(R.drawable.ic_back, "Earlier version of this reply", Palette.text3) {}
        private val versionLabel = ctx.text("", 12f, Palette.text3)
        private val nextVersion = ctx.iconButton(R.drawable.ic_chevron_right, "Later version of this reply", Palette.text3) {}
        private val versionsBar = LinearLayout(ctx)
        private val footer = LinearLayout(ctx)
        private var message: ChatMessage? = null
        private var thinkingShown = ""

        init {
            col.orientation = LinearLayout.VERTICAL
            col.layoutParams = RecyclerView.LayoutParams(MATCH, WRAP)
            col.setPadding(ctx.dp(16), ctx.dp(12), ctx.dp(12), ctx.dp(2))

            thinkHeader.orientation = LinearLayout.HORIZONTAL
            thinkHeader.gravity = Gravity.CENTER_VERTICAL
            thinkHeader.setPadding(0, ctx.dp(4), ctx.dp(8), ctx.dp(4))
            thinkHeader.background = ripple(null, ctx.dp(8).toFloat())
            chevron.layoutParams = lp(ctx.dp(18), ctx.dp(18))
            thinkHeader.addView(chevron)
            thinkHeader.addView(thinkLabel, lp(WRAP, WRAP).apply { marginStart = ctx.dp(4) })
            col.addView(thinkHeader, lp(WRAP, WRAP))

            thinkBody.setText("", TextView.BufferType.EDITABLE)
            thinkWrap.orientation = LinearLayout.HORIZONTAL
            thinkWrap.addView(View(ctx).apply { setBackgroundColor(Palette.borderStrong) }, lp(ctx.dp(2), MATCH))
            thinkWrap.addView(thinkBody, lp(0, WRAP, 1f).apply { marginStart = ctx.dp(10) })
            col.addView(thinkWrap, lp(MATCH, WRAP).apply { setMargins(ctx.dp(8), ctx.dp(2), 0, ctx.dp(8)) })

            col.addView(dots, lp(ctx.dp(44), ctx.dp(24)))
            col.addView(waiting)
            col.addView(content, lp(MATCH, WRAP))
            col.addView(errorText)

            footer.orientation = LinearLayout.HORIZONTAL
            footer.gravity = Gravity.CENTER_VERTICAL
            footer.addView(stats, lp(0, WRAP, 1f))
            versionsBar.orientation = LinearLayout.HORIZONTAL
            versionsBar.gravity = Gravity.CENTER_VERTICAL
            versionsBar.addView(prevVersion, lp(ctx.dp(32), ctx.dp(36)))
            versionsBar.addView(versionLabel)
            versionsBar.addView(nextVersion, lp(ctx.dp(32), ctx.dp(36)))
            footer.addView(versionsBar, lp(WRAP, WRAP))
            footer.addView(copy, lp(ctx.dp(36), ctx.dp(36)))
            footer.addView(again, lp(ctx.dp(36), ctx.dp(36)))
            footer.addView(more, lp(ctx.dp(36), ctx.dp(36)))
            col.addView(footer, lp(MATCH, WRAP).apply { topMargin = ctx.dp(2) })
            col.addView(note, lp(MATCH, WRAP).apply { topMargin = ctx.dp(2) })
            col.addView(cont, lp(WRAP, WRAP).apply { topMargin = ctx.dp(6) })

            content.setOnLongClickListener { showMenu(it); true }
        }

        // Markdown.Host
        override fun isCollapsed(blockIndex: Int) = message?.let { folded[it.id]?.contains(blockIndex) } ?: false

        override fun toggleCollapsed(blockIndex: Int, anchor: View) {
            val m = message ?: return
            actions.keepInPlace(anchor) {
                val set = folded.getOrPut(m.id) { mutableSetOf() }
                if (!set.add(blockIndex)) set.remove(blockIndex)
                bindContent(m)
            }
        }

        override fun copy(label: String, text: String) = itemView.context.copyText(label, text)

        private fun showMenu(v: View) {
            val m = message ?: return
            val act = v.context as? android.app.Activity ?: return
            val sheet = Sheet(act)
                .item("Copy", R.drawable.ic_copy) { v.context.copyText("reply", m.content) }
                .item("Select text") { actions.selectText(m.content) }
            val readable = !m.error && m.content.isNotBlank() && app.chat.streaming !== m
            if (readable) {
                sheet.item("Remember this", R.drawable.ic_spark, "Nyx keeps it in mind in every chat (Settings, Memory)") {
                    remember(v.context, m.content)
                }
                sheet.item("Translate or rewrite", R.drawable.ic_translate, "Tools: translate, humanize, summarize, fix") {
                    v.context.startActivity(android.content.Intent(v.context, ToolsActivity::class.java)
                        .putExtra(ToolsActivity.EXTRA_TEXT, m.content))
                }
                sheet.item(if (ReadAloud.isReading(m.id)) "Stop reading" else "Read aloud", R.drawable.ic_audio) {
                    if (ReadAloud.isReading(m.id)) ReadAloud.stop() else ReadAloud.read(v.context, m.id, m.content)
                }
                sheet.item("Share", R.drawable.ic_arrow_down, "To another app on this phone") {
                    val send = android.content.Intent(android.content.Intent.ACTION_SEND)
                        .setType("text/plain")
                        .putExtra(android.content.Intent.EXTRA_TEXT, m.content)
                    runCatching { v.context.startActivity(android.content.Intent.createChooser(send, "Share the reply")) }
                }
            }
            if (!app.chat.generating) {
                sheet.item("Delete", R.drawable.ic_close, danger = true) {
                    if (ReadAloud.isReading(m.id)) ReadAloud.stop()
                    app.chat.delete(m)
                }
            }
            sheet.show()
        }

        fun bind(m: ChatMessage, isLast: Boolean) {
            if (message !== m) {
                // a different message in this view: start its text views from scratch
                message = m
                thinkingShown = ""
                thinkBody.editableText?.clear()
                content.removeAllViews()
                content.tag = null
            }
            val ctx = itemView.context
            val streaming = app.chat.streaming === m
            val hasThinking = m.reasoning.isNotBlank()

            // Thinking: open while it is the only thing being written; folded once the answer
            // starts, unless the setting keeps it open or you opened it.
            thinkHeader.visibility = if (hasThinking) View.VISIBLE else View.GONE
            // If you are reading the thinking when the answer starts, it stays open: folding it
            // would pull the text out from under you.
            if (streaming && hasThinking && m.content.isNotBlank() && thinkingOpen[m.id] == null &&
                thinkWrap.visibility == View.VISIBLE && !actions.isFollowing()
            ) {
                thinkingOpen[m.id] = true
            }
            val open = thinkingOpen[m.id] ?: (app.settings.expandThinking || (streaming && m.content.isBlank()))
            thinkWrap.visibility = if (hasThinking && open) View.VISIBLE else View.GONE
            if (hasThinking) {
                thinkLabel.text = when {
                    m.team > 0 && streaming && m.content.isBlank() -> "Working it out together…"
                    m.team > 0 -> "How they worked it out"
                    streaming && m.content.isBlank() -> "Thinking…"
                    else -> "Thoughts"
                }
                chevron.setImageDrawable(ContextCompat.getDrawable(ctx, if (open) R.drawable.ic_chevron_down else R.drawable.ic_chevron_right)
                    ?.mutate()?.apply { setTint(Palette.text3) })
                if (open) {
                    // raw while it streams (each update only appends); readable maths once it is done
                    val r = if (streaming) m.reasoning else MathText.pretty(m.reasoning)
                    val e = thinkBody.editableText
                    if (e != null && r != thinkingShown) {
                        if (r.startsWith(thinkingShown) && thinkingShown.isNotEmpty()) e.append(r, thinkingShown.length, r.length)
                        else { e.clear(); e.append(r) }
                        thinkingShown = r
                    }
                }
                thinkHeader.setOnClickListener {
                    actions.keepInPlace(thinkHeader) {
                        thinkingOpen[m.id] = !open
                        bind(m, isLast)
                    }
                }
            }

            if (m.error) {
                errorText.visibility = View.VISIBLE
                errorText.text = m.content
                content.visibility = View.GONE
            } else {
                errorText.visibility = View.GONE
                bindContent(m)
            }

            if (streaming && m.content.isBlank() && !hasThinking) {
                val c = app.chat
                val reading = c.promptTotal > 0 && c.promptDone < c.promptTotal
                waiting.visibility = if (reading) View.VISIBLE else View.GONE
                dots.visibility = if (reading) View.GONE else View.VISIBLE
                if (reading) waiting.text = "Reading… ${c.promptDone * 100 / c.promptTotal}%${c.promptEtaLabel()}"
            } else {
                waiting.visibility = View.GONE
                dots.visibility = View.GONE
            }

            if (streaming) {
                footer.visibility = View.GONE
                cont.visibility = View.GONE
                note.visibility = View.GONE
            } else {
                footer.visibility = View.VISIBLE
                // which model wrote it, so a chat that changed models says who said what; what
                // needs attention goes on its own line below
                val parts = if (m.error) emptyList() else listOf(m.model).filter { it.isNotBlank() } + m.stats.split(" · ").filter { it.isNotBlank() }
                val warn = parts.filter { isWarning(it) }.map { warningText(it) }
                stats.text = parts.filterNot { isWarning(it) }.joinToString(" · ")
                stats.maxLines = 1
                note.text = warn.joinToString("\n")
                note.visibility = if (warn.isEmpty()) View.GONE else View.VISIBLE
                copy.visibility = if (m.error || m.content.isBlank()) View.GONE else View.VISIBLE
                copy.setOnClickListener { ctx.copyText("reply", m.content) }
                again.visibility = if (isLast && !m.greeting && !app.chat.generating && app.engine.loaded != null) View.VISIBLE else View.GONE
                again.setOnClickListener { app.chat.regenerate() }
                cont.visibility = if (isLast && app.chat.canContinue(m)) View.VISIBLE else View.GONE
                val many = isLast && m.versions.size > 1 && !app.chat.generating
                versionsBar.visibility = if (many) View.VISIBLE else View.GONE
                if (many) {
                    versionLabel.text = "${m.shown + 1}/${m.versions.size}"
                    prevVersion.alpha = if (m.shown > 0) 1f else 0.3f
                    nextVersion.alpha = if (m.shown < m.versions.size - 1) 1f else 0.3f
                    prevVersion.setOnClickListener { app.chat.flipVersion(m, -1) }
                    nextVersion.setOnClickListener { app.chat.flipVersion(m, +1) }
                }
                more.setOnClickListener { showMenu(it) }
            }
        }

        private fun bindContent(m: ChatMessage) {
            content.visibility = if (m.content.isBlank()) View.GONE else View.VISIBLE
            if (m.content.isNotBlank()) {
                try {
                    Markdown.render(content, m.content, options, this)
                } catch (e: Exception) {
                    // never lose a reply to a drawing problem: show it as plain text
                    content.removeAllViews()
                    content.tag = null
                    content.addView(itemView.context.text(m.content))
                }
            }
        }
    }

    companion object {
        const val PAYLOAD_STREAM = "stream"
    }
}


/** Parts of a reply's stats line that need the reader's attention. */
private fun isWarning(part: String): Boolean =
    part.startsWith("slow because") || part.startsWith("slow:") || part.endsWith("left out to fit") || part == "context full"

private fun warningText(part: String): String = when {
    // replies saved before the wording changed
    part.startsWith("slow because") -> "Slow: the model did not fit in free memory. Close other apps, lower the context size in Settings, or pick a smaller model"
    part == "context full" -> "Stopped: the conversation filled the context. Start a new chat or raise the context size"
    else -> part.replaceFirstChar { it.uppercase() }
}
