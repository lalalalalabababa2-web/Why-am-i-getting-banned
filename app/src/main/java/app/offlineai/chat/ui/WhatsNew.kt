package app.offlineai.chat.ui

import android.app.Activity
import android.widget.LinearLayout
import android.widget.ScrollView
import androidx.appcompat.app.AlertDialog

/**
 * What changed, shown once after an update brings a new list (never on a first install, where
 * none of it is new). Raise [VERSION] whenever [ITEMS] changes.
 */
object WhatsNew {
    const val VERSION = 1

    private val ITEMS = listOf(
        "New models" to "Spark-X2.6 4B and 1.7B, Nemotron 3.5 Bolt E4B, Ornith 1.5 9B, and for pictures and video " +
            "Qwen3-VL 2B, 4B and 8B and LFM2.5-VL 3B.",
        "Answers sooner" to "Thinking models now answer after 1024 tokens of thinking (Settings, Thinking budget), " +
            "and a long chat no longer has to be read again from the start on every turn once it fills the context.",
        "Models screen" to "Search, what each model can do at a glance, whether it fits in memory before you " +
            "download it, and download speed with time left.",
        "In the chat" to "Read a reply aloud or share it, readable maths, things to try in a new chat, and switching " +
            "models by tapping the model's name at the top.",
        "Settings" to "Ready-made styles for the system prompt, and an accent colour from your wallpaper.",
        "About" to "What the app promises, credits for everyone it is built on, and their licenses (Settings, About).",
    )

    /** Shows the list if this is an update the person has not seen it for; remembers either way. */
    fun maybeShow(activity: Activity, seen: Int, remember: (Int) -> Unit) {
        if (seen >= VERSION) return
        remember(VERSION)
        val fresh = try {
            val info = activity.packageManager.getPackageInfo(activity.packageName, 0)
            info.firstInstallTime == info.lastUpdateTime
        } catch (e: Exception) {
            true
        }
        if (!fresh) show(activity)
    }

    /** The list, whenever asked for (About has a row for it). */
    fun show(activity: Activity) {
        val box = LinearLayout(activity).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(activity.dp(24), activity.dp(8), activity.dp(24), activity.dp(8))
        }
        for ((title, body) in ITEMS) {
            box.addView(activity.text(title, 15f, bold = true).apply { setPadding(0, activity.dp(10), 0, 0) })
            box.addView(activity.text(body, 14f, Palette.text2))
        }
        val scroll = ScrollView(activity).apply { addView(box) }
        AlertDialog.Builder(activity)
            .setTitle("What's new")
            .setView(scroll)
            .setPositiveButton("Got it", null)
            .show()
    }
}
