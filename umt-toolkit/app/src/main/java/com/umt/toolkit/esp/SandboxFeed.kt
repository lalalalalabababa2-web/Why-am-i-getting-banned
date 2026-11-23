package com.umt.toolkit.esp

import com.umt.sdk.Entity
import com.umt.sdk.EntityFrame
import com.umt.sdk.Pose
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt
import kotlin.math.tan
import kotlin.random.Random

/**
 * Local Sandbox Test Feed: a small simulated world projected through a pinhole camera.
 * It exists so the entity renderer can be tried without any integrated app; the data is
 * labelled as simulated everywhere it appears.
 */
class SandboxFeed {
    private class Sim(val id: Int, val kind: String, val label: String, var x: Float, var z: Float,
                      var vx: Float, var vz: Float, var health: Float, val height: Float, val width: Float)

    private val lock = Any()
    private var sims = emptyList<Sim>()
    private var t = 0f
    private var seq = 0L
    private var player = Pose(0f, 0f, 0f)
    private val half = 90f
    @Volatile private var viewW = 1280
    @Volatile private var viewH = 720

    /** The overlay sets this to the screen size so the simulated view is not stretched. */
    fun setView(w: Int, h: Int) {
        if (w > 0 && h > 0) { viewW = w; viewH = h }
    }

    fun reset(count: Int, seed: Long = 7L) = synchronized(lock) {
        val rnd = Random(seed)
        val kinds = listOf("npc", "npc", "npc", "item", "vehicle", "marker")
        sims = List(count.coerceIn(1, 128)) { i ->
            val kind = kinds[i % kinds.size]
            val speed = when (kind) { "vehicle" -> 6f; "npc" -> 1.6f; else -> 0f }
            val dir = rnd.nextFloat() * 2f * PI.toFloat()
            Sim(i + 1, kind, "${kind.replaceFirstChar { it.uppercase() }} ${i + 1}",
                rnd.nextFloat() * 2 * half - half, rnd.nextFloat() * 2 * half - half,
                cos(dir) * speed, sin(dir) * speed, 0.3f + rnd.nextFloat() * 0.7f,
                when (kind) { "vehicle" -> 1.8f; "item" -> 0.5f; "marker" -> 3f; else -> 1.8f },
                when (kind) { "vehicle" -> 2.2f; "item" -> 0.5f; "marker" -> 0.4f; else -> 0.6f })
        }
        t = 0f
    }

    val count: Int get() = synchronized(lock) { sims.size }

    fun step(dt: Float) = synchronized(lock) {
        t += dt
        // The camera walks a slow circle and turns to look along it.
        val r = 30f
        val a = t * 0.12f
        val px = cos(a) * r
        val pz = sin(a) * r
        val yaw = Math.toDegrees(atan2Safe(-sin(a).toDouble(), cos(a).toDouble())).toFloat()
        player = Pose(px, pz, yaw)
        for (s in sims) {
            s.x += s.vx * dt
            s.z += s.vz * dt
            if (abs(s.x) > half) { s.vx = -s.vx; s.x = s.x.coerceIn(-half, half) }
            if (abs(s.z) > half) { s.vz = -s.vz; s.z = s.z.coerceIn(-half, half) }
        }
    }

    private fun atan2Safe(y: Double, x: Double) = kotlin.math.atan2(y, x)

    fun frame(viewW: Int = this.viewW, viewH: Int = this.viewH): EntityFrame = synchronized(lock) {
        val fov = Math.toRadians(70.0)
        val focal = (viewW / 2.0 / tan(fov / 2)).toFloat()
        val cx = viewW / 2f
        val cy = viewH / 2f
        val eye = 1.7f
        val yaw = Math.toRadians(player.yawDeg.toDouble())
        val entities = sims.map { s ->
            val dx = s.x - player.x
            val dz = s.z - player.z
            val forward = (dx * sin(yaw) + dz * cos(yaw)).toFloat()
            val right = (dx * cos(yaw) - dz * sin(yaw)).toFloat()
            val dist = sqrt(dx * dx + dz * dz)
            if (forward > 0.5f) {
                val sx = cx + right / forward * focal
                val bottom = cy + eye / forward * focal
                val h = s.height / forward * focal
                val w = s.width / forward * focal
                val onScreen = sx + w / 2 >= 0 && sx - w / 2 <= viewW && bottom >= 0 && bottom - h <= viewH
                Entity(s.id, s.kind, sx - w / 2, bottom - h, w, h, s.label, dist, s.health, s.x, s.z, onScreen)
            } else {
                // Behind the camera: point the off-screen arrow the right way (down = behind).
                Entity(s.id, s.kind, cx + right * 50f, cy - forward * 50f + 1f, 0f, 0f, s.label, dist, s.health, s.x, s.z, false)
            }
        }
        EntityFrame(++seq, System.currentTimeMillis(), 0, 0, viewW, viewH, entities, player)
    }
}
