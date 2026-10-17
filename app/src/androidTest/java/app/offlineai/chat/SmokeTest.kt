package app.offlineai.chat

import android.os.SystemClock
import android.util.Log
import android.widget.LinearLayout
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import app.offlineai.chat.data.MediaImport
import app.offlineai.chat.data.MemoryMode
import app.offlineai.chat.ui.ChatsActivity
import app.offlineai.chat.ui.MainActivity
import app.offlineai.chat.ui.Markdown
import app.offlineai.chat.ui.RenderOptions
import app.offlineai.chat.ui.ModelsActivity
import app.offlineai.chat.ui.SettingsActivity
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
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

    /** No reply left over from an earlier test (it would make the app refuse to send). */
    @Before
    fun setUp() {
        TestDevice.wake()
        onMain { app.chat.stop() }
        val end = SystemClock.uptimeMillis() + 60_000
        while (SystemClock.uptimeMillis() < end && app.chat.generating && app.engine.isBusy) Thread.sleep(100)
        onMain { app.chat.testFinish() }
    }

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
            val model = app.models.find(file.name)!!
            app.loadModel(model) { e ->
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
    fun speedTestAndLiveThreads() {
        app.settings.contextSize = 2048
        val file = installModel("test-qwen35.gguf")
        load(file)
        val latch = CountDownLatch(1)
        var rows = 0
        var err: String? = null
        onMain {
            app.engine.bench(intArrayOf(1, 2), 32, 8, onRow = { rows++ }) { r, e ->
                err = e
                rows = r.size
                latch.countDown()
            }
        }
        assertTrue("speed test did not finish", latch.await(120, TimeUnit.SECONDS))
        assertEquals("speed test rows (error: $err)", 2, rows)
        // and chatting still works afterwards, with the thread count changed mid-way
        onMain { app.chat.newChat() }
        app.engine.setThreads(1)
        turn("Hello after the speed test")
    }

    @Test
    fun lowMemoryAndCompactCacheLoad() {
        app.settings.contextSize = 2048
        app.settings.memoryMode = MemoryMode.LOW
        app.settings.kvQ8 = true
        try {
            val file = installModel("test-llama.gguf")
            load(file)
            assertTrue(app.engine.loaded!!.config.lowMemory)
            onMain { app.chat.newChat() }
            turn("Hello in low-memory mode")
        } finally {
            app.settings.memoryMode = MemoryMode.AUTO
            app.settings.kvQ8 = false
        }
    }

    @Test
    fun markdownRenders() {
        val host = object : Markdown.Host {
            override fun isCollapsed(blockIndex: Int) = false
            override fun toggleCollapsed(blockIndex: Int, anchor: android.view.View) {}
            override fun copy(label: String, text: String) {}
        }
        val opts = RenderOptions(true, false, true, 1f)
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
                Markdown.render(box, s, opts, host)
                // growing text, the way a reply streams in
                for (n in 0..s.length step 3) Markdown.render(box, s.substring(0, n), opts, host)
            }
        }
        // a long code block is shown in pieces; streamed in, the pieces add up to exactly the code
        for (wrap in listOf(false, true)) {
            val code = (1..300).joinToString("\n") { "line $it of the program, with some words" }
            val src = "Before.\n```text\n$code\n```\nAfter."
            var shown = listOf<String>()
            onMain {
                val box = LinearLayout(inst.targetContext).apply { orientation = LinearLayout.VERTICAL }
                val o = RenderOptions(true, wrap, true, 1f)
                var k = 0
                while (k < src.length) {
                    k = minOf(src.length, k + 41)
                    Markdown.render(box, src.substring(0, k), o, host)
                }
                shown = (0 until box.childCount).map { box.getChildAt(it) }
                    .filterIsInstance<Markdown.CodeBlockView>().map { it.shownCode() }
            }
            // checked here, not on the main thread, where a failed check would take the app down
            assertEquals("code blocks", 1, shown.size)
            assertEquals("code shown (wrap=$wrap)", code, shown[0])
        }
    }

    /** A picture sent to a model that cannot see: the app sends it, the engine says so to the model, the reply works. */
    @Test
    fun attachmentGoesWithTheMessage() {
        app.settings.contextSize = 2048
        app.settings.maxTokens = 32
        val file = installModel("test-llama.gguf")
        load(file)
        onMain { app.chat.newChat() }
        val dir = app.chats.mediaDir(app.chat.conversation.id)
        val png = File(dir, "test.png")
        val bmp = android.graphics.Bitmap.createBitmap(64, 48, android.graphics.Bitmap.Config.ARGB_8888)
        bmp.eraseColor(android.graphics.Color.RED)
        png.outputStream().use { bmp.compress(android.graphics.Bitmap.CompressFormat.PNG, 100, it) }
        // the import path the picker uses: shrink and copy as JPEG
        val att = MediaImport.image(inst.targetContext, android.net.Uri.fromFile(png), dir, 32)
        assertEquals("image", att.kind)
        val jpg = android.graphics.BitmapFactory.decodeFile(att.files[0])
        assertTrue("the picture should be shrunk to 32 px", maxOf(jpg.width, jpg.height) <= 32)
        onMain { app.chat.draftAttachments.add(att) }
        turn("What is in this picture?")
        val sent = app.chat.conversation.messages.first { it.role == "user" }
        assertEquals(1, sent.attachments.size)
        // saved with the chat and read back
        val again = app.chats.load(app.chat.conversation.id)!!
        assertEquals(att.files, again.messages.first { it.role == "user" }.attachments[0].files)
    }

    /** Sound files are decoded by Android and turned into 16 kHz mono WAV, the way the engine reads them. */
    @Test
    fun soundIsDecodedToWav() {
        val dir = File(inst.targetContext.cacheDir, "sound-test").apply { mkdirs() }
        val src = File(dir, "tone.wav")
        val rate = 44_100
        val pcm = FloatArray(rate * 2) { i -> (0.3 * Math.sin(2 * Math.PI * 440 * i / rate)).toFloat() }
        MediaImport.writeWav(src, pcm, pcm.size, rate)
        val att = MediaImport.audio(inst.targetContext, android.net.Uri.fromFile(src), dir, 30)
        Log.i(TAG, "sound: ${att.durationMs} ms, ${File(att.files[0]).length()} bytes")
        assertEquals("audio", att.kind)
        assertTrue("about two seconds (${att.durationMs})", att.durationMs in 1800..2200)
        val bytes = File(att.files[0]).readBytes()
        val bb = java.nio.ByteBuffer.wrap(bytes).order(java.nio.ByteOrder.LITTLE_ENDIAN)
        assertEquals("16 kHz", 16_000, bb.getInt(24))
        assertEquals("mono", 1, bb.getShort(22).toInt())
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
