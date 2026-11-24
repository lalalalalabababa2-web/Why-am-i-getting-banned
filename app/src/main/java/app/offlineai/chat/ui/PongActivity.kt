package app.offlineai.chat.ui

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RadialGradient
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.Typeface
import android.media.AudioAttributes
import android.media.SoundPool
import android.os.Bundle
import android.text.InputType
import android.view.Gravity
import android.view.HapticFeedbackConstants
import android.view.MotionEvent
import android.view.View
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.LinearLayout
import androidx.appcompat.app.AppCompatActivity
import app.offlineai.chat.App
import app.offlineai.chat.R
import app.offlineai.chat.data.Disguise
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.exp
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin
import kotlin.math.sqrt
import kotlin.random.Random

/**
 * Ping Pong: a real table tennis game, and what the app shows from the launcher while it is hidden
 * (Settings, Privacy, Hide as a game). Its settings have a player name; the secret code typed
 * there opens the app instead.
 */
class PongActivity : AppCompatActivity() {
    private lateinit var app: App
    private lateinit var game: PongView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        app = App.of(this)
        Palette.apply(this, app.settings)
        // hidden: the game opening means the app behind it is locked (Back never shows it)
        if (app.settings.disguised) app.lockNow()
        val root = FrameLayout(this).apply { setBackgroundColor(PongView.ARENA) }
        game = PongView(this, app.settings.gamePlayer.ifBlank { "You" }, app.settings.gameLevel, app.settings.gameSound)
        root.addView(game, FrameLayout.LayoutParams(MATCH, MATCH))
        val gear = iconButton(R.drawable.ic_settings, "Game settings", 0xB3FFFFFF.toInt()) { showSettings() }
        root.addView(gear, FrameLayout.LayoutParams(dp(48), dp(48), Gravity.TOP or Gravity.END).apply {
            setMargins(0, dp(8), dp(8), 0)
        })
        setContentView(root)
        edgeToEdge(root)
        // the arena is dark in both themes: light status bar icons on it
        androidx.core.view.WindowCompat.getInsetsController(window, root).apply {
            isAppearanceLightStatusBars = false
            isAppearanceLightNavigationBars = false
        }
        window.setBackgroundDrawable(android.graphics.drawable.ColorDrawable(PongView.ARENA))
    }

    override fun onResume() {
        super.onResume()
        game.resume()
    }

    override fun onPause() {
        super.onPause()
        game.pause()
    }

    override fun onDestroy() {
        game.release()
        super.onDestroy()
    }

    private fun showSettings() {
        game.pause()
        val box = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        box.addView(text("Player name", 13f, Palette.text3, bold = true).apply { setPadding(0, dp(4), 0, dp(6)) })
        val name = EditText(this).apply {
            setText(app.settings.gamePlayer)
            hint = "You"
            setHintTextColor(Palette.text3)
            setTextColor(Palette.text)
            textSize = 16f * Palette.fontScale
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS or InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD
            background = rounded(Palette.surface2, dp(14).toFloat(), dp(1), Palette.border)
            setPadding(dp(14), dp(12), dp(14), dp(12))
            isSingleLine = true
        }
        box.addView(name, lp(MATCH, WRAP))
        box.addView(text("Opponent", 13f, Palette.text3, bold = true).apply { setPadding(0, dp(16), 0, dp(6)) })
        val levels = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        var level = app.settings.gameLevel
        val chips = LEVELS.mapIndexed { i, l ->
            pill(l, primary = i == level) {}.also { levels.addView(it, lp(0, WRAP, 1f).apply { marginEnd = if (i < 2) dp(8) else 0 }) }
        }
        fun paint(chipsSel: Int, list: List<android.widget.TextView>) = list.forEachIndexed { k, o ->
            o.background = ripple(
                if (k == chipsSel) rounded(Palette.accent, dp(20).toFloat()) else rounded(Palette.surface2, dp(20).toFloat(), dp(1), Palette.border),
                dp(20).toFloat(),
            )
            o.setTextColor(if (k == chipsSel) Palette.onAccent else Palette.text)
        }
        chips.forEachIndexed { i, c ->
            c.setOnClickListener {
                level = i
                paint(i, chips)
            }
        }
        box.addView(levels, lp(MATCH, WRAP))
        box.addView(text("Sound", 13f, Palette.text3, bold = true).apply { setPadding(0, dp(16), 0, dp(6)) })
        val sounds = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        var sound = app.settings.gameSound
        val soundChips = listOf("On", "Off").mapIndexed { i, l ->
            pill(l, primary = (i == 0) == sound) {}.also { sounds.addView(it, lp(0, WRAP, 1f).apply { marginEnd = if (i == 0) dp(8) else 0 }) }
        }
        soundChips.forEachIndexed { i, c ->
            c.setOnClickListener {
                sound = i == 0
                paint(i, soundChips)
            }
        }
        box.addView(sounds, lp(MATCH, WRAP))
        val sheet = Sheet(this, "Game settings")
        sheet.view(box)
        sheet.button("Save") {
            val typed = name.text.toString()
            if (Disguise.matches(app.settings, typed)) {
                // the secret: open the app itself, and keep the real name out of the game
                startActivity(Intent(this, MainActivity::class.java))
                return@button
            }
            app.settings.gamePlayer = typed.trim().take(14)
            app.settings.gameLevel = level
            app.settings.gameSound = sound
            game.configure(app.settings.gamePlayer.ifBlank { "You" }, level, sound)
            game.resume()
        }
        sheet.setOnDismissListener { if (!isFinishing) game.resume() }
        sheet.show()
    }

    companion object {
        val LEVELS = listOf("Club", "League", "Pro")
    }
}

/**
 * Table tennis seen from behind your end of the table: a regulation table (2.74 by 1.525 m, the net
 * 15.25 cm high) drawn in perspective, a 40 mm ball under gravity that bounces, spins a little off
 * the racket and casts a shadow, and the rules of the game: the serve bounces on your side, then
 * theirs; a return must clear the net and land on the other side; first to 11, two clear, the serve
 * changes every two points (every point from 10-all). You move your racket with your finger; it
 * meets the ball when the ball comes to it, and where on the racket it meets, and how your finger
 * moves, send it left, right, short or long.
 */
