package com.umt.toolkit.overlay

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Rect
import android.graphics.RectF
import android.os.Build
import android.os.SystemClock
import android.view.MotionEvent
import android.view.View
import android.view.ViewConfiguration
import com.umt.sdk.EntityFrame
import com.umt.toolkit.esp.EspRenderer
import com.umt.toolkit.model.EspSettings
import com.umt.toolkit.model.HudMetric
import com.umt.toolkit.model.OverlaySettings
import com.umt.toolkit.perf.PerfMath
import com.umt.toolkit.perf.TelemetrySample
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * The single untouchable full-screen layer: dimmer, guide, entity overlay and reticle.
 * Redraws are capped at the governor's overlay frame rate.
 */
@SuppressLint("ViewConstructor")
class PassthroughLayerView(context: Context, val windowAlpha: Float) : View(context) {
    private val density = resources.displayMetrics.density
    private val drawing = LayerDrawing(density)
    private val renderer = EspRenderer(density)
    private val loc = IntArray(2)
    private val dst = RectF()
    private val bounds = RectF()
    private var lastDraw = 0L
    private var pending = false

    var overlays = OverlaySettings()
    var esp = EspSettings()
    var maxFps = 30
    private var frame: EntityFrame? = null

    fun setFrame(f: EntityFrame?) {
        frame = f
        if (!overlays.espEnabled) return
        val gap = 1000L / maxFps.coerceIn(5, 120)
        val now = SystemClock.uptimeMillis()
        if (now - lastDraw >= gap) {
            lastDraw = now
            invalidate()
        } else if (!pending) {
            pending = true
            postDelayed({ pending = false; lastDraw = SystemClock.uptimeMillis(); invalidate() }, gap - (now - lastDraw))
        }
    }

    private fun cutouts(): List<Rect> =
        if (Build.VERSION.SDK_INT >= 28) rootWindowInsets?.displayCutout?.boundingRects.orEmpty() else emptyList()

    override fun onDraw(canvas: Canvas) {
        val w = width.toFloat()
        val h = height.toFloat()
        val scale = 1f / windowAlpha
        if (overlays.dimmerEnabled) drawing.drawDimmer(canvas, overlays, scale)
        if (overlays.guideEnabled) drawing.drawGuide(canvas, overlays, w, h, cutouts(), scale)
        if (overlays.espEnabled) frame?.let { f ->
            bounds.set(0f, 0f, w, h)
            if (esp.source == "sandbox") {
                dst.set(bounds)
            } else {
                getLocationOnScreen(loc)
                val left = (f.originX - loc[0]).toFloat()
                val top = (f.originY - loc[1]).toFloat()
                dst.set(left, top, left + f.viewW, top + f.viewH)
            }
            renderer.draw(canvas, f, esp.copy(opacity = (esp.opacity * scale).coerceAtMost(1f)), dst, bounds)
        }
        if (overlays.reticleEnabled) drawing.drawReticle(canvas, overlays, w / 2, h / 2, scale)
    }
}

