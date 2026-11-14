package app.offlineai.chat

import android.app.Activity
import android.os.SystemClock
import android.view.View
import android.view.ViewGroup
import android.widget.EditText
import android.widget.TextView
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import app.offlineai.chat.data.ChatMessage
import app.offlineai.chat.data.Conversation
import app.offlineai.chat.data.ThemeMode
import app.offlineai.chat.ui.AboutActivity
import app.offlineai.chat.ui.ChatsActivity
import app.offlineai.chat.ui.MainActivity
import app.offlineai.chat.ui.ModelsActivity
import app.offlineai.chat.ui.PicturesActivity
import app.offlineai.chat.ui.PongActivity
import app.offlineai.chat.ui.SettingsActivity
import app.offlineai.chat.ui.TeamDialog
import app.offlineai.chat.ui.WhatsNew
import org.json.JSONArray
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
 * Pictures of every screen, dark and light, for looking at the interface (the Screens workflow
 * collects them). Runs only when asked for with the instrumentation argument `shots=1`; the tiny
 * test model stands in under a catalog model's file name, so the screens show a real name.
 */
@RunWith(AndroidJUnit4::class)
class ScreenshotTest {
    @get:Rule
    val timeout: Timeout = Timeout.seconds(900)

    private val inst = InstrumentationRegistry.getInstrumentation()
    private val app = inst.targetContext.applicationContext as App
    private val out = "/sdcard/Download/oa-shots"
    private var prefix = ""

    /** Asked for with the instrumentation argument shots=1; an ordinary run passes without doing anything. */
    private val wanted = InstrumentationRegistry.getArguments().getString("shots") == "1"

    @Before
    fun wake() {
        if (wanted) TestDevice.wake()
    }

    private fun onMain(block: () -> Unit) = inst.runOnMainSync { block() }

    private fun settle(ms: Long = 450) {
        inst.waitForIdleSync()
        Thread.sleep(ms)
    }

    private fun shot(name: String) {
        settle()
        TestDevice.shell("screencap -p $out/$prefix-$name.png")
    }

    private fun swipeUp() {
        TestDevice.shell("input swipe 540 1750 540 650 350")
        settle(700)
    }

    private fun back() {
        TestDevice.shell("input keyevent KEYCODE_BACK")
        settle(500)
    }

    private fun tap(v: View) {
        val at = IntArray(2)
        v.getLocationOnScreen(at)
        TestDevice.shell("input tap ${at[0] + v.width / 2} ${at[1] + v.height / 2}")
        settle(700)
    }

    private fun find(root: View, match: (View) -> Boolean): View? {
        if (match(root)) return root
        if (root is ViewGroup) {
            for (i in 0 until root.childCount) find(root.getChildAt(i), match)?.let { return it }
        }
        return null
    }

    private fun <A : Activity> ActivityScenario<A>.view(match: (View) -> Boolean): View? {
        var found: View? = null
        onActivity { a -> found = find(a.window.decorView, match) }
        return found
    }

    private fun install(asset: String, asFile: String): File {
        val dst = File(app.models.dir, asFile)
        if (!dst.isFile || dst.length() == 0L) {
            inst.context.assets.open(asset).use { i -> dst.outputStream().use { o -> i.copyTo(o) } }
        }
        return dst
    }

    private fun load(file: File) {
        val latch = CountDownLatch(1)
        var error: String? = "not called"
        onMain {
            app.loadModel(app.models.find(file.name)!!) { e ->
                error = e
                latch.countDown()
            }
        }
        assertTrue("model load did not finish", latch.await(180, TimeUnit.SECONDS))
        assertNull("model load failed", error)
    }

    private fun sampleChat(): List<ChatMessage> = listOf(
        ChatMessage(role = "user", content = "Explain how a hash map works, with a tiny Python example."),
        ChatMessage(
            role = "assistant", model = "Qwen3.5 0.8B",
            reasoning = "The user wants a short explanation and a small example. Keep it concrete: buckets, the hash " +
                "function, collisions, then a few lines of Python.",
            content = "## Hash maps in short\n\nA hash map stores **key → value** pairs so that looking a key up takes " +
                "about the same time however many pairs there are.\n\n" +
                "1. A *hash function* turns the key into a number.\n" +
                "2. That number picks a **bucket** in an array.\n" +
                "3. If two keys land in the same bucket (a collision), the bucket keeps both.\n\n" +
                "```python\nages = {\"Ada\": 36, \"Linus\": 54}\nages[\"Grace\"] = 85\nprint(ages[\"Ada\"])  # 36\n```\n\n" +
                "| Operation | Average | Worst |\n|---|---|---|\n| Look up | O(1) | O(n) |\n| Insert | O(1) | O(n) |\n\n" +
                "Use `dict.get(key)` when the key may be missing.",
            stats = "41.2 tok/s · 212 tokens · first word 0.4s",
        ),
        ChatMessage(role = "user", content = "Nice. What is three quarters of 24?"),
        ChatMessage(
            role = "assistant", model = "Qwen3.5 0.8B", team = 2,
            reasoning = "Answer 1:\n24 × 3/4 = 18\n\nAnswer 2:\n24 ÷ 4 = 6, and 6 × 3 = 18",
            content = "Three quarters of 24 is **18**: $\\frac{3}{4} \\times 24 = 18$.",
            stats = "2 answers, then a review · 38.0 tok/s · 96 tokens · first word 0.3s",
        ),
    )

