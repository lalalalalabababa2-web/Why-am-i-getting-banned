package app.offlineai.chat.ui

import android.app.Activity
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.res.ColorStateList
import android.content.res.Configuration
import android.graphics.Typeface
import android.graphics.drawable.ColorDrawable
import android.graphics.drawable.Drawable
import android.graphics.drawable.GradientDrawable
import android.graphics.drawable.RippleDrawable
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.ImageButton
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatDelegate
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsAnimationCompat
import androidx.core.view.WindowInsetsCompat
import app.offlineai.chat.R
import app.offlineai.chat.data.Accent
import app.offlineai.chat.data.Settings
import app.offlineai.chat.data.ThemeMode

/**
 * The interface colours. Charcoal by default (the same palette as Umbra's dark theme), with a
 * light variant; set once per screen from the theme and accent settings.
 */
object Palette {
    var dark = true
        private set
    var bg = 0
        private set
    var surface1 = 0
        private set
    var surface2 = 0
        private set
    var surface3 = 0
        private set
    var border = 0
        private set
    var borderStrong = 0
        private set
    var text = 0
        private set
    var text2 = 0
        private set
    var text3 = 0
        private set
    var accent = 0
        private set
    var onAccent = 0
        private set
    var positive = 0
        private set
    var caution = 0
        private set
    var danger = 0
        private set
    var ripple = 0
        private set
    var codeBg = 0
        private set
    var inlineCode = 0
        private set
    var fontScale = 1f
        private set

    // syntax colours
    var synKeyword = 0
        private set
    var synString = 0
        private set
    var synComment = 0
        private set
    var synNumber = 0
        private set

    init {
        set(true, Accent.SLATE, 1f)
    }

    /** [system]: the phone's own accent for dark and light, used for [Accent.SYSTEM]. */
    fun set(dark: Boolean, accent: Accent, fontScale: Float, system: Pair<Int, Int>? = null) {
        this.dark = dark
        this.fontScale = fontScale
        if (dark) {
            bg = 0xFF0E0F11.toInt(); surface1 = 0xFF17181B.toInt(); surface2 = 0xFF1F2124.toInt(); surface3 = 0xFF2A2C31.toInt()
            border = 0xFF26282C.toInt(); borderStrong = 0xFF3A3D43.toInt()
            text = 0xFFE6E7E9.toInt(); text2 = 0xFFA4A7AC.toInt(); text3 = 0xFF70747A.toInt()
            this.accent = system?.first ?: accent.dark; onAccent = 0xFF101418.toInt()
            positive = 0xFF7FB08A.toInt(); caution = 0xFFD4A24C.toInt(); danger = 0xFFD4706C.toInt()
            ripple = 0x1FFFFFFF; codeBg = 0xFF17181A.toInt(); inlineCode = 0xFFD9DCE0.toInt()
            synKeyword = 0xFFC792EA.toInt(); synString = 0xFFA5D6A7.toInt(); synComment = 0xFF6F7680.toInt(); synNumber = 0xFFF0B97A.toInt()
        } else {
            bg = 0xFFF1F2F4.toInt(); surface1 = 0xFFF9FAFB.toInt(); surface2 = 0xFFFFFFFF.toInt(); surface3 = 0xFFE6E8EB.toInt()
            border = 0xFFDDE0E4.toInt(); borderStrong = 0xFFC2C6CC.toInt()
            text = 0xFF1A1B1D.toInt(); text2 = 0xFF51555B.toInt(); text3 = 0xFF7D828A.toInt()
            this.accent = system?.second ?: accent.light; onAccent = 0xFFFFFFFF.toInt()
            positive = 0xFF2C7748.toInt(); caution = 0xFF8F6208.toInt(); danger = 0xFFB33F3A.toInt()
            ripple = 0x16000000; codeBg = 0xFFF6F7F8.toInt(); inlineCode = 0xFF2A2C30.toInt()
            synKeyword = 0xFF7B3FB8.toInt(); synString = 0xFF2E7D32.toInt(); synComment = 0xFF8A9099.toInt(); synNumber = 0xFFA4570F.toInt()
        }
    }

