package app.offlineai.chat

import android.os.SystemClock
import android.util.Log
import android.view.Choreographer
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import app.offlineai.chat.ui.MainActivity
import app.offlineai.chat.ui.Markdown
import app.offlineai.chat.ui.RenderOptions
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import kotlin.math.abs

/**
 * The chat must never move by itself while you read. These tests stream very long replies
 * (thousands of lines of code, long Markdown) into the real chat screen, drag it with real touch
 * events part way through, and measure where the text is on screen while it keeps growing.
 */
@RunWith(AndroidJUnit4::class)
class ScrollTest {
    private val inst = InstrumentationRegistry.getInstrumentation()
    private val app = inst.targetContext.applicationContext as App

    private fun onMain(block: () -> Unit) = inst.runOnMainSync { block() }

    private fun <T> onMainGet(block: () -> T): T {
        var out: T? = null
        inst.runOnMainSync { out = block() }
        @Suppress("UNCHECKED_CAST")
        return out as T
    }

    @Before
    fun setUp() {
        app.settings.autoFollow = true
        app.settings.jumpButton = true
        app.settings.streamIntervalMs = 16
        app.settings.codeWrap = false
        app.settings.markdown = true
        app.settings.syntaxHighlight = true
        TestDevice.wake()
        onMain { app.chat.newChat() }
    }

    /** A test that failed part way must not leave a half-written reply for the next one. */
    @After
    fun tearDown() {
        onMain { app.chat.testFinish() }
    }

    private fun codeReply(lines: Int) = buildString {
        append("Here is the whole program, as asked.\n\n```kotlin\n")
        for (i in 1..lines) {
            append("    val value$i = compute($i, \"text $i\") // a long comment so the line is wider than the screen, $i\n")
        }
        append("```\n\nThat is all of it. A few notes on it follow.\n\n")
        for (i in 1..25) append("Note $i: what this part of the program does, in a sentence or two.\n\n")
    }

    private fun markdownReply(sections: Int) = buildString {
        for (i in 1..sections) {
            append("## Part $i\n\nSome **bold** words and some `inline code` in paragraph $i, long enough to wrap onto ")
            append("a second and a third line on a phone screen.\n\n- first point of part $i\n- second point\n  - nested\n\n")
            if (i % 5 == 0) append("```python\nfor x in range($i):\n    print(x)\n```\n\n")
            if (i % 7 == 0) append("| a | b |\n|---|---|\n| $i | ${i * 2} |\n\n")
        }
    }

    private fun findRecycler(v: View): RecyclerView? {
        if (v is RecyclerView) return v
        if (v is ViewGroup) for (i in 0 until v.childCount) findRecycler(v.getChildAt(i))?.let { return it }
        return null
    }

    private fun findTextWith(v: View, s: String): TextView? {
        if (v is TextView && v.text.toString() == s) return v
        if (v is ViewGroup) for (i in 0 until v.childCount) findTextWith(v.getChildAt(i), s)?.let { return it }
        return null
    }

    /** The screen position of the reply's first view (its top edge), or null if it is off screen. */
    private fun replyTop(list: RecyclerView): Int? {
        val n = list.adapter?.itemCount ?: return null
        val v = list.layoutManager?.findViewByPosition(n - 1) ?: return null
        val loc = IntArray(2)
        v.getLocationOnScreen(loc)
        return loc[1]
    }

    private fun atBottom(list: RecyclerView): Boolean {
        val n = list.adapter?.itemCount ?: return true
        val v = list.layoutManager?.findViewByPosition(n - 1) ?: return false
        return abs(v.bottom - (list.height - list.paddingBottom)) <= 3
    }

    private fun waitIdle(list: RecyclerView) {
        val end = SystemClock.uptimeMillis() + 5000
        while (SystemClock.uptimeMillis() < end) {
            inst.waitForIdleSync()
            if (onMainGet { list.scrollState } == RecyclerView.SCROLL_STATE_IDLE) return
            Thread.sleep(50)
        }
    }

    /**
     * Puts the finger down on the chat. If something that is not the app is in front there (the
     * lock screen, a system dialog on a slow emulator), says what it was, clears it, and tries
     * once more; a second miss fails the test with the window list.
     */
    private fun touchDown(e: MotionEvent) {
        try {
            inst.sendPointerSync(e)
            return
        } catch (x: IllegalArgumentException) {
            Log.i(TAG, "touch went to another window, clearing the screen: ${TestDevice.windows()}")
        }
        TestDevice.wake()
        Thread.sleep(1000)
        inst.waitForIdleSync()
        try {
            inst.sendPointerSync(e)
        } catch (x: IllegalArgumentException) {
            throw AssertionError("the touch landed on a window that is not the app's: ${TestDevice.windows()}", x)
        }
    }

