package app.offlineai.chat.ui

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.content.res.Configuration
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.text.Editable
import android.text.InputType
import android.text.TextWatcher
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.net.Uri
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.HorizontalScrollView
import android.widget.ImageButton
import android.widget.LinearLayout
import android.widget.PopupMenu
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.RecyclerView
import app.offlineai.chat.App
import app.offlineai.chat.ChatController
import app.offlineai.chat.R
import app.offlineai.chat.data.Attachment
import app.offlineai.chat.data.Device
import app.offlineai.chat.data.MediaImport
import app.offlineai.chat.data.ModelStore
import app.offlineai.chat.data.Settings
import app.offlineai.chat.data.SoundRecorder
import app.offlineai.chat.engine.EngineController
import java.util.Locale
import java.util.concurrent.Executors

class MainActivity : AppCompatActivity(), ChatController.Listener, EngineController.StateListener {
    private lateinit var app: App
    private lateinit var list: RecyclerView
    private lateinit var lm: ChatLayoutManager
    private lateinit var scroller: ChatScroller
    private lateinit var adapter: MessageAdapter
    private lateinit var title: TextView
    private lateinit var subtitle: TextView
    private lateinit var input: EditText
    private lateinit var send: ImageButton
    private lateinit var jump: ImageButton
    private lateinit var progress: ProgressBar
    private lateinit var empty: LinearLayout
    private lateinit var emptyText: TextView
    private lateinit var emptyButton: TextView
    private lateinit var attach: ImageButton
    private lateinit var draftScroll: HorizontalScrollView
    private lateinit var draftRow: LinearLayout

    /** Attachments still being copied in (a video's frames take a moment). */
    private var preparing = 0
    private val io = Executors.newSingleThreadExecutor { r -> Thread(r, "attach") }

