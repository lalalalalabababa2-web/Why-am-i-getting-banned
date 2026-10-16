package app.offlineai.chat.ui

import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.text.Editable
import android.text.TextWatcher
import android.text.format.DateUtils
import android.view.Gravity
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.PopupMenu
import android.widget.ScrollView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import app.offlineai.chat.App
import app.offlineai.chat.R
import app.offlineai.chat.data.ChatStore
import app.offlineai.chat.data.ChatSummary
import java.util.concurrent.Executors

class ChatsActivity : AppCompatActivity() {
    private lateinit var app: App
    private lateinit var content: LinearLayout
    private lateinit var search: EditText
    private val main = Handler(Looper.getMainLooper())
    private val io = Executors.newSingleThreadExecutor()
    private var exportId: String? = null

    private val exportOne = registerForActivityResult(ActivityResultContracts.CreateDocument("text/markdown")) { uri: Uri? ->
        val id = exportId ?: return@registerForActivityResult
        if (uri != null) writeOut(uri) { app.chats.load(id)?.let { ChatStore.toMarkdown(it) } ?: "" }
    }
    private val exportAll = registerForActivityResult(ActivityResultContracts.CreateDocument("application/json")) { uri: Uri? ->
        if (uri != null) writeOut(uri) { app.chats.exportAll() }
    }
    private val importFile = registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri: Uri? ->
        if (uri != null) importFrom(uri)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        app = App.of(this)
        Palette.apply(this, app.settings)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Palette.bg)
        }
        val bar = topBar("Chats")
        bar.addView(pill("New chat", primary = true) {
            app.chat.newChat()
            finish()
        })
        bar.addView(iconButton(R.drawable.ic_more, "More") {}.also { more ->
            more.setOnClickListener { v ->
                val pm = PopupMenu(this, v)
                pm.menu.add(0, 1, 0, "Export all chats")
                pm.menu.add(0, 2, 1, "Import chats")
                pm.menu.add(0, 3, 2, "Delete all chats")
                pm.setOnMenuItemClickListener {
                    when (it.itemId) {
                        1 -> exportAll.launch("offline-ai-chats.json")
                        2 -> importFile.launch(arrayOf("application/json", "text/plain", "*/*"))
                        3 -> confirmDeleteAll()
                    }
                    true
                }
                pm.show()
            }
        })
        root.addView(bar, lp(MATCH, WRAP))

        search = EditText(this).apply {
            hint = "Search chats"
            setHintTextColor(Palette.text3)
            setTextColor(Palette.text)
            textSize = 15f * Palette.fontScale
            isSingleLine = true
            background = rounded(Palette.surface2, dp(20).toFloat(), dp(1), Palette.border)
            setPadding(dp(40), dp(9), dp(14), dp(9))
            setCompoundDrawablesRelativeWithIntrinsicBounds(
                ContextCompat.getDrawable(context, R.drawable.ic_search)?.mutate()?.apply { setTint(Palette.text3) }, null, null, null,
            )
            compoundDrawablePadding = dp(8)
            setPaddingRelative(dp(12), dp(9), dp(14), dp(9))
            addTextChangedListener(object : TextWatcher {
                override fun beforeTextChanged(s: CharSequence?, a: Int, b: Int, c: Int) {}
                override fun onTextChanged(s: CharSequence?, a: Int, b: Int, c: Int) {}
                override fun afterTextChanged(s: Editable?) {
                    main.removeCallbacks(searchNow)
                    main.postDelayed(searchNow, 200)
                }
            })
        }
        root.addView(search, lp(MATCH, WRAP).apply { setMargins(dp(16), dp(4), dp(16), dp(8)) })

        val scroll = ScrollView(this)
        content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(0, dp(4), 0, dp(24))
        }
        scroll.addView(content, android.widget.FrameLayout.LayoutParams(MATCH, WRAP))
        root.addView(scroll, lp(MATCH, 0, 1f))
        setContentView(root)
        edgeToEdge(root)
        load()
    }

    override fun onDestroy() {
        main.removeCallbacksAndMessages(null)
        io.shutdown()
        super.onDestroy()
    }

    private val searchNow = Runnable { load() }

    /** Reads the list (or the search results) off the main thread. */
    private fun load() {
        if (io.isShutdown) return
        val q = search.text.toString()
        io.execute {
            val items = try {
                app.chats.search(q)
            } catch (e: Exception) {
                emptyList()
            }
            main.post { if (!isFinishing) show(items, q) }
        }
    }

    private fun show(chats: List<ChatSummary>, query: String) {
        content.removeAllViews()
        if (chats.isEmpty()) {
            content.addView(text(if (query.isBlank()) "No chats yet." else "No chats contain \"$query\".", 14f, Palette.text2).apply {
                setPadding(dp(20), dp(24), dp(20), 0)
            })
            return
        }
        val current = app.chat.conversation.id
        chats.forEach { c ->
            val row = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
                setPadding(dp(20), dp(10), dp(8), dp(10))
                background = ripple(if (c.id == current) rounded(Palette.surface1, 0f) else null, 0f)
                setOnClickListener {
                    app.chat.open(c.id)
                    finish()
                }
            }
            val texts = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
            texts.addView(text(c.title.ifBlank { "Untitled" }, 15f).apply {
                maxLines = 2
                ellipsize = android.text.TextUtils.TruncateAt.END
            })
            val ago = DateUtils.getRelativeTimeSpanString(c.updatedAt, System.currentTimeMillis(), DateUtils.MINUTE_IN_MILLIS)
            texts.addView(text("$ago · ${c.count} messages", 12f, Palette.text3))
            row.addView(texts, lp(0, WRAP, 1f))
            row.addView(iconButton(R.drawable.ic_more, "Options for this chat", Palette.text3) {}.also { b ->
                b.setOnClickListener { v -> rowMenu(v, c) }
            })
            row.setOnLongClickListener { rowMenu(it, c); true }
            content.addView(row, lp(MATCH, WRAP))
        }
    }

    private fun rowMenu(anchor: android.view.View, c: ChatSummary) {
        val pm = PopupMenu(this, anchor)
        pm.menu.add(0, 1, 0, "Rename")
        pm.menu.add(0, 2, 1, "Export as Markdown")
        pm.menu.add(0, 3, 2, "Delete")
        pm.setOnMenuItemClickListener {
            when (it.itemId) {
                1 -> rename(c)
                2 -> {
                    exportId = c.id
                    val name = c.title.ifBlank { "chat" }.replace(Regex("[^A-Za-z0-9 _-]"), "").trim().take(40).ifBlank { "chat" }
                    exportOne.launch("$name.md")
                }
                3 -> confirmDelete(c)
            }
            true
        }
        pm.show()
    }

    private fun rename(c: ChatSummary) {
        val field = EditText(this).apply {
            setText(c.title)
            setTextColor(Palette.text)
            isSingleLine = true
            setSelection(text.length)
        }
        val box = LinearLayout(this).apply {
            setPadding(dp(20), dp(8), dp(20), 0)
            addView(field, lp(MATCH, WRAP))
        }
        AlertDialog.Builder(this)
            .setTitle("Rename chat")
            .setView(box)
            .setPositiveButton("Save") { _, _ ->
                val title = field.text.toString().trim()
                if (app.chat.conversation.id == c.id && !app.chat.generating) {
                    app.chat.conversation.title = title
                    app.chats.save(app.chat.conversation)
                } else {
                    app.chats.rename(c.id, title)
                }
                load()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun confirmDelete(c: ChatSummary) {
        AlertDialog.Builder(this)
            .setTitle("Delete this chat?")
            .setMessage(c.title.ifBlank { "Untitled" })
            .setPositiveButton("Delete") { _, _ ->
                app.chats.delete(c.id)
                app.chat.forget(c.id)
                load()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun confirmDeleteAll() {
        AlertDialog.Builder(this)
            .setTitle("Delete all chats?")
            .setMessage("This cannot be undone. Export them first if you want a copy.")
            .setPositiveButton("Delete all") { _, _ ->
                app.chat.newChat()
                app.chats.deleteAll()
                load()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun writeOut(uri: Uri, produce: () -> String) {
        io.execute {
            val error = try {
                val text = produce()
                contentResolver.openOutputStream(uri)?.use { it.write(text.toByteArray(Charsets.UTF_8)) }
                    ?: throw IllegalStateException("could not open the file")
                null
            } catch (e: Exception) {
                e.message ?: e.toString()
            }
            main.post {
                Toast.makeText(this, if (error == null) "Saved" else "Could not save: $error", Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun importFrom(uri: Uri) {
        io.execute {
            val result = try {
                val text = contentResolver.openInputStream(uri)?.use { it.readBytes().toString(Charsets.UTF_8) }
                    ?: throw IllegalStateException("could not open the file")
                "Imported ${app.chats.importJson(text)} chats"
            } catch (e: Exception) {
                "Could not import: this does not look like an Offline AI chat export (${e.message})"
            }
            main.post {
                Toast.makeText(this, result, Toast.LENGTH_LONG).show()
                load()
            }
        }
    }
}