    /** Applies the theme settings to the app and returns whether this screen should be dark. */
    fun apply(context: Context, settings: Settings) {
        val mode = when (settings.theme) {
            ThemeMode.DARK -> AppCompatDelegate.MODE_NIGHT_YES
            ThemeMode.LIGHT -> AppCompatDelegate.MODE_NIGHT_NO
            ThemeMode.SYSTEM -> AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM
        }
        if (AppCompatDelegate.getDefaultNightMode() != mode) AppCompatDelegate.setDefaultNightMode(mode)
        val night = when (settings.theme) {
            ThemeMode.DARK -> true
            ThemeMode.LIGHT -> false
            ThemeMode.SYSTEM -> (context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) ==
                Configuration.UI_MODE_NIGHT_YES
        }
        // the wallpaper's accent: a light tone on dark, a deep one on light, as the system uses them
        val system = if (settings.accent == Accent.SYSTEM && android.os.Build.VERSION.SDK_INT >= 31) {
            runCatching {
                context.getColor(android.R.color.system_accent1_200) to context.getColor(android.R.color.system_accent1_600)
            }.getOrNull()
        } else {
            null
        }
        set(night, settings.accent, settings.fontScale, system)
    }
}

fun Context.dp(v: Int): Int = (v * resources.displayMetrics.density + 0.5f).toInt()
fun View.dp(v: Int): Int = context.dp(v)

fun rounded(color: Int, radiusPx: Float, strokePx: Int = 0, strokeColor: Int = 0): GradientDrawable =
    GradientDrawable().apply {
        setColor(color)
        cornerRadius = radiusPx
        if (strokePx > 0) setStroke(strokePx, strokeColor)
    }

fun ripple(content: Drawable?, radiusPx: Float): RippleDrawable =
    RippleDrawable(ColorStateList.valueOf(Palette.ripple), content, rounded(0xFFFFFFFF.toInt(), radiusPx))

/** A text view in the app's style. Sizes follow the font size setting. */
fun Context.text(
    s: CharSequence = "",
    sizeSp: Float = 15f,
    color: Int = Palette.text,
    bold: Boolean = false,
    mono: Boolean = false,
): TextView = TextView(this).apply {
    text = s
    setTextSize(TypedValue.COMPLEX_UNIT_SP, sizeSp * Palette.fontScale)
    setTextColor(color)
    typeface = when {
        mono -> Typeface.MONOSPACE
        bold -> Typeface.create("sans-serif-medium", Typeface.NORMAL)
        else -> Typeface.DEFAULT
    }
    setLineSpacing(0f, 1.15f)
}

fun Context.iconButton(icon: Int, description: String, tint: Int = Palette.text2, onClick: () -> Unit): ImageButton =
    ImageButton(this).apply {
        setImageDrawable(ContextCompat.getDrawable(context, icon)?.mutate()?.apply { setTint(tint) })
        background = ripple(null, dp(20).toFloat())
        contentDescription = description
        scaleType = android.widget.ImageView.ScaleType.CENTER
        layoutParams = LinearLayout.LayoutParams(dp(44), dp(44))
        setOnClickListener { onClick() }
        pressable(0.88f)
    }

/** A pill-shaped button. Primary ones are filled with the accent. */
fun Context.pill(label: String, primary: Boolean = false, danger: Boolean = false, onClick: () -> Unit): TextView =
    text(label, 14f, when {
        primary -> Palette.onAccent
        danger -> Palette.danger
        else -> Palette.text
    }, bold = true).apply {
        gravity = Gravity.CENTER
        val r = dp(20).toFloat()
        background = ripple(
            if (primary) rounded(Palette.accent, r) else rounded(Palette.surface2, r, dp(1), Palette.border), r,
        )
        setPadding(dp(18), dp(9), dp(18), dp(9))
        minHeight = dp(40)
        isClickable = true
        isFocusable = true
        setOnClickListener { onClick() }
        pressable()
    }

