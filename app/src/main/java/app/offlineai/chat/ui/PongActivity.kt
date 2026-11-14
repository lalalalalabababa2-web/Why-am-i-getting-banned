package app.offlineai.chat.ui

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.graphics.BlurMaskFilter
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.Typeface
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
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sqrt
import kotlin.random.Random

/**
 * Ping Pong: a real game, and what the app shows from the launcher while it is hidden (Settings,
 * Privacy, Hide as a game). Its settings have a player name; the secret code typed there opens
 * the app instead.
 */
class PongActivity : AppCompatActivity() {
    private lateinit var app: App
    private lateinit var game: PongView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        app = App.of(this)
        Palette.apply(this, app.settings)
        val root = FrameLayout(this).apply { setBackgroundColor(0xFF07070D.toInt()) }
        game = PongView(this, app.settings.gamePlayer.ifBlank { "You" }, app.settings.gameLevel)
        root.addView(game, FrameLayout.LayoutParams(MATCH, MATCH))
        val gear = iconButton(R.drawable.ic_settings, "Game settings", 0xB3FFFFFF.toInt()) { showSettings() }
        root.addView(gear, FrameLayout.LayoutParams(dp(48), dp(48), Gravity.TOP or Gravity.END).apply {
            setMargins(0, dp(8), dp(8), 0)
        })
        setContentView(root)
        edgeToEdge(root)
    }

    override fun onResume() {
        super.onResume()
        game.resume()
    }

    override fun onPause() {
        super.onPause()
        game.pause()
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
        box.addView(text("Difficulty", 13f, Palette.text3, bold = true).apply { setPadding(0, dp(16), 0, dp(6)) })
        val levels = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        var level = app.settings.gameLevel
        val chips = LEVELS.mapIndexed { i, l ->
            pill(l, primary = i == level) {}.also { levels.addView(it, lp(0, WRAP, 1f).apply { marginEnd = if (i < 2) dp(8) else 0 }) }
        }
        chips.forEachIndexed { i, c ->
            c.setOnClickListener {
                level = i
                chips.forEachIndexed { k, o ->
                    o.background = ripple(
                        if (k == i) rounded(Palette.accent, dp(20).toFloat()) else rounded(Palette.surface2, dp(20).toFloat(), dp(1), Palette.border),
                        dp(20).toFloat(),
                    )
                    o.setTextColor(if (k == i) Palette.onAccent else Palette.text)
                }
            }
        }
        box.addView(levels, lp(MATCH, WRAP))
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
            game.configure(app.settings.gamePlayer.ifBlank { "You" }, level)
            game.resume()
        }
        sheet.setOnDismissListener { if (!isFinishing) game.resume() }
        sheet.show()
    }

    companion object {
        val LEVELS = listOf("Easy", "Normal", "Hard")
    }
}

/**
 * The table, the paddles and the ball. You play the bottom paddle with your finger; the top one
 * plays itself, a little slower and less exact on the easier levels. First to seven wins.
 */
