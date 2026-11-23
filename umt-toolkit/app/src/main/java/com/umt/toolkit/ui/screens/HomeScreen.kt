package com.umt.toolkit.ui.screens

import android.Manifest
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Apps
import androidx.compose.material.icons.outlined.Extension
import androidx.compose.material.icons.outlined.Hub
import androidx.compose.material.icons.outlined.Layers
import androidx.compose.material.icons.outlined.PowerSettingsNew
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import com.umt.toolkit.core.CrashHandler
import com.umt.toolkit.overlay.OverlayService
import com.umt.toolkit.perf.PerfMath
import com.umt.toolkit.ui.Dest
import com.umt.toolkit.ui.LocalToolkit
import com.umt.toolkit.ui.components.ButtonRow
import com.umt.toolkit.ui.components.InfoRow
import com.umt.toolkit.ui.components.Note
import com.umt.toolkit.ui.components.Panel
import com.umt.toolkit.ui.components.RowDivider
import com.umt.toolkit.ui.components.ScreenColumn
import com.umt.toolkit.ui.components.SettingRow
import com.umt.toolkit.ui.components.SmallButton
import com.umt.toolkit.ui.components.StatusPill
import com.umt.toolkit.ui.components.Tone

@Composable
fun HomeScreen(nav: NavController) {
    val tk = LocalToolkit.current
    val context = LocalContext.current
    val state by tk.repo.state.collectAsStateWithLifecycle()
    val plugins by tk.plugins.plugins.collectAsStateWithLifecycle()
    val sessions by tk.hub.sessions.collectAsStateWithLifecycle()
    val sample by tk.perf.latest.collectAsStateWithLifecycle()
    var resumeTick by remember { mutableIntStateOf(0) }
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) { resumeTick++ }
    val overlayOk = remember(resumeTick) { tk.canDrawOverlays() }
    val notifyOk = remember(resumeTick) { tk.canPostNotifications() }
    val crashes = remember(resumeTick) { CrashHandler.reports(context.filesDir).size }
    val serviceRunning by OverlayService.runningFlow.collectAsStateWithLifecycle()

    DisposableEffect(Unit) {
        tk.perf.acquire("home")
        onDispose { tk.perf.release("home") }
    }
    val notifLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { resumeTick++ }

    ScreenColumn {
        if (crashes > 0) {
            Panel("Crash reports") {
                Note("$crashes crash report(s) were saved. They are listed in the Console.", Tone.Bad)
                ButtonRow { SmallButton("Open console") { nav.navigate(Dest.CONSOLE.route) } }
            }
        }

        Panel("Status") {
            SettingRow("Display over other apps", if (overlayOk) "Granted" else "Needed for every overlay and menu panel") {
                if (overlayOk) StatusPill("Granted", Tone.Good)
                else SmallButton("Grant", primary = true) {
                    context.startActivity(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:${context.packageName}")))
                }
            }
            RowDivider()
            SettingRow("Notifications", if (Build.VERSION.SDK_INT >= 33) "Shows the Stop-all kill switch" else "Not a runtime permission before Android 13") {
                if (notifyOk) StatusPill("Allowed", Tone.Good)
                else SmallButton("Allow") { notifLauncher.launch(Manifest.permission.POST_NOTIFICATIONS) }
            }
            RowDivider()
            val layers = buildList {
                val o = state.overlays
                if (o.hudEnabled) add("HUD"); if (o.reticleEnabled) add("Reticle"); if (o.guideEnabled) add("Guide")
                if (o.dimmerEnabled) add("Dimmer"); if (o.espEnabled) add("Entity overlay")
                plugins.filter { it.state.panelVisible }.forEach { add(it.title) }
            }
            SettingRow("Overlay service", if (layers.isEmpty()) "Nothing switched on" else layers.joinToString(" · ")) {
                StatusPill(if (serviceRunning) "Running" else "Stopped", if (serviceRunning) Tone.Good else Tone.Neutral)
            }
            ButtonRow {
                SmallButton("Stop all", icon = Icons.Outlined.PowerSettingsNew, danger = true, enabled = layers.isNotEmpty() || serviceRunning) { tk.killAll(); resumeTick++ }
                SmallButton("Overlays", icon = Icons.Outlined.Layers) { nav.navigate(Dest.OVERLAYS.route) }
            }
        }

        Panel("Live readings") {
            val s = sample
            if (s == null) Note("Sampling…")
            else {
                InfoRow("Battery", "%.0f%%%s".format(s.batteryPct, if (s.charging) ", charging" else "") +
                    (s.batteryTempC?.let { ", %.1f °C".format(it) } ?: ""))
                InfoRow("Thermal", PerfMath.thermalLabel(s.thermalStatus))
                InfoRow("Memory", "%.0f MB free of %.0f MB%s".format(s.memAvailMb, s.memTotalMb, if (s.lowMemory) " (low)" else ""))
                InfoRow("Toolkit CPU", "%.1f%% of the device".format(s.cpuSelf))
                InfoRow("Display", "%.0f Hz".format(s.refreshHz))
            }
        }

        Panel("Device") {
            val d = tk.perf.static
            InfoRow("Model", "${d.manufacturer} ${d.model}")
            InfoRow("Android", "${d.android} (API ${d.sdk})")
            d.soc?.takeIf { it.isNotBlank() }?.let { InfoRow("SoC", it) }
            InfoRow("ABIs", d.abis.joinToString(), mono = true)
            InfoRow("CPU cores", "${d.cores}" + if (d.maxFreqMhz.isNotEmpty()) " (max ${d.maxFreqMhz.distinct().sortedDescending().joinToString("/")} MHz)" else "")
        }

        Panel("Integration") {
            val target = state.integration.targetPackage
            val s = tk.hub.session(target)
            SettingRow(
                if (state.esp.source == "sandbox") "Local Sandbox Test Feed" else target ?: "No app selected",
                if (state.esp.source == "sandbox") "Simulated entities for trying the entity overlay" else "${sessions.size} connected session(s)",
                onClick = { nav.navigate(Dest.INTEGRATION.route) },
            ) {
                if (state.esp.source == "integration" && s != null) StatusPill(s.state.label, if (s.state.name == "CONNECTED") Tone.Good else Tone.Warn)
            }
        }

        Panel("Go to") {
            ButtonRow {
                SmallButton("Apps", icon = Icons.Outlined.Apps) { nav.navigate(Dest.APPS.route) }
                SmallButton("Integration", icon = Icons.Outlined.Hub) { nav.navigate(Dest.INTEGRATION.route) }
                SmallButton("Plugins", icon = Icons.Outlined.Extension) { nav.navigate(Dest.PLUGINS.route) }
            }
        }
    }
}
