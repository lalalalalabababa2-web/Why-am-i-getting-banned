package com.umt.toolkit.ui.screens

import android.Manifest
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.umt.sdk.UmtProtocol
import com.umt.toolkit.BuildConfig
import com.umt.toolkit.compat.Capability
import com.umt.toolkit.compat.ModuleId
import com.umt.toolkit.ui.LocalMessages
import com.umt.toolkit.ui.LocalToolkit
import com.umt.toolkit.ui.components.ButtonRow
import com.umt.toolkit.ui.components.ChoiceRow
import com.umt.toolkit.ui.components.ConfirmDialog
import com.umt.toolkit.ui.components.InfoRow
import com.umt.toolkit.ui.components.Note
import com.umt.toolkit.ui.components.Panel
import com.umt.toolkit.ui.components.RowDivider
import com.umt.toolkit.ui.components.ScreenColumn
import com.umt.toolkit.ui.components.SettingRow
import com.umt.toolkit.ui.components.SmallButton
import com.umt.toolkit.ui.components.StatusPill
import com.umt.toolkit.ui.components.ToggleRow
import com.umt.toolkit.ui.components.Tone
import com.umt.toolkit.ui.components.formatBytes
import com.umt.toolkit.ui.theme.Umt
import kotlinx.coroutines.launch
import java.io.File

