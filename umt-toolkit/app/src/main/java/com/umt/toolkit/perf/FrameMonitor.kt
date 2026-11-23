package com.umt.toolkit.perf

import android.os.Handler
import android.os.Looper
import android.view.Choreographer

/**
 * Real Choreographer frame pacing of the toolkit's own main thread: the time between
 * consecutive vsync callbacks it receives. It cannot see any other app's frames.
 */
class FrameMonitor {
    private val main = Handler(Looper.getMainLooper())
    private val lock = Any()
    private val ring = FloatArray(600)
    private var head = 0
    private var size = 0
    private var lastNanos = 0L
    @Volatile private var running = false

    private val callback = object : Choreographer.FrameCallback {
        override fun doFrame(frameTimeNanos: Long) {
            if (!running) return
            if (lastNanos != 0L) {
                val ms = (frameTimeNanos - lastNanos) / 1_000_000f
                if (ms > 0f && ms < 5000f) synchronized(lock) {
                    ring[head] = ms
                    head = (head + 1) % ring.size
                    if (size < ring.size) size++
                }
            }
            lastNanos = frameTimeNanos
            Choreographer.getInstance().postFrameCallback(this)
        }
    }

    /** JVM tests (Robolectric) simulate vsync instantly, so a self-re-arming callback would never let them idle. */
    private val disabled = System.getProperty("umt.disableFrameMonitor") == "true"

    fun start() = main.post {
        if (running || disabled) return@post
        running = true
        lastNanos = 0L
        Choreographer.getInstance().postFrameCallback(callback)
    }

    fun stop() = main.post {
        running = false
        Choreographer.getInstance().removeFrameCallback(callback)
    }

    /** The newest intervals covering about [windowMs], oldest first. */
    fun recent(windowMs: Float): FloatArray = synchronized(lock) {
        var total = 0f
        var n = 0
        while (n < size) {
            val idx = (head - 1 - n + ring.size) % ring.size
            total += ring[idx]
            n++
            if (total >= windowMs) break
        }
        FloatArray(n) { i -> ring[(head - n + i + ring.size) % ring.size] }
    }

    /** The newest [n] intervals, oldest first (for the frame-time chart). */
    fun last(n: Int): FloatArray = synchronized(lock) {
        val k = minOf(n, size)
        FloatArray(k) { i -> ring[(head - k + i + ring.size) % ring.size] }
    }
}
