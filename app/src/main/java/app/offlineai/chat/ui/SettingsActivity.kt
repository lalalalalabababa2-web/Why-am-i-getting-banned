package app.offlineai.chat.ui

import android.content.res.ColorStateList
import android.os.Bundle
import android.text.InputType
import android.view.Gravity
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.SwitchCompat
import app.offlineai.chat.App
import app.offlineai.chat.BuildConfig
import app.offlineai.chat.data.Device
import app.offlineai.chat.data.Settings
import java.util.Locale

class SettingsActivity : AppCompatActivity() {
    private lateinit var app: App
    private lateinit var content: LinearLayout

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        app = App.of(this)
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Palette.bg)
        }
        root.addView(topBar("Settings"), lp(MATCH, WRAP))
        val scroll = ScrollView(this)
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

    private fun build() {
        content.removeAllViews()
        val s = app.settings

        content.addView(sectionTitle("Model"))
        choice(
            "Context size",
            "How much of the conversation the model holds at once. Larger uses more memory. Applies on the next load.",
            Settings.CONTEXT_SIZES.map { "$it tokens" }, Settings.CONTEXT_SIZES.indexOf(s.contextSize),
        ) { s.contextSize = Settings.CONTEXT_SIZES[it] }
        val auto = Device.defaultThreads()
        val threadOptions = listOf("Automatic ($auto)") + (1..Device.cores().coerceAtMost(12)).map { "$it" }
        choice(
            "CPU threads",
            "Automatic uses the fast cores only. Applies on the next load.",
            threadOptions, if (s.threads <= 0) 0 else s.threads,
        ) { s.threads = if (it == 0) 0 else it }

        content.addView(sectionTitle("Replies"))
        switch("Thinking", "Models that can think work through the problem before answering. Slower, often better.",
            s.thinking) { s.thinking = it }
        switch("Show thinking open", "Keep the thinking unfolded after the answer arrives.", s.expandThinking) {
            s.expandThinking = it
        }
        choice("Longest reply", "Thinking counts towards this.",
            Settings.MAX_TOKENS.map { "$it tokens" }, Settings.MAX_TOKENS.indexOf(s.maxTokens)) {
            s.maxTokens = Settings.MAX_TOKENS[it]
        }
        row("System prompt", s.systemPrompt.ifBlank { "None" }) {
            editText("System prompt", s.systemPrompt, multiLine = true) { s.systemPrompt = it.trim(); build() }
        }

        content.addView(sectionTitle("Sampling"))
        switch("Use each model's recommended settings", "Turn off to set them yourself.", s.useRecommendedSampling) {
            s.useRecommendedSampling = it
            build()
        }
        if (!s.useRecommendedSampling) {
            number("Temperature", s.temperature, "Higher is more varied, lower more predictable (0–2).") { s.temperature = it.coerceIn(0f, 2f) }
            number("Top-p", s.topP, "Keeps the likeliest words that add up to this share (0–1).") { s.topP = it.coerceIn(0f, 1f) }
            number("Top-k", s.topK.toFloat(), "Keeps only this many of the likeliest words (0 = all).") { s.topK = it.toInt().coerceIn(0, 500) }
            number("Min-p", s.minP, "Drops words much less likely than the best one (0–1).") { s.minP = it.coerceIn(0f, 1f) }
            number("Repeat penalty", s.repeatPenalty, "Above 1 discourages repeating (1 = off).") { s.repeatPenalty = it.coerceIn(0.5f, 2f) }
        }

        content.addView(sectionTitle("Other"))
        switch("Keep the screen on while it writes", null, s.keepScreenOn) { s.keepScreenOn = it }

        content.addView(sectionTitle("About"))
        val about = text(
            "Offline AI ${BuildConfig.VERSION_NAME} (build ${BuildConfig.VERSION_CODE}), running llama.cpp ${BuildConfig.LLAMA_CPP_VERSION} on the CPU.\n\n" +
                "Chats and models stay on this phone. The app only goes online to download a model you pick.",
            13f, Palette.text2,
        ).apply { setPadding(dp(20), 0, dp(20), 0) }
        content.addView(about)
        val sys = text("", 12f, Palette.text3, mono = true).apply { setPadding(dp(20), dp(12), dp(20), 0) }
        content.addView(sys)
        app.engine.systemInfo { sys.text = it.trim().replace(" | ", "\n") }
    }

    private fun row(title: String, value: String, onClick: () -> Unit) {
        val r = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(20), dp(12), dp(20), dp(12))
            background = ripple(null, 0f)
            setOnClickListener { onClick() }
        }
        r.addView(text(title, 15f))
        r.addView(text(value, 13f, Palette.text2).apply { maxLines = 3; ellipsize = android.text.TextUtils.TruncateAt.END })
        content.addView(r, lp(MATCH, WRAP))
    }

    private fun choice(title: String, help: String?, options: List<String>, current: Int, onPick: (Int) -> Unit) {
        val idx = current.coerceIn(0, options.size - 1)
        row(title, options[idx] + (help?.let { "\n$it" } ?: "")) {
            AlertDialog.Builder(this)
                .setTitle(title)
                .setSingleChoiceItems(options.toTypedArray(), idx) { d, which ->
                    onPick(which)
                    d.dismiss()
                    build()
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
                intArrayOf(0x668FA9C7, Palette.surface3),
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
                build()
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
