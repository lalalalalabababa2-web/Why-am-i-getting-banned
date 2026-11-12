package app.offlineai.chat.ui

import android.content.Context
import android.speech.tts.TextToSpeech
import android.widget.Toast

/**
 * Reads a reply aloud with the phone's own text-to-speech, which works offline once its voice is
 * on the phone. Markdown marks are left out of what is spoken, code blocks are named instead of
 * spelled out, and long replies go in pieces the engine can take.
 */
object ReadAloud {
    private var tts: TextToSpeech? = null
    private var ready = false
    private var failed = false
    private val waiting = mutableListOf<String>()

    /** The message being read, if any. */
    private var readingId: String? = null

    fun isReading(id: String): Boolean = readingId == id && (waiting.isNotEmpty() || tts?.isSpeaking == true)

    fun read(context: Context, id: String, markdown: String) {
        stop()
        val pieces = pieces(spoken(markdown))
        if (pieces.isEmpty()) return
        readingId = id
        val engine = tts
        if (engine != null && ready) {
            say(engine, pieces)
            return
        }
        waiting.clear()
        waiting.addAll(pieces)
        if (engine != null && !failed) return  // still starting; it reads them when it is ready
        val app = context.applicationContext
        failed = false
        tts = TextToSpeech(app) { status ->
            ready = status == TextToSpeech.SUCCESS
            val started = tts
            if (ready && started != null) {
                say(started, waiting.toList())
                waiting.clear()
            } else {
                failed = true
                waiting.clear()
                readingId = null
                Toast.makeText(app, "This phone has no text-to-speech voice. Add one in Android's settings " +
                    "(System, Languages, Text-to-speech).", Toast.LENGTH_LONG).show()
            }
        }
    }

    fun stop() {
        waiting.clear()
        readingId = null
        runCatching { tts?.stop() }
    }

    private fun say(engine: TextToSpeech, pieces: List<String>) {
        pieces.forEachIndexed { i, p ->
            engine.speak(p, if (i == 0) TextToSpeech.QUEUE_FLUSH else TextToSpeech.QUEUE_ADD, null, "offline-ai-$i")
        }
    }

    /** What a person would read out: no markdown marks, code blocks named, links by their text. */
    internal fun spoken(md: String): String = md
        .replace(Regex("```[\\s\\S]*?(```|$)"), "\n(a code block)\n")
        .replace(Regex("\\[([^\\]]*)\\]\\([^)]*\\)"), "$1")
        .replace(Regex("(?m)^\\s*#{1,6}\\s+"), "")
        .replace(Regex("(?m)^\\s*[-*+]\\s+"), "")
        .replace(Regex("[*_`~|>]"), "")
        .replace(Regex("\n{3,}"), "\n\n")
        .trim()

    /** Pieces of at most [MAX] characters, cut at paragraph, sentence or word ends. */
    internal fun pieces(text: String): List<String> {
        val out = mutableListOf<String>()
        var rest = text
        while (rest.length > MAX) {
            val window = rest.substring(0, MAX)
            var cut = window.lastIndexOf("\n\n")
            if (cut < MAX / 2) cut = window.lastIndexOf(". ").let { if (it > 0) it + 1 else -1 }
            if (cut < MAX / 2) cut = window.lastIndexOf(' ')
            if (cut <= 0) cut = MAX
            out += rest.substring(0, cut).trim()
            rest = rest.substring(cut)
        }
        if (rest.isNotBlank()) out += rest.trim()
        return out.filter { it.isNotBlank() }
    }

    /** Below what speech engines take at once (TextToSpeech.getMaxSpeechInputLength is 4000). */
    private const val MAX = 3500
}
