package app.offlineai.chat.ui

import android.app.Activity
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.res.ColorStateList
import android.graphics.Typeface
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
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import app.offlineai.chat.R

/** Charcoal palette, the same one as Umbra's dark theme. */
object Palette {
    const val bg = 0xFF131415.toInt()
    const val surface1 = 0xFF1B1C1E.toInt()
    const val surface2 = 0xFF242629.toInt()
    const val surface3 = 0xFF2E3034.toInt()
    const val border = 0xFF2D2F33.toInt()
    const val borderStrong = 0xFF3E4146.toInt()
    const val text = 0xFFE6E7E9.toInt()
    const val text2 = 0xFFA4A7AC.toInt()
    const val text3 = 0xFF70747A.toInt()
    const val accent = 0xFF8FA9C7.toInt()
    const val onAccent = 0xFF101418.toInt()
    const val positive = 0xFF7FB08A.toInt()
    const val caution = 0xFFD4A24C.toInt()
    const val danger = 0xFFD4706C.toInt()
    const val ripple = 0x1FFFFFFF
    const val codeBg = 0xFF17181A.toInt()
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

fun Context.text(
    s: CharSequence = "",
    sizeSp: Float = 15f,
    color: Int = Palette.text,
    bold: Boolean = false,
    mono: Boolean = false,
): TextView = TextView(this).apply {
    text = s
    setTextSize(TypedValue.COMPLEX_UNIT_SP, sizeSp)
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

fun Context.copyText(label: String, value: String) {
    val cm = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
    cm.setPrimaryClip(ClipData.newPlainText(label, value))
    // Android 13 and later show their own confirmation.
    if (android.os.Build.VERSION.SDK_INT < 33) Toast.makeText(this, "Copied", Toast.LENGTH_SHORT).show()
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
    window.setBackgroundDrawable(android.graphics.drawable.ColorDrawable(Palette.bg))
    WindowCompat.getInsetsController(window, root).apply {
        isAppearanceLightStatusBars = false
        isAppearanceLightNavigationBars = false
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
    background = rounded(Palette.surface1, dp(14).toFloat(), dp(1), Palette.border)
    setPadding(dp(16), dp(14), dp(16), dp(14))
    layoutParams = LinearLayout.LayoutParams(MATCH, WRAP).apply { setMargins(dp(12), dp(4), dp(12), dp(4)) }
}
