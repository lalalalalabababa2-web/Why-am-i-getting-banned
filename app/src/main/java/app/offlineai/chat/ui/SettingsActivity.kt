package app.offlineai.chat.ui

import android.content.Intent
import android.content.res.ColorStateList
import android.os.Bundle
import android.text.InputType
import android.view.Gravity
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.SwitchCompat
import app.offlineai.chat.App
import app.offlineai.chat.BuildConfig
import app.offlineai.chat.data.Accent
import app.offlineai.chat.data.BackgroundSpeed
import app.offlineai.chat.data.Device
import app.offlineai.chat.data.MemoryMode
import app.offlineai.chat.data.ModelStore
import app.offlineai.chat.data.PerfMode
import app.offlineai.chat.data.PictureDetail
import app.offlineai.chat.data.Settings
import app.offlineai.chat.data.ThemeMode
import app.offlineai.chat.data.recommended
import app.offlineai.chat.engine.BenchRow
import app.offlineai.chat.engine.ChatOutcome
import app.offlineai.chat.engine.ReplyListener
import org.json.JSONArray
import org.json.JSONObject
import java.util.Locale

class SettingsActivity : AppCompatActivity() {
    private lateinit var app: App
    private lateinit var content: LinearLayout
    private lateinit var scroll: ScrollView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        app = App.of(this)
        Palette.apply(this, app.settings)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Palette.bg)
        }
        root.addView(topBar("Settings"), lp(MATCH, WRAP))
        scroll = ScrollView(this)
        content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(0, 0, 0, dp(32))
        }
        scroll.addView(content, android.widget.FrameLayout.LayoutParams(MATCH, WRAP))
        root.addView(scroll, lp(MATCH, 0, 1f))
        setContentView(root)
        edgeToEdge(root)
        build()
    }

    override fun onPause() {
        super.onPause()
        app.reloadIfNeeded()
    }

    /** Rebuilds the list, keeping the scroll position. */
    private fun rebuild() {
        val y = scroll.scrollY
        build()
        scroll.post { scroll.scrollTo(0, y) }
    }

    private fun build() {
        content.removeAllViews()
        val s = app.settings
        val reloadNote = if (app.engine.loaded != null) " Applies when the model reloads (on leaving Settings)." else ""

        content.addView(sectionTitle("Model and memory"))
        choice("Context size",
            "How much of the conversation the model holds at once. Larger uses more memory.$reloadNote",
            Settings.CONTEXT_SIZES.map { "$it tokens" }, Settings.CONTEXT_SIZES.indexOf(s.contextSize)) {
            s.contextSize = Settings.CONTEXT_SIZES[it]
        }
        choice("Memory mode", s.memoryMode.help + reloadNote, MemoryMode.values().map { it.label }, s.memoryMode.ordinal) {
            s.memoryMode = MemoryMode.values()[it]
        }
        switch("Compact conversation memory",
            "Stores the conversation memory at 8 bits: half the memory for long chats, very slightly less exact.$reloadNote",
            s.kvQ8) { s.kvQ8 = it }
        choice("Prompt batch size",
            "Tokens read per step when reading a message. Larger reads long prompts faster and needs a little more memory.$reloadNote",
            Settings.PROMPT_BATCHES.map { "$it" }, Settings.PROMPT_BATCHES.indexOf(s.promptBatch)) {
            s.promptBatch = Settings.PROMPT_BATCHES[it]
        }

        content.addView(sectionTitle("Performance"))
        choice("Mode", s.perfMode.help, PerfMode.values().map { it.label }, s.perfMode.ordinal) {
            s.perfMode = PerfMode.values()[it]
            applyThreadsNow()
        }
        val auto = s.baseThreads()
        val threadOptions = listOf("From the mode ($auto)") + (1..Device.cores().coerceAtMost(12)).map { "$it" }
        choice("CPU threads",
            "More is not always faster: slow cores make the fast ones wait. The speed test finds the best count for this phone.",
            threadOptions, if (s.threads <= 0) 0 else s.threads) {
            s.threads = if (it == 0) 0 else it
            applyThreadsNow()
        }
        row("Speed test", if (s.measuredSummary.isBlank()) "Measure reading and writing speed at different thread counts with the loaded model."
        else s.measuredSummary) { runSpeedTest() }
        switch("Keep writing in the background",
            "Lets a reply finish when you switch apps or the screen turns off, with a notification showing how far it " +
                "has got.",
            s.backgroundWriting) { s.backgroundWriting = it; rebuild() }
        if (s.backgroundWriting) {
            choice("Speed in the background", s.backgroundSpeed.help, BackgroundSpeed.values().map { it.label },
                s.backgroundSpeed.ordinal) {
                s.backgroundSpeed = BackgroundSpeed.values()[it]
                app.applyBackground()
                rebuild()
            }
            switch("Tell me when a reply is ready", "A notification when a reply finishes while you are in another app.",
                s.replyNotifications) { s.replyNotifications = it }
            val pm = getSystemService(android.content.Context.POWER_SERVICE) as android.os.PowerManager
            val free = pm.isIgnoringBatteryOptimizations(packageName)
            row("Let Android keep it running",
                if (free) "Allowed: battery saving will not pause a reply." else
                    "Android may pause long replies to save battery (some phones close apps in the background). Tap to allow.") {
                if (!free) {
                    val asked = runCatching {
                        startActivity(Intent(android.provider.Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS)
                            .setData(android.net.Uri.parse("package:$packageName")))
                    }.isSuccess
                    if (!asked) runCatching { startActivity(Intent(android.provider.Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)) }
                }
            }
        }
        choice("Screen updates while writing",
            "How often new text is drawn. Less often uses a little less battery.",
            Settings.STREAM_INTERVALS.map { if (it <= 16) "Every frame" else "Every $it ms" },
            Settings.STREAM_INTERVALS.indexOf(s.streamIntervalMs).coerceAtLeast(0)) {
            s.streamIntervalMs = Settings.STREAM_INTERVALS[it]
        }
        val heat = app.currentThermal()
        content.addView(note("The phone is ${Device.thermalLabel(heat)} right now. Balanced and Eco use fewer threads as it warms, " +
            "so it can keep a steady speed instead of overheating and slowing down hard."))

        content.addView(sectionTitle("Writing speed"))
        switch("Copy from the conversation",
            "When a reply repeats text that is already in the chat (rewriting a note, editing code, quoting you), the " +
                "repeated part is checked many words at a time instead of one by one. It costs nothing when nothing " +
                "repeats, and the words are the same either way. Qwen3.5-style models copy 3 words at a time (those " +
                "under 10B, not in low-memory mode).$reloadNote",
            s.copyDrafts) { s.copyDrafts = it }
        switch("Draft ahead with a helper",
            "Models with an MTP head (the Qwen3.5 files here) or a drafter (Gemma 4) can guess the next few words and " +
                "check them in one step. Replies read the same; only the speed changes. On a phone's CPU checking extra " +
                "words is not free, so it is used for a model only once the drafting test below finds it faster on " +
                "this phone, or with a number set here.$reloadNote",
            s.speculative) { s.speculative = it; rebuild() }
        if (s.speculative) {
            val file = app.engine.loaded?.key
            val measured = file?.let { s.measuredDrafts(it) } ?: -1
            val autoLabel = when {
                measured > 0 -> "Automatic (test: $measured)"
                measured == 0 -> "Automatic (test: off for this model)"
                else -> "Automatic (off until tested)"
            }
            choice("Words drafted per step",
                "The drafting test picks this for each model. 3 is usually best when drafting helps at all: the CPU " +
                    "checks words in groups of 4 most efficiently.$reloadNote",
                listOf(autoLabel) + Settings.DRAFT_TOKENS.drop(1).map { "$it" }, Settings.DRAFT_TOKENS.indexOf(s.draftTokens).coerceAtLeast(0)) {
                s.draftTokens = Settings.DRAFT_TOKENS[it]
            }
        }
        val current = app.engine.loaded
        if (current != null) {
            val how = current.info.speculative
            val desc = when {
                how.isEmpty() -> "${current.displayName} is not drafting with these settings."
                else -> "${current.displayName} drafts by " + how.split("+").joinToString(" and ") {
                    when (it) {
                        "mtp" -> "its own MTP head"
                        "drafter" -> "its drafter"
                        else -> "copying from the conversation"
                    }
                } + (if (current.info.specNMax > 0) ", up to ${current.info.specNMax} words per step." else ".")
            }
            content.addView(note(desc))
        }
        row("Drafting test", s.draftSummary.ifBlank {
            "Writes the same short text with drafting off and with 1, 2 and 3 drafted words, and keeps the fastest for this model."
        }) { runDraftTest() }

        content.addView(sectionTitle("Pictures, video and sound"))
        choice("Picture detail", s.pictureDetail.help + reloadNote, PictureDetail.values().map { it.label }, s.pictureDetail.ordinal) {
            s.pictureDetail = PictureDetail.values()[it]
        }
        choice("Frames per video",
            "A video is sent as this many pictures spread over its length. More frames see more, and take longer to read.",
            Settings.VIDEO_FRAMES.map { "$it frames" }, Settings.VIDEO_FRAMES.indexOf(s.videoFrames).coerceAtLeast(0)) {
            s.videoFrames = Settings.VIDEO_FRAMES[it]
        }
        content.addView(note("Pictures and sound need a model that can take them (Gemma 4, Qwen3.5, LFM2.5-VL, Ministral 3, " +
            "Bonsai) and its picture support, downloaded from the Models screen. Sound: up to ${Settings.MAX_SOUND_SECONDS} " +
            "seconds, Gemma 4 models only."))

        content.addView(sectionTitle("Replies"))
        switch("Thinking", "Models that can think work through the problem before answering. Slower, often better.",
            s.thinking) { s.thinking = it }
        switch("Show thinking open", "Keep the thinking unfolded after the answer starts.", s.expandThinking) {
            s.expandThinking = it
        }
        choice("Longest reply", "Thinking counts towards this.",
            Settings.MAX_TOKENS.map { "$it tokens" }, Settings.MAX_TOKENS.indexOf(s.maxTokens)) {
            s.maxTokens = Settings.MAX_TOKENS[it]
        }
        row("System prompt", s.systemPrompt.ifBlank { "None" }) {
            editText("System prompt", s.systemPrompt, multiLine = true) { s.systemPrompt = it.trim(); rebuild() }
        }

        content.addView(sectionTitle("Sampling"))
        switch("Use each model's recommended settings", "Turn off to set them yourself.", s.useRecommendedSampling) {
            s.useRecommendedSampling = it
            rebuild()
        }
        if (!s.useRecommendedSampling) {
            number("Temperature", s.temperature, "Higher is more varied, lower more predictable (0–2).") { s.temperature = it.coerceIn(0f, 2f) }
            number("Top-p", s.topP, "Keeps the likeliest words that add up to this share (0–1).") { s.topP = it.coerceIn(0f, 1f) }
            number("Top-k", s.topK.toFloat(), "Keeps only this many of the likeliest words (0 = all).") { s.topK = it.toInt().coerceIn(0, 500) }
            number("Min-p", s.minP, "Drops words much less likely than the best one (0–1).") { s.minP = it.coerceIn(0f, 1f) }
            number("Repeat penalty", s.repeatPenalty, "Above 1 discourages repeating (1 = off).") { s.repeatPenalty = it.coerceIn(0.5f, 2f) }
        }

        content.addView(sectionTitle("Chat"))
        switch("Follow new text", "While you are at the bottom, the chat follows the reply. Scrolling up always stops it.",
            s.autoFollow) { s.autoFollow = it }
        switch("Jump-to-bottom button", "Shown while you are reading further up.", s.jumpButton) { s.jumpButton = it }
        switch("Format replies", "Headings, lists, bold and code blocks. Off shows the raw text.", s.markdown) { s.markdown = it }
        switch("Colour code", "Syntax colours in code blocks.", s.syntaxHighlight) { s.syntaxHighlight = it }
        switch("Wrap long code lines", "Off scrolls code sideways instead.", s.codeWrap) { s.codeWrap = it }

        content.addView(sectionTitle("Appearance"))
        choice("Theme", null, ThemeMode.values().map { it.label }, s.theme.ordinal) {
            s.theme = ThemeMode.values()[it]
            restyle()
        }
        choice("Accent colour", null, Accent.values().map { it.label }, s.accent.ordinal) {
            s.accent = Accent.values()[it]
            restyle()
        }
        choice("Text size", null, Settings.FONT_SCALES.map { "${(it * 100).toInt()}%" },
            Settings.FONT_SCALES.indexOfFirst { it == s.fontScale }.coerceAtLeast(1)) {
            s.fontScale = Settings.FONT_SCALES[it]
            restyle()
        }
        switch("Keep the screen on while it writes", null, s.keepScreenOn) { s.keepScreenOn = it }

        content.addView(sectionTitle("Privacy and data"))
        content.addView(note("Chats and models never leave this phone. Chats are kept in the app's private storage, which " +
            "Android encrypts along with the rest of the phone's data."))
        switch("Offline only", "Turns off model downloads too, so the app never goes online.", s.offlineOnly) { s.offlineOnly = it }
        row("Chats", "Search, rename, export, import or delete chats.") {
            startActivity(Intent(this, ChatsActivity::class.java))
        }
        row("Delete all downloaded models", ModelStore.formatBytes(app.models.local().sumOf { it.sizeBytes }) + " on this phone") {
            AlertDialog.Builder(this)
                .setTitle("Delete all models?")
                .setMessage("They can be downloaded again later.")
                .setPositiveButton("Delete") { _, _ ->
                    app.engine.unload()
                    window.decorView.postDelayed({
                        app.models.local().forEach { app.models.delete(it) }
                        rebuild()
                    }, 300)
                }
                .setNegativeButton("Cancel", null)
                .show()
        }

        content.addView(sectionTitle("About"))
        val loaded = app.engine.loaded
        content.addView(note(
            "Offline AI ${BuildConfig.VERSION_NAME}, running llama.cpp ${BuildConfig.LLAMA_CPP_VERSION} on the CPU." +
                (loaded?.let { m ->
                    "\n\nLoaded: ${m.displayName} (${m.info.desc}), ${m.nCtx} context, ${if (m.config.lowMemory) "low-memory" else "fast"} mode, " +
                        "loaded in ${String.format(Locale.US, "%.1f", m.loadMs / 1000.0)}s."
                } ?: "") +
                "\n\nThe phone: ${Device.cores()} cores (${Device.fastCores()} fast), ${ModelStore.formatBytes(app.totalRam)} of memory, " +
                "${ModelStore.formatBytes(app.availableRam())} free now.",
        ))
        val report = getSharedPreferences("exits", MODE_PRIVATE).getString("last_report", null)
        if (report != null) {
            row("Last problem report", "Copy the details of the last time the app closed unexpectedly.") { copyText("report", report) }
        }
        val sys = text("", 12f, Palette.text3, mono = true).apply { setPadding(dp(20), dp(12), dp(20), 0) }
        content.addView(sys)
        app.engine.systemInfo { sys.text = it.trim().replace(" | ", "\n") }
    }

    private fun restyle() {
        Palette.apply(this, app.settings)
        recreate()
    }

    private fun applyThreadsNow() {
        if (app.engine.loaded != null) app.engine.setThreads(app.threadsNow())
    }

    private fun runSpeedTest() {
        val m = app.engine.loaded
        if (m == null || app.chat.generating || app.engine.isBusy) {
            Toast.makeText(this, if (m == null) "Load a model first." else "Wait until the model is free.", Toast.LENGTH_LONG).show()
            return
        }
        val candidates = Device.benchCandidates()
        val out = text("Measuring ${candidates.joinToString(", ")} threads with ${m.displayName}. " +
            "Keep the app open; this takes about a minute.\n", 14f, Palette.text2).apply {
            setPadding(dp(24), dp(8), dp(24), 0)
            typeface = android.graphics.Typeface.MONOSPACE
        }
        val dialog = AlertDialog.Builder(this)
            .setTitle("Speed test")
            .setView(out)
            .setNegativeButton("Stop") { _, _ -> app.engine.stop() }
            .setCancelable(false)
            .show()
        app.engine.bench(candidates, 128, 32, onRow = { r: BenchRow ->
            out.append(String.format(Locale.US, "\n%2d threads: read %5.1f, write %5.1f tok/s", r.threads, r.readTps, r.writeTps))
        }) { rows, error ->
            dialog.dismiss()
            if (rows.isEmpty()) {
                Toast.makeText(this, error ?: "Stopped.", Toast.LENGTH_LONG).show()
                return@bench
            }
            val best = rows.maxByOrNull { it.writeTps }!!
            val summary = rows.joinToString(", ") { String.format(Locale.US, "%d: %.1f", it.threads, it.writeTps) }
            AlertDialog.Builder(this)
                .setTitle("Fastest: ${best.threads} threads")
                .setMessage(String.format(Locale.US,
                    "Writing speed by thread count (tokens per second):\n%s\n\nUse %d threads from now on? (Eco uses half.)",
                    summary, best.threads))
                .setPositiveButton("Use ${best.threads}") { _, _ ->
                    app.settings.measuredThreads = best.threads
                    app.settings.threads = 0
                    app.settings.measuredSummary = String.format(Locale.US, "Fastest here: %d threads, %.1f tok/s writing with %s. Measured: %s.",
                        best.threads, best.writeTps, m.displayName, summary)
                    applyThreadsNow()
                    rebuild()
                }
                .setNegativeButton("Keep as is", null)
                .show()
        }
    }

    // ---- drafting test

    private fun runDraftTest(reloaded: Boolean = false) {
        val m = app.engine.loaded
        if (m == null || app.chat.generating || app.engine.isBusy) {
            Toast.makeText(this, if (m == null) "Load a model first." else "Wait until the model is free.", Toast.LENGTH_LONG).show()
            return
        }
        val local = app.models.find(m.key) ?: return
        val how = m.info.speculative
        val head = "mtp" in how || "drafter" in how
        if (!head) {
            val canHead = m.info.hasMtp || local.hasDrafter
            val drafter = local.catalog?.drafter
            if (!canHead) {
                AlertDialog.Builder(this)
                    .setTitle("Drafting test")
                    .setMessage(if (drafter != null) {
                        "${m.displayName} drafts with a separate drafter file (${ModelStore.formatBytes(drafter.sizeBytes)}). " +
                            "Add it on the Models screen first, then run the test."
                    } else {
                        "${m.displayName} has no MTP head or drafter, so there is nothing to test. Copying from the " +
                            "conversation still works for it when a reply repeats text."
                    })
                    .setPositiveButton("OK", null)
                    .show()
                return
            }
        }
        if ((!head || m.info.specNMax < 3) && !reloaded) {
            // load once with the helper and room for 3 drafts per step, so every length can be tried
            val keepTokens = app.settings.draftTokens
            val keepSpec = app.settings.speculative
            app.settings.draftTokens = 3
            app.settings.speculative = true
            Toast.makeText(this, "Loading the model with its drafting helper…", Toast.LENGTH_SHORT).show()
            app.loadModel(local) { err ->
                app.settings.draftTokens = keepTokens
                app.settings.speculative = keepSpec
                if (err != null) Toast.makeText(this, err, Toast.LENGTH_LONG).show() else if (!isFinishing) runDraftTest(reloaded = true)
            }
            return
        }
        if (!head) {
            Toast.makeText(this, "The drafting helper could not be loaded (not enough memory, or low-memory mode).", Toast.LENGTH_LONG).show()
            app.reloadIfNeeded()
            return
        }
        // drafting off, then each length
        val candidates = listOf(0, 1, 2, 3).filter { it <= m.info.specNMax }
        val out = text("Writing a short text ${candidates.size} times with ${m.displayName}. Keep the app open.\n", 14f, Palette.text2).apply {
            setPadding(dp(24), dp(8), dp(24), 0)
            typeface = android.graphics.Typeface.MONOSPACE
        }
        var stopped = false
        val dialog = AlertDialog.Builder(this)
            .setTitle("Drafting test")
            .setView(out)
            .setNegativeButton("Stop") { _, _ -> stopped = true; app.engine.stop() }
            .setCancelable(false)
            .show()
        val fam = local.family.recommended()
        val results = mutableListOf<Pair<Int, Double>>()
        fun label(n: Int) = when (n) { 0 -> "off"; -1 -> "on"; else -> "$n" }
        fun next(i: Int) {
            if (stopped || i >= candidates.size || isFinishing) {
                dialog.dismiss()
                if (!stopped && results.size == candidates.size) offerDraftResult(m.key, m.displayName, results)
                else app.reloadIfNeeded()
                return
            }
            val n = candidates[i]
            val req = JSONObject()
                .put("messages", JSONArray().put(JSONObject().put("role", "user")
                    .put("content", "Explain in one paragraph how a lighthouse helps ships at night, then list three facts about lighthouses.")))
                .put("thinking", false)
                .put("now_ms", 1_760_000_000_000L)
                .put("spec_n_max", n)
                .put("sampling", JSONObject().put("temp", fam.temp.toDouble()).put("top_p", fam.topP.toDouble())
                    .put("top_k", fam.topK).put("min_p", fam.minP.toDouble()).put("repeat_penalty", fam.repeat.toDouble())
                    .put("max_tokens", 120).put("seed", 1234))
            app.engine.setThreads(app.threadsNow())
            app.engine.reply(req, object : ReplyListener {
                override fun onPromptProgress(done: Int, total: Int) {}
                override fun onUpdate(reasoning: String, content: String, generated: Int) {}
                override fun onDone(outcome: ChatOutcome) {
                    if (!outcome.ok || outcome.nGenerated < 8 || outcome.tGenMs <= 0) {
                        dialog.dismiss()
                        if (!stopped) Toast.makeText(this@SettingsActivity, outcome.error.ifBlank { "The test stopped." }, Toast.LENGTH_LONG).show()
                        app.reloadIfNeeded()
                        return
                    }
                    val tps = (outcome.nGenerated - 1) * 1000.0 / outcome.tGenMs
                    results += n to tps
                    val kept = if (outcome.nDrafted > 0) String.format(Locale.US, ", %d%% of drafts kept", outcome.nAccepted * 100 / outcome.nDrafted) else ""
                    out.append(String.format(Locale.US, "\ndrafts %-3s %5.1f tok/s%s", label(n), tps, kept))
                    next(i + 1)
                }
            })
        }
        next(0)
    }

    private fun offerDraftResult(file: String, name: String, results: List<Pair<Int, Double>>) {
        val best = results.maxByOrNull { it.second } ?: return
        val off = results.firstOrNull { it.first == 0 }?.second ?: 0.0
        val summary = results.joinToString(", ") {
            String.format(Locale.US, "%s: %.1f", if (it.first == 0) "off" else "${it.first}", it.second)
        }
        val gain = if (off > 0) String.format(Locale.US, " (%.0f%% faster than without)", (best.second / off - 1) * 100) else ""
        val msg = String.format(Locale.US, "Tokens per second with %s:\n%s\n\n", name, summary) + when {
            best.first == 0 -> "Drafting does not make this model faster on this phone. Keep it off for this model?"
            else -> "Fastest: ${best.first} drafted words per step$gain. Use that for this model?"
        }
        AlertDialog.Builder(this)
            .setTitle("Drafting test")
            .setMessage(msg)
            .setPositiveButton("Yes") { _, _ ->
                app.settings.setMeasuredDrafts(file, best.first)
                app.settings.draftTokens = 0
                if (best.first > 0) app.settings.speculative = true
                app.settings.draftSummary = String.format(Locale.US, "%s: %s tok/s. Using %s.", name, summary,
                    if (best.first == 0) "no drafting" else "${best.first} per step")
                app.reloadIfNeeded()
                rebuild()
            }
            .setNegativeButton("No") { _, _ -> app.reloadIfNeeded() }
            .setOnCancelListener { app.reloadIfNeeded() }
            .show()
    }

    // ---- rows

    private fun note(s: String): TextView = text(s, 13f, Palette.text2).apply { setPadding(dp(20), dp(4), dp(20), dp(8)) }

    private fun row(title: String, value: String, onClick: () -> Unit) {
        val r = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(20), dp(12), dp(20), dp(12))
            background = ripple(null, 0f)
            setOnClickListener { onClick() }
        }
        r.addView(text(title, 15f))
        r.addView(text(value, 13f, Palette.text2).apply { maxLines = 4; ellipsize = android.text.TextUtils.TruncateAt.END })
        content.addView(r, lp(MATCH, WRAP))
    }

    private fun choice(title: String, help: String?, options: List<String>, current: Int, onPick: (Int) -> Unit) {
        val idx = current.coerceIn(0, options.size - 1)
        row(title, options[idx] + (help?.let { "\n$it" } ?: "")) {
            AlertDialog.Builder(this)
                .setTitle(title)
                .setSingleChoiceItems(options.toTypedArray(), idx) { d, which ->
                    d.dismiss()
                    onPick(which)
                    if (!isFinishing) rebuild()
                }
                .setNegativeButton("Cancel", null)
                .show()
        }
    }

    private fun switch(title: String, help: String?, value: Boolean, onChange: (Boolean) -> Unit) {
        val r = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(20), dp(12), dp(16), dp(12))
        }
        val texts = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        texts.addView(text(title, 15f))
        if (help != null) texts.addView(text(help, 13f, Palette.text2))
        r.addView(texts, lp(0, WRAP, 1f))
        val sw = SwitchCompat(this).apply {
            isChecked = value
            thumbTintList = ColorStateList(
                arrayOf(intArrayOf(android.R.attr.state_checked), intArrayOf()),
                intArrayOf(Palette.accent, Palette.text3),
            )
            trackTintList = ColorStateList(
                arrayOf(intArrayOf(android.R.attr.state_checked), intArrayOf()),
                intArrayOf((Palette.accent and 0x00FFFFFF) or 0x66000000, Palette.surface3),
            )
            setOnCheckedChangeListener { _, checked -> onChange(checked) }
        }
        r.addView(sw)
        r.setOnClickListener { sw.toggle() }
        content.addView(r, lp(MATCH, WRAP))
    }

    private fun number(title: String, value: Float, help: String, onSave: (Float) -> Unit) {
        val shown = if (value == value.toInt().toFloat()) value.toInt().toString() else String.format(Locale.US, "%.2f", value)
        row(title, "$shown\n$help") {
            editText(title, shown, multiLine = false, numeric = true) { t ->
                t.trim().toFloatOrNull()?.let { onSave(it) }
                rebuild()
            }
        }
    }

    private fun editText(title: String, value: String, multiLine: Boolean, numeric: Boolean = false, onSave: (String) -> Unit) {
        val field = EditText(this).apply {
            setText(value)
            setTextColor(Palette.text)
            if (numeric) inputType = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL
            else if (multiLine) {
                inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_MULTI_LINE or InputType.TYPE_TEXT_FLAG_CAP_SENTENCES
                minLines = 3
                maxLines = 10
                gravity = Gravity.TOP or Gravity.START
            }
            setSelection(text.length)
        }
        val box = LinearLayout(this).apply {
            setPadding(dp(20), dp(8), dp(20), 0)
            addView(field, lp(MATCH, WRAP))
        }
        AlertDialog.Builder(this)
            .setTitle(title)
            .setView(box)
            .setPositiveButton("Save") { _, _ -> onSave(field.text.toString()) }
            .setNegativeButton("Cancel", null)
            .show()
    }
}
