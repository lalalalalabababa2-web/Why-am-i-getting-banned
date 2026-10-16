package app.offlineai.chat.ui

import android.os.Bundle
import android.text.format.DateUtils
import android.widget.LinearLayout
import android.widget.ScrollView
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import app.offlineai.chat.App

class ChatsActivity : AppCompatActivity() {
    private lateinit var app: App
    private lateinit var content: LinearLayout

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        app = App.of(this)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Palette.bg)
        }
        val bar = topBar("Chats")
        bar.addView(pill("New chat", primary = true) {
            app.chat.newChat()
            finish()
        })
        root.addView(bar, lp(MATCH, WRAP))
        val scroll = ScrollView(this)
        content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(0, dp(4), 0, dp(24))
        }
        scroll.addView(content, android.widget.FrameLayout.LayoutParams(MATCH, WRAP))
        root.addView(scroll, lp(MATCH, 0, 1f))
        setContentView(root)
        edgeToEdge(root)
        build()
    }

    private fun build() {
        content.removeAllViews()
        val chats = app.chats.list()
        if (chats.isEmpty()) {
            content.addView(text("No chats yet.", 14f, Palette.text2).apply { setPadding(dp(20), dp(24), dp(20), 0) })
            return
        }
        val current = app.chat.conversation.id
        chats.forEach { c ->
            val row = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                setPadding(dp(20), dp(12), dp(20), dp(12))
                background = ripple(if (c.id == current) rounded(Palette.surface1, 0f) else null, 0f)
                setOnClickListener {
                    app.chat.open(c.id)
                    finish()
                }
                setOnLongClickListener {
                    confirmDelete(c.id, c.title)
                    true
                }
            }
            row.addView(text(c.title.ifBlank { "Untitled" }, 15f).apply {
                maxLines = 2
                ellipsize = android.text.TextUtils.TruncateAt.END
            })
            val ago = DateUtils.getRelativeTimeSpanString(c.updatedAt, System.currentTimeMillis(), DateUtils.MINUTE_IN_MILLIS)
            row.addView(text("$ago · ${c.count} messages", 12f, Palette.text3))
            content.addView(row, lp(MATCH, WRAP))
        }
        content.addView(text("Touch and hold a chat to delete it.", 12f, Palette.text3).apply {
            setPadding(dp(20), dp(16), dp(20), dp(8))
        })
        content.addView(pill("Delete all chats", danger = true) {
            AlertDialog.Builder(this)
                .setTitle("Delete all chats?")
                .setMessage("This cannot be undone.")
                .setPositiveButton("Delete all") { _, _ ->
                    app.chats.deleteAll()
                    app.chat.newChat()
                    build()
                }
                .setNegativeButton("Cancel", null)
                .show()
        }, lp(WRAP, WRAP).apply { marginStart = dp(20) })
    }

    private fun confirmDelete(id: String, title: String) {
        AlertDialog.Builder(this)
            .setTitle("Delete this chat?")
            .setMessage(title.ifBlank { "Untitled" })
            .setPositiveButton("Delete") { _, _ ->
                app.chats.delete(id)
                app.chat.forget(id)
                build()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }
}