@Composable
fun SettingsScreen() {
    val tk = LocalToolkit.current
    val messages = LocalMessages.current
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val state by tk.repo.state.collectAsStateWithLifecycle()
    var tick by remember { mutableIntStateOf(0) }
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) { tick++ }
    val overlayOk = remember(tick) { tk.canDrawOverlays() }
    val notifyOk = remember(tick) { tk.canPostNotifications() }
    var resetting by remember { mutableStateOf(false) }
    var showMatrix by remember { mutableStateOf(false) }
    var showLimits by remember { mutableStateOf(false) }
    val notifLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { tick++ }
    val storage = remember(tick) { File(context.filesDir.path).walkTopDown().filter { it.isFile }.sumOf { it.length() } }

    ScreenColumn {
        Panel("Permissions") {
            SettingRow("Display over other apps", "SYSTEM_ALERT_WINDOW · overlays and panels") {
                if (overlayOk) StatusPill("Granted", Tone.Good)
                else SmallButton("Grant") { context.startActivity(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:${context.packageName}"))) }
            }
            RowDivider()
            SettingRow("Notifications", "POST_NOTIFICATIONS · kill switch and plugin messages") {
                if (notifyOk) StatusPill("Allowed", Tone.Good)
                else SmallButton("Allow") { if (Build.VERSION.SDK_INT >= 33) notifLauncher.launch(Manifest.permission.POST_NOTIFICATIONS) }
            }
            RowDivider()
            SettingRow("See installed apps", "QUERY_ALL_PACKAGES · granted at install, used by the Apps screen") { StatusPill("Declared", Tone.Neutral) }
            ButtonRow {
                SmallButton("Android app settings") {
                    context.startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}")))
                }
            }
        }

        Panel("Kill switch") {
            Note("Turns off every overlay layer and plugin panel and stops entity streams. Also in the notification while overlays are on.")
            ButtonRow { SmallButton("Stop everything now", danger = true) { tk.killAll(); messages.show("Everything stopped") } }
        }

        Panel("Logging") {
            ChoiceRow("Keep messages from", listOf("DEBUG", "INFO", "WARN", "ERROR").map { it to it.lowercase() }, state.governor.logLevel) { v ->
                tk.repo.updateGovernor { it.copy(logLevel = v) }
            }
            ChoiceRow("Lines kept in memory", listOf(500, 2000, 5000, 20000).map { "$it" to "$it" }, "${state.governor.logCapacity}") { v ->
                tk.repo.updateGovernor { it.copy(logCapacity = v.toInt()) }
            }
        }

        Panel("Compatibility", actions = {
            TextButton(onClick = { showMatrix = !showMatrix }) { Text(if (showMatrix) "Hide" else "Show", color = Umt.Accent, style = MaterialTheme.typography.labelMedium) }
        }) {
            Note("Every module is tagged with one of seven capability classes and checked per app on the Apps screen.")
            if (showMatrix) {
                Capability.entries.forEach { c -> InfoRow(c.label, c.summary) }
                RowDivider()
                ModuleId.entries.forEach { m -> InfoRow(m.title, m.tags.joinToString(" · ") { it.label }) }
                RowDivider()
                InfoRow("This device", "Android ${Build.VERSION.RELEASE}, API ${Build.VERSION.SDK_INT}")
                InfoRow("Thermal status", if (Build.VERSION.SDK_INT >= 29) "available" else "needs Android 10+")
                InfoRow("Overlay touch cap", "%.0f%%".format(tk.maxPassthroughOpacity() * 100))
            }
        }

        Panel("Known limitations", actions = {
            TextButton(onClick = { showLimits = !showLimits }) { Text(if (showLimits) "Hide" else "Show", color = Umt.Accent, style = MaterialTheme.typography.labelMedium) }
        }) {
            if (showLimits) {
                Note("No access to another app's memory: every app has its own Linux user ID and SELinux domain. Entity overlays only show data from apps that integrate umt-sdk, or the Local Sandbox Test Feed.")
                Note("Device-wide CPU usage is blocked by SELinux on Android 8+; the toolkit reports its own CPU time instead of inventing a number.")
                Note("No forced FPS or GPU changes for other apps. Frame graphs measure the toolkit's own Choreographer frame pacing.")
                Note("Plugins are declarative JSON with a permission allowlist, caps and a 3-fault circuit breaker. No .dex or .so loading.")
                Note("Overlay panels are not focusable (the app below keeps the keyboard), so keyboard shortcuts are not available inside them; the search field becomes focusable only while used.")
            } else Note("Five items; tap Show.")
        }

        Panel("Advanced") {
            ToggleRow("Advanced mode", state.ui.advancedMode, "Shows the root-level reference below") { v ->
                tk.repo.update { it.copy(ui = it.ui.copy(advancedMode = v)) }
            }
            if (state.ui.advancedMode) {
                RowDivider()
                Text("Root-level reference (info only)", style = MaterialTheme.typography.labelMedium, color = Umt.TextDim, modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp))
                Note("Changing system-wide settings such as CPU governors, GPU frequency or other apps' private data needs root or system privileges. The toolkit never requests root, never runs su and never escalates privileges; these capabilities are listed only so the compatibility report is complete.")
            }
        }

        Panel("Data") {
            InfoRow("Stored by the toolkit", formatBytes(storage))
            ButtonRow {
                SmallButton("Clear performance sessions") { scope.launch { tk.perf.clearSessions(); tick++; messages.show("Sessions deleted") } }
                SmallButton("Reset all settings", danger = true) { resetting = true }
            }
        }

        Panel("About") {
            InfoRow("Version", "${BuildConfig.VERSION_NAME} (${BuildConfig.VERSION_CODE}) ${BuildConfig.BUILD_TYPE}")
            InfoRow("Package", BuildConfig.APPLICATION_ID, mono = true)
            InfoRow("umt-sdk protocol", "v${UmtProtocol.VERSION} (SDK ${UmtProtocol.SDK_VERSION})")
            InfoRow("Integration flag", UmtProtocol.META_SUPPORTED, mono = true)
        }
    }

    if (resetting) ConfirmDialog("Reset all settings?", "Overlay, entity-overlay, governor and integration settings go back to defaults. Profiles, plugins and patches are kept.",
        "Reset", danger = true, onDismiss = { resetting = false }) {
        tk.killAll()
        tk.repo.resetAll()
        messages.show("Settings reset")
    }
}