    /** A real finger drag on the list: [dy] > 0 moves the finger down (shows earlier text). */
    private fun drag(list: RecyclerView, dy: Int, slow: Boolean = true) {
        val loc = IntArray(2)
        onMain { list.getLocationOnScreen(loc) }
        val h = onMainGet { list.height }
        val x = loc[0] + onMainGet { list.width } / 2f
        val y0 = loc[1] + if (dy > 0) h * 0.25f else h * 0.8f
        val t0 = SystemClock.uptimeMillis()
        val steps = if (slow) 20 else 6
        touchDown(MotionEvent.obtain(t0, t0, MotionEvent.ACTION_DOWN, x, y0, 0))
        for (k in 1..steps) {
            val t = t0 + k * 20L
            inst.sendPointerSync(MotionEvent.obtain(t0, t, MotionEvent.ACTION_MOVE, x, y0 + dy * k / steps.toFloat(), 0))
        }
        val tu = t0 + (steps + 1) * 20L
        inst.sendPointerSync(MotionEvent.obtain(t0, tu, MotionEvent.ACTION_UP, x, y0 + dy, 0))
        waitIdle(list)
    }

    private class FrameWatch {
        var last = 0L
        var worst = 0L
        val gaps = mutableListOf<Long>()
        var running = true
        val cb = object : Choreographer.FrameCallback {
            override fun doFrame(nanos: Long) {
                if (last != 0L) {
                    val g = (nanos - last) / 1_000_000
                    gaps += g
                    if (g > worst) worst = g
                }
                last = nanos
                if (running) Choreographer.getInstance().postFrameCallback(this)
            }
        }
    }

    private fun streamAndRead(full: String, label: String) {
        ActivityScenario.launch(MainActivity::class.java).use { scenario ->
            var list: RecyclerView? = null
            scenario.onActivity { a -> list = findRecycler(a.window.decorView) }
            val rv = list!!
            onMain { app.chat.testStartReply("write it") }

            val watch = FrameWatch()
            onMain { Choreographer.getInstance().postFrameCallback(watch.cb) }

            val step = maxOf(200, full.length / 600)
            var n = 0
            var pinnedChecks = 0
            var pinnedOk = 0

            // 1. at the bottom: the chat follows the reply
            while (n < full.length * 3 / 10) {
                n = minOf(full.length, n + step)
                val part = full.substring(0, n)
                onMain { app.chat.testUpdate(part) }
                Thread.sleep(16)
                if (n % (step * 20) < step) {
                    inst.waitForIdleSync()
                    Thread.sleep(40)
                    pinnedChecks++
                    if (onMainGet { atBottom(rv) }) pinnedOk++
                }
            }
            Log.i(TAG, "$label: following ok in $pinnedOk of $pinnedChecks checks")
            assertTrue("$label: did not follow the reply at the bottom ($pinnedOk of $pinnedChecks)", pinnedOk >= pinnedChecks - 1)

            // 2. drag up to read: following stops, and the text stays exactly where it is
            drag(rv, 700)
            drag(rv, 500)
            Thread.sleep(100)
            inst.waitForIdleSync()
            val anchorBefore = onMainGet { replyTop(rv) }
            val jump = onMainGet { findJump(rv) }
            assertTrue("$label: the jump-to-bottom button should show while reading up", jump?.visibility == View.VISIBLE)
            val samples = mutableListOf<Int?>()
            val readStart = SystemClock.uptimeMillis()
            var updates = 0
            while (n < full.length) {
                updates++
                n = minOf(full.length, n + step)
                val part = full.substring(0, n)
                onMain { app.chat.testUpdate(part) }
                Thread.sleep(16)
                if (n % (step * 10) < step) {
                    inst.waitForIdleSync()
                    samples += onMainGet { replyTop(rv) }
                }
            }
            inst.waitForIdleSync()
            Thread.sleep(100)
            samples += onMainGet { replyTop(rv) }
            val perUpdate = (SystemClock.uptimeMillis() - readStart) / maxOf(1, updates)
            Log.i(TAG, "$label: $updates updates while reading, ${perUpdate}ms each (16ms of it is the test's own pause)")
            val moved = samples.filter { it != anchorBefore }
            Log.i(TAG, "$label: reading position $anchorBefore; samples ${samples.size}; moved ${moved.size} ($moved)")
            assertTrue("$label: the reply moved while you were reading: $anchorBefore -> $moved", moved.isEmpty())

            // 3. the jump button returns to the bottom, and the chat follows again
            onMain { jump!!.performClick() }
            Thread.sleep(800)
            waitIdle(rv)
            val tail = full + "\n\nOne more line after jumping."
            onMain { app.chat.testUpdate(tail) }
            Thread.sleep(200)
            inst.waitForIdleSync()
            Thread.sleep(100)
            assertTrue("$label: not at the bottom after the jump button", onMainGet { atBottom(rv) })

            // 4. finishing the reply (stats and buttons appear below) keeps the bottom in view
            onMain { app.chat.testFinish() }
            Thread.sleep(200)
            inst.waitForIdleSync()
            assertTrue("$label: not at the bottom after the reply finished", onMainGet { atBottom(rv) })

            // 5. scrolling back to the code block's header after it finished and folding it there:
            //    the header stays where it was, under your finger
            if (label.startsWith("code")) {
                val fold = onMainGet { findTextWith(rv, "Fold") }
                assertTrue("$label: a long finished code block has no Fold button", fold != null)
                onMain {
                    val f = IntArray(2).also { fold!!.getLocationOnScreen(it) }[1]
                    val l = IntArray(2).also { rv.getLocationOnScreen(it) }[1]
                    rv.scrollBy(0, f - (l + rv.height / 5))
                }
                waitIdle(rv)
                Thread.sleep(200)
                inst.waitForIdleSync()
                val before = onMainGet { IntArray(2).also { fold!!.getLocationOnScreen(it) }[1] }
                onMain { fold!!.performClick() }
                Thread.sleep(300)
                inst.waitForIdleSync()
                assertEquals("$label: the code block did not fold", "Expand", onMainGet { fold!!.text.toString() })
                val after = onMainGet { IntArray(2).also { fold!!.getLocationOnScreen(it) }[1] }
                val atEnd = onMainGet { !rv.canScrollVertically(1) }
                val l = onMainGet { IntArray(2).also { rv.getLocationOnScreen(it) }[1] }
                val h = onMainGet { rv.height }
                Log.i(TAG, "$label: fold button $before -> $after (list ${if (atEnd) "at its end" else "not at its end"})")
                assertTrue("$label: folding moved the header off screen ($after)", after in l until l + h)
                // only when too little is left below to fill the screen may the list move, and only to fill it
                if (!atEnd) assertTrue("$label: folding moved the code block header ($before -> $after)", abs(after - before) <= 2)
            }

            watch.running = false
            val sorted = watch.gaps.sorted()
            val p95 = if (sorted.isEmpty()) 0 else sorted[(sorted.size * 95) / 100]
            Log.i(TAG, "$label: frames ${sorted.size}, p95 frame gap ${p95}ms, worst ${watch.worst}ms")
            // generous for a software-rendered emulator; a frozen screen would be seconds
            assertTrue("$label: the screen froze for ${watch.worst}ms", watch.worst < 1500)
        }
    }

