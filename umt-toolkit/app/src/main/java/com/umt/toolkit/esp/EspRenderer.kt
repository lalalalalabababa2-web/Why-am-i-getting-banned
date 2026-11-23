package com.umt.toolkit.esp

import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import com.umt.sdk.EntityFrame
import com.umt.toolkit.model.EspSettings
import kotlin.math.cos
import kotlin.math.sin

/**
 * Draws an [EntityFrame] onto a Canvas. Shared by the on-screen overlay and the in-app
 * preview so both show exactly the same thing. Paints are reused; nothing is allocated per
 * entity except label strings.
 */
class EspRenderer(private val density: Float) {
    private val stroke = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE }
    private val fill = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.FILL }
    private val text = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        textSize = 11f * density
        setShadowLayer(2f * density, 0f, 0f, Color.BLACK)
    }
    private val path = Path()
    private val box = RectF()

    /**
     * [dst] is where the app's view lands on this canvas; [bounds] is the visible area used for
     * off-screen arrows and the radar.
     */
    fun draw(canvas: Canvas, frame: EntityFrame, s: EspSettings, dst: RectF, bounds: RectF) {
        if (frame.viewW <= 0 || frame.viewH <= 0) return
        val alpha = (s.opacity.coerceIn(0.1f, 1f) * 255).toInt()
        stroke.strokeWidth = s.strokeDp * density
        val list = EspMath.select(frame.entities, s)
        val cx = bounds.centerX()
        val cy = bounds.centerY()

        for (e in list) {
            val color = s.colorFor(e.kind)
            val left = EspMath.mapX(e.x, frame.viewW, dst.left, dst.width())
            val top = EspMath.mapY(e.y, frame.viewH, dst.top, dst.height())
            val right = EspMath.mapX(e.x + e.w, frame.viewW, dst.left, dst.width())
            val bottom = EspMath.mapY(e.y + e.h, frame.viewH, dst.top, dst.height())
            box.set(left, top, right, bottom)
            val inside = e.visible && box.right >= bounds.left && box.left <= bounds.right &&
                box.bottom >= bounds.top && box.top <= bounds.bottom

            if (!inside) {
                if (s.offscreen) drawArrow(canvas, cx, cy, box.centerX(), box.centerY(), bounds, color, alpha)
                continue
            }
            stroke.color = color; stroke.alpha = alpha
            if (s.boxes) {
                if (s.boxStyle == "corners") drawCorners(canvas, box) else canvas.drawRect(box, stroke)
            }
            if (s.lines) canvas.drawLine(cx, bounds.bottom, box.centerX(), box.bottom, stroke)
            if (s.health) e.health?.let { h -> drawHealth(canvas, box, h.coerceIn(0f, 1f), alpha) }
            var ty = box.top - 4f * density
            if (s.labels && e.label.isNotEmpty()) {
                text.color = color; text.alpha = alpha
                val w = text.measureText(e.label)
                canvas.drawText(e.label, box.centerX() - w / 2, ty, text)
                ty -= text.textSize + 2f * density
            }
            if (s.distance) e.distance?.let { d ->
                text.color = Color.WHITE; text.alpha = alpha
                val label = if (d >= 100) "${d.toInt()} m" else "%.1f m".format(d)
                val w = text.measureText(label)
                canvas.drawText(label, box.centerX() - w / 2, box.bottom + text.textSize + 2f * density, text)
            }
        }
        if (s.radar && frame.player != null) drawRadar(canvas, frame, s, list, bounds, alpha)
    }

    private fun drawCorners(canvas: Canvas, r: RectF) {
        val lx = r.width() * 0.25f
        val ly = r.height() * 0.25f
        path.reset()
        path.moveTo(r.left, r.top + ly); path.lineTo(r.left, r.top); path.lineTo(r.left + lx, r.top)
        path.moveTo(r.right - lx, r.top); path.lineTo(r.right, r.top); path.lineTo(r.right, r.top + ly)
        path.moveTo(r.right, r.bottom - ly); path.lineTo(r.right, r.bottom); path.lineTo(r.right - lx, r.bottom)
        path.moveTo(r.left + lx, r.bottom); path.lineTo(r.left, r.bottom); path.lineTo(r.left, r.bottom - ly)
        canvas.drawPath(path, stroke)
    }

    private fun drawHealth(canvas: Canvas, r: RectF, h: Float, alpha: Int) {
        val w = 3f * density
        val x = r.left - w - 2f * density
        fill.color = Color.BLACK; fill.alpha = alpha / 2
        canvas.drawRect(x, r.top, x + w, r.bottom, fill)
        fill.color = Color.rgb((255 * (1 - h)).toInt(), (200 * h + 40).toInt(), 80); fill.alpha = alpha
        canvas.drawRect(x, r.bottom - r.height() * h, x + w, r.bottom, fill)
    }

    private fun drawArrow(canvas: Canvas, cx: Float, cy: Float, tx: Float, ty: Float, bounds: RectF, color: Int, alpha: Int) {
        val a = EspMath.edgeArrow(cx, cy, tx, ty, bounds.left, bounds.top, bounds.right, bounds.bottom, 18f * density) ?: return
        val size = 8f * density
        path.reset()
        path.moveTo(a.x + cos(a.angleRad) * size, a.y + sin(a.angleRad) * size)
        path.lineTo(a.x + cos(a.angleRad + 2.5f) * size, a.y + sin(a.angleRad + 2.5f) * size)
        path.lineTo(a.x + cos(a.angleRad - 2.5f) * size, a.y + sin(a.angleRad - 2.5f) * size)
        path.close()
        fill.color = color; fill.alpha = alpha
        canvas.drawPath(path, fill)
    }

    private fun drawRadar(canvas: Canvas, frame: EntityFrame, s: EspSettings, list: List<com.umt.sdk.Entity>, bounds: RectF, alpha: Int) {
        val player = frame.player ?: return
        val radius = s.radarSizeDp * density / 2
        val rcx = bounds.right - radius - 12f * density
        val rcy = bounds.top + radius + 12f * density
        fill.color = Color.BLACK; fill.alpha = (alpha * 0.45f).toInt()
        canvas.drawCircle(rcx, rcy, radius, fill)
        stroke.color = Color.WHITE; stroke.alpha = alpha / 3; stroke.strokeWidth = 1f * density
        canvas.drawCircle(rcx, rcy, radius, stroke)
        canvas.drawCircle(rcx, rcy, radius / 2, stroke)
        canvas.drawLine(rcx - radius, rcy, rcx + radius, rcy, stroke)
        canvas.drawLine(rcx, rcy - radius, rcx, rcy + radius, stroke)
        // Player: a small chevron pointing up (the direction it faces).
        path.reset()
        val p = 6f * density
        path.moveTo(rcx, rcy - p); path.lineTo(rcx + p * 0.7f, rcy + p * 0.7f); path.lineTo(rcx, rcy + p * 0.3f)
        path.lineTo(rcx - p * 0.7f, rcy + p * 0.7f); path.close()
        fill.color = Color.WHITE; fill.alpha = alpha
        canvas.drawPath(path, fill)
        for (e in list) {
            val wx = e.worldX ?: continue
            val wz = e.worldZ ?: continue
            val pt = EspMath.radar(player, wx, wz, s.radarRange, rcx, rcy, radius - 3f * density)
            fill.color = s.colorFor(e.kind); fill.alpha = if (pt.clamped) alpha / 2 else alpha
            canvas.drawCircle(pt.x, pt.y, (if (pt.clamped) 2f else 3f) * density, fill)
        }
    }
}
