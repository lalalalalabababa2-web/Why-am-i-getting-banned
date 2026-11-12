package app.offlineai.chat.ui

/**
 * A spoken conversation: listen, send what was said, wait for the reply, read it aloud, listen
 * again. Only the order of things lives here; the screen does the listening, sending and speaking
 * through [Hooks], so this runs (and is tested) without a phone.
 */
class VoiceLoop(private val hooks: Hooks) {
    interface Hooks {
        /** Starts listening, now or in a moment; false if it cannot. A later failure comes in through [failed]. */
        fun listen(): Boolean
        /** Sends the words as a message; false if they could not be sent. */
        fun send(words: String): Boolean
        /** Reads the reply aloud and calls [spoken] when done; false if it cannot. */
        fun speak(text: String): Boolean
        /** Stops listening and speaking: the conversation ended. */
        fun quiet()
        /** The state changed (the screen shows it). */
        fun changed()
    }

    enum class State { OFF, LISTENING, WAITING, SPEAKING }

    var state = State.OFF
        private set

    /** Turns in a row where nothing was heard; the conversation ends at [MAX_MISSES]. */
    private var misses = 0

    val on: Boolean get() = state != State.OFF

    fun start() {
        if (state != State.OFF) return
        misses = 0
        listen()
    }

    fun stop() {
        if (state == State.OFF) return
        state = State.OFF
        hooks.quiet()
        hooks.changed()
    }

    /** What was heard: the words, or empty when nothing was. */
    fun heard(words: String) {
        if (state != State.LISTENING) return
        if (words.isBlank()) {
            misses++
            if (misses >= MAX_MISSES) stop() else listen()
            return
        }
        misses = 0
        state = State.WAITING
        hooks.changed()
        if (!hooks.send(words.trim()) && state == State.WAITING) stop()
    }

    /** Listening failed for another reason than silence (no permission, no recognizer). */
    fun failed() {
        if (state == State.LISTENING) stop()
    }

    /** The reply is finished: its text, or empty when it failed or was stopped before a word. */
    fun replied(text: String) {
        if (state != State.WAITING) return
        if (text.isBlank()) {
            listen()
            return
        }
        state = State.SPEAKING
        hooks.changed()
        if (!hooks.speak(text) && state == State.SPEAKING) listen()
    }

    /** The reply was read out, or reading it was cut short to talk. */
    fun spoken() {
        if (state == State.SPEAKING) listen()
    }

    private fun listen() {
        state = State.LISTENING
        hooks.changed()
        if (!hooks.listen() && state == State.LISTENING) stop()
    }

    companion object {
        /** Silent turns in a row before the conversation ends by itself. */
        const val MAX_MISSES = 2
    }
}
