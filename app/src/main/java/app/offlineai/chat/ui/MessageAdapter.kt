package app.offlineai.chat.ui

import android.content.Context
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.PopupMenu
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.RecyclerView
import app.offlineai.chat.App
import app.offlineai.chat.R
import app.offlineai.chat.data.ChatMessage

class MessageAdapter(private val app: App, private val onEditLast: (String) -> Unit) :
    RecyclerView.Adapter<RecyclerView.ViewHolder>() {

    private val messages get() = app.chat.conversation.messages
    /** Replies whose thinking was opened or closed by hand. */
    private val thinkingToggled = mutableMapOf<String, Boolean>()

    override fun getItemCount() = messages.size

    override fun getItemViewType(position: Int) = if (messages[position].role == "user") 0 else 1

    override fun getItemId(position: Int) = messages[position].id.hashCode().toLong()

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder =
        if (viewType == 0) UserHolder(parent.context) else ReplyHolder(parent.context)

    override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
        val m = messages[position]
        when (holder) {
            is UserHolder -> holder.bind(m, position == lastUserIndex())
            is ReplyHolder -> holder.bind(m, position == messages.size - 1)
        }
    }

    private fun lastUserIndex() = messages.indexOfLast { it.role == "user" }

    inner class UserHolder(ctx: Context) : RecyclerView.ViewHolder(LinearLayout(ctx)) {
        private val row = itemView as LinearLayout
        private val bubble = ctx.text().apply {
            background = rounded(Palette.surface3, ctx.dp(18).toFloat())
            setPadding(ctx.dp(14), ctx.dp(10), ctx.dp(14), ctx.dp(10))
            maxWidth = (ctx.resources.displayMetrics.widthPixels * 0.82).toInt()
        }

        init {
            row.orientation = LinearLayout.HORIZONTAL
            row.gravity = Gravity.END
            row.layoutParams = RecyclerView.LayoutParams(MATCH, WRAP)
            row.setPadding(ctx.dp(48), ctx.dp(10), ctx.dp(14), ctx.dp(4))
            row.addView(bubble, lp(WRAP, WRAP))
        }

        fun bind(m: ChatMessage, isLastUser: Boolean) {
            bubble.text = m.content
            bubble.setOnClickListener { v ->
                val menu = PopupMenu(v.context, v)
                menu.menu.add(0, 1, 0, "Copy")
                if (isLastUser && !app.chat.generating) menu.menu.add(0, 2, 1, "Edit and send again")
                if (!app.chat.generating) menu.menu.add(0, 3, 2, "Delete")
                menu.setOnMenuItemClickListener {
                    when (it.itemId) {
                        1 -> v.context.copyText("message", m.content)
                        2 -> app.chat.takeBackLast()?.let(onEditLast)
                        3 -> app.chat.delete(m)
                    }
                    true
                }
                menu.show()
            }
        }
    }

    inner class ReplyHolder(ctx: Context) : RecyclerView.ViewHolder(LinearLayout(ctx)) {
        private val col = itemView as LinearLayout
        private val chevron = ImageView(ctx)
        private val thinkLabel = ctx.text("", 13f, Palette.text3, bold = true)
        private val thinkHeader = LinearLayout(ctx)
        private val thinkBody = ctx.text("", 13.5f, Palette.text2).apply { setTextIsSelectable(true) }
        private val thinkWrap = LinearLayout(ctx)
        private val content = LinearLayout(ctx).apply { orientation = LinearLayout.VERTICAL }
        private val waiting = ctx.text("", 14f, Palette.text3)
        private val errorText = ctx.text("", 14f, Palette.danger)
        private val stats = ctx.text("", 12f, Palette.text3)
        private val copy = ctx.iconButton(R.drawable.ic_copy, "Copy reply", Palette.text3) {}
        private val again = ctx.iconButton(R.drawable.ic_refresh, "Write again", Palette.text3) {}
        private val footer = LinearLayout(ctx)

        init {
            col.orientation = LinearLayout.VERTICAL
            col.layoutParams = RecyclerView.LayoutParams(MATCH, WRAP)
            col.setPadding(ctx.dp(16), ctx.dp(10), ctx.dp(12), ctx.dp(2))

            thinkHeader.orientation = LinearLayout.HORIZONTAL
            thinkHeader.gravity = Gravity.CENTER_VERTICAL
            thinkHeader.setPadding(0, ctx.dp(4), ctx.dp(8), ctx.dp(4))
            thinkHeader.background = ripple(null, ctx.dp(8).toFloat())
            chevron.layoutParams = lp(ctx.dp(18), ctx.dp(18))
            thinkHeader.addView(chevron)
            thinkHeader.addView(thinkLabel, lp(WRAP, WRAP).apply { marginStart = ctx.dp(4) })
            col.addView(thinkHeader, lp(WRAP, WRAP))

            thinkWrap.orientation = LinearLayout.HORIZONTAL
            thinkWrap.addView(View(ctx).apply { setBackgroundColor(Palette.borderStrong) }, lp(ctx.dp(2), MATCH))
            thinkWrap.addView(thinkBody, lp(0, WRAP, 1f).apply { marginStart = ctx.dp(10) })
            col.addView(thinkWrap, lp(MATCH, WRAP).apply { setMargins(ctx.dp(8), ctx.dp(2), 0, ctx.dp(8)) })

            col.addView(waiting)
            col.addView(content, lp(MATCH, WRAP))
            col.addView(errorText)

            footer.orientation = LinearLayout.HORIZONTAL
            footer.gravity = Gravity.CENTER_VERTICAL
            footer.addView(stats, lp(0, WRAP, 1f))
            footer.addView(copy, lp(ctx.dp(36), ctx.dp(36)))
            footer.addView(again, lp(ctx.dp(36), ctx.dp(36)))
            col.addView(footer, lp(MATCH, WRAP).apply { topMargin = ctx.dp(2) })
        }

        fun bind(m: ChatMessage, isLast: Boolean) {
            val ctx = itemView.context
            val streaming = app.chat.streaming === m
            val hasThinking = m.reasoning.isNotBlank()

            // Thinking: open while it is the only thing being written, then folded away unless
            // the setting says to keep it open or it was opened by hand.
            thinkHeader.visibility = if (hasThinking) View.VISIBLE else View.GONE
            val open = thinkingToggled[m.id] ?: (app.settings.expandThinking || (streaming && m.content.isBlank()))
            thinkWrap.visibility = if (hasThinking && open) View.VISIBLE else View.GONE
            if (hasThinking) {
                thinkLabel.text = if (streaming && m.content.isBlank()) "Thinking…" else "Thoughts"
                chevron.setImageDrawable(ContextCompat.getDrawable(ctx, if (open) R.drawable.ic_chevron_down else R.drawable.ic_chevron_right)
                    ?.mutate()?.apply { setTint(Palette.text3) })
                if (open) thinkBody.text = m.reasoning.trim()
                thinkHeader.setOnClickListener {
                    thinkingToggled[m.id] = !open
                    notifyItemChanged(bindingAdapterPosition)
                }
            }

            if (m.error) {
                errorText.visibility = View.VISIBLE
                errorText.text = m.content
                content.visibility = View.GONE
                content.removeAllViews()
            } else {
                errorText.visibility = View.GONE
                content.visibility = if (m.content.isBlank()) View.GONE else View.VISIBLE
                if (m.content.isNotBlank()) Markdown.render(content, m.content) else content.removeAllViews()
            }

            if (streaming && m.content.isBlank() && !hasThinking) {
                waiting.visibility = View.VISIBLE
                val c = app.chat
                waiting.text = if (c.promptTotal > 0 && c.promptDone < c.promptTotal) {
                    "Reading… ${c.promptDone * 100 / c.promptTotal}%"
                } else {
                    "…"
                }
            } else {
                waiting.visibility = View.GONE
            }

            if (streaming) {
                footer.visibility = View.GONE
            } else {
                footer.visibility = View.VISIBLE
                stats.text = if (m.error) "" else m.stats
                copy.visibility = if (m.error || m.content.isBlank()) View.GONE else View.VISIBLE
                copy.setOnClickListener { ctx.copyText("reply", m.content) }
                again.visibility = if (isLast && !app.chat.generating && app.engine.loaded != null) View.VISIBLE else View.GONE
                again.setOnClickListener { app.chat.regenerate() }
            }
        }
    }
}
