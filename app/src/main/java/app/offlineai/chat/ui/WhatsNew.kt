package app.offlineai.chat.ui

import android.app.Activity

/**
 * What changed, shown once after an update brings a new list (never on a first install, where
 * none of it is new). Raise [VERSION] whenever [ITEMS] changes.
 */
object WhatsNew {
    const val VERSION = 12

    private val ITEMS = listOf(
        "Auto web search" to "The Search button under the message box goes Off, Auto and Always. On Auto, questions " +
            "about facts, news, prices, dates or people are searched on the web first, and replies trust the results " +
            "over what the model remembers.",
        "Phone commands" to "Type \"open settings\", \"open wifi\", \"open YouTube\", \"flashlight on\", \"set an alarm " +
            "for 7:30 am\", \"set a timer for 5 minutes\", \"call 555 1234\" or \"text 555 1234 on my way\": done right away.",
        "New message box" to "What you type gets the full width; the paperclip, Search, Think and send sit underneath.",
        "Web search fixes" to "Misspelt names are corrected before searching (\"sparyground\" finds Sprayground), only " +
            "your latest message goes to the model with its results (older ones no longer cost tokens or confuse " +
            "replies), and when the pages say little, the search engines' own top results are used.",
        "Web search: more sites, quicker" to "It now asks DuckDuckGo and Bing at once, so answers come from many sites, " +
            "not just Wikipedia, and no longer waits for one that is slow (about 3 seconds instead of 8). Questions are " +
            "searched as keywords (\"come out\" becomes \"release date\"), and pages that only share a word with your " +
            "question are left out instead of filling the reply's memory.",
        "Ping Pong Pro" to "A new icon and name for the game, and your racket reaches wide balls: it moves further than " +
            "your finger, so the edge of the table is no longer off the screen.",
        "Better web search, fewer tokens" to "It reads up to six pages and keeps only the passages that answer you " +
            "(about 400 tokens instead of up to 1,000; Settings, Web search, How much it reads), and links and the " +
            "[1], [2] in a reply open the page.",
        "Thinking button" to "The light bulb in the message box turns thinking on or off for the next replies: on, " +
            "the model thinks first (better on hard questions); off, it answers straight away with fewer tokens.",
        "Web search" to "Nyx can now look things up: tap the paperclip, then Search the web. Each message you send " +
            "is searched (DuckDuckGo, or Brave Search or your own SearXNG server in Settings), the top pages are read " +
            "here on the phone, and the answer cites them, with the pages listed under your message. It is off " +
            "until you turn it on; the globe in the message box turns it off again, and then nothing leaves the phone.",
        "Pictures read up to 16 times faster" to "Reading a picture on Detailed took minutes; on our ARM test " +
            "machine Gemma 4 E2B now reads one in 6 seconds instead of 95, Qwen3.5 in 4 instead of 65, and " +
            "Ternary Bonsai 2 9B and LFM2.5-VL in 23 instead of about 185. The picture part now uses the " +
            "processor's fast matrix layout and its 8-bit dot-product instructions, like the chat models do. " +
            "Picture parts that come as 16-bit files also take half the memory.",
        "Faster on newer phones" to "On phones whose processor has SVE2, part of reading every long message " +
            "ran without the processor's vector instructions. It uses them now.",
        "Tidier screens" to "The send button sits evenly inside the message box, tables fill their card, every " +
            "row of the model menu lines up, Tools has its own icon, and the Pictures screen's buttons no " +
            "longer sit over text.",
        "No more crashes from a long context" to "A context size bigger than the phone's free memory can hold no " +
            "longer slows a model to a crawl or gets Nyx closed: each model gets as much of it as fits, measured " +
            "for that model when it loads, and the top of the chat says \"fit to memory\" when it was lowered.",
        "Faster long chats" to "Writing no longer slows down as much as a chat grows: the conversation memory " +
            "is read once for all the parts of the model that share it, instead of up to eight times, with half " +
            "the work per step on most phones. Long chats now write faster than before the engine update, and " +
            "bigger models using the smaller 8-bit memory (when the phone is short of it) are up to half again " +
            "as fast.",
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
