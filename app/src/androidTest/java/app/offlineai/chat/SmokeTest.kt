package app.offlineai.chat

import android.os.SystemClock
import android.util.Log
import android.widget.LinearLayout
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import app.offlineai.chat.data.ChatMessage
import app.offlineai.chat.data.MediaImport
import app.offlineai.chat.data.MemoryMode
import app.offlineai.chat.data.Catalog
import app.offlineai.chat.ui.AboutActivity
import app.offlineai.chat.ui.ChatsActivity
import app.offlineai.chat.ui.Dictation
import app.offlineai.chat.ui.MathText
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
import org.junit.Rule
import org.junit.Test
import org.junit.rules.Timeout
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
    /** One test that hangs fails on its own instead of using up the whole run. */
    @get:Rule
    val timeout: Timeout = Timeout.seconds(600)

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
                val file = installed(asset)
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
        val file = installed("test-qwen35.gguf")
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
            val file = installed("test-llama.gguf")
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
        val file = installed("test-llama.gguf")
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

    /** With the box empty the send button offers speaking instead, on phones that turn speech into text offline. */
    @Test
    fun emptyBoxOffersSpeakingWhereItCan() {
        load(installed("test-llama.gguf"))
        onMain { app.chat.newChat() }
        ActivityScenario.launch(MainActivity::class.java).use { sc ->
            Thread.sleep(500)
            var canSpeak = false
            var button: String? = null
            sc.onActivity { a ->
                canSpeak = Dictation.available(a)
                button = findDescribed(a.window.decorView, setOf("Send", "Speak a message"))?.contentDescription?.toString()
            }
            Log.i(TAG, "offline speech recognition: $canSpeak, button: $button")
            assertEquals(if (canSpeak) "Speak a message" else "Send", button)
        }
    }

    private fun findDescribed(v: android.view.View, descriptions: Set<String>): android.view.View? {
        if (v.contentDescription?.toString() in descriptions) return v
        if (v is android.view.ViewGroup) {
            for (i in 0 until v.childCount) findDescribed(v.getChildAt(i), descriptions)?.let { return it }
        }
        return null
    }

    /**
     * A model file from the test assets, copied in only if it is not there yet: writing over a
     * file the engine has mapped can stall or crash it, and the content is the same anyway.
     */
    private fun installed(asset: String): File {
        val have = File(app.models.dir, asset)
        return if (have.isFile && have.length() > 0) have else installModel(asset)
    }

    /** Working together: two answers then a review, by the model alone and with a partner model next to it. */
    @Test
    fun teamReplies() {
        app.settings.contextSize = 2048
        app.settings.maxTokens = 48
        app.settings.threads = 2
        val main = installed("test-qwen35.gguf")
        val other = installed("test-llama.gguf")
        load(main)
        try {
            app.settings.teamSize = 2
            app.settings.teamPartner = null
            onMain { app.chat.newChat() }
            turn("What is two plus two?")
            var team = 0
            var fold = ""
            var model = ""
            onMain {
                val m = app.chat.conversation.messages.last()
                team = m.team
                fold = m.reasoning
                model = m.model
            }
            assertEquals("a team reply", 2, team)
            assertTrue("both answers in the fold: $fold", fold.contains("Answer 1") && fold.contains("Answer 2"))

            val latch = CountDownLatch(1)
            var error: String? = "not called"
            onMain {
                app.settings.teamPartner = other.name
                app.applyTeamPartner { e ->
                    error = e
                    latch.countDown()
                }
            }
            assertTrue("the partner loads", latch.await(120, TimeUnit.SECONDS))
            assertNull("the partner loads: $error", error)
            turn("And three plus three?")
            onMain {
                val m = app.chat.conversation.messages.last()
                team = m.team
                fold = m.reasoning
                model = m.model
            }
            assertEquals("a team reply with a partner", 2, team)
            assertTrue("the partner's answer is named: $fold", fold.contains("Answer 2 ("))
            assertTrue("the reply names both models: $model", model.contains(" + "))
        } finally {
            app.settings.teamSize = 0
            app.settings.teamPartner = null
            onMain {
                app.applyTeamPartner()
                app.chat.newChat()
            }
        }
    }

    /**
     * A chat shorter than the screen is still once shown: the list used to try to line its last
     * message up with a bottom it could not reach, and redrew itself frame after frame (the main
     * thread never idle; on a phone, a busy CPU for as long as the chat was open).
     */
    @Test(timeout = 90_000)
    fun shortChatSettles() {
        onMain {
            app.chat.newChat()
            app.chat.conversation.messages.add(ChatMessage(role = "user", content = "Hi"))
            app.chat.conversation.messages.add(ChatMessage(role = "assistant", content = "Hello! How can I help?"))
        }
        try {
            // launching waits for the main thread to go idle, which it never did
            ActivityScenario.launch(MainActivity::class.java).use {
                Thread.sleep(1000)
                inst.waitForIdleSync()
            }
        } finally {
            onMain { app.chat.newChat() }
        }
    }

    /** The app's shortcuts (long-press its icon) are published, and New chat opens an empty chat. */
    @Test
    fun shortcuts() {
        val sm = app.getSystemService(android.content.pm.ShortcutManager::class.java)
        var ids = emptySet<String>()
        val end = SystemClock.uptimeMillis() + 10_000  // read from the manifest after install, not at once
        while (SystemClock.uptimeMillis() < end) {
            ids = sm.manifestShortcuts.map { it.id }.toSet()
            if (ids.containsAll(setOf("talk", "new_chat"))) break
            Thread.sleep(250)
        }
        assertTrue("shortcuts: $ids", ids.containsAll(setOf("talk", "new_chat")))

        var before = ""
        onMain {
            app.chat.conversation.messages.add(ChatMessage(role = "user", content = "an old message"))
            before = app.chat.conversation.id
        }
        val intent = android.content.Intent(app, MainActivity::class.java).setAction(MainActivity.ACTION_NEW_CHAT)
        ActivityScenario.launch<MainActivity>(intent).use { Thread.sleep(500) }
        var after = ""
        var empty = false
        onMain {
            after = app.chat.conversation.id
            empty = app.chat.conversation.messages.isEmpty()
        }
        assertTrue("a new chat", after != before && empty)
    }

    @Test
    fun screensOpen() {
        ActivityScenario.launch(ModelsActivity::class.java).use { Thread.sleep(1500) }
        ActivityScenario.launch(SettingsActivity::class.java).use { Thread.sleep(1500) }
        ActivityScenario.launch(ChatsActivity::class.java).use { Thread.sleep(1000) }
        ActivityScenario.launch(AboutActivity::class.java).use { Thread.sleep(1000) }
    }

    /** Every license the About screen lists is in the APK, and is the license it says it is. */
    @Test
    fun licensesShipWithTheApp() {
        val expect = mapOf(
            "llama.cpp.txt" to "MIT License", "nlohmann-json.txt" to "MIT License", "stb_image.txt" to "MIT License",
            "miniaudio.txt" to "MIT No Attribution", "xxhash.txt" to "BSD 2-Clause", "rotate-bits.txt" to "MIT License",
            "cpp-httplib.txt" to "MIT License", "public-domain.txt" to "public domain", "apache-2.0.txt" to "Apache License",
        )
        for ((file, mark) in expect) {
            val text = app.assets.open("licenses/$file").use { it.readBytes().toString(Charsets.UTF_8) }
            assertTrue("$file should say $mark", text.contains(mark))
        }
    }

    /** Maths that models write as LaTeX reads as text; money stays money. */
    @Test
    fun mathIsReadable() {
        assertEquals("The answer is 51.", MathText.pretty("The answer is \\boxed{51}."))
        assertEquals("So 3/4 of it", MathText.pretty("So \$\\frac{3}{4}\$ of it"))
        assertEquals("It costs \$5 and \$10", MathText.pretty("It costs \$5 and \$10"))
    }

    /** No two catalog entries share an id or a file name, and every size is filled in. */
    @Test
    fun catalogIsConsistent() {
        val ids = Catalog.models.map { it.id }
        val files = Catalog.models.map { it.file }
        assertEquals("duplicate ids: $ids", ids.size, ids.toSet().size)
        assertEquals("duplicate files: $files", files.size, files.toSet().size)
        for (m in Catalog.models) {
            assertTrue("${m.id} size", m.sizeBytes > 0)
            m.pictures?.let { assertTrue("${m.id} picture file size", it.sizeBytes > 0) }
            m.drafter?.let { assertTrue("${m.id} drafter size", it.sizeBytes > 0) }
            assertTrue("${m.id} file name", m.file.endsWith(".gguf"))
        }
    }

    companion object {
        const val TAG = "OfflineAI-Test"
    }
}
