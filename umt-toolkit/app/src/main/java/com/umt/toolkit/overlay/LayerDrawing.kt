package com.umt.toolkit.overlay

import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Rect
import android.graphics.RectF
import com.umt.toolkit.model.OverlaySettings
import com.umt.toolkit.model.Palette

/** Reticle, safe-area guide and dimmer drawing, shared by the overlay and the in-app previews. */
class LayerDrawing(private val density: Float) {
    private val stroke = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeCap = Paint.Cap.ROUND
        strokeJoin = Paint.Join.ROUND
    }
    private val fill = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.FILL }
    private val guide = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE }
    private val cutout = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.FILL }

    /**
     * [alphaScale] compensates for the window's own alpha (see PassthroughLayerView) so the
     * opacity the user picked is the opacity they see, up to the window's cap.
     */
    fun drawDimmer(canvas: Canvas, s: OverlaySettings, alphaScale: Float) {
        val a = (s.dimmerLevel * alphaScale).coerceIn(0f, 1f)
        val base = if (s.dimmerWarm) Color.rgb(40, 22, 0) else Color.BLACK
        canvas.drawColor(Color.argb((a * 255).toInt(), Color.red(base), Color.green(base), Color.blue(base)))
    }

    fun drawGuide(canvas: Canvas, s: OverlaySettings, w: Float, h: Float, cutouts: List<Rect>, alphaScale: Float) {
        val a = (0.55f * alphaScale).coerceIn(0f, 1f)
        guide.strokeWidth = 1f * density
        guide.color = Color.argb((a * 255).toInt(), 125, 163, 196)
        if (s.guideThirds) {
            for (i in 1..2) {
                canvas.drawLine(w * i / 3f, 0f, w * i / 3f, h, guide)
                canvas.drawLine(0f, h * i / 3f, w, h * i / 3f, guide)
            }
        }
        if (s.guideCenter) {
            guide.color = Color.argb((a * 255).toInt(), 230, 230, 230)
            canvas.drawLine(w / 2, 0f, w / 2, h, guide)
            canvas.drawLine(0f, h / 2, w, h / 2, guide)
        }
        if (s.guideMarginPct > 0f) {
            val mx = w * s.guideMarginPct / 100f
            val my = h * s.guideMarginPct / 100f
            guide.color = Color.argb((a * 255).toInt(), 224, 178, 82)
            canvas.drawRect(mx, my, w - mx, h - my, guide)
        }
        if (s.guideCutout) {
            cutout.color = Color.argb((0.45f * alphaScale * 255).coerceIn(0f, 255f).toInt(), 207, 122, 112)
            for (r in cutouts) canvas.drawRect(r, cutout)
        }
    }

    fun drawReticle(canvas: Canvas, s: OverlaySettings, cx0: Float, cy0: Float, alphaScale: Float) {
        val cx = cx0 + s.reticleOffsetXDp * density
        val cy = cy0 + s.reticleOffsetYDp * density
        val size = s.reticleSizeDp * density / 2
        val gap = s.reticleGapDp * density
        val color = Palette.argb(s.reticleColor)
        val alpha = ((s.reticleOpacity * alphaScale).coerceIn(0f, 1f) * 255).toInt()
        stroke.strokeWidth = s.reticleThicknessDp * density
        stroke.color = color; stroke.alpha = alpha
        fill.color = color; fill.alpha = alpha
        // Thin dark outline under the shape keeps it readable on bright and dark scenes.
        val outline = Paint(stroke).apply { this.color = Color.BLACK; this.alpha = alpha / 2; strokeWidth = stroke.strokeWidth + 2f * density }
        fun cross(p: Paint, top: Boolean) {
            canvas.drawLine(cx - size, cy, cx - gap, cy, p)
            canvas.drawLine(cx + gap, cy, cx + size, cy, p)
            if (top) canvas.drawLine(cx, cy - size, cx, cy - gap, p)
            canvas.drawLine(cx, cy + gap, cx, cy + size, p)
        }
        when (s.reticleStyle) {
            "dot" -> {
                canvas.drawCircle(cx, cy, stroke.strokeWidth * 1.5f + 1f * density, outline.apply { style = Paint.Style.FILL })
                canvas.drawCircle(cx, cy, stroke.strokeWidth * 1.5f, fill)
            }
            "circle" -> {
                canvas.drawCircle(cx, cy, size, outline)
                canvas.drawCircle(cx, cy, size, stroke)
                canvas.drawCircle(cx, cy, stroke.strokeWidth, fill)
            }
            "cross_dot" -> {
                cross(outline, true); cross(stroke, true)
                canvas.drawCircle(cx, cy, stroke.strokeWidth, fill)
            }
            "chevron" -> {
                val path = android.graphics.Path().apply {
                    moveTo(cx - size * 0.7f, cy + size * 0.5f); lineTo(cx, cy); lineTo(cx + size * 0.7f, cy + size * 0.5f)
                }
                canvas.drawPath(path, outline)
                canvas.drawPath(path, stroke)
            }
            "tee" -> { cross(outline, false); cross(stroke, false) }
            else -> { cross(outline, true); cross(stroke, true) }
        }
    }

    companion object {
        fun previewRect(w: Float, h: Float) = RectF(0f, 0f, w, h)
    }
}
