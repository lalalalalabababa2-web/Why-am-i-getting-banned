package com.umt.toolkit.overlay

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.text.Editable
import android.text.InputType
import android.text.TextUtils
import android.text.TextWatcher
import android.util.TypedValue
import android.view.Gravity
import android.view.KeyEvent
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputMethodManager
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.HorizontalScrollView
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.SeekBar
import android.widget.Switch
import android.widget.TextView
import com.umt.toolkit.Toolkit
import com.umt.toolkit.plugins.ControlSpec
import com.umt.toolkit.plugins.InstalledPlugin
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.doubleOrNull
import kotlin.math.roundToInt

/**
 * A plugin's floating menu panel, built from Android views so it runs in an overlay window
 * without an activity. Every control reads and writes through PluginManager, i.e. the real
 * binding; nothing here keeps its own copy of a value.
 */
@SuppressLint("ViewConstructor", "UseSwitchCompatOrMaterialCode")
class PanelView(
    context: Context,
    private val tk: Toolkit,
    private var plugin: InstalledPlugin,
    private val callbacks: Callbacks,
    private val inApp: Boolean = false,
) : LinearLayout(context) {

    interface Callbacks {
        fun onDrag(dx: Int, dy: Int) {}
        fun onDragEnd() {}
        fun onResize(dx: Int) {}
        fun onResizeEnd() {}
        fun onSearchFocus(focused: Boolean) {}
    }

    private val dp = resources.displayMetrics.density
    private val manifest = plugin.manifest!!
    private var activeTab = plugin.state.activeTab.coerceIn(0, (manifest.tabs.size - 1).coerceAtLeast(0))
    private var collapsed = plugin.state.collapsed ?: manifest.panel.collapsed
    private val collapsedSections = plugin.state.collapsedSections.toMutableSet().apply {
        if (isEmpty()) manifest.tabs.flatMap { it.sections }.filter { !it.expanded }.forEach { add(it.id) }
    }
    private var query = ""
    private val rows = ArrayList<Row>()

    private val content = LinearLayout(context).apply { orientation = VERTICAL }
    private val tabStrip = LinearLayout(context).apply { orientation = HORIZONTAL }
    private val tabScroll = HorizontalScrollView(context).apply { isHorizontalScrollBarEnabled = false; addView(tabStrip) }
    private val body = LinearLayout(context).apply { orientation = VERTICAL }
    private val bodyScroll = object : ScrollView(context) {
        override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
            val maxH = (resources.displayMetrics.heightPixels * if (inApp) 0.9f else 0.55f).toInt()
            super.onMeasure(widthMeasureSpec, MeasureSpec.makeMeasureSpec(maxH, MeasureSpec.AT_MOST))
        }
    }.apply { addView(body); isVerticalFadingEdgeEnabled = true }
    private val presetsRow = LinearLayout(context).apply { orientation = HORIZONTAL }
    private val statusText = text("", 10f, DIM).apply { maxLines = 2; ellipsize = TextUtils.TruncateAt.END }
    private val collapseBtn = text("–", 14f, TEXT)
    private var search: EditText? = null

    private val refreshTick = object : Runnable {
        override fun run() {
            refresh()
            postDelayed(this, manifest.refreshMs.toLong().coerceIn(250, 10_000))
        }
    }

    init {
        orientation = VERTICAL
        background = rounded(BG, 6f, OUTLINE)
        alpha = plugin.state.opacity ?: manifest.panel.opacity
        addView(header())
        content.addView(tabScroll)
        if (manifest.panel.searchable) content.addView(searchField())
        content.addView(bodyScroll)
        if (manifest.presets.isNotEmpty()) content.addView(HorizontalScrollView(context).apply {
            isHorizontalScrollBarEnabled = false
            addView(presetsRow)
            setPadding(px(6), px(2), px(6), px(2))
        })
        content.addView(footer())
        addView(content)
        buildTabs()
        buildPresets()
        rebuildBody()
        applyCollapsed()
        tk.plugins.status.value[plugin.id]?.let { setStatus(it) }
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        post(refreshTick)
    }

    override fun onDetachedFromWindow() {
        removeCallbacks(refreshTick)
        super.onDetachedFromWindow()
    }

    fun update(p: InstalledPlugin) {
        plugin = p
        alpha = p.state.opacity ?: manifest.panel.opacity
        refresh()
    }

    fun refresh() = rows.forEach { it.refresh() }

    fun setStatus(text: String) {
        statusText.text = text
    }

    // ---- Structure --------------------------------------------------------------------------

    @SuppressLint("ClickableViewAccessibility")
    private fun header(): View {
        val row = LinearLayout(context).apply {
            orientation = HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            background = rounded(HEADER, 6f, null)
            setPadding(px(8), px(5), px(4), px(5))
        }
        val title = text(plugin.title, 12f, TEXT).apply {
            typeface = Typeface.DEFAULT_BOLD
            layoutParams = LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
            maxLines = 1
            ellipsize = TextUtils.TruncateAt.END
        }
        row.addView(title)
        collapseBtn.setPadding(px(8), 0, px(8), 0)
        collapseBtn.setOnClickListener {
            collapsed = !collapsed
            applyCollapsed()
            tk.plugins.updateGeometry(plugin.id) { it.copy(collapsed = collapsed) }
        }
        row.addView(collapseBtn)
        if (!inApp) row.addView(text("×", 15f, TEXT).apply {
            setPadding(px(8), 0, px(6), 0)
            setOnClickListener { tk.plugins.setPanelVisible(plugin.id, false) }
        })
        // Drag the panel by its title bar.
        var lastX = 0f
        var lastY = 0f
        var moved = false
        title.setOnTouchListener { _, e ->
            when (e.actionMasked) {
                MotionEvent.ACTION_DOWN -> { lastX = e.rawX; lastY = e.rawY; moved = false }
                MotionEvent.ACTION_MOVE -> {
                    val dx = (e.rawX - lastX).toInt()
                    val dy = (e.rawY - lastY).toInt()
                    if (dx != 0 || dy != 0) { callbacks.onDrag(dx, dy); moved = true }
                    lastX += dx; lastY += dy
                }
                MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> if (moved) callbacks.onDragEnd()
            }
            true
        }
        return row
    }

    private fun searchField(): View {
        val et = EditText(context).apply {
            hint = "Search controls"
            setHintTextColor(FAINT)
            setTextColor(TEXT)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
            background = rounded(SURFACE2, 4f, OUTLINE)
            setPadding(px(8), px(4), px(8), px(4))
            isSingleLine = true
            inputType = InputType.TYPE_CLASS_TEXT
            imeOptions = EditorInfo.IME_ACTION_DONE
            isFocusableInTouchMode = !inApp
            setOnFocusChangeListener { v, has ->
                if (!has) hideKeyboard(v)
            }
            setOnEditorActionListener { v, actionId, _ ->
                if (actionId == EditorInfo.IME_ACTION_DONE) { endSearchFocus(v); true } else false
            }
            setOnKeyListener { v, keyCode, event ->
                if (keyCode == KeyEvent.KEYCODE_BACK && event.action == KeyEvent.ACTION_UP) { endSearchFocus(v); true } else false
            }
            addTextChangedListener(object : TextWatcher {
                override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
                override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
                override fun afterTextChanged(s: Editable?) {
                    query = s?.toString()?.trim().orEmpty()
                    rebuildBody()
                }
            })
        }
        if (!inApp) {
            // Overlay windows are not focusable (so the app below keeps the keyboard); make this
            // one focusable only while the search field is in use.
            et.setOnTouchListener { v, e ->
                if (e.actionMasked == MotionEvent.ACTION_UP && !v.hasFocus()) {
                    callbacks.onSearchFocus(true)
                    v.post {
                        v.requestFocus()
                        context.getSystemService(InputMethodManager::class.java)?.showSoftInput(v, 0)
                    }
                }
                false
            }
        }
        search = et
        return FrameLayout(context).apply {
            setPadding(px(6), px(4), px(6), px(2))
            addView(et, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))
        }
    }

    private fun endSearchFocus(v: View) {
        hideKeyboard(v)
        v.clearFocus()
        callbacks.onSearchFocus(false)
    }

    private fun hideKeyboard(v: View) {
        context.getSystemService(InputMethodManager::class.java)?.hideSoftInputFromWindow(v.windowToken, 0)
    }

    @SuppressLint("ClickableViewAccessibility")
    private fun footer(): View {
        val row = LinearLayout(context).apply {
            orientation = HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(px(8), px(3), px(2), px(3))
        }
        statusText.layoutParams = LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
        row.addView(statusText)
        if (!inApp) {
            val grip = text("⇲", 14f, DIM).apply { setPadding(px(8), px(2), px(6), px(2)) }
            var lastX = 0f
            grip.setOnTouchListener { _, e ->
                when (e.actionMasked) {
                    MotionEvent.ACTION_DOWN -> lastX = e.rawX
                    MotionEvent.ACTION_MOVE -> {
                        val dx = (e.rawX - lastX).toInt()
                        if (dx != 0) callbacks.onResize(dx)
                        lastX += dx
                    }
                    MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> callbacks.onResizeEnd()
                }
                true
            }
            row.addView(grip)
        }
        return row
    }

    private fun applyCollapsed() {
        content.visibility = if (collapsed) GONE else VISIBLE
        collapseBtn.text = if (collapsed) "+" else "–"
    }

    private fun buildTabs() {
        tabStrip.removeAllViews()
        tabScroll.visibility = if (manifest.tabs.size > 1) VISIBLE else GONE
        manifest.tabs.forEachIndexed { i, tab ->
            val selected = i == activeTab && query.isEmpty()
            tabStrip.addView(text(tab.title, 11f, if (selected) TEXT else DIM).apply {
                setPadding(px(10), px(6), px(10), px(6))
                if (selected) background = underline()
                setOnClickListener {
                    activeTab = i
                    search?.setText("")
                    buildTabs()
                    rebuildBody()
                    tk.plugins.updateGeometry(plugin.id) { it.copy(activeTab = i) }
                }
            })
        }
    }

    private fun buildPresets() {
        presetsRow.removeAllViews()
        for (p in manifest.presets) {
            presetsRow.addView(chip("▸ ${p.name}") { tk.plugins.applyPreset(plugin, p.name); refresh() })
        }
    }

    private fun rebuildBody() {
        body.removeAllViews()
        rows.clear()
        if (query.isNotEmpty()) {
            val hits = manifest.allControls().filter { it.label.contains(query, ignoreCase = true) }
            if (hits.isEmpty()) body.addView(text("No controls match \"$query\"", 11f, DIM).apply { setPadding(px(10), px(8), px(10), px(8)) })
            hits.forEach { addRow(it) }
            return
        }
        val tab = manifest.tabs.getOrNull(activeTab) ?: return
        tab.controls.forEach { addRow(it) }
        for (sec in tab.sections) {
            val isCollapsed = sec.id in collapsedSections
            body.addView(text("${if (isCollapsed) "▸" else "▾"}  ${sec.title}", 11f, ACCENT).apply {
                typeface = Typeface.DEFAULT_BOLD
                setPadding(px(10), px(8), px(10), px(4))
                setOnClickListener {
                    if (!collapsedSections.remove(sec.id)) collapsedSections.add(sec.id)
                    tk.plugins.updateGeometry(plugin.id) { it.copy(collapsedSections = collapsedSections.toSet()) }
                    rebuildBody()
                }
            })
            if (!isCollapsed) sec.controls.forEach { addRow(it) }
        }
    }

    private fun addRow(c: ControlSpec) {
        val row: Row = when (c.type) {
            "toggle" -> ToggleRow(c)
            "slider" -> SliderRow(c)
            "dropdown" -> DropdownRow(c)
            "button" -> ButtonRow(c)
            "value" -> ValueRow(c)
            else -> LabelRow(c)
        }
        body.addView(row.view)
        rows += row
        row.refresh()
    }

    // ---- Rows -------------------------------------------------------------------------------

    private abstract inner class Row(val c: ControlSpec) {
        abstract val view: View
        abstract fun refresh()
        protected val note = text("", 9f, FAINT).apply { visibility = GONE }

        protected fun line(vararg children: View): LinearLayout = LinearLayout(context).apply {
            orientation = HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(px(10), px(3), px(8), px(3))
            children.forEach { addView(it) }
        }

        protected fun label() = text(c.label, 12f, TEXT).apply {
            layoutParams = LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
        }

        protected fun showBridgeStatus() {
            val st = tk.plugins.bridgeStatus(plugin, c)
            when (st?.state) {
                null, "ok" -> note.visibility = GONE
                "pending" -> { note.visibility = VISIBLE; note.text = "sending…"; note.setTextColor(FAINT) }
                else -> { note.visibility = VISIBLE; note.text = st.message ?: st.state; note.setTextColor(BAD) }
            }
        }

        protected fun wrap(main: View): View = LinearLayout(context).apply {
            orientation = VERTICAL
            addView(main)
            note.setPadding(px(10), 0, px(10), px(2))
            addView(note)
        }
    }

    private inner class ToggleRow(c: ControlSpec) : Row(c) {
        private var updating = false
        private val sw = Switch(context).apply {
            setOnCheckedChangeListener { _, checked ->
                if (!updating) tk.plugins.write(plugin, c, JsonPrimitive(checked))
            }
        }
        override val view = wrap(line(label(), sw))
        override fun refresh() {
            updating = true
            val v = tk.plugins.read(plugin, c)?.booleanOrNull
            sw.isEnabled = v != null
            sw.isChecked = v == true
            updating = false
            showBridgeStatus()
        }
    }

    private inner class SliderRow(c: ControlSpec) : Row(c) {
        private val valueText = text("", 11f, DIM)
        private var dragging = false
        private val bar = SeekBar(context)
        private val r get() = tk.plugins.range(plugin, c)
        private fun steps(): Int {
            val rg = r
            val s = rg.step
            return if (s != null && s > 0) ((rg.max - rg.min) / s).roundToInt().coerceIn(1, 1000) else 100
        }
        private fun valueAt(progress: Int): Double {
            val rg = r
            val v = rg.min + (rg.max - rg.min) * progress / steps()
            return if (rg.step == 1.0) v.roundToInt().toDouble() else v
        }
        override val view = wrap(LinearLayout(context).apply {
            orientation = VERTICAL
            addView(line(label(), valueText))
            bar.setPadding(px(14), px(2), px(14), px(4))
            addView(bar)
        })
        init {
            bar.setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
                override fun onProgressChanged(sb: SeekBar, p: Int, fromUser: Boolean) {
                    if (fromUser) valueText.text = fmt(valueAt(p))
                }
                override fun onStartTrackingTouch(sb: SeekBar) { dragging = true }
                override fun onStopTrackingTouch(sb: SeekBar) {
                    dragging = false
                    val v = valueAt(sb.progress)
                    val prim = if (r.step == 1.0) JsonPrimitive(v.roundToInt()) else JsonPrimitive(v)
                    tk.plugins.write(plugin, c, prim)
                }
            })
        }
        override fun refresh() {
            if (dragging) return
            val rg = r
            val v = tk.plugins.read(plugin, c)?.doubleOrNull
            bar.max = steps()
            bar.isEnabled = v != null
            if (v != null && rg.max > rg.min) bar.progress = ((v - rg.min) / (rg.max - rg.min) * steps()).roundToInt().coerceIn(0, steps())
            valueText.text = v?.let { fmt(it) } ?: "—"
            showBridgeStatus()
        }
        private fun fmt(v: Double) = if (v == Math.floor(v) && Math.abs(v) < 1e6) v.toLong().toString() else "%.2f".format(v)
    }

    private inner class DropdownRow(c: ControlSpec) : Row(c) {
        private val current = text("", 11f, ACCENT).apply { setPadding(px(6), px(2), px(2), px(2)) }
        private val options = LinearLayout(context).apply { orientation = VERTICAL; visibility = GONE; setPadding(px(18), 0, px(10), px(4)) }
        override val view = wrap(LinearLayout(context).apply {
            orientation = VERTICAL
            addView(line(label(), current).apply {
                setOnClickListener { toggle() }
            })
            addView(options)
        })
        private fun toggle() {
            if (options.visibility == VISIBLE) { options.visibility = GONE; return }
            options.removeAllViews()
            val cur = tk.plugins.read(plugin, c)?.content
            for (o in tk.plugins.range(plugin, c).options) {
                options.addView(text(if (o == cur) "● $o" else "○ $o", 11f, if (o == cur) TEXT else DIM).apply {
                    setPadding(px(4), px(5), px(4), px(5))
                    setOnClickListener {
                        tk.plugins.write(plugin, c, JsonPrimitive(o))
                        options.visibility = GONE
                        refresh()
                    }
                })
            }
            if (options.childCount == 0) options.addView(text("No options (not connected?)", 10f, FAINT))
            options.visibility = VISIBLE
        }
        override fun refresh() {
            current.text = (tk.plugins.read(plugin, c)?.content ?: "—") + "  ▾"
            showBridgeStatus()
        }
    }

    private inner class ButtonRow(c: ControlSpec) : Row(c) {
        override val view: View = FrameLayout(context).apply {
            setPadding(px(10), px(3), px(10), px(3))
            addView(text(c.label, 12f, TEXT).apply {
                gravity = Gravity.CENTER
                background = rounded(SURFACE2, 4f, OUTLINE)
                setPadding(px(8), px(6), px(8), px(6))
                setOnClickListener { tk.plugins.action(plugin, c); this@PanelView.refresh() }
            }, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT))
        }
        override fun refresh() {}
    }

    private inner class ValueRow(c: ControlSpec) : Row(c) {
        private val value = text("", 12f, TEXT).apply { typeface = Typeface.MONOSPACE }
        override val view = line(label(), value)
        override fun refresh() { value.text = tk.plugins.display(plugin, c) }
    }

    private inner class LabelRow(c: ControlSpec) : Row(c) {
        override val view = text(c.label, 11f, DIM).apply { setPadding(px(10), px(4), px(10), px(4)) }
        override fun refresh() {}
    }

    // ---- Helpers ----------------------------------------------------------------------------

    private fun px(v: Int) = (v * dp).toInt()

    private fun text(s: String, sp: Float, color: Int) = TextView(context).apply {
        text = s
        setTextSize(TypedValue.COMPLEX_UNIT_SP, sp)
        setTextColor(color)
    }

    private fun chip(s: String, onClick: () -> Unit) = text(s, 11f, TEXT).apply {
        background = rounded(SURFACE2, 10f, OUTLINE)
        setPadding(px(9), px(4), px(9), px(4))
        layoutParams = LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply { marginEnd = px(4) }
        setOnClickListener { onClick() }
    }

    private fun rounded(fill: Int, radiusDp: Float, stroke: Int?) = GradientDrawable().apply {
        setColor(fill)
        cornerRadius = radiusDp * dp
        if (stroke != null) setStroke(dp.toInt().coerceAtLeast(1), stroke)
    }

    private fun underline() = GradientDrawable(GradientDrawable.Orientation.BOTTOM_TOP, intArrayOf(ACCENT, Color.TRANSPARENT, Color.TRANSPARENT, Color.TRANSPARENT, Color.TRANSPARENT, Color.TRANSPARENT, Color.TRANSPARENT, Color.TRANSPARENT, Color.TRANSPARENT, Color.TRANSPARENT, Color.TRANSPARENT, Color.TRANSPARENT))

    companion object {
        val BG = Color.rgb(26, 29, 33)
        val HEADER = Color.rgb(33, 37, 42)
        val SURFACE2 = Color.rgb(37, 41, 47)
        val OUTLINE = Color.rgb(48, 53, 60)
        val TEXT = Color.rgb(226, 229, 233)
        val DIM = Color.rgb(154, 163, 173)
        val FAINT = Color.rgb(108, 116, 126)
        val ACCENT = Color.rgb(125, 163, 196)
        val BAD = Color.rgb(207, 122, 112)
    }
}
