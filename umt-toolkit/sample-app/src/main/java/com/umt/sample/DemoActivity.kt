package com.umt.sample

import android.annotation.SuppressLint
import android.app.Activity
import android.app.Application
import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.os.Bundle
import android.view.Choreographer
import android.view.MotionEvent
import android.view.View
import com.umt.sdk.Entity
import com.umt.sdk.Pose
import com.umt.sdk.UmtSdk
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt
import kotlin.random.Random

class DemoApp : Application() {
    override fun onCreate() {
        super.onCreate()
        // A demo is meant to be driven by the toolkit, so it opts in even in release builds.
        UmtSdk.init(this, UmtSdk.Config(allowRemoteChanges = true, allowStreaming = true))
    }
}

/**
 * A small top-down world: the player in the middle (drag to move, the heading follows the drag),
 * wandering entities around it. Its tunable values are registered with umt-sdk, and every frame
 * is published while the toolkit asks for a stream.
 */
class DemoActivity : Activity() {
    private lateinit var arena: ArenaView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        arena = ArenaView(this)
        setContentView(arena)
        UmtSdk.registerInt("entity_count", "Entities", 16, 1, 64, group = "World", description = "How many things wander around") {
            arena.setCount(it); UmtSdk.log("entity_count -> $it")
        }
        UmtSdk.registerFloat("speed", "Speed", 1f, 0.1f, 3f, 0.1f, group = "World") { arena.speed = it; UmtSdk.log("speed -> $it") }
        UmtSdk.registerFloat("time_scale", "Time scale", 1f, 0f, 2f, 0.1f, group = "World") { arena.timeScale = it; UmtSdk.log("time_scale -> $it") }
        UmtSdk.registerBool("show_colliders", "Show colliders", false, group = "Debug") { arena.showColliders = it }
        UmtSdk.registerChoice("palette", "Palette", listOf("graphite", "sunset", "mono"), "graphite", group = "Look") { arena.palette = it }
        arena.setCount(UmtSdk.getInt("entity_count"))
    }

    override fun onResume() { super.onResume(); arena.start() }
    override fun onPause() { arena.stop(); super.onPause() }
}

@SuppressLint("ViewConstructor")
class ArenaView(context: Context) : View(context) {
    private class Thing(val id: Int, val kind: String, var x: Float, var z: Float, var vx: Float, var vz: Float, val size: Float, var health: Float)

    var speed = 1f
    var timeScale = 1f
    var showColliders = false
    var palette = "graphite"

    private val density = resources.displayMetrics.density
    private val pxPerMeter = 22f * density
    private val rnd = Random(3)
    private var things = emptyList<Thing>()
    private var px = 0f
    private var pz = 0f
    private var yaw = 0f
    private var lastNanos = 0L
    private var running = false
    private var frames = 0
    private var fpsWindowStart = 0L
    private var fps = 0f

