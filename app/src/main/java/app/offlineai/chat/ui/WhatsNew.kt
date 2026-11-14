package app.offlineai.chat.ui

import android.app.Activity

/**
 * What changed, shown once after an update brings a new list (never on a first install, where
 * none of it is new). Raise [VERSION] whenever [ITEMS] changes.
 */
object WhatsNew {
    const val VERSION = 2

    private val ITEMS = listOf(
        "Nyx" to "A new name, icon and look: menus that rise from the bottom, a message box that floats over the " +
            "chat like frosted glass, and motion that follows your finger.",
        "Pictures" to "Make pictures from words, here on the phone: tap Make a picture in a new chat, or the paperclip. " +
            "Seven picture models, from SDXS (seconds) to DreamShaper XL Turbo (the best looking); styles, shapes, " +
            "and Steps from 1 to 30. Pictures carry on in the background, with a notification when one is ready.",
        "Steadier speed" to "Replies keep the phone's processor at full speed for the whole reply, and the " +
            "conversation memory is kept compact when memory is tight.",
        "Hide as a game" to "Settings, Privacy: the launcher shows a ping pong game instead; a secret code typed as " +
            "the player name opens Nyx.",
        "New models" to "Spark-X2.6 4B and 1.7B, Nemotron 3.5 Bolt E4B, Ornith 1.5 9B, and for pictures and video " +
            "Qwen3-VL 2B, 4B and 8B and LFM2.5-VL 3B.",
        "Answers sooner" to "Thinking models now answer after 1024 tokens of thinking (Settings, Thinking budget), " +
            "and a long chat no longer has to be read again from the start on every turn once it fills the context.",
        "Models screen" to "Search, what each model can do at a glance, whether it fits in memory before you " +
            "download it, and download speed with time left.",
        "In the chat" to "Read a reply aloud or share it, readable maths, things to try in a new chat, and switching " +
            "models by tapping the model's name at the top.",
        "Speak instead of typing" to "With the message box empty, the send button is a microphone: what you say is " +
            "written into the box by the phone's own offline speech recognition (Android 12 and later). Hold it, tap " +
            "Talk in a new chat, or long-press the app's icon and pick Talk, to talk: each reply is read aloud, then " +
            "it listens again.",
        "Settings" to "Ready-made styles for the system prompt, and an accent colour from your wallpaper.",
        "Work together" to "Have each message answered two or three times separately, then checked and settled in a " +
            "review: by the model itself, or with a second model on the phone loaded next to it. Tap the model's name " +
            "at the top, then Work together.",
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
        val sheet = Sheet(activity, "What's new")
        for ((title, body) in ITEMS) sheet.view(activity.sheetParagraph(title, body))
        sheet.button("Got it") {}.show()
    }
}