@SuppressLint("ViewConstructor")
class PongView(context: Context, private var player: String, private var level: Int, private var soundOn: Boolean) : View(context) {
    private val density = resources.displayMetrics.density

    // ---------------------------------------------------------------- the world, in metres
    // x across the table (0 in the middle), y along it (0 at your end), z up from the table top

    private class Ball {
        var x = 0f; var y = 0f; var z = 0f
        var vx = 0f; var vy = 0f; var vz = 0f
        /** Sidespin left from the racket: it curves the ball a little in the air. */
        var curve = 0f
        fun set(o: Ball) { x = o.x; y = o.y; z = o.z; vx = o.vx; vy = o.vy; vz = o.vz; curve = o.curve }
    }

    private enum class Side { ME, CPU }
    private enum class State { TITLE, SERVE, PLAY, POINT, OVER }

    private val ball = Ball()
    private val ghost = Ball()  // for working out where the ball will be

    private var state = State.TITLE
    private var server = Side.ME
    private var hitter = Side.ME
    private var isServe = false
    private var serveBouncedOwn = false
    private var bouncedReceiver = false
    private var myScore = 0
    private var cpuScore = 0
    private var myGames = 0
    private var cpuGames = 0
    private var message = ""
    private var messageUntil = 0f
    private var clock = 0f
    private var pointAt = 0f
    private var cpuServeAt = 0f

    // your racket: where it is and where your finger wants it
    private var myX = 0f
    private var myY = -0.25f
    private var myZ = 0.2f
    private var wantX = 0f
    private var wantY = -0.25f
    private var fingerVx = 0f
    private var fingerVy = 0f
    private var lastTouchX = 0f
    private var lastTouchY = 0f
    private var lastTouchT = 0L
    private var myTilt = 0f

    // the other racket
    private var cpuX = 0f
    private var cpuZ = 0.2f
    private var cpuAim = 0f
    private var cpuReactAt = 0f
    private var cpuTilt = 0f

    private var running = false
    private var last = 0L

    // ---------------------------------------------------------------- the camera

    private var w = 0f
    private var h = 0f
    private var focal = 0f
    private var cx0 = 0f
    private var cy0 = 0f
    // camera at (0, -CAM_BACK, CAM_UP), looking at (0, LOOK_Y, 0)
    private val fy: Float
    private val fz: Float

    init {
        val dy = LOOK_Y + CAM_BACK
        val dz = -CAM_UP
        val n = sqrt(dy * dy + dz * dz)
        fy = dy / n
        fz = dz / n
        contentDescription = "Table tennis table"
    }

    private var px = 0f
    private var py = 0f
    private var pdepth = 1f

    /** Projects a point of the world into [px], [py] (pixels) and [pdepth] (metres from the camera). */
    private fun project(x: Float, y: Float, z: Float) {
        val dy = y + CAM_BACK
        val dz = z - CAM_UP
        // up = (0, -fz, fy), forward = (0, fy, fz), right = (1, 0, 0)
        val up = -dy * fz + dz * fy
        val fwd = max(0.05f, dy * fy + dz * fz)
        px = cx0 + focal * x / fwd
        py = cy0 - focal * up / fwd
        pdepth = fwd
    }

    /** The x in metres that puts something at screen x [sx] at depth [y], height [z]. */
    private fun unprojectX(sx: Float, y: Float, z: Float): Float {
        val fwd = max(0.05f, (y + CAM_BACK) * fy + (z - CAM_UP) * fz)
        return (sx - cx0) * fwd / focal
    }

    // ---------------------------------------------------------------- drawing things, made once

