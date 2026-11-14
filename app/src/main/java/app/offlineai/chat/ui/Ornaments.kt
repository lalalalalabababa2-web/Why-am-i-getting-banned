package app.offlineai.chat.ui

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RadialGradient
import android.graphics.Shader
import android.view.View
import android.view.animation.LinearInterpolator
import androidx.core.graphics.ColorUtils
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

/**
 * Animations that run on their own while they are on screen and stop when they are not. They are
 * driven by an animator (never by drawing asking for another draw), so the screen can go idle
 * between frames and nothing runs with animations turned off.
 */
abstract class Animated(context: Context, private val periodMs: Long) : View(context) {
    protected var phase = 0f
    private var animator: ValueAnimator? = null

    private fun sync() {
        val want = isAttachedToWindow && isShown && Motion.enabled()
        if (want && animator == null) {
            animator = ValueAnimator.ofFloat(0f, 1f).apply {
                duration = periodMs
                repeatCount = ValueAnimator.INFINITE
                interpolator = LinearInterpolator()
                addUpdateListener {
                    phase = it.animatedValue as Float
                    invalidate()
                }
                start()
            }
        } else if (!want && animator != null) {
            animator?.cancel()
            animator = null
        }
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        sync()
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        sync()
    }

    override fun onVisibilityChanged(changedView: View, visibility: Int) {
        super.onVisibilityChanged(changedView, visibility)
        sync()
    }

    override fun onWindowVisibilityChanged(visibility: Int) {
        super.onWindowVisibilityChanged(visibility)
        sync()
    }
}

/** The app's mark: a soft ball of the accent colour that slowly breathes, two lights drifting over it. */
class Orb(context: Context) : Animated(context, 7000) {
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)

    override fun onDraw(canvas: Canvas) {
        val cx = width / 2f
        val cy = height / 2f
        val a = (phase * 2 * PI).toFloat()
        val r = minOf(cx, cy) * (0.86f + 0.05f * sin(a))
        val accent = Palette.accent
        val deep = ColorUtils.blendARGB(accent, if (Palette.dark) 0xFF10131A.toInt() else 0xFF2A3550.toInt(), 0.55f)
        val light = ColorUtils.blendARGB(accent, 0xFFFFFFFF.toInt(), 0.55f)
        // a glow around it
        paint.shader = RadialGradient(cx, cy, r * 1.15f, intArrayOf(ColorUtils.setAlphaComponent(accent, 70), 0), floatArrayOf(0.6f, 1f), Shader.TileMode.CLAMP)
        canvas.drawCircle(cx, cy, r * 1.15f, paint)
        // the ball
        paint.shader = RadialGradient(cx - r * 0.3f, cy - r * 0.35f, r * 1.5f, intArrayOf(light, accent, deep), floatArrayOf(0f, 0.45f, 1f), Shader.TileMode.CLAMP)
        canvas.drawCircle(cx, cy, r * 0.86f, paint)
        // two lights drifting across it
        for (k in 0..1) {
            val t = a + k * PI.toFloat()
            val lx = cx + cos(t) * r * 0.32f
            val ly = cy + sin(t * 1f) * r * 0.26f
            paint.shader = RadialGradient(lx, ly, r * 0.5f, intArrayOf(ColorUtils.setAlphaComponent(0xFFFFFFFF.toInt(), if (k == 0) 90 else 40), 0), null, Shader.TileMode.CLAMP)
            canvas.drawCircle(cx, cy, r * 0.86f, paint)
        }
        paint.shader = null
    }
}

/** Three dots rising and falling one after another: a reply is on its way. */
class TypingDots(context: Context) : Animated(context, 1100) {
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)

    init {
        contentDescription = "Writing"
    }

    override fun onDraw(canvas: Canvas) {
        val d = dp(7).toFloat()
        val gap = dp(6).toFloat()
        val cy = height / 2f
        for (i in 0..2) {
            val t = ((phase - i * 0.16f) % 1f + 1f) % 1f
            val up = if (t < 0.5f) sin(t * 2 * PI.toFloat()).coerceAtLeast(0f) else 0f
            paint.color = ColorUtils.setAlphaComponent(Palette.text2, (110 + 145 * up).toInt())
            canvas.drawCircle(d / 2 + i * (d + gap), cy - up * dp(4), d / 2 * (0.85f + 0.15f * up), paint)
        }
    }
}

/**
 * Frosted glass: draws whatever of [source] is behind it, blurred (Android 12 and later; on older
 * phones it stays empty and the translucent surface on top does the work alone). It is redrawn
 * only when [source] changed, so a still screen stays idle.
 */
class Backdrop(context: Context, private val source: View, radiusDp: Int = 22) : View(context) {
    private val node: android.graphics.RenderNode? =
        if (android.os.Build.VERSION.SDK_INT >= 31) android.graphics.RenderNode("backdrop").apply {
            val r = dp(radiusDp).toFloat()
            setRenderEffect(android.graphics.RenderEffect.createBlurEffect(r, r, Shader.TileMode.CLAMP))
        } else null
    private val here = IntArray(2)
    private val there = IntArray(2)
    private var broken = false
    private val watch = android.view.ViewTreeObserver.OnPreDrawListener {
        if (source.isDirty) invalidate()
        true
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        if (node != null) source.viewTreeObserver.addOnPreDrawListener(watch)
    }

    override fun onDetachedFromWindow() {
        source.viewTreeObserver.removeOnPreDrawListener(watch)
        super.onDetachedFromWindow()
    }

    override fun onDraw(canvas: Canvas) {
        val n = node ?: return
        if (broken || width == 0 || height == 0 || !canvas.isHardwareAccelerated || android.os.Build.VERSION.SDK_INT < 31) return
        try {
            getLocationInWindow(here)
            source.getLocationInWindow(there)
            n.setPosition(0, 0, width, height)
            val rc = n.beginRecording(width, height)
            rc.drawColor(Palette.bg)
            rc.translate((there[0] - here[0]).toFloat(), (there[1] - here[1]).toFloat())
            source.draw(rc)
            n.endRecording()
            canvas.drawRenderNode(n)
        } catch (e: Exception) {
            // never worth a crash: the surface on top is translucent enough on its own
            broken = true
        }
    }
}
