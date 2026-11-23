package com.umt.toolkit.overlay

import android.content.Context
import android.graphics.PixelFormat
import android.os.Build
import android.view.ContextThemeWrapper
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import com.umt.sdk.EntityFrame
import com.umt.toolkit.R
import com.umt.toolkit.Toolkit
import com.umt.toolkit.model.ToolkitState
import com.umt.toolkit.perf.TelemetrySample
import com.umt.toolkit.plugins.InstalledPlugin

/** Adds, updates and removes the overlay windows to match the toolkit state. */
class OverlayHost(private val context: Context, private val tk: Toolkit) {
    private val wm = context.getSystemService(WindowManager::class.java)
    private val themed = ContextThemeWrapper(context, R.style.Theme_UMT_Overlay)
    private val density = context.resources.displayMetrics.density

    private var layer: PassthroughLayerView? = null
    private var hud: HudView? = null
    private var hudParams: WindowManager.LayoutParams? = null
    private var watchingFrames = false

    private class PanelWindow(val view: PanelView, val params: WindowManager.LayoutParams, val source: String)
    private val panels = LinkedHashMap<String, PanelWindow>()

    private val overlayType = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY

    fun apply(state: ToolkitState, visiblePanels: List<InstalledPlugin>, paused: Boolean) {
        val o = state.overlays

        // One full-screen, untouchable window for every pass-through layer. Android 12+ only lets
        // touches through overlay windows whose combined opacity is at most the system cap, so
        // the window alpha is the cap and the drawing compensates up to it.
        if (state.anyPassthroughLayer && !paused) {
            val l = layer ?: PassthroughLayerView(context, windowAlpha()).also { v ->
                wm.addView(v, passthroughParams(v.windowAlpha))
                layer = v
                val dm = context.resources.displayMetrics
                tk.sandbox.setView(dm.widthPixels, dm.heightPixels)
            }
            l.overlays = o
            l.esp = state.esp
            l.maxFps = state.governor.overlayMaxFps
            l.invalidate()
        } else {
            layer?.let { remove(it) }
            layer = null
        }

        val wantFrames = o.espEnabled && !paused
        if (wantFrames != watchingFrames) {
            if (wantFrames) { tk.frames.acquire(); tk.ensureStream() } else tk.frames.release()
            watchingFrames = wantFrames
        }

        if (o.hudEnabled && !paused) {
            val h = hud ?: HudView(themed, onMove = { dx, dy -> moveHud(dx, dy) }, onMoveEnd = { saveHud() }).also { v ->
                val p = touchableParams(WindowManager.LayoutParams.WRAP_CONTENT, o.hudX, o.hudY)
                wm.addView(v, p)
                hud = v
                hudParams = p
            }
            h.configure(o.hudMetrics, o.hudTextSp, o.hudOpacity)
        } else {
            hud?.let { remove(it) }
            hud = null
            hudParams = null
        }

        val wanted = if (paused) emptyMap() else visiblePanels.associateBy { it.id }
        for (id in panels.keys.toList()) {
            val win = panels[id]!!
            val p = wanted[id]
            if (p == null || p.source != win.source) {
                remove(win.view)
                panels.remove(id)
            }
        }
        for ((id, p) in wanted) {
            val existing = panels[id]
            if (existing != null) {
                existing.view.update(p)
                continue
            }
            val m = p.manifest ?: continue
            val st = p.state
            val params = touchableParams(((st.widthDp ?: m.panel.widthDp) * density).toInt(), st.x ?: m.panel.x, st.y ?: m.panel.y)
            lateinit var view: PanelView
            view = PanelView(themed, tk, p, object : PanelView.Callbacks {
                override fun onDrag(dx: Int, dy: Int) {
                    params.x += dx; params.y += dy
                    clampToScreen(params, view)
                    safeUpdate(view, params)
                }
                override fun onDragEnd() = tk.plugins.updateGeometry(id) { it.copy(x = params.x, y = params.y) }
                override fun onResize(dx: Int) {
                    params.width = (params.width + dx).coerceIn((160 * density).toInt(), (480 * density).toInt())
                    safeUpdate(view, params)
                }
                override fun onResizeEnd() = tk.plugins.updateGeometry(id) { it.copy(widthDp = (params.width / density).toInt()) }
                override fun onSearchFocus(focused: Boolean) {
                    params.flags = if (focused) params.flags and WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE.inv()
                    else params.flags or WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                    safeUpdate(view, params)
                }
            })
            try {
                wm.addView(view, params)
                panels[id] = PanelWindow(view, params, p.source)
            } catch (e: Exception) {
                tk.log.e("Overlay", "Could not show panel ${p.id}", e)
            }
        }
    }

    fun refreshPanels() = panels.values.forEach { it.view.refresh() }

    fun onTelemetry(s: TelemetrySample) {
        hud?.update(s)
    }

    fun onFrame(f: EntityFrame?) {
        layer?.setFrame(f)
    }

    fun onPluginStatus(status: Map<String, String>) {
        for ((id, w) in panels) status[id]?.let { w.view.setStatus(it) }
    }

    fun removeAll() {
        layer?.let { remove(it) }; layer = null
        hud?.let { remove(it) }; hud = null
        panels.values.forEach { remove(it.view) }; panels.clear()
        if (watchingFrames) { tk.frames.release(); watchingFrames = false }
    }

    private fun windowAlpha(): Float = tk.maxPassthroughOpacity().coerceIn(0.1f, 1f)

    private fun passthroughParams(alpha: Float) = WindowManager.LayoutParams(
        WindowManager.LayoutParams.MATCH_PARENT,
        WindowManager.LayoutParams.MATCH_PARENT,
        overlayType,
        WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE or WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS or
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
        PixelFormat.TRANSLUCENT,
    ).apply {
        gravity = Gravity.TOP or Gravity.START
        this.alpha = alpha
        title = "UMT layers"
        if (Build.VERSION.SDK_INT >= 28) layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
        if (Build.VERSION.SDK_INT >= 30) {
            layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS
            fitInsetsTypes = 0
        }
    }

    private fun touchableParams(width: Int, x: Int, y: Int) = WindowManager.LayoutParams(
        width,
        WindowManager.LayoutParams.WRAP_CONTENT,
        overlayType,
        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
        PixelFormat.TRANSLUCENT,
    ).apply {
        gravity = Gravity.TOP or Gravity.START
        this.x = x
        this.y = y
        title = "UMT panel"
    }

    private fun moveHud(dx: Int, dy: Int) {
        val v = hud ?: return
        val p = hudParams ?: return
        p.x += dx; p.y += dy
        clampToScreen(p, v)
        safeUpdate(v, p)
    }

    private fun saveHud() {
        val p = hudParams ?: return
        tk.repo.updateOverlays { it.copy(hudX = p.x, hudY = p.y) }
    }

    private fun clampToScreen(p: WindowManager.LayoutParams, v: View) {
        val dm = context.resources.displayMetrics
        val w = if (v.width > 0) v.width else (48 * density).toInt()
        p.x = p.x.coerceIn(0, (dm.widthPixels - w).coerceAtLeast(0))
        p.y = p.y.coerceIn(0, (dm.heightPixels - (32 * density).toInt()).coerceAtLeast(0))
    }

    private fun safeUpdate(v: View, p: WindowManager.LayoutParams) {
        try { wm.updateViewLayout(v, p) } catch (_: Exception) {}
    }

    private fun remove(v: View) {
        try { wm.removeView(v) } catch (_: Exception) {}
    }
}