fun Context.divider(): View = View(this).apply {
    setBackgroundColor(Palette.border)
    layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 1)
}

/** Copies text, guarding against Android's limit on how much one clipboard entry can carry. */
fun Context.copyText(label: String, value: String) {
    val limit = 400_000
    try {
        val cm = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        cm.setPrimaryClip(ClipData.newPlainText(label, if (value.length > limit) value.substring(0, limit) else value))
        when {
            value.length > limit -> Toast.makeText(this, "Copied the first $limit characters (the clipboard holds no more)", Toast.LENGTH_LONG).show()
            // Android 13 and later show their own confirmation.
            android.os.Build.VERSION.SDK_INT < 33 -> Toast.makeText(this, "Copied", Toast.LENGTH_SHORT).show()
        }
    } catch (e: Exception) {
        Toast.makeText(this, "Could not copy: ${e.message}", Toast.LENGTH_LONG).show()
    }
}

fun lp(w: Int, h: Int, weight: Float = 0f): LinearLayout.LayoutParams = LinearLayout.LayoutParams(w, h, weight)
const val MATCH = ViewGroup.LayoutParams.MATCH_PARENT
const val WRAP = ViewGroup.LayoutParams.WRAP_CONTENT

/**
 * Draws behind the system bars (required from Android 15) and pads [root] by the bars, the
 * display cutout and the keyboard, so nothing sits under them.
 */
fun Activity.edgeToEdge(root: View) {
    WindowCompat.setDecorFitsSystemWindows(window, false)
    window.setBackgroundDrawable(ColorDrawable(Palette.bg))
    WindowCompat.getInsetsController(window, root).apply {
        isAppearanceLightStatusBars = !Palette.dark
        isAppearanceLightNavigationBars = !Palette.dark
    }
    // While the keyboard slides, the bottom edge of the screen follows it frame by frame, so the
    // message box rides up with the keyboard instead of jumping ahead of it. Only the bottom
    // moves: the top bar stays where it is.
    val all = WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout() or WindowInsetsCompat.Type.ime()
    var imeMoving = false
    ViewCompat.setOnApplyWindowInsetsListener(root) { v, insets ->
        val bars = insets.getInsets(all)
        // mid-slide the bottom is set by the animation below; the end state arrives first
        v.setPadding(bars.left, bars.top, bars.right, if (imeMoving) v.paddingBottom else bars.bottom)
        WindowInsetsCompat.CONSUMED
    }
    ViewCompat.setWindowInsetsAnimationCallback(root, object : WindowInsetsAnimationCompat.Callback(DISPATCH_MODE_STOP) {
        override fun onPrepare(animation: WindowInsetsAnimationCompat) {
            if ((animation.typeMask and WindowInsetsCompat.Type.ime()) != 0) imeMoving = true
        }

        override fun onProgress(insets: WindowInsetsCompat, running: MutableList<WindowInsetsAnimationCompat>): WindowInsetsCompat {
            if (imeMoving) {
                val bottom = insets.getInsets(all).bottom
                if (bottom != root.paddingBottom) root.setPadding(root.paddingLeft, root.paddingTop, root.paddingRight, bottom)
            }
            return insets
        }

        override fun onEnd(animation: WindowInsetsAnimationCompat) {
            if ((animation.typeMask and WindowInsetsCompat.Type.ime()) != 0) {
                imeMoving = false
                // settle exactly where the keyboard ended up
                ViewCompat.requestApplyInsets(root)
            }
        }
    })
}

/** A top bar with a back arrow and a title, for the secondary screens. */
fun Activity.topBar(title: String): LinearLayout = LinearLayout(this).apply {
    orientation = LinearLayout.HORIZONTAL
    gravity = Gravity.CENTER_VERTICAL
    setPadding(dp(4), dp(4), dp(12), dp(4))
    addView(iconButton(R.drawable.ic_back, "Back") { finish() })
    addView(text(title, 22f, bold = true).apply {
        setPadding(dp(4), 0, 0, 0)
        letterSpacing = -0.01f
        // one line whatever shares the bar with it (squeezed, it would wrap letter by letter)
        maxLines = 1
        ellipsize = android.text.TextUtils.TruncateAt.END
    }, lp(0, WRAP, 1f))
}

