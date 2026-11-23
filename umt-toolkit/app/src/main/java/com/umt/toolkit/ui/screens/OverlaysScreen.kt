@file:OptIn(ExperimentalLayoutApi::class)

package com.umt.toolkit.ui.screens

import android.content.Intent
import android.net.Uri
import android.provider.Settings
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import com.umt.toolkit.model.HudMetric
import com.umt.toolkit.model.OverlaySettings
import com.umt.toolkit.model.Palette
import com.umt.toolkit.model.ReticleStyle
import com.umt.toolkit.overlay.LayerDrawing
import com.umt.toolkit.ui.Dest
import com.umt.toolkit.ui.LocalToolkit
import com.umt.toolkit.ui.components.ButtonRow
import com.umt.toolkit.ui.components.Chip
import com.umt.toolkit.ui.components.ChoiceRow
import com.umt.toolkit.ui.components.Note
import com.umt.toolkit.ui.components.Panel
import com.umt.toolkit.ui.components.RowDivider
import com.umt.toolkit.ui.components.ScreenColumn
import com.umt.toolkit.ui.components.SliderRow
import com.umt.toolkit.ui.components.SmallButton
import com.umt.toolkit.ui.components.ToggleRow
import com.umt.toolkit.ui.components.Tone
import com.umt.toolkit.ui.theme.Umt