    private fun findJump(rv: RecyclerView): View? {
        val parent = rv.parent as? ViewGroup ?: return null
        for (i in 0 until parent.childCount) {
            val c = parent.getChildAt(i)
            if (c.contentDescription == "Jump to the newest text") return c
        }
        return null
    }

    @Test
    fun code500Lines() = streamAndRead(codeReply(500), "code 500")

    @Test
    fun code2000Lines() = streamAndRead(codeReply(2000), "code 2000")

    @Test
    fun longMarkdown() = streamAndRead(markdownReply(120), "markdown")

    @Test
    fun scrollingBackDownResumesFollowing() {
        ActivityScenario.launch(MainActivity::class.java).use { scenario ->
            var list: RecyclerView? = null
            scenario.onActivity { a -> list = findRecycler(a.window.decorView) }
            val rv = list!!
            onMain { app.chat.testStartReply("go") }
            val full = codeReply(400)
            var n = 0
            while (n < full.length / 2) {
                n += 400
                val part = full.substring(0, minOf(n, full.length))
                onMain { app.chat.testUpdate(part) }
                Thread.sleep(16)
            }
            drag(rv, 600)
            assertFalse(onMainGet { atBottom(rv) })
            // the finger pushes back down to the end
            repeat(30) { if (!onMainGet { atBottom(rv) }) drag(rv, -900, slow = false) }
            assertTrue("could not scroll back to the bottom", onMainGet { atBottom(rv) })
            while (n < full.length) {
                n += 400
                val part = full.substring(0, minOf(n, full.length))
                onMain { app.chat.testUpdate(part) }
                Thread.sleep(16)
            }
            inst.waitForIdleSync()
            Thread.sleep(100)
            assertTrue("following did not resume at the bottom", onMainGet { atBottom(rv) })
            onMain { app.chat.testFinish() }
        }
    }

    @Test
    fun streamingMarkdownMatchesFinalRendering() {
        // Growing a reply piece by piece must end in exactly the same blocks as rendering it at once.
        val full = markdownReply(30) + codeReply(50)
        val once = Markdown.parse(full).map { it.javaClass.simpleName + ":" + it.src }
        val grown = onMainGet {
            val box = android.widget.LinearLayout(inst.targetContext)
            val host = object : Markdown.Host {
                override fun isCollapsed(blockIndex: Int) = false
                override fun toggleCollapsed(blockIndex: Int, anchor: View) {}
                override fun copy(label: String, text: String) {}
            }
            val opts = RenderOptions(true, false, true, 1f)
            var k = 0
            while (k < full.length) {
                k = minOf(full.length, k + 37)
                Markdown.render(box, full.substring(0, k), opts, host)
            }
            box.childCount
        }
        assertEquals("views after streaming vs blocks parsed at once", once.size, grown)
    }

    companion object {
        const val TAG = "OfflineAI-Test"
    }
}
