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
import app.offlineai.chat.data.Catalog
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
    private var composerWasBlank = true
    private lateinit var send: ImageButton
    private lateinit var jump: ImageButton
    private lateinit var progress: ProgressBar
    private lateinit var empty: LinearLayout
    private lateinit var emptyText: TextView
    private lateinit var emptyButton: TextView
    private lateinit var emptyMore: TextView
    /** What the empty screen's main button does right now. */
    private var emptyAction: () -> Unit = {}
    /** A first model downloading from the empty screen: it loads the moment it is on the phone. */
    private var firstPending: String? = null
    private lateinit var starters: LinearLayout
    private lateinit var talk: TextView
    private lateinit var voiceBar: LinearLayout
    private lateinit var voiceState: TextView
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
    private val askMicToDictate = registerForActivityResult(ActivityResultContracts.RequestPermission()) { ok ->
        val toTalk = talkAfterPermission
        talkAfterPermission = false
        when {
            !ok -> toast("Speaking a message needs the microphone permission.")
            toTalk -> voice.start()
            else -> startDictation()
        }
    }
    /** The microphone permission was asked for to start talking, not for one message. */
    private var talkAfterPermission = false

    /** Talking: listen, send what was said, read the reply aloud, listen again. */
    private val voice: VoiceLoop = VoiceLoop(object : VoiceLoop.Hooks {
        override fun listen(): Boolean {
            // a moment first, so the last recognizer has let go of the microphone and the reply's
            // voice has died down; what goes wrong after that ends the conversation
            send.postDelayed({
                if (voice.state == VoiceLoop.State.LISTENING && dictation == null && !startDictation()) voice.failed()
            }, 300)
            return true
        }
        override fun send(words: String): Boolean = sendNow(words)
        override fun speak(text: String): Boolean {
            val id = voiceReplyId ?: return false
            ReadAloud.read(this@MainActivity, id, text) { voice.spoken() }
            return true
        }
        override fun quiet() {
            cancelDictation()
            ReadAloud.stop()
        }
        override fun changed() = refreshVoice()
    })
    /** The reply being read aloud while talking. */
    private var voiceReplyId: String? = null
    /** The reply was stopped by hand while talking: listen again instead of reading it out. */
    private var voiceStopped = false
    /** Whether the send button shows the microphone (a long press starts talking). */
    private var micShown = false
    /** Talking was asked for (the app's shortcut) while the model was still loading: it starts once it has. */
    private var talkWhenLoaded = false

    /** Speech turned into text in the message box, while listening; null otherwise. */
    private var dictation: Dictation? = null
    /** What the box held when listening started; the spoken words go after it. */
    private var dictationBefore = ""
    /** Whether this phone turns speech into text offline (then an empty box offers a microphone). */
    private val canDictate by lazy { Dictation.available(this) }
    /** The send button's colour as last set (accent, or the listening colour). */
    private var sendListening: Boolean? = null
    /** The icon the send button shows; a change makes it pop. */
    private var sendIcon = 0

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
            setOnClickListener { v -> switchModel(v) }
        }
        title = text("Nyx", 16f, bold = true).apply { maxLines = 1; ellipsize = android.text.TextUtils.TruncateAt.END }
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
        empty.addView(Orb(this), lp(dp(88), dp(88)).apply { gravity = Gravity.CENTER_HORIZONTAL })
        empty.addView(text("Nyx", 28f, bold = true).apply {
            gravity = Gravity.CENTER
            letterSpacing = -0.02f
            setPadding(0, dp(14), 0, dp(6))
        }, lp(MATCH, WRAP))
        emptyText = text("", 15f, Palette.text2).apply { gravity = Gravity.CENTER }
        empty.addView(emptyText, lp(MATCH, WRAP))
        emptyAction = { startActivity(Intent(this, ModelsActivity::class.java)) }
        emptyButton = pill("Choose a model", primary = true) { emptyAction() }
        empty.addView(emptyButton, lp(WRAP, WRAP).apply { topMargin = dp(20); gravity = Gravity.CENTER_HORIZONTAL })
        emptyMore = pill("See all models") { startActivity(Intent(this, ModelsActivity::class.java)) }.apply { visibility = View.GONE }
        empty.addView(emptyMore, lp(WRAP, WRAP).apply { topMargin = dp(10); gravity = Gravity.CENTER_HORIZONTAL })
        // a few things to try, put in the composer (not sent) so they can be changed first
        starters = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            visibility = View.GONE
        }
        for (s in STARTERS) {
            starters.addView(pill(s) {
                input.setText(s)
                input.setSelection(s.length)
                input.requestFocus()
            }, lp(WRAP, WRAP).apply { topMargin = dp(8); gravity = Gravity.CENTER_HORIZONTAL })
        }
        empty.addView(starters, lp(MATCH, WRAP).apply { topMargin = dp(12) })
        talk = pill("Talk instead of typing") { startTalk() }.apply { visibility = View.GONE }
        empty.addView(talk, lp(WRAP, WRAP).apply { topMargin = dp(16); gravity = Gravity.CENTER_HORIZONTAL })
        empty.addView(pill("Make a picture") { openPictures() }.apply {
            setCompoundDrawablesRelativeWithIntrinsicBounds(
                ContextCompat.getDrawable(this@MainActivity, R.drawable.ic_image)?.mutate()?.apply { setTint(Palette.accent) }, null, null, null)
            compoundDrawablePadding = dp(8)
        }, lp(WRAP, WRAP).apply { topMargin = dp(10); gravity = Gravity.CENTER_HORIZONTAL })
        empty.addView(text("About & credits", 13f, Palette.text3).apply {
            gravity = Gravity.CENTER
            setPadding(dp(12), dp(10), dp(12), dp(10))
            background = ripple(null, dp(14).toFloat())
            setOnClickListener { startActivity(Intent(this@MainActivity, AboutActivity::class.java)) }
        }, lp(WRAP, WRAP).apply { topMargin = dp(18); gravity = Gravity.CENTER_HORIZONTAL })
        middle.addView(empty, FrameLayout.LayoutParams(MATCH, MATCH))
        root.addView(middle, lp(MATCH, 0, 1f))

        // The message box floats over the end of the chat: the conversation scrolls on under it and
        // shows through, frosted, instead of stopping at a hard edge above it.
        val dock = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        middle.addView(dock, FrameLayout.LayoutParams(MATCH, WRAP, Gravity.BOTTOM))
        val glass = { a: Int -> androidx.core.graphics.ColorUtils.setAlphaComponent(Palette.bg, a) }

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
        draftScroll.background = rounded(glass(0xE6), dp(18).toFloat())
        dock.addView(draftScroll, lp(MATCH, WRAP).apply { setMargins(dp(10), 0, dp(10), dp(4)) })

        // while talking: what is happening, and a way out
        voiceBar = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(16), dp(8), dp(12), dp(2))
            visibility = View.GONE
        }
        // read out by TalkBack as it changes
        voiceState = text("", 14f, Palette.text2).apply { accessibilityLiveRegion = View.ACCESSIBILITY_LIVE_REGION_POLITE }
        voiceBar.addView(voiceState, lp(0, WRAP, 1f))
        voiceBar.addView(pill("End") { voice.stop() }, lp(WRAP, WRAP).apply { marginStart = dp(8) })
        voiceBar.background = rounded(glass(0xE6), dp(18).toFloat())
        dock.addView(voiceBar, lp(MATCH, WRAP).apply { setMargins(dp(10), 0, dp(10), dp(4)) })

        // composer
        val composer = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.BOTTOM
            setPadding(dp(4), dp(4), dp(4), dp(4))
            // translucent: what is behind shows through, blurred by the backdrop under it
            background = rounded(androidx.core.graphics.ColorUtils.setAlphaComponent(Palette.surface1, if (Palette.dark) 0xB8 else 0xC4),
                dp(26).toFloat(), dp(1), androidx.core.graphics.ColorUtils.setAlphaComponent(Palette.borderStrong, 0x90))
        }
        attach = iconButton(R.drawable.ic_attach, "Attach a picture, video or sound", Palette.text2) { showAttachMenu(attach) }
        composer.addView(attach, lp(dp(44), dp(44)))
        input = EditText(this).apply {
            hint = "Message"
            setHintTextColor(Palette.text3)
            setTextColor(Palette.text)
            textSize = 15f * Palette.fontScale
            background = null
            setPadding(dp(6), dp(11), dp(8), dp(11))
            minHeight = dp(44)
            maxLines = 6
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_MULTI_LINE or InputType.TYPE_TEXT_FLAG_CAP_SENTENCES
            // with "Enter sends" the keyboard shows a send key instead (see applyEnterKey)
            setOnEditorActionListener { _, actionId, _ ->
                if (actionId == android.view.inputmethod.EditorInfo.IME_ACTION_SEND) {
                    // the key only sends; stopping a reply stays the button's job
                    if (!app.chat.generating) onSendOrStop()
                    true
                } else {
                    false
                }
            }
            addTextChangedListener(object : TextWatcher {
                override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
                override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
                override fun afterTextChanged(s: Editable?) {
                    updateSend()
                    // the first character of a message: the model starts getting ready for it
                    val blank = s.isNullOrBlank()
                    if (!blank && composerWasBlank) app.chat.readAhead()
                    composerWasBlank = blank
                }
            })
        }
        composer.addView(input, lp(0, WRAP, 1f))
        send = ImageButton(this).apply {
            scaleType = android.widget.ImageView.ScaleType.CENTER
            background = ripple(rounded(Palette.accent, dp(22).toFloat()), dp(22).toFloat())
            setOnClickListener { onSendOrStop() }
            setOnLongClickListener {
                if (!micShown) return@setOnLongClickListener false
                startTalk()
                true
            }
        }
        send.pressable(0.86f)
        composer.addView(send, lp(dp(44), dp(44)).apply { marginStart = dp(4) })
        val capsule = FrameLayout(this).apply {
            elevation = dp(4).toFloat()
            outlineProvider = object : android.view.ViewOutlineProvider() {
                override fun getOutline(view: View, outline: android.graphics.Outline) =
                    outline.setRoundRect(0, 0, view.width, view.height, dp(26).toFloat())
            }
            clipToOutline = true
        }
        capsule.addView(Backdrop(this, list), FrameLayout.LayoutParams(MATCH, MATCH))
        capsule.addView(composer, FrameLayout.LayoutParams(MATCH, WRAP))
        dock.addView(capsule, lp(MATCH, WRAP).apply { setMargins(dp(10), dp(6), dp(10), dp(10)) })
        // the end of the chat stays reachable above the box, however tall the box grows
        dock.addOnLayoutChangeListener { _, _, top, _, bottom, _, oldTop, _, oldBottom ->
            val h = bottom - top
            if (h == oldBottom - oldTop) return@addOnLayoutChangeListener
            val wasFollowing = scroller.following
            // after this layout pass, not during it
            list.post {
                list.setPadding(0, 0, 0, h + dp(12))
                // the empty screen's buttons stay above the box too
                empty.setPadding(empty.paddingLeft, empty.paddingTop, empty.paddingRight, h + dp(16))
                (jump.layoutParams as FrameLayout.LayoutParams).bottomMargin = h + dp(8)
                jump.requestLayout()
                if (wasFollowing) scroller.jumpToBottom(smooth = false)
            }
        }

        setContentView(root)
        edgeToEdge(root)

        app.chat.addListener(this)
        app.engine.addListener(this)
        adapter.reset()
        scroller.jumpToBottom(smooth = false)

        app.nativeError?.let { showMessage("The engine did not start", it, null) }
        val crashed = app.lastExit != null
        app.lastExit?.let { exit ->
            app.lastExit = null
            showMessage(exit.title, exit.message, exit.details)
        }
        // not on top of a problem report: it shows the next time instead
        if (!crashed && app.nativeError == null) {
            WhatsNew.maybeShow(this, app.settings.whatsNewSeen) { app.settings.whatsNewSeen = it }
        }
        app.loadLastModel()
        refreshDraft()
        refreshAll()
        if (savedInstanceState == null) handleShortcut(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleShortcut(intent)
    }

    /** The app's shortcuts (long-press its icon): a new chat, or a new chat to talk in. */
    private fun handleShortcut(intent: Intent?) {
        val action = intent?.action
        if (action != ACTION_TALK && action != ACTION_NEW_CHAT) return
        app.chat.newChat()
        input.setText("")
        if (action != ACTION_TALK) return
        when {
            !canDictate -> toast("Talking needs speech recognition that works offline, which phones have from Android 12 on.")
            app.engine.loaded == null && app.engine.isLoading -> talkWhenLoaded = true
            else -> startTalk()
        }
    }

    // While a reply is on its way the header is redrawn every second: the time left keeps moving,
    // and a model that has run out of memory says so even in the middle of a long step.
    private val ticker = object : Runnable {
        override fun run() {
            if (app.chat.generating) refreshHeader()
            // no model yet: a download's progress, and the first model loaded the moment it is here
            if (app.engine.loaded == null && !app.engine.isLoading && app.nativeError == null) {
                refreshEmpty()
                val waiting = firstPending
                if (waiting != null && !app.models.isDownloading(waiting)) {
                    firstPending = null
                    app.models.find(waiting)?.let { app.loadModel(it) }
                }
            }
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
        voice.stop()
        cancelDictation()
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

    /** The Pictures screen, with what is in the message box as the picture's description. */
    private fun openPictures() {
        val words = input.text?.toString()?.trim().orEmpty()
        startActivity(Intent(this, PicturesActivity::class.java).putExtra(PicturesActivity.EXTRA_PROMPT, words))
    }

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
        val sheet = Sheet(this, "Add to your message")
        sheet.item("Make a picture", R.drawable.ic_spark, "From what you have typed, here on the phone") { openPictures() }
        val mic = {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                record()
            } else {
                askMic.launch(Manifest.permission.RECORD_AUDIO)
            }
        }
        if (sees) {
            sheet.item("Photo", R.drawable.ic_image, "Up to four pictures") {
                pickPictures.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
            }
            sheet.item("Video", R.drawable.ic_video, "Sent as a few frames with their times") {
                pickVideo.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.VideoOnly))
            }
        }
        if (hears) {
            sheet.item("Record sound", R.drawable.ic_mic) { mic() }
            sheet.item("Sound file", R.drawable.ic_audio) { pickSound.launch(arrayOf("audio/*")) }
        }
        if (!sees && !hears) {
            val extra = local.catalog?.pictures
            if (extra != null && !local.hasPictures) {
                sheet.item("Add picture support", R.drawable.ic_image, "A ${ModelStore.formatBytes(extra.sizeBytes)} download for ${local.displayName}") {
                    startActivity(Intent(this, ModelsActivity::class.java))
                }
            } else {
                sheet.item("${local.displayName} cannot see pictures", R.drawable.ic_image, enabled = false)
                sheet.item("Models that can", R.drawable.ic_spark) { startActivity(Intent(this, ModelsActivity::class.java)) }
            }
        }
        sheet.show()
    }

    /** Copies picked files into the chat's own storage (pictures shrunk, videos turned into frames, sound into WAV). */
    private fun importMedia(kind: String, uris: List<Uri>) {
        val chatId = app.chat.conversation.id
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
                        if (app.chat.conversation.id != chatId) {
                            // another chat was opened meanwhile; the files are in this one's folder
                            app.chats.deleteFiles(chatId, listOf(a))
                            return@onSuccess
                        }
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
        applyEnterKey()
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
        if (dictation != null) {
            // done speaking: the last words come in a moment
            send.performHapticFeedback(android.view.HapticFeedbackConstants.KEYBOARD_TAP)
            dictation?.stop()
            return
        }
        if (voice.state == VoiceLoop.State.SPEAKING) {
            // cut the reading short to answer
            send.performHapticFeedback(android.view.HapticFeedbackConstants.KEYBOARD_TAP)
            ReadAloud.stop()
            voice.spoken()
            return
        }
        if (app.chat.generating) {
            send.performHapticFeedback(android.view.HapticFeedbackConstants.KEYBOARD_TAP)
            if (voice.state == VoiceLoop.State.WAITING) voiceStopped = true
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
        if (text.isBlank() && app.chat.draftAttachments.isEmpty()) {
            if (canDictate) dictate()
            return
        }
        sendNow(text)
    }

    /** Sends the message, with the attachments waiting in the composer; false if it could not go. */
    private fun sendNow(text: String): Boolean {
        if (preparing > 0 || (text.isBlank() && app.chat.draftAttachments.isEmpty())) return false
        askForNotificationsOnce()
        scroller.follow()
        if (!app.chat.send(text)) return false
        send.performHapticFeedback(android.view.HapticFeedbackConstants.KEYBOARD_TAP)
        input.setText("")
        refreshDraft()
        return true
    }

    /** Starts talking: from then on what you say is sent and each reply is read aloud. */
    private fun startTalk() {
        if (voice.on) return
        if (app.engine.loaded == null) {
            startActivity(Intent(this, ModelsActivity::class.java))
            return
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            talkAfterPermission = true
            askMicToDictate.launch(Manifest.permission.RECORD_AUDIO)
            return
        }
        voice.start()
    }

    /** While talking and waiting for the reply: once it is written, it is read aloud (unless it was stopped). */
    private fun voiceReplyCheck() {
        if (voice.state != VoiceLoop.State.WAITING || app.chat.generating) return
        val last = app.chat.conversation.messages.lastOrNull()
        val readIt = last != null && last.role == "assistant" && !last.error && !voiceStopped
        voiceStopped = false
        voiceReplyId = last?.id
        voice.replied(if (readIt) last?.content.orEmpty() else "")
    }

    private fun refreshVoice() {
        voiceBar.visibility = if (voice.on) View.VISIBLE else View.GONE
        voiceState.text = when (voice.state) {
            VoiceLoop.State.LISTENING -> "Talking: listening…"
            VoiceLoop.State.WAITING -> "Talking: the reply is being written…"
            VoiceLoop.State.SPEAKING -> "Talking: reading the reply aloud. Tap the microphone to answer."
            VoiceLoop.State.OFF -> ""
        }
        refreshAll()
    }

    /** The "writing a reply" notification needs permission on Android 13 and later; asked once. */
    private fun askForNotificationsOnce() {
        if (Build.VERSION.SDK_INT < 33 || !app.settings.backgroundWriting || app.settings.askedNotifications) return
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) return
        app.settings.askedNotifications = true
        requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1)
    }

    private fun dictate() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
            startDictation()
        } else {
            askMicToDictate.launch(Manifest.permission.RECORD_AUDIO)
        }
    }

    /** Listens with the phone's offline speech recognition; the words appear in the box as they come. */
    private fun startDictation(): Boolean {
        if (dictation != null || app.chat.generating) return false
        dictationBefore = input.text.toString()
        val d = Dictation(
            this,
            onPartial = { words -> showDictated(words) },
            onDone = { words, error ->
                dictation = null
                if (words.isNotBlank()) showDictated(words)
                endDictation()
                if (voice.on) {
                    // talking: what was said goes out as a message
                    when (error) {
                        null -> voice.heard(if (words.isNotBlank()) input.text.toString() else "")
                        Dictation.NOTHING_HEARD -> {
                            voice.heard("")
                            if (!voice.on) toast("Stopped talking: nothing was heard twice in a row.")
                        }
                        else -> {
                            toast(error)
                            voice.failed()
                        }
                    }
                } else if (error != null) {
                    toast(error)
                }
            },
            onLevel = { level ->
                val scale = 1f + 0.18f * level
                send.animate().scaleX(scale).scaleY(scale).setDuration(90).start()
            },
        )
        val why = d.start()
        if (why != null) {
            toast(why)
            return false
        }
        dictation = d
        send.performHapticFeedback(android.view.HapticFeedbackConstants.KEYBOARD_TAP)
        input.hint = "Listening…"
        updateSend()
        return true
    }

    private fun showDictated(words: String) {
        val before = dictationBefore.trimEnd()
        val text = if (before.isEmpty()) words.replaceFirstChar { it.uppercase() } else "$before $words"
        input.setText(text)
        input.setSelection(text.length)
    }

    /** Back to typing; what was heard so far stays in the box. */
    private fun cancelDictation() {
        val d = dictation ?: return
        dictation = null
        d.cancel()
        endDictation()
    }

    private fun endDictation() {
        send.animate().cancel()
        send.scaleX = 1f
        send.scaleY = 1f
        input.hint = composerHint()
        updateSend()
    }

    /** Who you are writing to. */
    private fun composerHint(): String {
        val name = app.engine.loaded?.displayName
        return when {
            dictation != null -> "Listening…"
            // short, so it never wraps: the model's name is at the top already
            name == null -> "Message"
            app.chat.teamSize() > 0 -> "Message the team"
            else -> "Message"
        }
    }

    private fun updateSend() {
        val generating = app.chat.generating
        val listening = dictation != null
        val hasSomething = input.text.isNotBlank() || app.chat.draftAttachments.isNotEmpty()
        val speaking = voice.state == VoiceLoop.State.SPEAKING
        // nothing to send yet: speak it instead
        val mic = !generating && !listening && !hasSomething && preparing == 0 && app.engine.loaded != null && canDictate
        micShown = mic && !voice.on
        val icon = when {
            generating || listening -> R.drawable.ic_stop
            mic || speaking -> R.drawable.ic_mic
            else -> R.drawable.ic_send
        }
        send.setImageDrawable(ContextCompat.getDrawable(this, icon)?.mutate()?.apply { setTint(Palette.onAccent) })
        if (sendIcon != icon) {
            if (sendIcon != 0) Motion.pop(send)
            sendIcon = icon
        }
        send.contentDescription = when {
            generating -> "Stop"
            listening -> "Stop listening"
            speaking -> "Answer now"
            mic -> "Speak a message"
            else -> "Send"
        }
        if (sendListening != listening) {
            sendListening = listening
            val r = dp(22).toFloat()
            send.background = ripple(rounded(if (listening) Palette.danger else Palette.accent, r), r)
        }
        val enabled = generating || listening || mic || speaking || (app.engine.loaded != null && hasSomething && preparing == 0)
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
        // who you are writing to
        val hint = composerHint()
        if (input.hint?.toString() != hint) input.hint = hint
        refreshHeader()
        refreshEmpty()
        updateSend()
        updateJump()
        val keepOn = voice.on || (app.settings.keepScreenOn && (app.chat.generating || app.engine.isLoading))
        if (keepOn) window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        else window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }

    private fun refreshEmpty() {
        val noMessages = app.chat.conversation.messages.isEmpty()
        empty.visibility = if (noMessages) View.VISIBLE else View.GONE
        val loaded = app.engine.loaded
        starters.visibility = if (loaded != null && app.nativeError == null && !app.engine.isLoading) View.VISIBLE else View.GONE
        talk.visibility = if (starters.visibility == View.VISIBLE && canDictate && !voice.on) View.VISIBLE else View.GONE
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
                // finished downloads are moved into place here, so a first model is noticed at once
                val pending = runCatching { app.models.poll() }.getOrDefault(emptyList())
                    .firstOrNull { Catalog.byFile(it.fileName) != null }
                val first = app.firstModel()
                emptyButton.visibility = View.VISIBLE
                when {
                    pending != null -> {
                        val name = Catalog.byFile(pending.fileName)?.name ?: pending.fileName
                        val total = if (pending.total > 0) pending.total else Catalog.byFile(pending.fileName)?.sizeBytes ?: 0L
                        val pct = if (total > 0) (pending.done * 100 / total).toInt() else 0
                        if (pending.fileName == app.settings.lastModelFile) firstPending = pending.fileName
                        emptyText.text = "Downloading $name: $pct% of ${ModelStore.formatBytes(total)}. " +
                            (if (firstPending == pending.fileName) "It loads by itself when it is done; " else "") +
                            "from then on everything runs on this phone, with no internet."
                        emptyButton.text = "See downloads"
                        emptyAction = { startActivity(Intent(this, ModelsActivity::class.java)) }
                        emptyMore.visibility = View.GONE
                    }
                    first != null && app.models.local().isEmpty() -> {
                        val failed = app.models.failures[first.file]
                        emptyText.text = (if (failed != null) "The download stopped: $failed\n\n" else "") +
                            "Download a model to start: once it is on the phone, everything runs here, with no " +
                            "internet. For this phone: ${first.name}, ${ModelStore.formatBytes(first.sizeBytes)}."
                        emptyButton.text = "Download ${first.name}"
                        emptyAction = { startFirstDownload(first) }
                        emptyMore.visibility = View.VISIBLE
                    }
                    else -> {
                        emptyText.text = "Pick a model to start. It downloads once, then everything runs on this phone, with no internet."
                        emptyButton.text = "Choose a model"
                        emptyAction = { startActivity(Intent(this, ModelsActivity::class.java)) }
                        emptyMore.visibility = View.GONE
                    }
                }
            }
            else -> {
                emptyText.text = "Ask anything. Your chats stay on this phone."
                emptyButton.visibility = View.GONE
                emptyMore.visibility = View.GONE
            }
        }
    }

    /**
     * Enter sends (a send key, the text still wrapping over several lines) or starts a new line,
     * as Settings says.
     */
    private fun applyEnterKey() {
        val sends = app.settings.enterSends
        val type = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_CAP_SENTENCES or
            (if (sends) 0 else InputType.TYPE_TEXT_FLAG_MULTI_LINE)
        if (input.inputType == type) return
        input.inputType = type
        input.imeOptions = if (sends) android.view.inputmethod.EditorInfo.IME_ACTION_SEND else android.view.inputmethod.EditorInfo.IME_ACTION_NONE
        // without the multi-line flag a text field keeps to one line unless told otherwise
        input.setHorizontallyScrolling(false)
        input.maxLines = 6
    }

    /** The models on the phone, to switch to in one tap (the current one ticked), and the full list. */
    private fun switchModel(anchor: View) {
        val local = app.models.local()
        if (local.isEmpty() || app.chat.generating || app.engine.isLoading) {
            startActivity(Intent(this, ModelsActivity::class.java))
            return
        }
        val current = app.engine.loaded?.key
        val sheet = Sheet(this, "Model")
        for (m in local) {
            val size = ModelStore.formatBytes(m.sizeBytes)
            sheet.item(m.displayName, icon = R.drawable.ic_spark, detail = m.catalog?.maker?.let { "$it · $size" } ?: size,
                checked = m.file.name == current) { pick(m, current) }
        }
        val team = TeamDialog.summary(app)
        sheet.divider()
            .item("Work together", detail = if (team.isEmpty()) "Several answers, then a review" else team) {
                TeamDialog.show(this, app) { refreshAll() }
            }
            .item("All models", detail = "Download, add or remove") { startActivity(Intent(this, ModelsActivity::class.java)) }
            .item("Pictures", R.drawable.ic_image, "Make pictures from words") { openPictures() }
            .show()
    }

    private fun pick(m: app.offlineai.chat.data.LocalModel, current: String?) {
        run {
            when {
                m.file.name != current -> {
                    val go = {
                        app.loadModel(m)
                        toast("Loading ${m.displayName}…")
                    }
                    val need = app.estimatedRam(m)
                    val free = app.availableRam()
                    if (need > free && !app.lowMemoryFor(m)) {
                        // the same warning as the Models screen gives
                        AlertDialog.Builder(this)
                            .setTitle("This may not fit right now")
                            .setMessage("${m.displayName} needs about ${ModelStore.formatBytes(need)} of memory and " +
                                "${ModelStore.formatBytes(free)} is free. If it does not fit it still loads, but it reads " +
                                "itself from storage on every step and replies crawl. Close other apps first.")
                            .setPositiveButton("Load anyway") { _, _ -> go() }
                            .setNegativeButton("Cancel", null)
                            .show()
                    } else {
                        go()
                    }
                }
            }
        }
    }

    /** The empty screen's one-tap start: the suggested model downloads, then loads by itself. */
    private fun startFirstDownload(m: app.offlineai.chat.data.CatalogModel) {
        if (app.settings.offlineOnly) {
            toast("Offline only is on (Settings), so downloads are off.")
            return
        }
        val free = app.models.freeBytes()
        if (free in 0 until m.sizeBytes + 200_000_000L) {
            toast("Not enough free space: ${m.name} needs ${ModelStore.formatBytes(m.sizeBytes)} and " +
                "${ModelStore.formatBytes(free)} is free.")
            return
        }
        val error = app.models.download(m.url, m.file, m.name)
        if (error != null) {
            toast(error)
            return
        }
        app.settings.lastModelFile = m.file
        firstPending = m.file
        toast("Downloading ${m.name}. It carries on if you leave the app, and loads when it is done.")
        refreshEmpty()
    }

    private fun refreshHeader() {
        val e = app.engine
        val c = app.chat
        val loaded = e.loaded
        title.text = loaded?.displayName ?: e.loadingName ?: "Nyx"
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
            c.generating && c.generated > 1 -> String.format(Locale.US, "Writing · %.1f tok/s", c.tokensPerSecond()) + hot
            c.generating -> "Starting…$hot"
            loaded == null && e.lastError != null -> {
                subtitle.setTextColor(Palette.danger)
                e.lastError
            }
            loaded == null -> "No model loaded · tap to choose"
            else -> "Ready · ${loaded.nCtx} context" + (if (loaded.config.lowMemory) " · low memory" else "") +
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
        voiceReplyCheck()
    }

    override fun onConversationSwitched() {
        voice.stop()
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
        if (talkWhenLoaded && !app.engine.isLoading) {
            talkWhenLoaded = false
            if (app.engine.loaded != null) startTalk()
        }
        // the write-again button depends on whether a model is loaded
        if (!app.chat.generating && adapter.itemCount > 0) adapter.notifyItemChanged(adapter.itemCount - 1)
    }

    companion object {

        /** The app's shortcuts (res/xml/shortcuts.xml). */
        const val ACTION_TALK = "app.offlineai.chat.action.TALK"
        const val ACTION_NEW_CHAT = "app.offlineai.chat.action.NEW_CHAT"

        private val STARTERS = listOf(
            "Explain how a rainbow forms, simply",
            "Write a short poem about city lights at night",
            "Plan a 3-day trip to Lisbon on a budget",
            "Write a Python function that removes duplicates from a list",
        )
    }
}
