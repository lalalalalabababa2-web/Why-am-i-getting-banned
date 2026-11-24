package app.offlineai.chat.ui

import android.app.Activity

/**
 * What changed, shown once after an update brings a new list (never on a first install, where
 * none of it is new). Raise [VERSION] whenever [ITEMS] changes.
 */
object WhatsNew {
    const val VERSION = 5

    private val ITEMS = listOf(
        "No more crashes from a long context" to "A context size bigger than the phone's free memory can hold no " +
            "longer slows a model to a crawl or gets Nyx closed: each model gets as much of it as fits, measured " +
            "for that model when it loads, and the top of the chat says \"fit to memory\" when it was lowered.",
        "Faster long chats" to "Writing no longer slows down as much as a chat grows: a new way of reading the " +
            "conversation memory reads it once for all the parts of the model that share it, instead of up to " +
            "eight times.",
        "Free memory while away" to "Two minutes after you leave Nyx (or while the game is open), the model " +
            "leaves memory so the phone stays quick and Android does not close Nyx for it. It loads again when " +
            "you come back. Settings, Free memory while away.",
        "Message box" to "Pressing Enter in an empty box no longer makes it tall and empty, and the chat fades out " +
            "behind the box instead of showing through under it.",
        "Lighter E4B models" to "Gemma 4 E4B and E2B now download Google's own 4-bit trained versions: 4.2 GB " +
            "instead of 5, 2.6 GB in memory instead of 3, and faster on the phone's processor, with the same " +
            "answers. Nemotron Bolt and the uncensored E4B got lighter files too. An older copy you already have " +
            "keeps working and shows under Your files with the lighter one to download.",
        "Memory, measured" to "The app now reads each model's file to see how much of it has to stay in memory, " +
            "instead of guessing from its size, and picks fast or low-memory mode from that.",
        "Tools" to "Translate (37 languages), Humanize, Summarize, Fix grammar, Rewrite, Shorten, More formal or " +
            "casual, Bullet points, Explain simply, Write a reply, Notes to email. From the chat's empty screen, " +
            "the model menu, or a message's long-press menu.",
        "Made for one job" to "Index-Translate 2B (150 languages, also text in photos) and Humanizer 12B; Tools uses " +
            "them when they are on the phone.",
        "New models" to "LFM3 1.7B and LFM3-VL 2B from Liquid AI, and Ternary Bonsai 2 27B (Qwen3.8 27B) for two phones.",
        "Better pictures" to "FLUX.2 klein 4B and Z-Image Turbo: they follow long prompts and can write words into " +
            "the picture.",
        "Ping Pong" to "Real table tennis now: a regulation table in perspective, a ball that flies and bounces, " +
            "rackets, the rules (first to 11, serve every two points) and the sounds.",
        "Faster engine" to "llama.cpp b12670, with the app's own ARM kernels moved onto it.",
        "Encrypted" to "Chats, Memory, characters and paired phones are now encrypted on the phone with a key kept in " +
            "its Keystore, and the app's code is scrambled so it is hard to read if the APK is taken apart.",
        "Reply versions" to "Write again keeps the earlier replies: flip between them with the arrows under the last " +
            "reply, and the chat goes on from the one you pick.",
        "Characters" to "Chat with someone: a storyteller, a study buddy, a debate partner, or anyone you make (name, " +
            "personality, how they open the chat). Hold the New chat button, or tap the model's name, then Characters.",
        "Continue" to "A reply cut off by its length limit, or stopped, has a Continue button: the model carries on " +
            "writing it from where it stopped, in the same message.",
        "Memory" to "Nyx can remember things about you across every chat: long-press a message and pick Remember " +
            "this, or add notes in Settings, Memory. They stay on the phone.",
        "Phones together" to "Run models bigger than one phone's memory across two phones on the same Wi-Fi (or one on " +
            "the other's hotspot). On the second phone: Settings, Phones together, Let another phone use this one. On " +
            "this one, pair it with the code it shows. A model that does not fit here then shares its memory. If the " +
            "other phone leaves, the reply stops with a message and the model loads again here.",
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
