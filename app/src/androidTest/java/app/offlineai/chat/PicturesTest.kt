package app.offlineai.chat

import android.content.ComponentName
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.os.SystemClock
import android.util.Log
import android.view.View
import android.view.ViewGroup
import android.widget.EditText
import android.widget.TextView
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import app.offlineai.chat.data.Disguise
import app.offlineai.chat.data.PictureCatalog
import app.offlineai.chat.engine.PictureEngine
import app.offlineai.chat.ui.MainActivity
import app.offlineai.chat.ui.PicturesActivity
import app.offlineai.chat.ui.PongActivity
import app.offlineai.chat.ui.PongView
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
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
import kotlin.math.sqrt

/**
 * What came with Nyx: making pictures through the app's own native bridge (with the real SDXS
 * model when CI has put it on the emulator), the Pictures screen, the ping pong game, hiding as
 * a game, and the message box floating at the bottom of the chat.
 */
@RunWith(AndroidJUnit4::class)
class PicturesTest {
    @get:Rule
    val timeout: Timeout = Timeout.seconds(600)

    private val inst = InstrumentationRegistry.getInstrumentation()
    private val app = inst.targetContext.applicationContext as App

    @Before
    fun setUp() = TestDevice.wake()

    private fun find(root: View, match: (View) -> Boolean): View? {
        if (match(root)) return root
        if (root is ViewGroup) for (i in 0 until root.childCount) find(root.getChildAt(i), match)?.let { return it }
        return null
    }

    private class Result {
        var picture: Bitmap? = null
        var error: String? = null
        var previews = 0
        val stages = mutableListOf<String>()
    }

    private fun make(model: File, steps: Int, seconds: Long): Result {
        val r = Result()
        val done = CountDownLatch(1)
        inst.runOnMainSync {
            PictureEngine.make(
                model.path, null, 3,
                PictureEngine.Request("a red apple on a wooden table", "", 512, 512, steps, 1f, 7, "euler_a"),
                object : PictureEngine.Events {
                    override fun onProgress(stage: String, done: Long, total: Long) {
                        if (r.stages.lastOrNull() != stage) r.stages.add(stage)
                    }

                    override fun onPreview(preview: Bitmap) {
                        r.previews++
                    }

                    override fun onDone(picture: Bitmap?, error: String?, millis: Long) {
                        r.picture = picture
                        r.error = error
                        Log.i("OfflineAI-Test", "picture in $millis ms, stages ${r.stages}, previews ${r.previews}, error $error")
                        done.countDown()
                    }
                },
            )
        }
        assertTrue("the picture did not finish", done.await(seconds, TimeUnit.SECONDS))
        return r
    }

    @Test
    fun missingModelIsAnErrorNotACrash() {
        val r = make(File(app.filesDir, "no-such-model.gguf"), 1, 60)
        assertNull(r.picture)
        assertNotNull("a missing model should say why", r.error)
    }

    /** The real thing: SDXS through pictures.cpp, when CI has pushed it (/sdcard/Download/oa-sdxs.gguf). */
    @Test
    fun sdxsMakesAPicture() {
        val m = PictureCatalog.models.first { it.id == "sdxs" }
        val dst = File(app.models.dir, m.key)
        dst.parentFile?.mkdirs()
        if (!dst.isFile) TestDevice.shell("mv /sdcard/Download/oa-sdxs.gguf ${dst.path}")
        if (!dst.isFile || dst.length() < m.sizeBytes) {
            Log.w("OfflineAI-Test", "SDXS is not on this device; picture making itself not tested here")
            return
        }
        val r = make(dst, 1, 400)
        assertNull("error: ${r.error}", r.error)
        val p = r.picture!!
        assertEquals(512, p.width)
        assertEquals(512, p.height)
        // a real picture, not a flat or broken one
        val px = IntArray(512 * 512)
        p.getPixels(px, 0, 512, 0, 0, 512, 512)
        val g = px.map { ((it shr 16 and 255) + (it shr 8 and 255) + (it and 255)) / 3.0 }
        val mean = g.average()
        val sd = sqrt(g.sumOf { (it - mean) * (it - mean) } / g.size)
        assertTrue("picture looks flat (sd $sd)", sd > 20)
        assertTrue("the steps were not reported: ${r.stages}", r.stages.any { it.contains("sampl") })
        assertTrue("no step preview came", r.previews >= 1)
        // and the screen shows it in the grid once saved
        inst.runOnMainSync { app.pictures.save(p, "test apple", "None", m.name, 7, 1000) }
        assertTrue(app.pictures.all().any { it.prompt == "test apple" })
        app.pictures.all().filter { it.prompt == "test apple" }.forEach { app.pictures.delete(it) }
        PictureEngine.unload()
    }

