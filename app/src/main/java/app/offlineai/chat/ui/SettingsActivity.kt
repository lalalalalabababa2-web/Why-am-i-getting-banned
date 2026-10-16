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
import app.offlineai.chat.data.Device
import app.offlineai.chat.data.MemoryMode
import app.offlineai.chat.data.ModelStore
import app.offlineai.chat.data.PerfMode
import app.offlineai.chat.data.Settings
import app.offlineai.chat.data.ThemeMode
import app.offlineai.chat.engine.BenchRow
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
            "Lets a reply finish when you switch apps or the screen turns off, with a notification while it writes.",
            s.backgroundWriting) { s.backgroundWriting = it }
        choice("Screen updates while writing",
            "How often new text is drawn. Less often uses a little less battery.",
            Settings.STREAM_INTERVALS.map { if (it <= 16) "Every frame" else "Every $it ms" },
            Settings.STREAM_INTERVALS.indexOf(s.streamIntervalMs).coerceAtLeast(0)) {
            s.streamIntervalMs = Settings.STREAM_INTERVALS[it]
        }
        val heat = app.currentThermal()
        content.addView(note("The phone is ${Device.thermalLabel(heat)} right now. Balanced and Eco use fewer threads as it warms, " +
            "so it can keep a steady speed instead of overheating and slowing down hard."))

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