@SuppressLint("ViewConstructor")
class PongView(context: Context, private var player: String, private var level: Int) : View(context) {
    private val density = resources.displayMetrics.density
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val glow = Paint(Paint.ANTI_ALIAS_FLAG)
    private val big = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        typeface = Typeface.create("sans-serif-black", Typeface.BOLD)
        textAlign = Paint.Align.CENTER
    }
    private val small = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
        textAlign = Paint.Align.CENTER
    }

    // the court, in pixels
    private var w = 0f
    private var h = 0f
    private var top = 0f
    private var bottom = 0f

    private var me = 0f        // paddle centres (x)
    private var cpu = 0f
    private var meTarget = 0f
    private var bx = 0f
    private var by = 0f
    private var vx = 0f
    private var vy = 0f
    private var myScore = 0
    private var cpuScore = 0
    private var serving = true
    private var serveDown = true
    private var winner: String? = null
    private var running = false
    private var last = 0L
    private var shake = 0f
    private val trail = ArrayDeque<Pair<Float, Float>>()
    private val sparks = mutableListOf<FloatArray>()  // x, y, vx, vy, life

    private val frame = object : Runnable {
        override fun run() {
            if (!running) return
            step()
            invalidate()
            postOnAnimation(this)
        }
    }

    fun configure(name: String, lvl: Int) {
        player = name
        level = lvl
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

    override fun onSizeChanged(nw: Int, nh: Int, ow: Int, oh: Int) {
        w = nw.toFloat()
        h = nh.toFloat()
        top = 96 * density
        bottom = h - 72 * density
        me = w / 2
        meTarget = me
        cpu = w / 2
        resetBall(true)
    }

    private val paddleW get() = w * 0.24f
    private val paddleH get() = 12 * density
    private val radius get() = 9 * density

    private fun resetBall(down: Boolean) {
        bx = w / 2
        by = (top + bottom) / 2
        vx = 0f
        vy = 0f
        serving = true
        serveDown = down
        trail.clear()
    }

    private fun serve() {
        val speed = h * (0.55f + 0.12f * level)
        vx = (Random.nextFloat() - 0.5f) * speed * 0.8f
        vy = if (serveDown) speed else -speed
        serving = false
    }

    private fun step() {
        val now = System.nanoTime()
        val dt = if (last == 0L) 1f / 60f else min((now - last) / 1e9f, 1f / 30f)
        last = now
        // your paddle follows the finger closely, with a little smoothing
        me += (meTarget - me) * min(1f, dt * 28f)
        // the other paddle chases the ball, at a top speed set by the level
        val aim = if (vy < 0) bx + vx * 0.06f else w / 2
        val maxMove = w * (0.9f + 0.55f * level) * dt
        cpu += (aim - cpu).coerceIn(-maxMove, maxMove)
        cpu = cpu.coerceIn(paddleW / 2, w - paddleW / 2)
        shake *= 0.86f
        sparks.removeAll { it[4] <= 0f }
        for (s in sparks) {
            s[0] += s[2] * dt
            s[1] += s[3] * dt
            s[4] -= dt * 1.8f
        }
        if (serving || winner != null) return

        // small steps, so a fast ball never jumps through a paddle
        var left = dt
        while (left > 0f) {
            val sub = min(left, 1f / 240f)
            left -= sub
            bx += vx * sub
            by += vy * sub
            if (bx < radius) { bx = radius; vx = abs(vx) }
            if (bx > w - radius) { bx = w - radius; vx = -abs(vx) }
            val meY = bottom - paddleH
            if (vy > 0 && by + radius >= meY && by < bottom && abs(bx - me) <= paddleW / 2 + radius) hit(me, meY - radius, -1f)
            val cpuY = top + paddleH
            if (vy < 0 && by - radius <= cpuY && by > top && abs(bx - cpu) <= paddleW / 2 + radius) hit(cpu, cpuY + radius, 1f)
            if (by > h + radius) { point(false); return }
            if (by < -radius) { point(true); return }
        }
        trail.addFirst(bx to by)
        while (trail.size > 14) trail.removeLast()
    }

    private fun hit(paddleX: Float, y: Float, dir: Float) {
        by = y
        // where it meets the paddle sets the angle; every hit is a little faster
        val off = ((bx - paddleX) / (paddleW / 2)).coerceIn(-1f, 1f)
        val speed = min(sqrt(vx * vx + vy * vy) * 1.045f, h * 2.2f)
        vx = off * speed * 0.75f
        vy = dir * sqrt(max(speed * speed - vx * vx, speed * speed * 0.3f))
        shake = 5 * density
        performHapticFeedback(HapticFeedbackConstants.CLOCK_TICK)
        repeat(10) {
            sparks.add(floatArrayOf(bx, by, (Random.nextFloat() - 0.5f) * 600 * density, dir * Random.nextFloat() * 400 * density, 1f))
        }
    }

    private fun point(mine: Boolean) {
        if (mine) myScore++ else cpuScore++
        performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
        if (myScore >= 7 || cpuScore >= 7) winner = if (myScore >= 7) player else "Computer"
        resetBall(!mine)
    }

    @SuppressLint("ClickableViewAccessibility")
    override fun onTouchEvent(e: MotionEvent): Boolean {
        when (e.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                if (winner != null) {
                    winner = null
                    myScore = 0
                    cpuScore = 0
                    resetBall(true)
                } else if (serving) {
                    serve()
                }
                meTarget = e.x.coerceIn(paddleW / 2, w - paddleW / 2)
            }
            MotionEvent.ACTION_MOVE -> meTarget = e.x.coerceIn(paddleW / 2, w - paddleW / 2)
        }
        return true
    }

    override fun onDraw(c: Canvas) {
        if (w == 0f) return
        c.save()
        if (shake > 0.5f) c.translate((Random.nextFloat() - 0.5f) * shake, (Random.nextFloat() - 0.5f) * shake)
        // the table: a deep gradient, a net, side lines
        paint.shader = LinearGradient(0f, 0f, 0f, h, 0xFF141233.toInt(), 0xFF07070D.toInt(), Shader.TileMode.CLAMP)
        c.drawRect(0f, 0f, w, h, paint)
        paint.shader = null
        paint.color = 0x22FFFFFF
        paint.strokeWidth = 2 * density
        val mid = (top + bottom) / 2
        var x = 0f
        while (x < w) {
            c.drawLine(x, mid, x + 14 * density, mid, paint)
            x += 26 * density
        }
        // scores, big and faint behind the play
        big.textSize = 120 * density
        big.color = 0x18FFFFFF
        c.drawText("$cpuScore", w / 2, mid - 36 * density, big)
        c.drawText("$myScore", w / 2, mid + 120 * density, big)
        small.textSize = 13 * density
        small.color = 0x80FFFFFF
        c.drawText("COMPUTER · ${PongActivity.LEVELS[level.coerceIn(0, 2)].uppercase()}", w / 2, top - 30 * density, small)
        c.drawText(player.uppercase(), w / 2, bottom + 40 * density, small)

        // paddles, glowing
        drawPaddle(c, cpu, top, 0xFFFF5C8A.toInt())
        drawPaddle(c, me, bottom - paddleH, 0xFF5CE1FF.toInt())

        // the ball and its trail
        trail.forEachIndexed { i, (tx, ty) ->
            paint.color = Color.argb((90 * (1f - i / 14f)).toInt(), 255, 255, 255)
            c.drawCircle(tx, ty, radius * (1f - i / 18f), paint)
        }
        glow.color = 0x66FFFFFF
        glow.maskFilter = BlurMaskFilter(radius * 1.6f, BlurMaskFilter.Blur.NORMAL)
        c.drawCircle(bx, by, radius * 1.4f, glow)
        paint.color = Color.WHITE
        c.drawCircle(bx, by, radius, paint)
        for (s in sparks) {
            paint.color = Color.argb((255 * s[4].coerceIn(0f, 1f)).toInt(), 255, 230, 160)
            c.drawCircle(s[0], s[1], 2.2f * density, paint)
        }
        c.restore()

        small.textSize = 15 * density
        small.color = 0xCCFFFFFF.toInt()
        when {
            winner != null -> {
                big.textSize = 40 * density
                big.color = Color.WHITE
                c.drawText(if (winner == player) "You win!" else "Computer wins", w / 2, mid - 8 * density, big)
                c.drawText("Tap to play again", w / 2, mid + 28 * density, small)
            }
            serving && myScore == 0 && cpuScore == 0 -> {
                big.textSize = 46 * density
                big.color = Color.WHITE
                c.drawText("PING PONG", w / 2, mid - 70 * density, big)
                c.drawText("Tap to serve · drag to move", w / 2, mid - 36 * density, small)
            }
            serving -> c.drawText("Tap to serve", w / 2, mid - 20 * density, small)
        }
    }

    private fun drawPaddle(c: Canvas, cx: Float, y: Float, color: Int) {
        val r = RectF(cx - paddleW / 2, y, cx + paddleW / 2, y + paddleH)
        glow.color = (color and 0x00FFFFFF) or 0x88000000.toInt()
        glow.maskFilter = BlurMaskFilter(14 * density, BlurMaskFilter.Blur.NORMAL)
        c.drawRoundRect(r, paddleH, paddleH, glow)
        paint.color = color
        c.drawRoundRect(r, paddleH / 2, paddleH / 2, paint)
    }

    init {
        contentDescription = "Ping pong table"
    }
}
