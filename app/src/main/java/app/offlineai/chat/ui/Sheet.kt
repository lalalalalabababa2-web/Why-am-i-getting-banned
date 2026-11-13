package app.offlineai.chat.ui

import android.app.Activity
import android.app.Dialog
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat

/**
 * A sheet that rises from the bottom of the screen: the app's menus and small dialogs. It comes
 * up on a spring, dims (and where the phone can, blurs) what is behind it, follows the finger
 * when dragged down by its top, and goes away on a drag, a tap outside or Back.
 */
class Sheet(private val activity: Activity, title: String? = null, subtitle: String? = null) :
    Dialog(activity, android.R.style.Theme_Translucent_NoTitleBar) {

    private val scrim = View(activity)
    private val panel = LinearLayout(activity)
    private val body = LinearLayout(activity)
    private val root = FrameLayout(activity)
    private var closing = false
    private var bottomInset = 0
    private val slide = Spring(stiffness = 380f, damping = 36f, rest = 0.5f) { y ->
        panel.translationY = y
        val h = panel.height.coerceAtLeast(1)
        scrim.alpha = (1f - y / h).coerceIn(0f, 1f)
    }

    init {
        scrim.setBackgroundColor(if (Palette.dark) 0x99000000.toInt() else 0x59000000)
        scrim.alpha = 0f
        scrim.setOnClickListener { dismiss() }
        scrim.contentDescription = "Close"
        root.addView(scrim, FrameLayout.LayoutParams(MATCH, MATCH))

        val r = activity.dp(28).toFloat()
        panel.orientation = LinearLayout.VERTICAL
        panel.background = GradientDrawable().apply {
            setColor(Palette.surface1)
            cornerRadii = floatArrayOf(r, r, r, r, 0f, 0f, 0f, 0f)
            setStroke(activity.dp(1), Palette.border)
        }
        panel.isClickable = true
        panel.elevation = activity.dp(16).toFloat()

        // the top of the sheet: a handle to drag it down by, and what it is
        val head = LinearLayout(activity).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(activity.dp(24), activity.dp(10), activity.dp(24), activity.dp(if (title != null) 8 else 4))
        }
        head.addView(View(activity).apply {
            background = rounded(Palette.borderStrong, activity.dp(2).toFloat())
        }, lp(activity.dp(36), activity.dp(4)).apply { gravity = Gravity.CENTER_HORIZONTAL; bottomMargin = activity.dp(if (title != null) 14 else 6) })
        if (title != null) head.addView(activity.text(title, 20f, bold = true))
        if (subtitle != null) head.addView(activity.text(subtitle, 14f, Palette.text2).apply { setPadding(0, activity.dp(4), 0, 0) })
        panel.addView(head, lp(MATCH, WRAP))
        dragToClose(head)

        body.orientation = LinearLayout.VERTICAL
        body.setPadding(0, 0, 0, activity.dp(8))
        panel.addView(ScrollView(activity).apply {
            isVerticalScrollBarEnabled = false
            overScrollMode = View.OVER_SCROLL_IF_CONTENT_SCROLLS
            addView(body)
        }, lp(MATCH, WRAP))

        root.addView(panel, FrameLayout.LayoutParams(MATCH, WRAP, Gravity.BOTTOM))
        setContentView(root)

        window?.let { w ->
            w.setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
            w.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))
            w.clearFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND or WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS or
                WindowManager.LayoutParams.FLAG_TRANSLUCENT_NAVIGATION)
            // behind the status and navigation bars too, drawing them itself (see-through)
            w.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS or WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN)
            w.attributes = w.attributes.apply {
                layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
            }
            if (Build.VERSION.SDK_INT >= 29) {
                w.isStatusBarContrastEnforced = false
                w.isNavigationBarContrastEnforced = false
            }
            w.statusBarColor = Color.TRANSPARENT
            w.navigationBarColor = Color.TRANSPARENT
            WindowCompat.setDecorFitsSystemWindows(w, false)
            w.setWindowAnimations(0)
            if (Build.VERSION.SDK_INT >= 31) {
                // what is behind goes soft, on phones that can afford it (ignored elsewhere)
                w.addFlags(WindowManager.LayoutParams.FLAG_BLUR_BEHIND)
                w.attributes = w.attributes.apply { blurBehindRadius = activity.dp(18) }
            }
            WindowCompat.getInsetsController(w, root).apply {
                isAppearanceLightStatusBars = false
                isAppearanceLightNavigationBars = !Palette.dark
            }
        }
        ViewCompat.setOnApplyWindowInsetsListener(root) { _, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout() or WindowInsetsCompat.Type.ime())
            bottomInset = bars.bottom
            panel.setPadding(bars.left, 0, bars.right, bars.bottom)
            // never taller than the screen below the status bar, with a little of what is behind showing
            (panel.layoutParams as FrameLayout.LayoutParams).topMargin = bars.top + activity.dp(24)
            WindowInsetsCompat.CONSUMED
        }
    }

    /** One choice: tapping it closes the sheet and then does [onClick]. */
    fun item(
        label: String, icon: Int = 0, detail: String? = null, checked: Boolean = false, danger: Boolean = false,
        enabled: Boolean = true, onClick: () -> Unit = {},
    ): Sheet {
        val color = when {
            danger -> Palette.danger
            !enabled -> Palette.text3
            else -> Palette.text
        }
        val row = LinearLayout(activity).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            minimumHeight = activity.dp(56)
            setPadding(activity.dp(24), activity.dp(10), activity.dp(20), activity.dp(10))
            if (enabled) {
                background = ripple(null, 0f)
                setOnClickListener { dismiss { onClick() } }
            }
        }
        if (icon != 0) {
            row.addView(ImageView(activity).apply {
                setImageDrawable(ContextCompat.getDrawable(activity, icon)?.mutate()?.apply { setTint(if (danger) Palette.danger else Palette.text2) })
            }, lp(activity.dp(24), activity.dp(24)).apply { marginEnd = activity.dp(18) })
        }
        val texts = LinearLayout(activity).apply { orientation = LinearLayout.VERTICAL }
        texts.addView(activity.text(label, 16f, color))
        if (detail != null) texts.addView(activity.text(detail, 13f, Palette.text3))
        row.addView(texts, lp(0, WRAP, 1f))
        if (checked) {
            row.addView(activity.text("✓", 17f, Palette.accent, bold = true), lp(WRAP, WRAP).apply { marginStart = activity.dp(12) })
        }
        body.addView(row, lp(MATCH, WRAP))
        return this
    }

    fun divider(): Sheet {
        body.addView(View(activity).apply { setBackgroundColor(Palette.border) },
            lp(MATCH, 1).apply { setMargins(activity.dp(24), activity.dp(6), activity.dp(24), activity.dp(6)) })
        return this
    }

    /** Anything else in the sheet (text, a form, buttons). */
    fun view(v: View, sidePaddingDp: Int = 24): Sheet {
        body.addView(v, lp(MATCH, WRAP).apply { setMargins(activity.dp(sidePaddingDp), 0, activity.dp(sidePaddingDp), 0) })
        return this
    }

    /** A wide button at the bottom of the sheet. */
    fun button(label: String, primary: Boolean = true, onClick: () -> Unit): Sheet {
        val b = activity.pill(label, primary = primary) { dismiss { onClick() } }.apply {
            minHeight = activity.dp(48)
            textSize = 15f * Palette.fontScale
            background = ripple(
                if (primary) rounded(Palette.accent, activity.dp(24).toFloat())
                else rounded(Palette.surface2, activity.dp(24).toFloat(), activity.dp(1), Palette.borderStrong),
                activity.dp(24).toFloat(),
            )
        }
        body.addView(b, lp(MATCH, WRAP).apply { setMargins(activity.dp(24), activity.dp(8), activity.dp(24), activity.dp(4)) })
        return this
    }

    override fun show() {
        if (activity.isFinishing || activity.isDestroyed) return
        super.show()
        panel.post {
            slide.snap(panel.height.toFloat())
            slide.animateTo(0f)
        }
        // until it is measured it stays out of sight
        panel.translationY = 10_000f
    }

    override fun dismiss() = dismiss(null)

    /** Slides away, then runs [then] (so what a choice opens does not fight the sheet leaving). */
    fun dismiss(then: (() -> Unit)?) {
        if (closing) return
        closing = true
        slide.animateTo(panel.height.toFloat()) {
            runCatching { super@Sheet.dismiss() }
            then?.invoke()
        }
    }

    private fun dragToClose(handle: View) {
        var downY = 0f
        var lastY = 0f
        var lastT = 0L
        var speed = 0f
        handle.setOnTouchListener { _, e ->
            when (e.actionMasked) {
                MotionEvent.ACTION_DOWN -> {
                    downY = e.rawY
                    lastY = e.rawY
                    lastT = e.eventTime
                    speed = 0f
                    slide.cancel()
                }
                MotionEvent.ACTION_MOVE -> {
                    val dy = (e.rawY - downY).coerceAtLeast(0f)
                    val dt = (e.eventTime - lastT).coerceAtLeast(1)
                    speed = (e.rawY - lastY) / dt * 1000f
                    lastY = e.rawY
                    lastT = e.eventTime
                    slide.snap(dy)
                }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                    slide.velocity = speed
                    // far enough or fast enough downwards: it goes; otherwise it springs back
                    if (panel.translationY > panel.height * 0.3f || speed > activity.dp(900)) dismiss() else slide.animateTo(0f)
                }
            }
            true
        }
    }
}

/** Text for inside a sheet: a heading with a paragraph under it. */
fun Activity.sheetParagraph(heading: String, bodyText: String): LinearLayout = LinearLayout(this).apply {
    orientation = LinearLayout.VERTICAL
    addView(text(heading, 15f, bold = true).apply { setPadding(0, dp(12), 0, dp(2)) })
    addView(text(bodyText, 14f, Palette.text2))
}

internal fun TextView.oneLine(): TextView = apply {
    maxLines = 1
    ellipsize = android.text.TextUtils.TruncateAt.END
}