    private val pickPictures = registerForActivityResult(ActivityResultContracts.PickMultipleVisualMedia(4)) { uris ->
        if (uris.isNotEmpty()) importMedia("image", uris)
    }
    private val pickVideo = registerForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        if (uri != null) importMedia("video", listOf(uri))
    }
    private val pickSound = registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) importMedia("audio", listOf(uri))
    }
    private val askMic = registerForActivityResult(ActivityResultContracts.RequestPermission()) { ok ->
        if (ok) record() else toast("Recording needs the microphone permission.")
    }

    /** Theme, accent and text size this screen was built with; a change rebuilds it. */
    private var look = ""
    private var renderPending = false
    private val renderReply = Runnable {
        renderPending = false
        adapter.replyChanged()
    }

    private fun lookOf() = "${app.settings.theme}|${app.settings.accent}|${app.settings.fontScale}|${Palette.dark}"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        app = App.of(this)
        Palette.apply(this, app.settings)
        look = lookOf()

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
        adapter = MessageAdapter(app, object : MessageAdapter.Actions {
            override fun editLast(text: String) {
                input.setText(text)
                input.setSelection(text.length)
                input.requestFocus()
            }

            override fun selectText(text: String) = SelectTextActivity.open(this@MainActivity, text)
            override fun keepInPlace(anchor: View, change: () -> Unit) = scroller.keepInPlace(anchor, change)
            override fun isFollowing() = scroller.following
        })
        adapter.options = renderOptions()
        lm = ChatLayoutManager(this)
        list = RecyclerView(this).apply {
            layoutManager = lm
            adapter = this@MainActivity.adapter
            itemAnimator = null
            clipToPadding = false
            setPadding(0, 0, 0, dp(16))
            descendantFocusability = android.view.ViewGroup.FOCUS_BLOCK_DESCENDANTS
            setItemViewCacheSize(6)
        }
        middle.addView(list, FrameLayout.LayoutParams(MATCH, MATCH))
        scroller = ChatScroller(list, lm, enabled = { app.settings.autoFollow }, onChange = { updateJump() })

        jump = ImageButton(this).apply {
            setImageDrawable(ContextCompat.getDrawable(context, R.drawable.ic_arrow_down)?.mutate()?.apply { setTint(Palette.text) })
            background = ripple(rounded(Palette.surface3, dp(20).toFloat(), dp(1), Palette.borderStrong), dp(20).toFloat())
            contentDescription = "Jump to the newest text"
            elevation = dp(2).toFloat()
            isFocusable = false
            visibility = View.GONE
            setOnClickListener { scroller.jumpToBottom(smooth = true) }
        }
        middle.addView(jump, FrameLayout.LayoutParams(dp(40), dp(40), Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL).apply {
            bottomMargin = dp(12)
        })

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

        // attachments waiting to go with the next message
        draftRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setPadding(dp(12), dp(6), dp(12), 0)
        }
        draftScroll = HorizontalScrollView(this).apply {
            isHorizontalScrollBarEnabled = false
            visibility = View.GONE
            addView(draftRow)
        }
        root.addView(draftScroll, lp(MATCH, WRAP))

        // composer
        val composer = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.BOTTOM
            setPadding(dp(4), dp(8), dp(8), dp(10))
            setBackgroundColor(Palette.bg)
        }
        attach = iconButton(R.drawable.ic_attach, "Attach a picture, video or sound", Palette.text2) { showAttachMenu(attach) }
        composer.addView(attach, lp(dp(44), dp(44)))
        input = EditText(this).apply {
            hint = "Message"
            setHintTextColor(Palette.text3)
            setTextColor(Palette.text)
            textSize = 15f * Palette.fontScale
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
        adapter.reset()
        scroller.jumpToBottom(smooth = false)

        app.nativeError?.let { showMessage("The engine did not start", it, null) }
        app.lastExit?.let { exit ->
            app.lastExit = null
            showMessage(exit.title, exit.message, exit.details)
        }
        app.loadLastModel()
        refreshDraft()
        refreshAll()
    }

    // While a reply is on its way the header is redrawn every second: the time left keeps moving,
    // and a model that has run out of memory says so even in the middle of a long step.
    private val ticker = object : Runnable {
        override fun run() {
            if (app.chat.generating) refreshHeader()
            subtitle.postDelayed(this, 1000)
        }
    }

    override fun onStart() {
        super.onStart()
        subtitle.removeCallbacks(ticker)
        subtitle.postDelayed(ticker, 1000)
    }

    override fun onStop() {
        subtitle.removeCallbacks(ticker)
        super.onStop()
    }

    override fun onDestroy() {
        app.chat.removeListener(this)
        app.engine.removeListener(this)
        list.removeCallbacks(renderReply)
        scroller.detach()
        io.shutdown()
        super.onDestroy()
    }

    private fun toast(s: String?) = Toast.makeText(this, s ?: "Something went wrong.", Toast.LENGTH_LONG).show()

    // ---------------------------------------------------------------- attachments

    private fun showAttachMenu(anchor: View) {
        // picture support may have finished downloading since the model was loaded
        runCatching { app.models.poll() }
        if (app.needsReload() && !app.chat.generating) {
            app.reloadIfNeeded()
            toast("Loading the model again with its picture support. Try again in a moment.")
            return
        }
        val loaded = app.engine.loaded
        val local = loaded?.let { app.models.find(it.key) }
        if (loaded == null || local == null) {
            toast("Load a model first.")
            return
        }
        val sees = loaded.info.vision
        val hears = loaded.info.audio
        val pm = PopupMenu(this, anchor)
        if (sees) {
            pm.menu.add(0, 1, 0, "Photo")
            pm.menu.add(0, 2, 1, "Video")
        }
        if (hears) {
            pm.menu.add(0, 3, 2, "Record sound")
            pm.menu.add(0, 4, 3, "Sound file")
        }
        if (!sees && !hears) {
            val extra = local.catalog?.pictures
            if (extra != null && !local.hasPictures) {
                pm.menu.add(0, 5, 0, "Add picture support (${ModelStore.formatBytes(extra.sizeBytes)})…")
            } else {
                pm.menu.add(0, 6, 0, "${local.displayName} cannot see pictures").isEnabled = false
                pm.menu.add(0, 5, 1, "Models that can…")
            }
        }
        pm.setOnMenuItemClickListener {
            when (it.itemId) {
                1 -> pickPictures.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                2 -> pickVideo.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.VideoOnly))
                3 -> if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                    record()
                } else {
                    askMic.launch(Manifest.permission.RECORD_AUDIO)
                }
                4 -> pickSound.launch(arrayOf("audio/*"))
                5 -> startActivity(Intent(this, ModelsActivity::class.java))
            }
            true
        }
        pm.show()
    }

    /** Copies picked files into the chat's own storage (pictures shrunk, videos turned into frames, sound into WAV). */
    private fun importMedia(kind: String, uris: List<Uri>) {
        val dir = app.chat.mediaDir()
        val detail = app.settings.pictureDetail
        val frames = app.settings.videoFrames
        preparing += uris.size
        refreshDraft()
        updateSend()
        val ctx = applicationContext
        io.execute {
            for (uri in uris) {
                val result = runCatching {
                    when (kind) {
                        "image" -> MediaImport.image(ctx, uri, dir, detail.maxSide)
                        "video" -> MediaImport.video(ctx, uri, dir, frames, detail.maxSide)
                        else -> MediaImport.audio(ctx, uri, dir, Settings.MAX_SOUND_SECONDS)
                    }
                }
                runOnUiThread {
                    preparing = (preparing - 1).coerceAtLeast(0)
                    result.onSuccess { a ->
                        app.chat.draftAttachments.add(a)
                        if (a.kind == "audio" && a.durationMs >= Settings.MAX_SOUND_SECONDS * 1000L - 500) {
                            toast("Only the first ${Settings.MAX_SOUND_SECONDS} seconds are kept; that is as much as the model hears at once.")
                        }
                    }.onFailure { e -> toast(e.message) }
                    if (!isDestroyed) {
                        refreshDraft()
                        updateSend()
                    }
                }
            }
        }
    }

    private fun record() {
        val rec = SoundRecorder(Settings.MAX_SOUND_SECONDS)
        if (!rec.start()) {
            toast("The microphone could not be started.")
            return
        }
        val label = text("Recording… 0:00", 18f).apply { gravity = Gravity.CENTER }
        val box = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(24), dp(16), dp(24), dp(8))
            addView(label, lp(MATCH, WRAP))
            addView(text("Up to ${Settings.MAX_SOUND_SECONDS} seconds. Tap Done when you have finished.", 13f, Palette.text3).apply {
                gravity = Gravity.CENTER
                setPadding(0, dp(8), 0, 0)
            }, lp(MATCH, WRAP))
        }
        val tick = object : Runnable {
            override fun run() {
                val secs = rec.seconds
                label.text = if (rec.isRecording) "Recording… ${Thumbs.duration((secs * 1000).toLong())}"
                else "Stopped at ${Thumbs.duration((secs * 1000).toLong())}, the longest a model hears at once"
                if (rec.isRecording) label.postDelayed(this, 200)
            }
        }
        AlertDialog.Builder(this)
            .setTitle("Record sound")
            .setView(box)
            .setCancelable(false)
            .setPositiveButton("Done") { _, _ ->
                label.removeCallbacks(tick)
                val f = MediaImport.newSoundFile(app.chat.mediaDir())
                val ms = rec.stop(f)
                if (ms > 0) {
                    app.chat.draftAttachments.add(Attachment("audio", listOf(f.absolutePath), durationMs = ms))
                    refreshDraft()
                    updateSend()
                } else {
                    f.delete()
                    toast("Nothing was recorded.")
                }
            }
            .setNegativeButton("Cancel") { _, _ ->
                label.removeCallbacks(tick)
                rec.cancel()
            }
            .show()
        label.post(tick)
    }

    private fun refreshDraft() {
        draftRow.removeAllViews()
        for (a in app.chat.draftAttachments.toList()) {
            draftRow.addView(Thumbs.tile(this, a, 64, onClick = { Thumbs.show(this, a) }, onRemove = {
                app.chat.removeDraftAttachment(a)
                refreshDraft()
                updateSend()
            }), lp(WRAP, WRAP).apply { marginEnd = dp(8) })
        }
        if (preparing > 0) {
            draftRow.addView(text("Preparing…", 13f, Palette.text3).apply {
                gravity = Gravity.CENTER
                background = rounded(Palette.surface2, dp(10).toFloat(), dp(1), Palette.border)
                setPadding(dp(10), 0, dp(10), 0)
            }, lp(WRAP, dp(64)))
        }
        draftScroll.visibility = if (draftRow.childCount > 0) View.VISIBLE else View.GONE
    }

    override fun onResume() {
        super.onResume()
        if (lookOf() != look) {
            recreate()
            return
        }
        val opts = renderOptions()
        if (opts != adapter.options) {
            adapter.options = opts
            adapter.reset()
        }
        app.models.poll()
        app.reloadIfNeeded()
        refreshAll()
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        // only the theme can need a rebuild; rotation and keyboards are handled in place
        Palette.apply(this, app.settings)
        if (lookOf() != look) recreate()
    }

    private fun renderOptions() = RenderOptions(
        markdown = app.settings.markdown,
        wrapCode = app.settings.codeWrap,
        highlight = app.settings.syntaxHighlight,
        fontScale = app.settings.fontScale,
    )

    private fun showMessage(title: String, message: String, details: String?) {
        val b = AlertDialog.Builder(this).setTitle(title).setMessage(message).setPositiveButton("OK", null)
        if (details != null) b.setNeutralButton("Copy details") { _, _ -> copyText("details", details) }
        b.show()
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
        if (preparing > 0) {
            toast("Wait a moment: the attachments are still being prepared.")
            return
        }
        if (text.isBlank() && app.chat.draftAttachments.isEmpty()) return
        askForNotificationsOnce()
        scroller.follow()
        if (app.chat.send(text)) {
            input.setText("")
            refreshDraft()
        }
    }

    /** The "writing a reply" notification needs permission on Android 13 and later; asked once. */
    private fun askForNotificationsOnce() {
        if (Build.VERSION.SDK_INT < 33 || !app.settings.backgroundWriting || app.settings.askedNotifications) return
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) return
        app.settings.askedNotifications = true
        requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1)
    }

    private fun updateSend() {
        val generating = app.chat.generating
        val icon = if (generating) R.drawable.ic_stop else R.drawable.ic_send
        send.setImageDrawable(ContextCompat.getDrawable(this, icon)?.mutate()?.apply { setTint(Palette.onAccent) })
        send.contentDescription = if (generating) "Stop" else "Send"
        val hasSomething = input.text.isNotBlank() || app.chat.draftAttachments.isNotEmpty()
        val enabled = generating || (app.engine.loaded != null && hasSomething && preparing == 0)
        send.alpha = if (enabled) 1f else 0.4f
        send.isEnabled = enabled || app.engine.loaded == null
    }

    private fun updateJump() {
        val show = app.settings.jumpButton && adapter.itemCount > 0 && !scroller.isAtBottom()
        val shown = jump.visibility == View.VISIBLE && jump.tag != "hiding"
        if (show && !shown) {
            jump.tag = null
            jump.animate().cancel()
            jump.alpha = 0f
            jump.visibility = View.VISIBLE
            jump.animate().alpha(1f).setDuration(150).start()
        } else if (!show && shown) {
            jump.tag = "hiding"
            jump.animate().cancel()
            jump.animate().alpha(0f).setDuration(120).withEndAction {
                if (jump.tag == "hiding") jump.visibility = View.GONE
            }.start()
        }
    }

    private fun refreshAll() {
        refreshHeader()
        refreshEmpty()
        updateSend()
        updateJump()
        val keepOn = app.settings.keepScreenOn && (app.chat.generating || app.engine.isLoading)
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
            app.engine.isLoading -> {
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

    /** " · low memory", or for a model bigger than memory how much of it stays and how much streams. */
    private fun memoryLabel(loaded: app.offlineai.chat.engine.LoadedModel): String {
        if (!loaded.config.lowMemory) return ""
        val p = app.engine.pagerStats()
        if (p == null || !p.active) return " · low memory"
        return String.format(Locale.US, " · %.1f GB in memory, %.1f GB streamed per token", p.residentBytes / 1e9, p.streamedBytes / 1e9)
    }

    private fun refreshHeader() {
        val e = app.engine
        val c = app.chat
        val loaded = e.loaded
        title.text = loaded?.displayName ?: e.loadingName ?: "Offline AI"
        subtitle.setTextColor(Palette.text3)
        val heat = app.currentThermal()
        val hot = (if (heat >= PowerManager.THERMAL_STATUS_MODERATE) " · phone ${Device.thermalLabel(heat)}, slowed down" else "") +
            (if (c.thrashing()) " · too big for free memory, reading itself from storage" else "")
        subtitle.text = when {
            app.nativeError != null -> "Engine unavailable"
            e.phase == EngineController.Phase.LOADING -> "Loading… ${(e.loadProgress * 100).toInt()}%"
            e.phase == EngineController.Phase.WARMING -> "Getting ready…"
            c.generating && c.mediaIndex == -1 -> "Loading the picture part…"
            c.generating && c.mediaIndex >= 0 && c.mediaTotal > 0 && (c.promptTotal == 0 || c.promptDone < c.promptTotal) ->
                "Looking at attachment ${c.mediaIndex + 1} of ${c.mediaTotal}…$hot"
            c.generating && c.promptTotal > 0 && c.promptDone < c.promptTotal -> "Reading ${c.promptDone} of ${c.promptTotal} tokens${c.promptEtaLabel()}$hot"
            c.generating && c.generated > 1 -> c.writingLabel() + hot
            c.generating -> c.startingLabel() + hot
            loaded == null && e.lastError != null -> {
                subtitle.setTextColor(Palette.danger)
                e.lastError
            }
            loaded == null -> "No model loaded · tap to choose"
            else -> "Ready · ${loaded.nCtx} context" + memoryLabel(loaded) +
                (if (loaded.info.vision) " · sees pictures" else "") + " · tap to change"
        }
        val showProgress = e.isLoading || (c.generating && c.promptTotal > 0 && c.promptDone < c.promptTotal)
        progress.visibility = if (showProgress) View.VISIBLE else View.INVISIBLE
        progress.isIndeterminate = e.phase == EngineController.Phase.WARMING
        if (!progress.isIndeterminate) {
            progress.progress = when {
                e.phase == EngineController.Phase.LOADING -> (e.loadProgress * 1000).toInt()
                c.promptTotal > 0 -> c.promptDone * 1000 / c.promptTotal
                else -> 0
            }
        }
    }

    // ChatController.Listener

    override fun onMessagesChanged() {
        adapter.submit()
        refreshAll()
    }

    override fun onConversationSwitched() {
        adapter.reset()
        scroller.jumpToBottom(smooth = false)
        refreshDraft()
        refreshAll()
    }

    override fun onReplyUpdate() {
        if (!renderPending) {
            renderPending = true
            list.postDelayed(renderReply, app.settings.streamIntervalMs.toLong().coerceIn(0, 1000))
        }
        refreshHeader()
    }

    override fun onStatus() {
        refreshAll()
        // the reply's "Reading…" line
        if (app.chat.generating) onReplyUpdate()
    }

    // EngineController.StateListener

    override fun onEngineState() {
        refreshAll()
        // the write-again button depends on whether a model is loaded
        if (!app.chat.generating && adapter.itemCount > 0) adapter.notifyItemChanged(adapter.itemCount - 1)
    }
}
