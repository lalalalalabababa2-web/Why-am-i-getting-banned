package app.offlineai.chat.ui

import android.content.Intent
import android.os.Bundle
import android.text.Editable
import android.text.InputType
import android.text.TextWatcher
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.ImageButton
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import app.offlineai.chat.App
import app.offlineai.chat.ChatController
import app.offlineai.chat.R
import app.offlineai.chat.engine.EngineController
import java.util.Locale

class MainActivity : AppCompatActivity(), ChatController.Listener, EngineController.StateListener {
    private lateinit var app: App
    private lateinit var list: RecyclerView
    private lateinit var adapter: MessageAdapter
    private lateinit var title: TextView
    private lateinit var subtitle: TextView
    private lateinit var input: EditText
    private lateinit var send: ImageButton
    private lateinit var progress: ProgressBar
    private lateinit var empty: LinearLayout
    private lateinit var emptyText: TextView
    private lateinit var emptyButton: TextView

    private var renderPending = false
    private val renderReply = Runnable {
        renderPending = false
        val last = app.chat.conversation.messages.size - 1
        if (last < 0) return@Runnable
        val atBottom = !list.canScrollVertically(1)
        adapter.notifyItemChanged(last)
        if (atBottom) list.post { list.scrollBy(0, 1_000_000) }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        app = App.of(this)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Palette.bg)
        }

        // top bar: chats · model (tap to change) · new chat · settings
        val bar = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(4), dp(4), dp(4), dp(4))
        }
        bar.addView(iconButton(R.drawable.ic_chats, "Chats") {
            startActivity(Intent(this, ChatsActivity::class.java))
        })
        val titleBox = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(8), dp(4), dp(8), dp(4))
            background = ripple(null, dp(10).toFloat())
            setOnClickListener { startActivity(Intent(this@MainActivity, ModelsActivity::class.java)) }
        }
        title = text("Offline AI", 16f, bold = true).apply { maxLines = 1; ellipsize = android.text.TextUtils.TruncateAt.END }
        subtitle = text("", 12f, Palette.text3).apply { maxLines = 1; ellipsize = android.text.TextUtils.TruncateAt.END }
        titleBox.addView(title)
        titleBox.addView(subtitle)
        bar.addView(titleBox, lp(0, WRAP, 1f))
        bar.addView(iconButton(R.drawable.ic_add, "New chat") {
            app.chat.newChat()
            input.setText("")
        })
        bar.addView(iconButton(R.drawable.ic_settings, "Settings") {
            startActivity(Intent(this, SettingsActivity::class.java))
        })
        root.addView(bar, lp(MATCH, WRAP))

        progress = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
            max = 1000
            progressTintList = android.content.res.ColorStateList.valueOf(Palette.accent)
            progressBackgroundTintList = android.content.res.ColorStateList.valueOf(Palette.surface2)
            visibility = View.INVISIBLE
        }
        root.addView(progress, lp(MATCH, dp(3)))

        val middle = FrameLayout(this)
        adapter = MessageAdapter(app) { text ->
            input.setText(text)
            input.setSelection(text.length)
            input.requestFocus()
        }
        list = RecyclerView(this).apply {
            layoutManager = LinearLayoutManager(this@MainActivity).apply { stackFromEnd = true }
            adapter = this@MainActivity.adapter
            itemAnimator = null
            clipToPadding = false
            setPadding(0, 0, 0, dp(12))
        }
        middle.addView(list, FrameLayout.LayoutParams(MATCH, MATCH))

        empty = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(dp(32), 0, dp(32), dp(48))
        }
        empty.addView(text("✦", 34f, Palette.accent).apply { gravity = Gravity.CENTER }, lp(MATCH, WRAP))
        empty.addView(text("Offline AI", 22f, bold = true).apply { gravity = Gravity.CENTER; setPadding(0, dp(8), 0, dp(8)) }, lp(MATCH, WRAP))
        emptyText = text("", 14f, Palette.text2).apply { gravity = Gravity.CENTER }
        empty.addView(emptyText, lp(MATCH, WRAP))
        emptyButton = pill("Choose a model", primary = true) {
            startActivity(Intent(this, ModelsActivity::class.java))
        }
        empty.addView(emptyButton, lp(WRAP, WRAP).apply { topMargin = dp(20); gravity = Gravity.CENTER_HORIZONTAL })
        middle.addView(empty, FrameLayout.LayoutParams(MATCH, MATCH))
        root.addView(middle, lp(MATCH, 0, 1f))

        // composer
        val composer = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.BOTTOM
            setPadding(dp(10), dp(8), dp(8), dp(10))
            setBackgroundColor(Palette.bg)
        }
        input = EditText(this).apply {
            hint = "Message"
            setHintTextColor(Palette.text3)
            setTextColor(Palette.text)
            textSize = 15f
            background = rounded(Palette.surface2, dp(22).toFloat(), dp(1), Palette.border)
            setPadding(dp(16), dp(11), dp(16), dp(11))
            minHeight = dp(44)
            maxLines = 6
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_MULTI_LINE or InputType.TYPE_TEXT_FLAG_CAP_SENTENCES
            addTextChangedListener(object : TextWatcher {
                override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
                override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
                override fun afterTextChanged(s: Editable?) = updateSend()
            })
        }
        composer.addView(input, lp(0, WRAP, 1f))
        send = ImageButton(this).apply {
            scaleType = android.widget.ImageView.ScaleType.CENTER
            background = ripple(rounded(Palette.accent, dp(22).toFloat()), dp(22).toFloat())
            setOnClickListener { onSendOrStop() }
        }
        composer.addView(send, lp(dp(44), dp(44)).apply { marginStart = dp(8) })
        root.addView(composer, lp(MATCH, WRAP))

        setContentView(root)
        edgeToEdge(root)

        app.chat.addListener(this)
        app.engine.addListener(this)
        app.nativeError?.let { showNativeError(it) }
        app.loadLastModel()
        refreshAll()
    }

    override fun onDestroy() {
        app.chat.removeListener(this)
        app.engine.removeListener(this)
        list.removeCallbacks(renderReply)
        super.onDestroy()
    }

    override fun onResume() {
        super.onResume()
        app.models.poll()
        app.reloadIfNeeded()
        adapter.notifyDataSetChanged()
        refreshAll()
    }

    private fun showNativeError(message: String) {
        AlertDialog.Builder(this)
            .setTitle("The engine did not start")
            .setMessage(message)
            .setPositiveButton("OK", null)
            .show()
    }

    private fun onSendOrStop() {
        if (app.chat.generating) {
            app.chat.stop()
            return
        }
        if (app.engine.loaded == null) {
            startActivity(Intent(this, ModelsActivity::class.java))
            return
        }
        val text = input.text.toString()
        if (text.isBlank()) return
        if (app.chat.send(text)) input.setText("")
    }

    private fun updateSend() {
        val generating = app.chat.generating
        val icon = if (generating) R.drawable.ic_stop else R.drawable.ic_send
        send.setImageDrawable(ContextCompat.getDrawable(this, icon)?.mutate()?.apply { setTint(Palette.onAccent) })
        send.contentDescription = if (generating) "Stop" else "Send"
        val enabled = generating || (app.engine.loaded != null && input.text.isNotBlank())
        send.alpha = if (enabled) 1f else 0.4f
        send.isEnabled = enabled || app.engine.loaded == null
    }

    private fun refreshAll() {
        refreshHeader()
        refreshEmpty()
        updateSend()
        val keepOn = app.settings.keepScreenOn && (app.chat.generating || app.engine.phase == EngineController.Phase.LOADING)
        if (keepOn) window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        else window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }

    private fun refreshEmpty() {
        val noMessages = app.chat.conversation.messages.isEmpty()
        empty.visibility = if (noMessages) View.VISIBLE else View.GONE
        val loaded = app.engine.loaded
        when {
            app.nativeError != null -> {
                emptyText.text = "The AI engine could not start on this phone."
                emptyButton.visibility = View.GONE
            }
            app.engine.phase == EngineController.Phase.LOADING -> {
                emptyText.text = "Loading ${app.engine.loadingName ?: "the model"}…"
                emptyButton.visibility = View.GONE
            }
            loaded == null -> {
                emptyText.text = "Pick a model to start. It downloads once, then everything runs on this phone, with no internet."
                emptyButton.visibility = View.VISIBLE
            }
            else -> {
                emptyText.text = "Ask anything. Your chats stay on this phone."
                emptyButton.visibility = View.GONE
            }
        }
    }

    private fun refreshHeader() {
        val e = app.engine
        val c = app.chat
        val loaded = e.loaded
        title.text = loaded?.displayName ?: e.loadingName ?: "Offline AI"
        subtitle.setTextColor(Palette.text3)
        subtitle.text = when {
            app.nativeError != null -> "Engine unavailable"
            e.phase == EngineController.Phase.LOADING -> "Loading… ${(e.loadProgress * 100).toInt()}%"
            c.generating && c.promptTotal > 0 && c.promptDone < c.promptTotal -> "Reading ${c.promptDone} of ${c.promptTotal} tokens"
            c.generating && c.generated > 0 -> String.format(Locale.US, "Writing · %.1f tok/s", c.tokensPerSecond())
            c.generating -> "Starting…"
            loaded == null && e.lastError != null -> {
                subtitle.setTextColor(Palette.danger)
                e.lastError
            }
            loaded == null -> "No model loaded · tap to choose"
            else -> "Ready · ${loaded.nCtx} context · tap to change"
        }
        val showProgress = (e.phase == EngineController.Phase.LOADING) ||
            (c.generating && c.promptTotal > 0 && c.promptDone < c.promptTotal)
        progress.visibility = if (showProgress) View.VISIBLE else View.INVISIBLE
        progress.progress = when {
            e.phase == EngineController.Phase.LOADING -> (e.loadProgress * 1000).toInt()
            c.promptTotal > 0 -> c.promptDone * 1000 / c.promptTotal
            else -> 0
        }
    }

    override fun onMessagesChanged() {
        adapter.notifyDataSetChanged()
        val n = adapter.itemCount
        if (n > 0) list.scrollToPosition(n - 1)
        refreshAll()
    }

    override fun onReplyUpdate() {
        if (!renderPending) {
            renderPending = true
            list.postDelayed(renderReply, 60)
        }
        refreshHeader()
    }

    override fun onStatus() {
        refreshAll()
        // the reply's "Reading…" line
        if (app.chat.generating) onReplyUpdate()
    }

    override fun onEngineState() {
        refreshAll()
        // the regenerate button depends on whether a model is loaded
        if (!app.chat.generating && adapter.itemCount > 0) adapter.notifyItemChanged(adapter.itemCount - 1)
    }
}