    @Test
    fun picturesScreenOpens() {
        ActivityScenario.launch(PicturesActivity::class.java).use { sc ->
            Thread.sleep(1500)
            var title = false
            sc.onActivity { a -> title = find(a.window.decorView) { it is TextView && it.text?.toString() == "Pictures" } != null }
            assertTrue(title)
        }
    }

    @Test
    fun gameRunsAndServes() {
        ActivityScenario.launch(PongActivity::class.java).use { sc ->
            Thread.sleep(800)
            TestDevice.shell("input tap 540 1200")
            Thread.sleep(1500)
            var found = false
            sc.onActivity { a -> found = find(a.window.decorView) { it is PongView } != null }
            assertTrue(found)
        }
    }

    @Test
    fun hidingAsAGameSwitchesTheLauncher() {
        val pm = app.packageManager
        val game = ComponentName(app.packageName, "app.offlineai.chat.GameLauncher")
        val nyx = ComponentName(app.packageName, "app.offlineai.chat.Launcher")
        try {
            Disguise.enable(app, app.settings, "tiger42")
            assertEquals(PackageManager.COMPONENT_ENABLED_STATE_ENABLED, pm.getComponentEnabledSetting(game))
            assertEquals(PackageManager.COMPONENT_ENABLED_STATE_DISABLED, pm.getComponentEnabledSetting(nyx))
            assertTrue(Disguise.matches(app.settings, "tiger42"))
            assertTrue("case and spaces do not matter", Disguise.matches(app.settings, " TIGER42 "))
            assertFalse(Disguise.matches(app.settings, "tiger43"))
            assertFalse(Disguise.matches(app.settings, ""))
            assertFalse("only a hash is kept", app.settings.disguiseCode.contains("tiger"))
        } finally {
            Disguise.disable(app, app.settings)
        }
        assertEquals(PackageManager.COMPONENT_ENABLED_STATE_ENABLED, pm.getComponentEnabledSetting(nyx))
        assertEquals(PackageManager.COMPONENT_ENABLED_STATE_DISABLED, pm.getComponentEnabledSetting(game))
        assertFalse(Disguise.matches(app.settings, "tiger42"))
    }

    /** The message box floats at the bottom, as a capsule: never stretched over the chat. */
    @Test
    fun messageBoxStaysAtTheBottom() {
        ActivityScenario.launch(MainActivity::class.java).use { sc ->
            val end = SystemClock.uptimeMillis() + 5000
            var ok = false
            var why = ""
            while (!ok && SystemClock.uptimeMillis() < end) {
                Thread.sleep(300)
                sc.onActivity { a ->
                    val input = find(a.window.decorView) { it is EditText } ?: return@onActivity
                    // the capsule is the input's row's parent
                    val capsule = (input.parent as View).parent as View
                    val at = IntArray(2)
                    capsule.getLocationOnScreen(at)
                    val screen = a.window.decorView.height
                    why = "capsule at ${at[1]}, height ${capsule.height}, screen $screen"
                    ok = capsule.height in 1 until screen / 4 && at[1] > screen / 2
                }
            }
            assertTrue(why, ok)
        }
    }
}
