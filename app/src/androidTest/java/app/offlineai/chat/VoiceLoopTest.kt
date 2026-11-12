package app.offlineai.chat

import app.offlineai.chat.ui.VoiceLoop
import app.offlineai.chat.ui.VoiceLoop.State
import org.junit.Assert.assertEquals
import org.junit.Test

/** The order of a spoken conversation, with the listening, sending and speaking faked. */
class VoiceLoopTest {
    private class Fake : VoiceLoop.Hooks {
        val calls = mutableListOf<String>()
        var canListen = true
        var canSend = true
        var canSpeak = true
        override fun listen(): Boolean { calls += "listen"; return canListen }
        override fun send(words: String): Boolean { calls += "send $words"; return canSend }
        override fun speak(text: String): Boolean { calls += "speak $text"; return canSpeak }
        override fun quiet() { calls += "quiet" }
        override fun changed() {}
    }

    private fun loop(): Pair<VoiceLoop, Fake> {
        val f = Fake()
        return VoiceLoop(f) to f
    }

    @Test
    fun aWholeTurnAndTheNext() {
        val (v, f) = loop()
        v.start()
        assertEquals(State.LISTENING, v.state)
        v.heard("  what is the time in Tokyo  ")
        assertEquals(State.WAITING, v.state)
        v.replied("It is 3 in the afternoon.")
        assertEquals(State.SPEAKING, v.state)
        v.spoken()
        assertEquals(State.LISTENING, v.state)
        assertEquals(listOf("listen", "send what is the time in Tokyo", "speak It is 3 in the afternoon.", "listen"), f.calls)
    }

    @Test
    fun twoSilentTurnsInARowEndIt() {
        val (v, f) = loop()
        v.start()
        v.heard("")
        assertEquals(State.LISTENING, v.state)
        v.heard("  ")
        assertEquals(State.OFF, v.state)
        assertEquals(listOf("listen", "listen", "quiet"), f.calls)
    }

    @Test
    fun wordsInBetweenStartTheSilentCountAgain() {
        val (v, _) = loop()
        v.start()
        v.heard("")
        v.heard("hello")
        v.replied("Hi.")
        v.spoken()
        v.heard("")
        assertEquals("one silent turn after words does not end it", State.LISTENING, v.state)
    }

    @Test
    fun aFailedOrEmptyReplyListensAgain() {
        val (v, f) = loop()
        v.start()
        v.heard("hello")
        v.replied("")
        assertEquals(State.LISTENING, v.state)
        assertEquals(listOf("listen", "send hello", "listen"), f.calls)
    }

    @Test
    fun whatCannotBeDoneEndsItOrMovesOn() {
        val (a, fa) = loop()
        fa.canListen = false
        a.start()
        assertEquals("no listening: it ends", State.OFF, a.state)

        val (b, fb) = loop()
        fb.canSend = false
        b.start()
        b.heard("hello")
        assertEquals("not sent: it ends", State.OFF, b.state)

        val (c, fc) = loop()
        fc.canSpeak = false
        c.start()
        c.heard("hello")
        c.replied("Hi.")
        assertEquals("no voice to read with: back to listening", State.LISTENING, c.state)

        val (d, _) = loop()
        d.start()
        d.failed()
        assertEquals("listening broke: it ends", State.OFF, d.state)
    }

    @Test
    fun eventsAtTheWrongTimeAreIgnored() {
        val (v, f) = loop()
        v.heard("too early")
        v.replied("too early")
        v.spoken()
        assertEquals(State.OFF, v.state)
        v.start()
        v.replied("not waiting for a reply")
        v.spoken()
        assertEquals(State.LISTENING, v.state)
        v.heard("hello")
        v.heard("again")
        v.spoken()
        assertEquals(State.WAITING, v.state)
        v.start()
        assertEquals(listOf("listen", "send hello"), f.calls)
    }

    @Test
    fun endingItQuietsOnce() {
        val (v, f) = loop()
        v.start()
        v.heard("hello")
        v.stop()
        v.stop()
        v.replied("late reply")
        assertEquals(State.OFF, v.state)
        assertEquals(listOf("listen", "send hello", "quiet"), f.calls)
    }
}
