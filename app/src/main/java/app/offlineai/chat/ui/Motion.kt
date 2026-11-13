package app.offlineai.chat.ui

import android.animation.ValueAnimator
import android.view.Choreographer
import android.view.MotionEvent
import android.view.View
import java.util.WeakHashMap
import kotlin.math.abs
import kotlin.math.min

/**
 * A spring: a value that moves to its target the way a weight on a spring does. Unlike an
 * animation with a fixed length it can be given a new target at any moment and carries on from
 * where it is, at the speed it has, which is what makes motion feel fluid under a finger.
 * With animations turned off on the phone (accessibility, battery saver) it jumps to the target.
 */
class Spring(
    private val stiffness: Float = 420f,
    private val damping: Float = 34f,
    /** How close to the target, in the value's own units, counts as arrived. */
    private val rest: Float = 0.002f,
    private val onUpdate: (Float) -> Unit,
) : Choreographer.FrameCallback {
    var value = 0f
        private set
    var velocity = 0f
    var target = 0f
        private set
    private var running = false
    private var last = 0L
    private var onRest: (() -> Unit)? = null

    fun snap(v: Float) {
        value = v
        target = v
        velocity = 0f
        onUpdate(v)
    }

    fun animateTo(t: Float, then: (() -> Unit)? = null) {
        target = t
        onRest = then
        if (!Motion.enabled()) {
            snap(t)
            finish()
            return
        }
        if (!running) {
            running = true
            last = 0L
            Choreographer.getInstance().postFrameCallback(this)
        }
    }

    fun cancel() {
        if (running) Choreographer.getInstance().removeFrameCallback(this)
        running = false
        onRest = null
    }

    override fun doFrame(now: Long) {
        if (!running) return
        var dt = if (last == 0L) 1f / 60f else min((now - last) / 1e9f, 1f / 20f)
        last = now
        // small fixed steps keep a stiff spring stable whatever the frame rate
        while (dt > 0f) {
            val h = min(dt, 0.004f)
            step(h)
            dt -= h
        }
        if (abs(velocity) < rest * 20f && abs(value - target) < rest) {
            value = target
            velocity = 0f
            onUpdate(value)
            running = false
            finish()
        } else {
            onUpdate(value)
            Choreographer.getInstance().postFrameCallback(this)
        }
    }

    /** One step of time (seconds); also what the tests drive. */
    internal fun step(h: Float) {
        val a = -stiffness * (value - target) - damping * velocity
        velocity += a * h
        value += velocity * h
    }

    private fun finish() {
        val f = onRest
        onRest = null
        f?.invoke()
    }
}

object Motion {
    /** False when the phone has animations turned off. */
    fun enabled(): Boolean = ValueAnimator.areAnimatorsEnabled()

    private val presses = WeakHashMap<View, Spring>()

    /**
     * The view gives a little under the finger and springs back: pressed, it shrinks to [scale];
     * let go, it returns with a slight overshoot. Clicks go through as before.
     */
    fun pressable(v: View, scale: Float = 0.96f) {
        v.setOnTouchListener { view, e ->
            when (e.actionMasked) {
                MotionEvent.ACTION_DOWN -> if (view.isEnabled) press(view).animateTo(scale)
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> press(view).animateTo(1f)
            }
            false
        }
    }

    private fun press(v: View): Spring = presses.getOrPut(v) {
        Spring(stiffness = 700f, damping = 30f, rest = 0.001f) { s ->
            v.scaleX = s
            v.scaleY = s
        }.also { it.snap(1f) }
    }

    /** Arrives: fades in while rising [fromDp] and growing from [fromScale]. */
    fun enter(v: View, fromDp: Int = 14, fromScale: Float = 0.98f, delayMs: Long = 0) {
        if (!enabled()) return
        val dy = v.dp(fromDp).toFloat()
        v.alpha = 0f
        v.translationY = dy
        v.scaleX = fromScale
        v.scaleY = fromScale
        val s = Spring(stiffness = 300f, damping = 28f, rest = 0.002f) { p ->
            v.alpha = p.coerceIn(0f, 1f)
            v.translationY = dy * (1f - p)
            val k = fromScale + (1f - fromScale) * p
            v.scaleX = k
            v.scaleY = k
        }
        v.postDelayed({ s.animateTo(1f) }, delayMs)
    }

    /** A quick pop for something that changed in place (an icon swapped, a count went up). */
    fun pop(v: View, from: Float = 0.82f) {
        if (!enabled()) return
        val s = Spring(stiffness = 600f, damping = 22f, rest = 0.001f) { k ->
            v.scaleX = k
            v.scaleY = k
        }
        s.snap(from)
        s.animateTo(1f)
    }
}

fun <T : View> T.pressable(scale: Float = 0.96f): T = apply { Motion.pressable(this, scale) }
