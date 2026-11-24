package app.offlineai.chat

import android.os.SystemClock
import android.util.Log
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import app.offlineai.chat.data.PoolMode
import app.offlineai.chat.pool.LendService
import app.offlineai.chat.pool.LendStatus
import app.offlineai.chat.ui.MainActivity
import androidx.test.core.app.ActivityScenario
import app.offlineai.chat.pool.PoolWire
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.rules.Timeout
import org.junit.runner.RunWith
import java.io.File
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/**
 * Phones working together, on one emulator: the app lends itself (its lending process, its gate
 * and code check, the RPC server) to itself over the loopback, and a model is split between the
 * two. Then lending stops, as if the other phone left: the app notices and loads the model again
 * on its own.
 */
@RunWith(AndroidJUnit4::class)
class PhonesTest {
    @get:Rule
    val timeout: Timeout = Timeout.seconds(600)

    private val inst = InstrumentationRegistry.getInstrumentation()
    private val app = inst.targetContext.applicationContext as App

    private fun onMain(block: () -> Unit) = inst.runOnMainSync { block() }

    private fun waitFor(what: String, timeoutMs: Long, cond: () -> Boolean) {
        val end = SystemClock.uptimeMillis() + timeoutMs
        while (SystemClock.uptimeMillis() < end) {
            var ok = false
            onMain { ok = cond() }
            if (ok) return
            Thread.sleep(200)
        }
        throw AssertionError("timed out waiting for $what")
    }

    private fun installed(asset: String): File {
        val have = File(app.models.dir, asset)
        if (have.isFile && have.length() > 0) return have
        inst.context.assets.open(asset).use { i -> have.outputStream().use { o -> i.copyTo(o) } }
        return have
    }

    private fun load(file: File): String? {
        val latch = CountDownLatch(1)
        var error: String? = "not called"
        onMain {
            app.loadModel(app.models.find(file.name)!!) { e ->
                error = e
                latch.countDown()
            }
        }
        assertTrue("model load did not finish", latch.await(240, TimeUnit.SECONDS))
        return error
    }

    private fun pair(port: Int, code: String): String? {
        val latch = CountDownLatch(1)
        var error: String? = "not called"
        onMain {
            app.phones.pair("127.0.0.1", port, code) { e ->
                error = e
                latch.countDown()
            }
        }
        assertTrue("pairing did not finish", latch.await(30, TimeUnit.SECONDS))
        return error
    }

    @Test
    fun aModelSplitWithAnotherPhone() {
        val s = app.settings
        s.freeWhileAway = false
        s.contextSize = 2048
        s.maxTokens = 24
        s.threads = 2
        app.phones.allowSelf = true
        // a screen in front: a foreground service (the lending) may only start from the app in front
        val screen = ActivityScenario.launch(MainActivity::class.java)
        try {
            // lend this phone
            s.lendCode = "246810"
            s.lending = true
            onMain { LendService.start(app, "246810", "Lender") }
            var port = 0
            waitFor("the lending gate", 30_000) {
                port = LendService.localPort(app)
                port > 0
            }
            var st: LendStatus? = null
            val end = SystemClock.uptimeMillis() + 20_000
            while (SystemClock.uptimeMillis() < end) {
                st = PoolWire.status("127.0.0.1", port)
                if (st != null) break
                Thread.sleep(300)
            }
            Log.i(TAG, "lending status: $st")
            assertTrue("the lending phone answers", st != null)
            assertEquals("", st!!.error)

            // a wrong code is refused, the right one pairs
            val wrong = pair(port, "135790")
            assertTrue("a wrong code is refused: $wrong", wrong != null && wrong.contains("Wrong code"))
            assertNull("pairing", pair(port, "246810"))
            assertEquals(1, app.phones.saved().size)

            // the model is split with it
            s.poolMode = PoolMode.ALWAYS
            val loadErr = load(installed("test-llama.gguf"))
            if (loadErr != null) {
                Log.i(TAG, "split load failed: $loadErr · gate: ${app.phones.lastError} · lending: ${PoolWire.status("127.0.0.1", port)}")
            }
            assertNull("split load", loadErr)
            val info = app.engine.loaded!!.info
            Log.i(TAG, "split: ${info.nRemoteLayers} of ${info.nLayer} layers on the other phone")
            assertTrue("part of the model is on the other phone", info.nRemoteLayers > 0)

            var sent = false
            onMain {
                app.chat.newChat()
                sent = app.chat.send("Hello across two phones")
            }
            assertTrue(sent)
            waitFor("a reply", 180_000) { !app.chat.generating }
            val reply = app.chat.conversation.messages.last()
            Log.i(TAG, "split reply: error=${reply.error} ${reply.stats}")
            assertFalse("split reply failed: ${reply.content}", reply.error)

            // the other phone goes away: the app notices and loads the model on its own
            s.lending = false
            onMain { LendService.stop(app) }
            waitFor("the model loaded again on this phone alone", 120_000) {
                val l = app.engine.loaded
                l != null && !app.engine.isBusy && l.info.nRemoteLayers == 0
            }
            onMain { sent = app.chat.send("And now alone") }
            assertTrue(sent)
            waitFor("a reply alone", 180_000) { !app.chat.generating }
            assertFalse("reply alone failed", app.chat.conversation.messages.last().error)
        } finally {
            s.poolMode = PoolMode.AUTO
            s.lending = false
            onMain { LendService.stop(app) }
            app.phones.saved().forEach { app.phones.remove(it.id) }
            app.phones.allowSelf = false
            onMain { app.chat.newChat() }
            screen.close()
        }
    }

    companion object {
        const val TAG = "OfflineAI-Test"
    }
}