/** Small draggable telemetry readout. */
@SuppressLint("ViewConstructor")
class HudView(
    context: Context,
    private val onMove: (Int, Int) -> Unit,
    private val onMoveEnd: () -> Unit,
) : View(context) {
    private val density = resources.displayMetrics.density
    private val bg = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.rgb(26, 29, 33) }
    private val border = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; color = Color.rgb(48, 53, 60); strokeWidth = density }
    private val labelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.rgb(154, 163, 173) }
    private val valuePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.rgb(226, 229, 233) }
    private val rect = RectF()
    private var metrics: List<String> = HudMetric.defaults
    private var lines: List<Pair<String, String>> = emptyList()
    private var opacity = 0.85f
    private val slop = ViewConfiguration.get(context).scaledTouchSlop
    private var downX = 0f
    private var downY = 0f
    private var lastX = 0f
    private var lastY = 0f
    private var dragging = false
    private var latest: TelemetrySample? = null
    private val clock = SimpleDateFormat("HH:mm", Locale.getDefault())

    fun configure(metrics: List<String>, textSp: Float, opacity: Float) {
        this.metrics = metrics.ifEmpty { listOf(HudMetric.TIME) }
        this.opacity = opacity
        val px = textSp * resources.displayMetrics.scaledDensity
        labelPaint.textSize = px
        valuePaint.textSize = px
        rebuild()
    }

    fun update(s: TelemetrySample) {
        latest = s
        rebuild()
    }

    private fun rebuild() {
        val s = latest
        lines = metrics.map { m ->
            val v = when (m) {
                HudMetric.TIME -> clock.format(Date())
                HudMetric.BATTERY -> s?.batteryPct?.takeIf { it >= 0 }?.let { "%.0f%%".format(it) + if (s.charging) " ⚡" else "" }
                HudMetric.TEMP -> s?.batteryTempC?.let { "%.1f °C".format(it) }
                HudMetric.THERMAL -> s?.let { if (it.thermalStatus < 0) "n/a" else PerfMath.thermalLabel(it.thermalStatus) }
                HudMetric.MEMORY -> s?.let { "%.0f MB".format(it.memAvailMb) }
                HudMetric.CPU -> s?.let { "%.1f%%".format(it.cpuSelf) }
                HudMetric.UI_FPS -> s?.let { "%.0f".format(it.uiFps) }
                HudMetric.REFRESH -> s?.let { "%.0f Hz".format(it.refreshHz) }
                HudMetric.CURRENT -> s?.currentMa?.let { "%.0f mA".format(it) }
                else -> null
            } ?: "…"
            shortLabel(m) to v
        }
        requestLayout()
        invalidate()
    }

    private fun shortLabel(m: String) = when (m) {
        HudMetric.TIME -> "Time"; HudMetric.BATTERY -> "Batt"; HudMetric.TEMP -> "Temp"; HudMetric.THERMAL -> "Therm"
        HudMetric.MEMORY -> "RAM"; HudMetric.CPU -> "UMT CPU"; HudMetric.UI_FPS -> "UMT fps"; HudMetric.REFRESH -> "Disp"
        HudMetric.CURRENT -> "Curr"; else -> m
    }

    private val pad get() = 6f * density
    private val gap get() = 8f * density
    private val lineH get() = valuePaint.textSize * 1.3f

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        val lw = lines.maxOfOrNull { labelPaint.measureText(it.first) } ?: 0f
        val vw = lines.maxOfOrNull { valuePaint.measureText(it.second) } ?: 0f
        setMeasuredDimension((pad * 2 + lw + gap + vw).toInt() + 1, (pad * 2 + lineH * lines.size).toInt() + 1)
    }

    override fun onDraw(canvas: Canvas) {
        val a = (opacity * 255).toInt()
        rect.set(0f, 0f, width.toFloat(), height.toFloat())
        bg.alpha = a
        canvas.drawRoundRect(rect, 5 * density, 5 * density, bg)
        canvas.drawRoundRect(rect, 5 * density, 5 * density, border)
        val lw = lines.maxOfOrNull { labelPaint.measureText(it.first) } ?: 0f
        var y = pad + valuePaint.textSize
        for ((l, v) in lines) {
            canvas.drawText(l, pad, y, labelPaint)
            canvas.drawText(v, pad + lw + gap, y, valuePaint)
            y += lineH
        }
    }

    @SuppressLint("ClickableViewAccessibility")
    override fun onTouchEvent(e: MotionEvent): Boolean {
        when (e.actionMasked) {
            MotionEvent.ACTION_DOWN -> { downX = e.rawX; downY = e.rawY; lastX = downX; lastY = downY; dragging = false }
            MotionEvent.ACTION_MOVE -> {
                if (!dragging && (Math.abs(e.rawX - downX) > slop || Math.abs(e.rawY - downY) > slop)) dragging = true
                if (dragging) {
                    val dx = (e.rawX - lastX).toInt()
                    val dy = (e.rawY - lastY).toInt()
                    if (dx != 0 || dy != 0) onMove(dx, dy)
                    lastX += dx; lastY += dy
                }
            }
            MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> if (dragging) onMoveEnd()
        }
        return true
    }
}
