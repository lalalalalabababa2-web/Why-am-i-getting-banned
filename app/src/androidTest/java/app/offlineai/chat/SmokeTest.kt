package app.offlineai.chat

import android.os.SystemClock
import android.util.Log
import android.widget.LinearLayout
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import app.offlineai.chat.ui.ChatsActivity
import app.offlineai.chat.ui.MainActivity
import app.offlineai.chat.ui.Markdown
import app.offlineai.chat.ui.ModelsActivity
import app.offlineai.chat.ui.SettingsActivity
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/**
 * The whole app on an emulator, with tiny random models that CI makes with llama.cpp's own tool
 * (their words are nonsense; the point is that every path runs): the engine starts, models
 * load, chats run for several turns on both kinds of model memory, stop and write-again work,
 * and every screen opens.
 */
@RunWith(AndroidJUnit4::class)
class SmokeTest {
    private val inst = InstrumentationRegistry.getInstrumentation()
    private val app = inst.targetContext.applicationContext as App

    private fun onMain(block: () -> Unit) = inst.runOnMainSync { block() }

    private fun waitFor(what: String, timeoutMs: Long, cond: () -> Boolean) {
        val end = SystemClock.uptimeMillis() + timeoutMs
        while (SystemClock.uptimeMillis() < end) {
            var ok = false
            onMain { ok = cond() }
            if (ok) return
            Thread.sleep(100)
        }
        throw AssertionError("timed out waiting for $what")
    }

    private fun installModel(asset: String): File {
        val dst = File(app.models.dir, asset)
        inst.context.assets.open(asset).use { i -> dst.outputStream().use { o -> i.copyTo(o) } }
        return dst
    }

    private fun load(file: File) {
        val latch = CountDownLatch(1)
        var error: String? = "not called"
        onMain {
            app.loadModel(file, file.name) { e ->
                error = e
                latch.countDown()
            }
        }
        assertTrue("model load did not finish", latch.await(180, TimeUnit.SECONDS))
        assertNull("model load failed", error)
        Log.i(TAG, "loaded ${file.name}: ${app.engine.loaded?.info}")
    }

    private fun turn(text: String) {
        var sent = false
        onMain { sent = app.chat.send(text) }
        assertTrue("send refused", sent)
        waitFor("a reply", 180_000) { !app.chat.generating }
        val last = app.chat.conversation.messages.last()
        Log.i(TAG, "reply: error=${last.error} stats=${last.stats} content=${last.content.take(80)}")
        assertEquals("assistant", last.role)
        assertFalse("reply failed: ${last.content}", last.error)
    }

    @Test
    fun engineStarts() {
        assertNull(app.nativeError)
        var info = ""
        val latch = CountDownLatch(1)
        app.engine.systemInfo {
            info = it
            latch.countDown()
        }
        assertTrue(latch.await(30, TimeUnit.SECONDS))
        Log.i(TAG, "system info: $info")
        assertTrue(info.isNotBlank())
    }

    @Test
    fun chatsOnBothKindsOfMemory() {
        app.settings.contextSize = 2048
        app.settings.maxTokens = 512
        app.settings.threads = 2
        ActivityScenario.launch(MainActivity::class.java).use {
            for (asset in listOf("test-qwen35.gguf", "test-llama.gguf")) {
                val file = installModel(asset)
                load(file)
                onMain { app.chat.newChat() }
                turn("Hello there, how are you?")
                turn("Tell me more about that.")
                turn("And once more, in more words this time please.")

                // write the last reply again
                onMain { app.chat.regenerate() }
                waitFor("regenerate", 180_000) { !app.chat.generating }
                assertFalse(app.chat.conversation.messages.last().error)

                // stop part way
                onMain { app.chat.send("Write a very long story.") }
                waitFor("first words", 60_000) { app.chat.generated > 0 || !app.chat.generating }
                onMain { app.chat.stop() }
                waitFor("stop", 60_000) { !app.chat.generating }

                // take back and resend
                var text: String? = null
                onMain { text = app.chat.takeBackLast() }
                assertTrue(text != null)
                turn(text!!)
            }
        }
    }

    @Test
    fun markdownRenders() {
        val samples = listOf(
            "# Title\n\nSome **bold**, *italic*, `code` and a [link](https://example.com).\n\n- one\n- two\n  - nested\n1. first\n2. second\n\n> quoted",
            "Here:\n```kotlin\nfun main() {\n    println(\"hi\")\n}\n```\nand after.",
            "| a | b |\n|---|---|\n| 1 | 22 |\n| 333 | 4 |",
            "```python\nprint('still being written'",  // a fence that is not closed yet
            "2 * 3 * 4 = 24, snake_case_name, ***, ~~gone~~, `unclosed",
            "",
        )
        onMain {
            val box = LinearLayout(inst.targetContext).apply { orientation = LinearLayout.VERTICAL }
            for (s in samples) {
                Markdown.render(box, s)
                // growing text, the way a reply streams in
                for (n in 0..s.length step 3) Markdown.render(box, s.substring(0, n))
            }
        }
    }

    @Test
    fun screensOpen() {
        ActivityScenario.launch(ModelsActivity::class.java).use { Thread.sleep(1500) }
        ActivityScenario.launch(SettingsActivity::class.java).use { Thread.sleep(1500) }
        ActivityScenario.launch(ChatsActivity::class.java).use { Thread.sleep(1000) }
    }

    companion object {
        const val TAG = "OfflineAI-Test"
    }
}
