package com.umt.toolkit.esp

import com.umt.sdk.Entity
import com.umt.sdk.Pose
import com.umt.toolkit.model.EspSettings
import kotlin.math.abs
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

data class Arrow(val x: Float, val y: Float, val angleRad: Float)
data class RadarPoint(val x: Float, val y: Float, val clamped: Boolean)

/** Pure geometry and filtering for the entity overlay (unit tested, no Android types). */
object EspMath {

    /** Hidden kinds removed, beyond max distance removed, nearest first, capped at maxEntities. */
    fun select(entities: List<Entity>, s: EspSettings): List<Entity> = entities.asSequence()
        .filter { it.kind !in s.hiddenKinds }
        .filter { e -> e.distance.let { it == null || it <= s.maxDistance } }
        .sortedBy { it.distance ?: Float.MAX_VALUE }
        .take(s.maxEntities.coerceIn(1, 256))
        .toList()

    /**
     * Where an arrow for a target in direction (tx, ty) from the centre (cx, cy) sits on the
     * border of the rectangle [left, top, right, bottom] inset by [margin].
     */
    fun edgeArrow(cx: Float, cy: Float, tx: Float, ty: Float,
                  left: Float, top: Float, right: Float, bottom: Float, margin: Float): Arrow? {
        val dx = tx - cx
        val dy = ty - cy
        if (abs(dx) < 1e-3f && abs(dy) < 1e-3f) return null
        val l = left + margin; val r = right - margin; val t = top + margin; val b = bottom - margin
        if (r <= l || b <= t) return null
        var scale = Float.MAX_VALUE
        if (dx > 0) scale = minOf(scale, (r - cx) / dx)
        if (dx < 0) scale = minOf(scale, (l - cx) / dx)
        if (dy > 0) scale = minOf(scale, (b - cy) / dy)
        if (dy < 0) scale = minOf(scale, (t - cy) / dy)
        if (scale == Float.MAX_VALUE || scale < 0) return null
        return Arrow(cx + dx * scale, cy + dy * scale, atan2(dy, dx))
    }

    /**
     * Ground position -> radar position with the player facing up. Yaw is clockwise from +z.
     * Points beyond [range] are pulled onto the rim and flagged.
     */
    fun radar(player: Pose, ex: Float, ez: Float, range: Float, cx: Float, cy: Float, radius: Float): RadarPoint {
        val yaw = Math.toRadians(player.yawDeg.toDouble())
        val dx = (ex - player.x).toDouble()
        val dz = (ez - player.z).toDouble()
        val forward = dx * sin(yaw) + dz * cos(yaw)
        val right = dx * cos(yaw) - dz * sin(yaw)
        var px = (right / range).toFloat()
        var py = (forward / range).toFloat()
        val len = sqrt(px * px + py * py)
        val clamped = len > 1f
        if (clamped) { px /= len; py /= len }
        return RadarPoint(cx + px * radius, cy - py * radius, clamped)
    }

    /** Maps a point in the app's view to the destination rectangle. */
    fun mapX(x: Float, viewW: Int, dstLeft: Float, dstWidth: Float) = dstLeft + x / viewW * dstWidth
    fun mapY(y: Float, viewH: Int, dstTop: Float, dstHeight: Float) = dstTop + y / viewH * dstHeight
}