    /** Chats from today back to last year, so the list shows its headings. */
    private fun seedChats() {
        val day = 24L * 3600 * 1000
        val now = System.currentTimeMillis()
        val items = listOf(
            "Hash maps explained" to 0L, "Trip to Lisbon on a budget" to 0L, "Poem about city lights" to 1L,
            "Fix the build script" to 3L, "Birthday dinner ideas" to 5L, "Notes on the French Revolution" to 20L,
            "Python: remove duplicates" to 70L, "Old recipes from grandma" to 400L,
        )
        val arr = JSONArray()
        for ((k, item) in items.withIndex()) {
            val t = now - item.second * day - k * 60_000L
            val c = Conversation(id = "shots-$k", title = item.first, createdAt = t, updatedAt = t, messages = sampleChat().toMutableList())
            arr.put(c.toJson())
        }
        app.chats.importJson(arr.toString())
    }

    @Test
    fun everyScreen() {
        if (!wanted) return
        TestDevice.shell("mkdir -p $out")
        TestDevice.shell("settings put secure show_ime_with_hard_keyboard 1")
        app.settings.whatsNewSeen = WhatsNew.VERSION
        app.settings.askedNotifications = true
        var seeded = false
        for (theme in listOf(ThemeMode.DARK, ThemeMode.LIGHT)) {
            prefix = theme.name.lowercase()
            onMain {
                app.settings.theme = theme
                app.chat.newChat()
            }

            if (app.models.local().isEmpty()) {
                // the very first start: nothing downloaded yet
                ActivityScenario.launch(MainActivity::class.java).use { shot("01-first-start") }
            }
            val model = install("test-llama.gguf", "Qwen3.5-0.8B-Q4_K_M.gguf")
            install("test-qwen35.gguf", "LFM2.5-1.2B-Instruct-Q4_K_M.gguf")
            if (app.engine.loaded == null) load(model)
            if (!seeded) {
                seedChats()
                seeded = true
            }

            ActivityScenario.launch(MainActivity::class.java).use { sc ->
                shot("02-new-chat")
                sc.view { it is TextView && it !is EditText && it.text?.toString() == "Qwen3.5 0.8B" }?.let {
                    tap(it)
                    shot("03-model-menu")
                    back()
                }
                sc.view { it.contentDescription?.toString()?.startsWith("Attach") == true }?.let {
                    tap(it)
                    shot("04-attach-menu")
                    back()
                }
                sc.onActivity { a -> TeamDialog.show(a, app) {} }
                shot("05-work-together")
                back()
                sc.onActivity { a -> WhatsNew.show(a) }
                shot("06-whats-new")
                back()
            }

            onMain {
                app.chat.newChat()
                app.chat.conversation.title = "Hash maps explained"
                app.chat.conversation.messages.addAll(sampleChat())
            }
            ActivityScenario.launch(MainActivity::class.java).use { sc ->
                shot("07-chat-end")
                TestDevice.shell("input swipe 540 700 540 1900 300")
                settle(800)
                shot("08-chat-scrolled")
                TestDevice.shell("input swipe 540 700 540 1900 300")
                settle(800)
                shot("09-chat-top")
                sc.view { it is EditText }?.let {
                    tap(it)
                    val end = SystemClock.uptimeMillis() + 4000
                    while (SystemClock.uptimeMillis() < end && !TestDevice.windows().contains("mInputShown=true")) Thread.sleep(200)
                    settle(900)
                    TestDevice.shell("input text Hello")
                    shot("10-chat-keyboard")
                    back()
                }
            }
            onMain { app.chat.newChat() }

            ActivityScenario.launch(ModelsActivity::class.java).use {
                shot("11-models")
                swipeUp()
                shot("12-models-2")
                swipeUp()
                shot("13-models-3")
            }
            ActivityScenario.launch(SettingsActivity::class.java).use {
                shot("14-settings")
                swipeUp()
                shot("15-settings-2")
                swipeUp()
                shot("16-settings-3")
                swipeUp()
                shot("17-settings-4")
            }
            ActivityScenario.launch(ChatsActivity::class.java).use { shot("18-chats") }
            ActivityScenario.launch(AboutActivity::class.java).use {
                shot("19-about")
                swipeUp()
                shot("20-about-2")
            }
            ActivityScenario.launch(PicturesActivity::class.java).use { shot("21-pictures") }
            ActivityScenario.launch(PongActivity::class.java).use {
                shot("22-game")
                TestDevice.shell("input tap 540 1200")
                settle(900)
                shot("23-game-playing")
            }
        }
        onMain { app.settings.theme = ThemeMode.DARK }

        // Big text, as many phones are set up: the screens must still line up
        prefix = "big"
        TestDevice.shell("settings put system font_scale 1.3")
        settle(1500)
        try {
            onMain { app.chat.newChat() }
            ActivityScenario.launch(MainActivity::class.java).use { shot("02-new-chat") }
            onMain {
                app.chat.newChat()
                app.chat.conversation.messages.addAll(sampleChat())
            }
            ActivityScenario.launch(MainActivity::class.java).use { sc ->
                shot("07-chat-end")
                sc.view { it is EditText }?.let {
                    tap(it)
                    settle(900)
                    TestDevice.shell("input text Hello")
                    shot("10-chat-keyboard")
                    back()
                }
            }
            onMain { app.chat.newChat() }
            ActivityScenario.launch(PicturesActivity::class.java).use { shot("21-pictures") }
            ActivityScenario.launch(SettingsActivity::class.java).use { shot("14-settings") }
        } finally {
            TestDevice.shell("settings put system font_scale 1.0")
        }
    }
}