fun Context.sectionTitle(s: String): TextView = text(s.uppercase(), 12f, Palette.text3, bold = true).apply {
    letterSpacing = 0.06f
    setPadding(dp(20), dp(20), dp(20), dp(8))
}

fun Context.card(): LinearLayout = LinearLayout(this).apply {
    orientation = LinearLayout.VERTICAL
    background = rounded(Palette.surface1, dp(20).toFloat(), dp(1), Palette.border)
    setPadding(dp(18), dp(16), dp(18), dp(16))
    layoutParams = LinearLayout.LayoutParams(MATCH, WRAP).apply { setMargins(dp(14), dp(6), dp(14), dp(6)) }
}

/**
 * Buttons and chips side by side that go on to the next line when they do not fit (a wide font, a
 * big font size, a narrow screen). In a plain row the last one was squeezed to a sliver many
 * lines tall, which stretched its whole card. No child is ever wider than the row.
 */
class FlowLayout(context: Context, gapDp: Int = 8) : ViewGroup(context) {
    private val gap = context.dp(gapDp)

    override fun generateDefaultLayoutParams(): LayoutParams = LayoutParams(WRAP, WRAP)
    override fun generateLayoutParams(p: LayoutParams): LayoutParams = LayoutParams(p)
    override fun checkLayoutParams(p: LayoutParams?): Boolean = p != null

    /** Places the children line by line; returns the height used. [place] false only measures. */
    private fun flow(width: Int, place: Boolean): Int {
        val right = width - paddingRight
        var x = paddingLeft
        var y = paddingTop
        var line = 0
        for (i in 0 until childCount) {
            val c = getChildAt(i)
            if (c.visibility == GONE) continue
            if (x > paddingLeft && x + c.measuredWidth > right) {
                x = paddingLeft
                y += line + gap
                line = 0
            }
            if (place) c.layout(x, y, x + c.measuredWidth, y + c.measuredHeight)
            x += c.measuredWidth + gap
            line = maxOf(line, c.measuredHeight)
        }
        return y + line + paddingBottom
    }

    override fun onMeasure(widthSpec: Int, heightSpec: Int) {
        val unlimited = MeasureSpec.getMode(widthSpec) == MeasureSpec.UNSPECIFIED
        val avail = if (unlimited) Int.MAX_VALUE / 4 else (MeasureSpec.getSize(widthSpec) - paddingLeft - paddingRight).coerceAtLeast(0)
        val childW = if (unlimited) MeasureSpec.makeMeasureSpec(0, MeasureSpec.UNSPECIFIED) else MeasureSpec.makeMeasureSpec(avail, MeasureSpec.AT_MOST)
        val childH = MeasureSpec.makeMeasureSpec(0, MeasureSpec.UNSPECIFIED)
        var widest = 0
        var total = 0
        for (i in 0 until childCount) {
            val c = getChildAt(i)
            if (c.visibility == GONE) continue
            c.measure(childW, childH)
            widest = maxOf(widest, c.measuredWidth)
            total += c.measuredWidth + gap
        }
        val width = when (MeasureSpec.getMode(widthSpec)) {
            MeasureSpec.EXACTLY -> MeasureSpec.getSize(widthSpec)
            MeasureSpec.AT_MOST -> minOf(MeasureSpec.getSize(widthSpec), (total - gap).coerceAtLeast(widest) + paddingLeft + paddingRight)
            else -> (total - gap).coerceAtLeast(0) + paddingLeft + paddingRight
        }
        setMeasuredDimension(width, resolveSize(flow(width, false), heightSpec))
    }

    override fun onLayout(changed: Boolean, l: Int, t: Int, r: Int, b: Int) {
        flow(r - l, true)
    }
}