    private val fill = Paint(Paint.ANTI_ALIAS_FLAG)
    private val line = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE }
    private val path = Path()
    private val oval = RectF()
    private val label = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        typeface = Typeface.create("sans-serif-condensed", Typeface.BOLD)
    }
    private val digits = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        typeface = Typeface.create("sans-serif-condensed", Typeface.BOLD)
        textAlign = Paint.Align.CENTER
        fontFeatureSettings = "tnum"
    }
    private val title = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        typeface = Typeface.create("sans-serif-black", Typeface.NORMAL)
        textAlign = Paint.Align.CENTER
        letterSpacing = 0.04f
    }
    private val body = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
        textAlign = Paint.Align.CENTER
    }
    private var floorShader: Shader? = null
    private var lightShader: Shader? = null
    private var tableShader: Shader? = null
    private var standsShader: Shader? = null
    private var floorTop = 0f
    private var boardsTop = 0f

    private val sounds = Sounds(context)

    fun configure(name: String, lvl: Int, sound: Boolean) {
        player = name
        level = lvl.coerceIn(0, 2)
        soundOn = sound
        invalidate()
    }

    fun resume() {
        if (running) return
        running = true
        last = 0L
        postOnAnimation(frame)
    }

    fun pause() {
        running = false
        removeCallbacks(frame)
    }

    fun release() {
        pause()
        sounds.release()
    }

    private val frame = object : Runnable {
        override fun run() {
            if (!running) return
            val now = System.nanoTime()
            val dt = if (last == 0L) 1f / 60f else min((now - last) / 1e9f, 1f / 20f)
            last = now
            step(dt)
            invalidate()
            postOnAnimation(this)
        }
    }

    override fun onSizeChanged(nw: Int, nh: Int, ow: Int, oh: Int) {
        w = nw.toFloat()
        h = nh.toFloat()
        // the near edge of the table spans 92% of the width
        cx0 = w / 2
        cy0 = 0f
        focal = 1f
        project(HALF_W, 0f, 0f)
        val nearX = px - cx0
        focal = (w * 0.46f) / nearX
        // then the near edge sits at 70% of the height, or a little higher on short screens
        project(0f, 0f, 0f)
        val nearY = py
        cy0 = h * min(0.70f, 0.5f + w * 0.42f / h) - nearY
        project(0f, TABLE_L + 3f, -TABLE_H)
        floorTop = py
        boardsTop = py - 0.75f * focal / pdepth
        floorShader = LinearGradient(0f, floorTop, 0f, h, 0xFF3A1A1C.toInt(), 0xFF6B2A2C.toInt(), Shader.TileMode.CLAMP)
        standsShader = LinearGradient(0f, 0f, 0f, boardsTop, 0xFF07080B.toInt(), 0xFF15171D.toInt(), Shader.TileMode.CLAMP)
        project(0f, TABLE_L / 2, 0f)
        lightShader = RadialGradient(px, py, w * 0.95f, intArrayOf(0x30FFF4E0, 0x10FFF4E0, 0x00000000), floatArrayOf(0f, 0.5f, 1f), Shader.TileMode.CLAMP)
        project(0f, 0f, 0f)
        val nearTop = py
        project(0f, TABLE_L, 0f)
        tableShader = LinearGradient(0f, py, 0f, nearTop, 0xFF163E78.toInt(), 0xFF1D5297.toInt(), Shader.TileMode.CLAMP)
        if (state == State.TITLE || state == State.SERVE) placeForServe()
    }

    // ---------------------------------------------------------------- the rules

    private fun newGame() {
        myScore = 0
        cpuScore = 0
        server = if ((myGames + cpuGames) % 2 == 0) Side.ME else Side.CPU
        prepareServe()
    }

    private fun prepareServe() {
        state = State.SERVE
        isServe = false
        bouncedReceiver = false
        serveBouncedOwn = false
        placeForServe()
        if (server == Side.CPU) cpuServeAt = clock + 1.1f
        show(if (server == Side.ME) "Your serve" else "", 1.2f)
    }

    /** The ball waits in the server's hand, above their end of the table. */
    private fun placeForServe() {
        ball.vx = 0f; ball.vy = 0f; ball.vz = 0f; ball.curve = 0f
        // tossed from the free hand, beside the racket rather than behind it
        if (server == Side.ME) {
            ball.x = (myX - 0.14f).coerceIn(-0.6f, 0.6f)
            ball.y = -0.12f
        } else {
            ball.x = (cpuX + 0.14f).coerceIn(-0.6f, 0.6f)
            ball.y = TABLE_L + 0.12f
        }
        ball.z = 0.3f
    }

    private fun pointTo(side: Side, why: String) {
        if (state != State.PLAY) return
        if (side == Side.ME) myScore++ else cpuScore++
        state = State.POINT
        pointAt = clock
        performHapticFeedback(if (side == Side.ME) HapticFeedbackConstants.CONFIRM else HapticFeedbackConstants.REJECT)
        val done = (myScore >= 11 || cpuScore >= 11) && abs(myScore - cpuScore) >= 2
        if (done) {
            if (myScore > cpuScore) myGames++ else cpuGames++
            state = State.OVER
            show("", 0f)
            return
        }
        // the serve changes every two points, and every point from 10-all
        val total = myScore + cpuScore
        val swap = if (myScore >= 10 && cpuScore >= 10) true else total % 2 == 0
        if (swap) server = if (server == Side.ME) Side.CPU else Side.ME
        val pts = if (side == Side.ME) "Point $player" else "Point Computer"
        show("$why · $pts", 1.3f)
    }

    private fun show(text: String, seconds: Float) {
        message = text
        messageUntil = clock + seconds
    }

    private fun onBounce(onMySide: Boolean) {
        val side = if (onMySide) Side.ME else Side.CPU
        if (state == State.PLAY) sounds.play(Sounds.TABLE, soundOn, ball.y)
        if (isServe) {
            if (!serveBouncedOwn) {
                if (side == hitter) serveBouncedOwn = true else pointTo(other(hitter), "Fault")
            } else if (side != hitter) {
                isServe = false
                bouncedReceiver = true
            } else {
                pointTo(other(hitter), "Fault")
            }
            return
        }
        if (!bouncedReceiver) {
            if (side != hitter) bouncedReceiver = true else pointTo(other(hitter), "Own side")
        } else {
            // a second bounce: the receiver did not get to it
            pointTo(hitter, if (hitter == Side.ME) "Winner" else "Too slow")
        }
    }

    /** The ball fell to the floor or flew away. */
    private fun onDead() {
        if (bouncedReceiver) pointTo(hitter, "Unreturned") else pointTo(other(hitter), "Out")
    }

    private fun other(s: Side) = if (s == Side.ME) Side.CPU else Side.ME

    // ---------------------------------------------------------------- physics

    /** Moves [b] on by [dt]: gravity, a little drag, sidespin; table, net and floor. Returns what it touched. */
    private fun physics(b: Ball, dt: Float): Int {
        val drag = 1f - DRAG * dt
        b.vx = b.vx * drag + b.curve * dt
        b.vy *= drag
        b.vz = b.vz * drag - G * dt
        val oy = b.y
        b.x += b.vx * dt
        b.y += b.vy * dt
        b.z += b.vz * dt
        // the net: crossing it below its top stops the ball
        if ((oy - NET_Y) * (b.y - NET_Y) < 0f && abs(b.x) < HALF_W + NET_OUT && b.z < NET_H + R) {
            b.y = NET_Y - 0.02f * kotlin.math.sign(b.vy)
            b.vy = -b.vy * 0.15f
            b.vx *= 0.3f
            b.vz = min(b.vz, 0.4f)
            return HIT_NET
        }
        if (b.z <= 0f && b.vz < 0f && abs(b.x) <= HALF_W && b.y in 0f..TABLE_L) {
            b.z = 0f
            b.vz = -b.vz * BOUNCE
            b.vx *= 0.96f
            b.vy *= 0.96f
            b.curve *= 0.5f
            return HIT_TABLE
        }
        if (b.z < -TABLE_H || b.y < -3.5f || b.y > TABLE_L + 3.5f || abs(b.x) > 3f) return HIT_DEAD
        return 0
    }

    /**
     * The launch that takes the ball from where it is to land at ([tx], [ty]) on the table in about
     * [t] seconds, high enough to clear the net with [clearance] to spare.
     */
    private fun aim(b: Ball, tx: Float, ty: Float, t0: Float, clearance: Float) {
        var t = t0
        repeat(24) {
            b.vx = (tx - b.x) / t
            b.vy = (ty - b.y) / t
            b.vz = (0f - b.z + 0.5f * G * t * t) / t
            val tn = (NET_Y - b.y) / b.vy
            if (tn <= 0f || tn >= t) return
            val zn = b.z + b.vz * tn - 0.5f * G * tn * tn
            if (zn > NET_H + R + clearance) return
            t += 0.05f
        }
    }

    /**
     * A legal serve from where the ball is: it bounces once on the server's half, then lands near
     * ([tx], [ty]) on the other half. Tried over a range of first bounces and flight times.
     */
    private fun serveTo(b: Ball, tx: Float, ty: Float, mine: Boolean) {
        var best = Float.MAX_VALUE
        var bvx = 0f; var bvy = 0f; var bvz = 0f
        val ownNear = if (mine) 0.25f else TABLE_L - 0.25f
        val ownFar = if (mine) 0.85f else TABLE_L - 0.85f
        for (i in 0..12) {
            val y1 = ownNear + (ownFar - ownNear) * i / 12f
            val x1 = b.x + (tx - b.x) * 0.35f
            var t1 = 0.16f
            while (t1 < 0.6f) {
                ghost.set(b)
                ghost.vx = (x1 - b.x) / t1
                ghost.vy = (y1 - b.y) / t1
                ghost.vz = (0f - b.z + 0.5f * G * t1 * t1) / t1
                val vx0 = ghost.vx; val vy0 = ghost.vy; val vz0 = ghost.vz
                // follow it to its second bounce
                var bounces = 0
                var net = false
                var steps = 0
                while (steps < 800) {
                    steps++
                    val r = physics(ghost, 1f / 240f)
                    if (r == HIT_NET) { net = true; break }
                    if (r == HIT_DEAD) break
                    if (r == HIT_TABLE) {
                        bounces++
                        if (bounces == 2) break
                    }
                }
                if (!net && bounces == 2) {
                    val okSide = if (mine) ghost.y > NET_Y + 0.1f else ghost.y < NET_Y - 0.1f
                    if (okSide) {
                        val d = (ghost.x - tx) * (ghost.x - tx) + (ghost.y - ty) * (ghost.y - ty)
                        if (d < best) {
                            best = d
                            bvx = vx0; bvy = vy0; bvz = vz0
                        }
                    }
                }
                t1 += 0.03f
            }
        }
        b.vx = bvx; b.vy = bvy; b.vz = bvz
    }

    private fun serveMine() {
        // aim where your finger is across, deep on their side
        val tx = (wantX * 0.9f).coerceIn(-0.6f, 0.6f)
        serveTo(ball, tx, TABLE_L - 0.45f, true)
        startRally(Side.ME, serve = true)
        sounds.play(Sounds.RACKET, soundOn, ball.y)
        performHapticFeedback(HapticFeedbackConstants.CLOCK_TICK)
    }

    private fun serveCpu() {
        val tx = (Random.nextFloat() - 0.5f) * 1.1f
        serveTo(ball, tx, 0.3f + Random.nextFloat() * 0.4f, false)
        startRally(Side.CPU, serve = true)
        sounds.play(Sounds.RACKET, soundOn, ball.y)
    }

    private fun startRally(by: Side, serve: Boolean) {
        hitter = by
        isServe = serve
        serveBouncedOwn = false
        bouncedReceiver = false
        state = State.PLAY
        message = ""
        cpuReactAt = clock + REACT[level]
    }

    /** Your racket meets the ball. */
    private fun hitMine() {
        val reach = REACH
        val off = ((ball.x - myX) / reach).coerceIn(-1f, 1f)
        // how fast your finger was going forward (up the screen) sets how hard; sideways adds spin
        val power = (fingerVy / 3.2f).coerceIn(0f, 1f)
        val tx = (ball.x + off * 0.55f + fingerVx * 0.08f).coerceIn(-0.95f, 0.95f)
        val ty = (TABLE_L - 0.95f + 0.6f * power).coerceIn(NET_Y + 0.25f, TABLE_L + 0.1f)
        // a ball met far from the middle of the racket, or very high, goes astray
        val miss = abs(off) * 0.55f + max(0f, ball.z - 0.45f) * 0.8f
        val ex = (Random.nextFloat() - 0.5f) * miss * 0.9f
        val ey = (Random.nextFloat() - 0.5f) * miss * 1.1f
        aim(ball, tx + ex, ty + ey, 0.62f - 0.22f * power, 0.03f + 0.06f * (1f - power))
        ball.curve = (-fingerVx * 0.35f).coerceIn(-1.2f, 1.2f)
        hitter = Side.ME
        bouncedReceiver = false
        cpuReactAt = clock + REACT[level]
        myTilt = off * 18f
        sounds.play(Sounds.RACKET, soundOn, ball.y)
        performHapticFeedback(HapticFeedbackConstants.CLOCK_TICK)
    }

    /** The computer's racket meets the ball. */
    private fun hitCpu() {
        val err = ERROR[level]
        // now and then it simply misjudges one: long, wide or into the net
        val blunder = Random.nextFloat() < err
        // it aims away from where your racket is, more so at the higher levels
        val away = if (myX > 0) -1f else 1f
        val side = (Random.nextFloat() - 0.5f) * 1.1f + away * 0.25f * level
        var tx = side.coerceIn(-0.65f, 0.65f)
        var ty = 0.25f + Random.nextFloat() * (0.55f + 0.15f * level)
        var t = FLIGHT[level] + Random.nextFloat() * 0.15f
        var clear = 0.03f + Random.nextFloat() * 0.08f
        if (blunder) {
            when (Random.nextInt(3)) {
                0 -> ty = -0.15f - Random.nextFloat() * 0.3f          // long
                1 -> tx = if (Random.nextBoolean()) 0.95f else -0.95f // wide
                else -> { clear = -0.06f; t *= 0.85f }               // net
            }
        }
        aim(ball, tx, ty, t, clear)
        ball.curve = (Random.nextFloat() - 0.5f) * 0.6f
        hitter = Side.CPU
        bouncedReceiver = false
        cpuTilt = ((ball.x - cpuX) / REACH).coerceIn(-1f, 1f) * 18f
        sounds.play(Sounds.RACKET, soundOn, ball.y)
    }

    private fun step(dt: Float) {
        clock += dt
        // your racket follows your finger closely
        val k = min(1f, dt * 22f)
        myX += (wantX - myX) * k
        myY += (wantY - myY) * k
        myTilt *= exp(-dt * 6f)
        cpuTilt *= exp(-dt * 6f)
        myZ += ((if (state == State.PLAY) ball.z.coerceIn(0.05f, 0.5f) else 0.16f) - myZ) * min(1f, dt * 10f)
        cpuZ += ((if (state == State.PLAY) ball.z.coerceIn(0.05f, 0.5f) else 0.16f) - cpuZ) * min(1f, dt * 10f)
        moveCpu(dt)

        when (state) {
            State.TITLE -> { placeForServe(); return }
            State.SERVE -> {
                placeForServe()
                if (server == Side.CPU && clock >= cpuServeAt) serveCpu()
                return
            }
            State.POINT -> {
                // the ball carries on falling while the point is told
                physics(ball, dt * TIME)
                if (clock - pointAt > 1.4f) prepareServe()
                return
            }
            State.OVER -> { physics(ball, dt * TIME); return }
            State.PLAY -> Unit
        }

        // small steps, so a fast ball never jumps through the net or a racket
        var left = dt * TIME
        while (left > 0f && state == State.PLAY) {
            val sub = min(left, 1f / 360f)
            left -= sub
            when (physics(ball, sub)) {
                HIT_TABLE -> onBounce(ball.y < NET_Y)
                HIT_NET -> {
                    sounds.play(Sounds.NET, soundOn, ball.y)
                    // a ball stopped by the net never reaches the other side: the hitter's point is lost
                    pointTo(other(hitter), "Net")
                }
                HIT_DEAD -> onDead()
            }
            if (state != State.PLAY) break
            // your return: the ball has bounced on your side and comes to the racket
            if (hitter == Side.CPU && bouncedReceiver && ball.vy < 0.5f &&
                abs(ball.y - myY) < 0.14f && abs(ball.x - myX) < REACH && ball.z in -0.12f..0.62f
            ) hitMine()
            // theirs
            if (hitter == Side.ME && bouncedReceiver && ball.vy > -0.5f &&
                ball.y > TABLE_L + 0.06f && abs(ball.x - cpuX) < REACH * CPU_REACH[level] && ball.z in -0.15f..0.7f
            ) hitCpu()
        }
    }

    /** The computer watches the ball and moves to where it will be, at the speed its level allows. */
    private fun moveCpu(dt: Float) {
        if (state == State.PLAY && hitter == Side.ME && clock >= cpuReactAt) {
            // where the ball will cross its end, followed through the bounce
            ghost.set(ball)
            var n = 0
            while (n < 900 && ghost.y < TABLE_L + 0.25f) {
                if (physics(ghost, 1f / 240f) == HIT_DEAD) break
                n++
            }
            cpuAim = ghost.x
        } else if (state != State.PLAY || hitter == Side.CPU) {
            cpuAim = cpuAim * 0.98f
        }
        val maxMove = SPEED[level] * dt
        cpuX += (cpuAim - cpuX).coerceIn(-maxMove, maxMove)
    }

    // ---------------------------------------------------------------- touch

    @SuppressLint("ClickableViewAccessibility")
    override fun onTouchEvent(e: MotionEvent): Boolean {
        val t = e.eventTime
        when (e.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                lastTouchX = e.x; lastTouchY = e.y; lastTouchT = t
                fingerVx = 0f; fingerVy = 0f
                follow(e.x, e.y)
                when (state) {
                    State.TITLE -> { newGame(); }
                    State.OVER -> { newGame() }
                    State.SERVE -> if (server == Side.ME) serveMine()
                    else -> Unit
                }
            }
            MotionEvent.ACTION_MOVE -> {
                val dtS = max(1L, t - lastTouchT) / 1000f
                // finger speed in metres a second at your end of the table, smoothed
                val mPerPx = 1f / max(1f, focal / (CAM_BACK + 0.2f))
                val vx = (e.x - lastTouchX) * mPerPx / dtS
                val vy = -(e.y - lastTouchY) * mPerPx / dtS
                fingerVx += (vx - fingerVx) * 0.5f
                fingerVy += (vy - fingerVy) * 0.5f
                lastTouchX = e.x; lastTouchY = e.y; lastTouchT = t
                follow(e.x, e.y)
            }
            MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                fingerVx *= 0.3f
                fingerVy *= 0.3f
            }
        }
        return true
    }

    /** The racket goes where the finger is: across from its x, nearer the table as it goes up. */
    private fun follow(sx: Float, sy: Float) {
        project(0f, 0f, 0f)
        val nearEdge = py
        val frac = ((sy - nearEdge) / max(1f, h - nearEdge)).coerceIn(0f, 1f)
        wantY = 0.05f - 0.55f * frac
        wantX = unprojectX(sx, wantY, 0.2f).coerceIn(-HALF_W - 0.45f, HALF_W + 0.45f)
    }

    // ---------------------------------------------------------------- drawing

    override fun onDraw(c: Canvas) {
        if (w == 0f) return
        drawArena(c)
        drawTable(c)
        // far half: the computer's racket and a ball beyond the net go behind the net
        val ballFar = ball.y > NET_Y
        drawShadow(c)
        if (ballFar) drawBall(c)
        drawRacket(c, cpuX, TABLE_L + 0.26f, cpuZ, cpuTilt, mine = false)
        drawNet(c)
        if (!ballFar) drawBall(c)
        drawRacket(c, myX, myY, myZ, myTilt, mine = true)
        if (state != State.TITLE) drawScoreboard(c)
        drawWords(c)
    }

    private fun drawArena(c: Canvas) {
        // the stands, dark; advertising boards; the red sports floor
        fill.shader = standsShader
        c.drawRect(0f, 0f, w, boardsTop, fill)
        fill.shader = null
        // three boards side by side, a word on each, sized to fit its board
        val boardW = w / BOARDS.size
        val boardH = floorTop - boardsTop
        BOARDS.forEachIndexed { i, word ->
            fill.color = if (i % 2 == 0) 0xFF14233F.toInt() else 0xFF182B4A.toInt()
            c.drawRect(i * boardW, boardsTop, (i + 1) * boardW, floorTop, fill)
            body.textSize = boardH * 0.36f
            val tw = body.measureText(word)
            if (tw > boardW * 0.8f) body.textSize *= boardW * 0.8f / tw
            body.color = 0x59FFFFFF
            c.drawText(word, (i + 0.5f) * boardW, boardsTop + boardH / 2 + body.textSize * 0.36f, body)
        }
        fill.color = 0x33FFFFFF
        c.drawRect(0f, boardsTop, w, boardsTop + density, fill)
        for (i in 1 until BOARDS.size) c.drawRect(i * boardW - density / 2, boardsTop, i * boardW + density / 2, floorTop, fill)
        fill.shader = floorShader
        c.drawRect(0f, floorTop, w, h, fill)
        fill.shader = lightShader
        c.drawRect(0f, 0f, w, h, fill)
        fill.shader = null
    }

    private fun quad(x0: Float, y0: Float, z0: Float, x1: Float, y1: Float, z1: Float, x2: Float, y2: Float, z2: Float, x3: Float, y3: Float, z3: Float) {
        path.reset()
        project(x0, y0, z0); path.moveTo(px, py)
        project(x1, y1, z1); path.lineTo(px, py)
        project(x2, y2, z2); path.lineTo(px, py)
        project(x3, y3, z3); path.lineTo(px, py)
        path.close()
    }

    private fun drawTable(c: Canvas) {
        // its shadow on the floor, then the legs, then the top and its front edge
        fill.color = 0x66000000
        quad(-HALF_W - 0.05f, -0.1f, -TABLE_H, HALF_W + 0.05f, -0.1f, -TABLE_H, HALF_W + 0.1f, TABLE_L + 0.1f, -TABLE_H, -HALF_W - 0.1f, TABLE_L + 0.1f, -TABLE_H)
        c.drawPath(path, fill)
        fill.color = 0xFF16181C.toInt()
        for (lx in floatArrayOf(-HALF_W + 0.15f, HALF_W - 0.2f)) {
            for (ly in floatArrayOf(0.35f, TABLE_L - 0.4f)) {
                quad(lx, ly, -0.02f, lx + 0.05f, ly, -0.02f, lx + 0.05f, ly, -TABLE_H, lx, ly, -TABLE_H)
                c.drawPath(path, fill)
            }
        }
        // the front edge (2.5 cm thick)
        fill.color = 0xFF0F2C57.toInt()
        quad(-HALF_W, 0f, 0f, HALF_W, 0f, 0f, HALF_W, 0f, -0.03f, -HALF_W, 0f, -0.03f)
        c.drawPath(path, fill)
        // the top
        fill.shader = tableShader
        quad(-HALF_W, 0f, 0f, HALF_W, 0f, 0f, HALF_W, TABLE_L, 0f, -HALF_W, TABLE_L, 0f)
        c.drawPath(path, fill)
        fill.shader = null
        // white lines: 2 cm round the edge, 3 mm down the middle
        fill.color = 0xFFF2F2EE.toInt()
        val e = 0.02f
        quad(-HALF_W, 0f, 0f, HALF_W, 0f, 0f, HALF_W, e, 0f, -HALF_W, e, 0f); c.drawPath(path, fill)
        quad(-HALF_W, TABLE_L - e, 0f, HALF_W, TABLE_L - e, 0f, HALF_W, TABLE_L, 0f, -HALF_W, TABLE_L, 0f); c.drawPath(path, fill)
        quad(-HALF_W, 0f, 0f, -HALF_W + e, 0f, 0f, -HALF_W + e, TABLE_L, 0f, -HALF_W, TABLE_L, 0f); c.drawPath(path, fill)
        quad(HALF_W - e, 0f, 0f, HALF_W, 0f, 0f, HALF_W, TABLE_L, 0f, HALF_W - e, TABLE_L, 0f); c.drawPath(path, fill)
        quad(-0.0035f, 0f, 0f, 0.0035f, 0f, 0f, 0.0035f, TABLE_L, 0f, -0.0035f, TABLE_L, 0f); c.drawPath(path, fill)
    }

    private fun drawNet(c: Canvas) {
        val xo = HALF_W + NET_OUT
        // posts and clamps
        fill.color = 0xFF2A2D33.toInt()
        for (s in floatArrayOf(-1f, 1f)) {
            quad(s * xo - 0.012f, NET_Y, NET_H + 0.01f, s * xo + 0.012f, NET_Y, NET_H + 0.01f, s * xo + 0.012f, NET_Y, -0.03f, s * xo - 0.012f, NET_Y, -0.03f)
            c.drawPath(path, fill)
        }
        // the mesh: dark and see-through, with fine threads
        fill.color = 0x8C0C1016.toInt()
        quad(-xo, NET_Y, NET_H, xo, NET_Y, NET_H, xo, NET_Y, 0f, -xo, NET_Y, 0f)
        c.drawPath(path, fill)
        line.color = 0x2EFFFFFF
        line.strokeWidth = max(1f, density * 0.5f)
        var x = -xo
        while (x <= xo) {
            project(x, NET_Y, NET_H); val ax = px; val ay = py
            project(x, NET_Y, 0f)
            c.drawLine(ax, ay, px, py, line)
            x += 0.045f
        }
        var z = 0.03f
        while (z < NET_H) {
            project(-xo, NET_Y, z); val ax = px; val ay = py
            project(xo, NET_Y, z)
            c.drawLine(ax, ay, px, py, line)
            z += 0.03f
        }
        // the white band along the top
        fill.color = 0xFFF5F5F2.toInt()
        quad(-xo, NET_Y, NET_H + 0.004f, xo, NET_Y, NET_H + 0.004f, xo, NET_Y, NET_H - 0.014f, -xo, NET_Y, NET_H - 0.014f)
        c.drawPath(path, fill)
    }

    private fun drawShadow(c: Canvas) {
        if (state == State.TITLE) return
        val onTable = abs(ball.x) <= HALF_W && ball.y in 0f..TABLE_L && ball.z >= -0.01f
        val sz = if (onTable) 0f else -TABLE_H
        val height = ball.z - sz
        project(ball.x, ball.y, sz)
        val r = R * 1.6f * focal / pdepth
        val a = (0.45f / (1f + height * 3f)).coerceIn(0.05f, 0.45f)
        fill.color = Color.argb((a * 255).toInt(), 0, 0, 0)
        oval.set(px - r * 1.3f, py - r * 0.55f, px + r * 1.3f, py + r * 0.55f)
        c.drawOval(oval, fill)
    }

    // the ball's shading, made once at unit size and moved and scaled onto the ball each frame
    private val ballShader = RadialGradient(-0.35f, -0.4f, 1.4f,
        intArrayOf(0xFFFFFFFF.toInt(), 0xFFF1EEE6.toInt(), 0xFFB9B4A8.toInt()), floatArrayOf(0f, 0.55f, 1f), Shader.TileMode.CLAMP)
    private val ballMatrix = android.graphics.Matrix()

    private fun drawBall(c: Canvas) {
        project(ball.x, ball.y, ball.z + R)
        val r = R * 1.6f * focal / pdepth
        ballMatrix.setScale(r, r)
        ballMatrix.postTranslate(px, py)
        ballShader.setLocalMatrix(ballMatrix)
        fill.shader = ballShader
        c.drawCircle(px, py, r, fill)
        fill.shader = null
    }

    private fun drawRacket(c: Canvas, x: Float, y: Float, z: Float, tilt: Float, mine: Boolean) {
        project(x, y, z)
        val cxp = px
        val cyp = py
        val r = BLADE * focal / pdepth
        c.save()
        c.rotate(tilt + if (mine) 8f else -8f, cxp, cyp)
        // the handle: wood, flared, below the blade (towards the player holding it)
        val hw = r * 0.26f
        val hl = r * 1.05f
        val dir = if (mine) 1f else -1f
        fill.color = 0xFF9A6A3C.toInt()
        oval.set(cxp - hw, cyp + dir * r * 0.55f - (if (mine) 0f else hl), cxp + hw, cyp + dir * r * 0.55f + (if (mine) hl else 0f))
        c.drawRoundRect(oval, hw * 0.6f, hw * 0.6f, fill)
        fill.color = 0x33000000
        oval.inset(hw * 0.55f, 0f)
        c.drawRect(oval, fill)
        // the blade's wooden edge, then the rubber
        fill.color = 0xFFC9A273.toInt()
        oval.set(cxp - r, cyp - r * 1.06f, cxp + r, cyp + r * 1.06f)
        c.drawOval(oval, fill)
        fill.color = if (mine) 0xFFB3121F.toInt() else 0xFF1B1B1D.toInt()
        oval.inset(r * 0.06f, r * 0.06f)
        c.drawOval(oval, fill)
        // a soft sheen across the rubber
        fill.color = 0x14FFFFFF
        oval.set(cxp - r * 0.7f, cyp - r * 0.8f, cxp + r * 0.3f, cyp + r * 0.1f)
        c.drawOval(oval, fill)
        c.restore()
    }

    private fun drawScoreboard(c: Canvas) {
        val pad = 12 * density
        val rowH = 30 * density
        val left = 14 * density
        val top = 44 * density
        val nameW = 128 * density
        val cell = 34 * density
        val width = nameW + cell * 2
        fill.color = 0xE6101318.toInt()
        oval.set(left, top, left + width, top + rowH * 2)
        c.drawRoundRect(oval, 8 * density, 8 * density, fill)
        fill.color = 0xFF2B6CB0.toInt()
        oval.set(left + nameW + cell, top, left + width, top + rowH * 2)
        c.drawRoundRect(oval, 8 * density, 8 * density, fill)
        c.drawRect(left + nameW + cell, top, left + nameW + cell + 8 * density, top + rowH * 2, fill)
        line.color = 0x22FFFFFF
        line.strokeWidth = density
        c.drawLine(left, top + rowH, left + width, top + rowH, line)
        label.textSize = 14 * density
        digits.textSize = 17 * density
        // drawn every frame: nothing new is made here (no lists or strings for the collector)
        if (playerLabel.first != player) playerLabel = player to player.uppercase().take(12)
        for (i in 0..1) {
            val cpu = i == 0
            val base = top + rowH * i + rowH * 0.68f
            label.color = 0xFFEDEDED.toInt()
            c.drawText(if (cpu) "COMPUTER" else playerLabel.second, left + pad + 10 * density, base, label)
            if (server == (if (cpu) Side.CPU else Side.ME) && state != State.OVER && state != State.TITLE) {
                fill.color = 0xFFE8E26A.toInt()
                c.drawCircle(left + pad, top + rowH * i + rowH / 2, 3.5f * density, fill)
            }
            digits.color = 0x99FFFFFF.toInt()
            c.drawText(number(if (cpu) cpuGames else myGames), left + nameW + cell / 2, base, digits)
            digits.color = Color.WHITE
            c.drawText(number(if (cpu) cpuScore else myScore), left + nameW + cell * 1.5f, base, digits)
        }
    }

    private var playerLabel = "" to ""
    private val numbers = Array(100) { it.toString() }
    private fun number(n: Int) = if (n in 0..99) numbers[n] else n.toString()

    private fun drawWords(c: Canvas) {
        project(0f, NET_Y, 0.55f)
        val mid = py
        when (state) {
            State.TITLE -> {
                // in the dark above the boards, clear of the table and the other racket
                val ty = max(boardsTop * 0.55f, 96 * density)
                title.color = Color.WHITE
                title.textSize = 40 * density
                c.drawText("PING PONG", w / 2, ty, title)
                body.color = 0xCCFFFFFF.toInt()
                body.textSize = 15 * density
                c.drawText("Table tennis · first to 11", w / 2, ty + 30 * density, body)
                body.textSize = 14 * density
                c.drawText("Tap to start · drag to move your racket", w / 2, h - 36 * density, body)
            }
            State.OVER -> {
                title.color = Color.WHITE
                title.textSize = 30 * density
                val won = myScore > cpuScore
                c.drawText(if (won) "You win $myScore–$cpuScore" else "Computer wins $cpuScore–$myScore", w / 2, mid - 20 * density, title)
                body.color = 0xCCFFFFFF.toInt()
                body.textSize = 15 * density
                c.drawText("Games $myGames–$cpuGames · tap to play again", w / 2, mid + 12 * density, body)
            }
            else -> {
                if (state == State.SERVE && server == Side.ME) {
                    body.color = 0xB3FFFFFF.toInt()
                    body.textSize = 14 * density
                    c.drawText("Tap to serve", w / 2, h - 36 * density, body)
                }
                if (message.isNotEmpty() && clock < messageUntil) {
                    body.textSize = 15 * density
                    val tw = body.measureText(message)
                    fill.color = 0xCC101318.toInt()
                    oval.set(w / 2 - tw / 2 - 14 * density, mid - 20 * density, w / 2 + tw / 2 + 14 * density, mid + 10 * density)
                    c.drawRoundRect(oval, 15 * density, 15 * density, fill)
                    body.color = Color.WHITE
                    c.drawText(message, w / 2, mid, body)
                }
            }
        }
    }

    /**
     * The sounds of the game, made here (a celluloid-like tock for the racket, a brighter tick for
     * the table, a dull one for the net) and played through the media volume.
     */
    private class Sounds(context: Context) {
        private val pool = SoundPool.Builder().setMaxStreams(4)
            .setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_GAME)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build())
            .build()
        private val ids = IntArray(3)

        init {
            val dir = File(context.cacheDir, "game").apply { mkdirs() }
            ids[RACKET] = load(dir, "racket", 1150.0, 0.045, 0.55)
            ids[TABLE] = load(dir, "table", 2300.0, 0.028, 0.35)
            ids[NET] = load(dir, "net", 420.0, 0.06, 0.15)
        }

        private fun load(dir: File, name: String, freq: Double, seconds: Double, noise: Double): Int = runCatching {
            val f = File(dir, "$name-v1.wav")
            if (!f.isFile) f.writeBytes(wav(freq, seconds, noise))
            pool.load(f.path, 1)
        }.getOrDefault(0)

        /** A short knock: a damped tone with a little noise at its start, 16-bit mono WAV. */
        private fun wav(freq: Double, seconds: Double, noise: Double): ByteArray {
            val rate = 44100
            val n = (rate * seconds).toInt()
            val pcm = ByteBuffer.allocate(n * 2).order(ByteOrder.LITTLE_ENDIAN)
            val rnd = Random(7)
            for (i in 0 until n) {
                val t = i.toDouble() / rate
                val env = exp(-t / (seconds / 4.5))
                val attack = min(1.0, i / 40.0)
                val v = (sin(2 * PI * freq * t) * 0.7 + sin(2 * PI * freq * 1.62 * t) * 0.25 +
                    (rnd.nextDouble() * 2 - 1) * noise * exp(-t / 0.004)) * env * attack
                pcm.putShort((v.coerceIn(-1.0, 1.0) * 26000).toInt().toShort())
            }
            val data = pcm.array()
            val out = ByteBuffer.allocate(44 + data.size).order(ByteOrder.LITTLE_ENDIAN)
            out.put("RIFF".toByteArray()); out.putInt(36 + data.size); out.put("WAVE".toByteArray())
            out.put("fmt ".toByteArray()); out.putInt(16); out.putShort(1); out.putShort(1)
            out.putInt(rate); out.putInt(rate * 2); out.putShort(2); out.putShort(16)
            out.put("data".toByteArray()); out.putInt(data.size); out.put(data)
            return out.array()
        }

        /** Quieter as the ball is further away. */
        fun play(which: Int, on: Boolean, y: Float) {
            if (!on || ids[which] == 0) return
            val v = (1f - (y / (TABLE_L * 2.2f))).coerceIn(0.35f, 1f)
            pool.play(ids[which], v, v, 1, 0, 0.97f + Random.nextFloat() * 0.06f)
        }

        fun release() = pool.release()

        companion object {
            const val RACKET = 0
            const val TABLE = 1
            const val NET = 2
        }
    }

    companion object {
        const val ARENA = 0xFF07080B.toInt()

        // the table, in metres (ITTF)
        private const val TABLE_L = 2.74f
        private const val HALF_W = 0.7625f
        private const val TABLE_H = 0.76f
        private const val NET_Y = TABLE_L / 2
        private const val NET_H = 0.1525f
        private const val NET_OUT = 0.1525f
        private const val R = 0.02f
        private const val BLADE = 0.085f
        private const val REACH = 0.17f

        // the camera: behind your end, above the table
        private const val CAM_BACK = 1.25f
        private const val CAM_UP = 2.05f
        private const val LOOK_Y = 1.3f

        private const val G = 9.81f
        private const val DRAG = 0.12f
        private const val BOUNCE = 0.86f
        /** Game time against real time: a touch slower than life, so a phone can be played. */
        private const val TIME = 0.8f

        private const val HIT_TABLE = 1
        private const val HIT_NET = 2
        private const val HIT_DEAD = 3

        // the computer, by level (Club, League, Pro)
        private val REACT = floatArrayOf(0.22f, 0.14f, 0.08f)
        private val SPEED = floatArrayOf(1.5f, 2.2f, 3.1f)
        private val ERROR = floatArrayOf(0.14f, 0.08f, 0.035f)
        private val FLIGHT = floatArrayOf(0.95f, 0.8f, 0.66f)
        private val CPU_REACH = floatArrayOf(1.0f, 1.15f, 1.3f)

        private val BOARDS = listOf("TABLE TENNIS", "CHAMPIONSHIP", "TABLE TENNIS")
    }
}