    private val fill = Paint(Paint.ANTI_ALIAS_FLAG)
    private val stroke = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE; strokeWidth = 1.5f * density }
    private val text = Paint(Paint.ANTI_ALIAS_FLAG).apply { textSize = 13f * density; color = Color.WHITE }
    private val grid = Paint().apply { strokeWidth = 1f }
    private val rect = RectF()
    private val path = Path()

    private val tick = object : Choreographer.FrameCallback {
        override fun doFrame(now: Long) {
            if (!running) return
            val dt = if (lastNanos == 0L) 0f else ((now - lastNanos) / 1e9f).coerceAtMost(0.1f)
            lastNanos = now
            step(dt * timeScale)
            frames++
            if (now - fpsWindowStart > 1_000_000_000L) {
                fps = frames * 1e9f / (now - fpsWindowStart)
                frames = 0
                fpsWindowStart = now
                UmtSdk.publishDiagnostics(fps, mapOf("entities" to "${things.size}", "player" to "%.1f, %.1f".format(px, pz), "time_scale" to "$timeScale"))
            }
            invalidate()
            Choreographer.getInstance().postFrameCallback(this)
        }
    }

    fun start() {
        running = true
        lastNanos = 0L
        fpsWindowStart = System.nanoTime()
        Choreographer.getInstance().postFrameCallback(tick)
    }

    fun stop() {
        running = false
        Choreographer.getInstance().removeFrameCallback(tick)
    }

    fun setCount(n: Int) {
        val kinds = listOf("npc", "npc", "item", "vehicle")
        things = List(n.coerceIn(1, 64)) { i ->
            val k = kinds[i % kinds.size]
            val a = rnd.nextFloat() * 6.283f
            val v = when (k) { "vehicle" -> 3f; "npc" -> 1.2f; else -> 0f }
            Thing(i + 1, k, px + rnd.nextFloat() * 40 - 20, pz + rnd.nextFloat() * 40 - 20, cos(a) * v, sin(a) * v,
                when (k) { "vehicle" -> 1.6f; "item" -> 0.5f; else -> 0.7f }, 0.3f + rnd.nextFloat() * 0.7f)
        }
    }

    private fun step(dt: Float) {
        for (t in things) {
            t.x += t.vx * speed * dt
            t.z += t.vz * speed * dt
            if (t.x - px > 30 || t.x - px < -30) t.vx = -t.vx
            if (t.z - pz > 30 || t.z - pz < -30) t.vz = -t.vz
        }
    }

    private fun colors(kind: String): Int = when (palette) {
        "sunset" -> when (kind) { "npc" -> 0xFFE8875A.toInt(); "item" -> 0xFFF2C14E.toInt(); else -> 0xFFC2588C.toInt() }
        "mono" -> when (kind) { "npc" -> 0xFFDDDDDD.toInt(); "item" -> 0xFF999999.toInt(); else -> 0xFF666666.toInt() }
        else -> when (kind) { "npc" -> 0xFFE0B252.toInt(); "item" -> 0xFF79C27F.toInt(); else -> 0xFF5DC4CF.toInt() }
    }

    override fun onDraw(canvas: Canvas) {
        val w = width.toFloat()
        val h = height.toFloat()
        val cx = w / 2
        val cy = h / 2
        canvas.drawColor(if (palette == "sunset") 0xFF2A1F2D.toInt() else 0xFF1A1D21.toInt())
        // ground grid, one line per 2 m
        grid.color = 0xFF2A2F35.toInt()
        val step = 2 * pxPerMeter
        var gx = cx - ((px * pxPerMeter) % step)
        while (gx > 0) gx -= step
        while (gx < w) { canvas.drawLine(gx, 0f, gx, h, grid); gx += step }
        var gy = cy + ((pz * pxPerMeter) % step)
        while (gy > 0) gy -= step
        while (gy < h) { canvas.drawLine(0f, gy, w, gy, grid); gy += step }

        val published = ArrayList<Entity>(things.size)
        for (t in things) {
            val sx = cx + (t.x - px) * pxPerMeter
            val sy = cy - (t.z - pz) * pxPerMeter
            val r = t.size * pxPerMeter / 2
            rect.set(sx - r, sy - r, sx + r, sy + r)
            fill.color = colors(t.kind)
            when (t.kind) {
                "item" -> canvas.drawRect(rect, fill)
                "vehicle" -> canvas.drawRoundRect(rect, r / 3, r / 3, fill)
                else -> canvas.drawCircle(sx, sy, r, fill)
            }
            if (showColliders) { stroke.color = Color.RED; canvas.drawRect(rect, stroke) }
            val dist = sqrt((t.x - px) * (t.x - px) + (t.z - pz) * (t.z - pz))
            val visible = rect.right >= 0 && rect.left <= w && rect.bottom >= 0 && rect.top <= h
            published += Entity(t.id, t.kind, rect.left, rect.top, rect.width(), rect.height(),
                "${t.kind} ${t.id}", dist, t.health, t.x, t.z, visible)
        }

        // the player: an arrow pointing along its heading (yaw clockwise from +z = up)
        val yr = Math.toRadians(yaw.toDouble())
        val fx = sin(yr).toFloat()
        val fy = -cos(yr).toFloat()
        val s = 14f * density
        path.reset()
        path.moveTo(cx + fx * s, cy + fy * s)
        path.lineTo(cx - fy * s * 0.6f - fx * s * 0.6f, cy + fx * s * 0.6f - fy * s * 0.6f)
        path.lineTo(cx + fy * s * 0.6f - fx * s * 0.6f, cy - fx * s * 0.6f - fy * s * 0.6f)
        path.close()
        fill.color = 0xFF7DA3C4.toInt()
        canvas.drawPath(path, fill)

        val status = when {
            UmtSdk.isStreaming -> "toolkit connected · streaming"
            UmtSdk.isConnected -> "toolkit connected"
            else -> "not connected (open Mod Toolkit > Integration)"
        }
        canvas.drawText("UMT SDK Demo · %.0f fps · %s".format(fps, status), 12 * density, 28 * density, text)
        canvas.drawText("Drag to move", 12 * density, 46 * density, text.apply { alpha = 150 })
        text.alpha = 255

        UmtSdk.publishFrame(this, published, Pose(px, pz, yaw))
    }

    private var lastTouchX = 0f
    private var lastTouchY = 0f

    @SuppressLint("ClickableViewAccessibility")
    override fun onTouchEvent(e: MotionEvent): Boolean {
        when (e.actionMasked) {
            MotionEvent.ACTION_DOWN -> { lastTouchX = e.x; lastTouchY = e.y }
            MotionEvent.ACTION_MOVE -> {
                val dx = e.x - lastTouchX
                val dy = e.y - lastTouchY
                if (dx * dx + dy * dy > 4f) {
                    px += dx / pxPerMeter
                    pz -= dy / pxPerMeter
                    yaw = Math.toDegrees(atan2(dx.toDouble(), -dy.toDouble())).toFloat()
                }
                lastTouchX = e.x; lastTouchY = e.y
            }
        }
        return true
    }
}
