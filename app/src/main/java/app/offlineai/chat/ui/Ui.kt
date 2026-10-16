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

    fun set(dark: Boolean, accent: Accent, fontScale: Float) {
        this.dark = dark
        this.fontScale = fontScale
        if (dark) {
            bg = 0xFF131415.toInt(); surface1 = 0xFF1B1C1E.toInt(); surface2 = 0xFF242629.toInt(); surface3 = 0xFF2E3034.toInt()
            border = 0xFF2D2F33.toInt(); borderStrong = 0xFF3E4146.toInt()
            text = 0xFFE6E7E9.toInt(); text2 = 0xFFA4A7AC.toInt(); text3 = 0xFF70747A.toInt()
            this.accent = accent.dark; onAccent = 0xFF101418.toInt()
            positive = 0xFF7FB08A.toInt(); caution = 0xFFD4A24C.toInt(); danger = 0xFFD4706C.toInt()
            ripple = 0x1FFFFFFF; codeBg = 0xFF17181A.toInt(); inlineCode = 0xFFD9DCE0.toInt()
            synKeyword = 0xFFC792EA.toInt(); synString = 0xFFA5D6A7.toInt(); synComment = 0xFF6F7680.toInt(); synNumber = 0xFFF0B97A.toInt()
        } else {
            bg = 0xFFF1F2F4.toInt(); surface1 = 0xFFF9FAFB.toInt(); surface2 = 0xFFFFFFFF.toInt(); surface3 = 0xFFE6E8EB.toInt()
            border = 0xFFDDE0E4.toInt(); borderStrong = 0xFFC2C6CC.toInt()
            text = 0xFF1A1B1D.toInt(); text2 = 0xFF51555B.toInt(); text3 = 0xFF7D828A.toInt()
            this.accent = accent.light; onAccent = 0xFFFFFFFF.toInt()
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
        set(night, settings.accent, settings.fontScale)
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
    }

/** A pill-shaped button. Primary ones are filled with the accent. */
fun Context.pill(label: String, primary: Boolean = false, danger: Boolean = false, onClick: () -> Unit): TextView =
    text(label, 14f, when {
        primary -> Palette.onAccent
        danger -> Palette.danger
        else -> Palette.text
    }, bold = true).apply {
        gravity = Gravity.CENTER
        val r = dp(18).toFloat()
        background = ripple(
            if (primary) rounded(Palette.accent, r) else rounded(Palette.surface2, r, dp(1), Palette.borderStrong), r,
        )
        setPadding(dp(16), dp(8), dp(16), dp(8))
        minHeight = dp(36)
        isClickable = true
        isFocusable = true
        setOnClickListener { onClick() }
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
    ViewCompat.setOnApplyWindowInsetsListener(root) { v, insets ->
        val bars = insets.getInsets(
            WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout() or WindowInsetsCompat.Type.ime(),
        )
        v.setPadding(bars.left, bars.top, bars.right, bars.bottom)
        WindowInsetsCompat.CONSUMED
    }
}

/** A top bar with a back arrow and a title, for the secondary screens. */
fun Activity.topBar(title: String): LinearLayout = LinearLayout(this).apply {
    orientation = LinearLayout.HORIZONTAL
    gravity = Gravity.CENTER_VERTICAL
    setPadding(dp(4), dp(4), dp(12), dp(4))
    addView(iconButton(R.drawable.ic_back, "Back") { finish() })
    addView(text(title, 18f, bold = true).apply { setPadding(dp(4), 0, 0, 0) }, lp(0, WRAP, 1f))
}

fun Context.sectionTitle(s: String): TextView = text(s.uppercase(), 12f, Palette.text3, bold = true).apply {
    letterSpacing = 0.06f
    setPadding(dp(20), dp(20), dp(20), dp(8))
}

fun Context.card(): LinearLayout = LinearLayout(this).apply {
    orientation = LinearLayout.VERTICAL
    background = rounded(Palette.surface1, dp(12).toFloat(), dp(1), Palette.border)
    setPadding(dp(16), dp(14), dp(16), dp(14))
    layoutParams = LinearLayout.LayoutParams(MATCH, WRAP).apply { setMargins(dp(12), dp(4), dp(12), dp(4)) }
}