@Composable
fun OverlaysScreen(nav: NavController) {
    val tk = LocalToolkit.current
    val context = LocalContext.current
    val state by tk.repo.state.collectAsStateWithLifecycle()
    val o = state.overlays
    var tick by remember { mutableIntStateOf(0) }
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) { tick++ }
    val canDraw = remember(tick) { tk.canDrawOverlays() }
    val cap = remember { tk.maxPassthroughOpacity() }
    fun set(f: (OverlaySettings) -> OverlaySettings) {
        tk.repo.updateOverlays(f)
        tk.syncOverlays()
    }

    ScreenColumn {
        if (!canDraw) Panel("Permission needed") {
            Note("Overlays need \"Display over other apps\". Settings you change here are kept and take effect once it is allowed.", Tone.Warn)
            ButtonRow {
                SmallButton("Open setting", primary = true) {
                    context.startActivity(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:${context.packageName}")))
                }
            }
        }
        if (cap < 1f) Note("Android 12+ passes touches through overlay layers only up to ${(cap * 100).toInt()}% opacity, so the reticle, guide, dimmer and entity layer are drawn at most that opaque. Apps underneath stay fully usable.")

        Panel("Telemetry HUD") {
            ToggleRow("Show HUD", o.hudEnabled, "Drag it anywhere; its position is remembered") { v -> set { it.copy(hudEnabled = v) } }
            Text("Readouts", style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp))
            FlowRow(Modifier.padding(horizontal = 12.dp), horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                HudMetric.all.forEach { m ->
                    Chip(HudMetric.label(m), m in o.hudMetrics) {
                        set { s -> s.copy(hudMetrics = if (m in s.hudMetrics) s.hudMetrics - m else HudMetric.all.filter { it in s.hudMetrics || it == m }) }
                    }
                }
            }
            Note("\"Toolkit CPU\" and \"Toolkit UI fps\" measure this toolkit, not the app underneath; Android does not expose other apps' frame rates.")
            SliderRow("Opacity", o.hudOpacity, 0.3f..1f, { "%.0f%%".format(it * 100) }) { v -> set { it.copy(hudOpacity = v) } }
            SliderRow("Text size", o.hudTextSp, 8f..18f, { "%.0f sp".format(it) }, steps = 9) { v -> set { it.copy(hudTextSp = v) } }
            ButtonRow { SmallButton("Reset position") { set { it.copy(hudX = 16, hudY = 160) } } }
        }

        Panel("Reticle") {
            ToggleRow("Show reticle", o.reticleEnabled, "A fixed screen-centre marker; it does not read the app") { v -> set { it.copy(reticleEnabled = v) } }
            LayerPreview(o.copy(reticleEnabled = true, guideEnabled = false, dimmerEnabled = false), reticle = true)
            ChoiceRow("Style", ReticleStyle.all.map { it to ReticleStyle.label(it) }, o.reticleStyle) { v -> set { it.copy(reticleStyle = v) } }
            Text("Colour", style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp))
            FlowRow(Modifier.padding(horizontal = 12.dp), horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Palette.colors.forEach { (name, argb) ->
                    Chip(name, o.reticleColor == name, leading = Color(argb.toInt())) { set { it.copy(reticleColor = name) } }
                }
            }
            SliderRow("Size", o.reticleSizeDp, 4f..120f, { "%.0f dp".format(it) }) { v -> set { it.copy(reticleSizeDp = v) } }
            SliderRow("Thickness", o.reticleThicknessDp, 1f..8f, { "%.1f dp".format(it) }) { v -> set { it.copy(reticleThicknessDp = v) } }
            SliderRow("Centre gap", o.reticleGapDp, 0f..40f, { "%.0f dp".format(it) }) { v -> set { it.copy(reticleGapDp = v) } }
            SliderRow("Opacity", o.reticleOpacity, 0.1f..1f, { "%.0f%%".format(it * 100) }) { v -> set { it.copy(reticleOpacity = v) } }
            SliderRow("Offset X", o.reticleOffsetXDp, -300f..300f, { "%.0f dp".format(it) }) { v -> set { it.copy(reticleOffsetXDp = v) } }
            SliderRow("Offset Y", o.reticleOffsetYDp, -300f..300f, { "%.0f dp".format(it) }) { v -> set { it.copy(reticleOffsetYDp = v) } }
            ButtonRow { SmallButton("Centre") { set { it.copy(reticleOffsetXDp = 0f, reticleOffsetYDp = 0f) } } }
        }

        Panel("Safe-area guide") {
            ToggleRow("Show guide", o.guideEnabled, "Thirds, centre lines, margins and the camera cutout") { v -> set { it.copy(guideEnabled = v) } }
            LayerPreview(o.copy(guideEnabled = true, reticleEnabled = false, dimmerEnabled = false), reticle = false)
            ToggleRow("Rule of thirds", o.guideThirds) { v -> set { it.copy(guideThirds = v) } }
            ToggleRow("Centre lines", o.guideCenter) { v -> set { it.copy(guideCenter = v) } }
            ToggleRow("Display cutout", o.guideCutout) { v -> set { it.copy(guideCutout = v) } }
            SliderRow("Safe margin", o.guideMarginPct, 0f..20f, { "%.0f%%".format(it) }, steps = 19) { v -> set { it.copy(guideMarginPct = v) } }
        }

        Panel("Screen dimmer") {
            ToggleRow("Dim the screen", o.dimmerEnabled, "Darkens everything below the system brightness floor") { v -> set { it.copy(dimmerEnabled = v) } }
            SliderRow("Level", o.dimmerLevel, 0f..0.8f, { "%.0f%%".format(it * 100) }) { v -> set { it.copy(dimmerLevel = v) } }
            ToggleRow("Warm tint", o.dimmerWarm) { v -> set { it.copy(dimmerWarm = v) } }
        }

        Panel("Entity overlay") {
            ToggleRow("Show over the screen", o.espEnabled,
                if (state.esp.source == "sandbox") "Source: Local Sandbox Test Feed (simulated)" else "Source: ${state.integration.targetPackage ?: "no app selected"} via umt-sdk",
            ) { v -> set { it.copy(espEnabled = v) }; if (v) tk.ensureStream() }
            RowDivider()
            ButtonRow { SmallButton("Source and drawing options") { nav.navigate(Dest.INTEGRATION.route) } }
        }

        Panel("Kill switch") {
            Note("Stops every overlay layer, plugin panel and entity stream at once. The same button is in the notification while overlays are on.")
            ButtonRow { SmallButton("Stop all", danger = true) { tk.killAll() } }
        }
    }
}

/** Phone-shaped preview drawn with the same code as the real overlay. */
@Composable
private fun LayerPreview(o: OverlaySettings, reticle: Boolean) {
    val density = LocalDensity.current.density
    val drawing = remember(density) { LayerDrawing(density) }
    Canvas(
        Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 6.dp)
            .height(120.dp)
            .clip(RoundedCornerShape(6.dp))
            .background(Color(0xFF2B3540)),
    ) {
        drawIntoCanvas { c ->
            val nc = c.nativeCanvas
            if (reticle) drawing.drawReticle(nc, o, size.width / 2, size.height / 2, 1f)
            else drawing.drawGuide(nc, o, size.width, size.height, emptyList(), 1f)
        }
    }
}
