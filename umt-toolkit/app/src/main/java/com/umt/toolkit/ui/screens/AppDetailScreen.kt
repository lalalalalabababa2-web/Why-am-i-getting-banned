package com.umt.toolkit.ui.screens

import android.content.Intent
import android.net.Uri
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.umt.toolkit.apps.AppAnalysis
import com.umt.toolkit.compat.Availability
import com.umt.toolkit.compat.CompatibilityEngine
import com.umt.toolkit.compat.TargetInfo
import com.umt.toolkit.core.UmtJson
import com.umt.toolkit.ui.Dest
import com.umt.toolkit.ui.LocalMessages
import com.umt.toolkit.ui.LocalToolkit
import com.umt.toolkit.ui.components.ButtonRow
import com.umt.toolkit.ui.components.EmptyState
import com.umt.toolkit.ui.components.InfoRow
import com.umt.toolkit.ui.components.Note
import com.umt.toolkit.ui.components.Panel
import com.umt.toolkit.ui.components.RowDivider
import com.umt.toolkit.ui.components.ScreenColumn
import com.umt.toolkit.ui.components.SettingRow
import com.umt.toolkit.ui.components.SmallButton
import com.umt.toolkit.ui.components.StatusPill
import com.umt.toolkit.ui.components.Tone
import com.umt.toolkit.ui.components.formatBytes
import com.umt.toolkit.ui.theme.Mono
import com.umt.toolkit.ui.theme.Umt
import com.umt.toolkit.ui.writeText
import kotlinx.coroutines.launch
import kotlinx.serialization.encodeToString
import java.text.DateFormat
import java.util.Date

/** Analysis of an installed app ([pkg]) or of the last APK file picked ([pkg] == null). */
@Composable
fun AppDetailScreen(nav: NavController, pkg: String?) {
    val tk = LocalToolkit.current
    val messages = LocalMessages.current
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var analysis by remember { mutableStateOf(if (pkg == null) ApkResult.last else null) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(pkg) {
        if (pkg != null) {
            try {
                analysis = tk.scanner.analyzeInstalled(pkg)
            } catch (e: Exception) {
                error = e.message
                tk.log.w("Analyzer", "Analysis of $pkg failed", e)
            }
        }
    }

    val exporter = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("application/json")) { uri ->
        val a = analysis
        if (uri != null && a != null) scope.launch {
            try {
                writeText(context, uri, UmtJson.encodeToString(a))
                messages.show("Report saved")
            } catch (e: Exception) {
                messages.show("Could not save: ${e.message}")
            }
        }
    }

    val a = analysis
    if (a == null) {
        ScreenColumn {
            if (error != null) Note(error!!, Tone.Bad)
            else if (pkg == null) Note("No APK file has been analysed yet.")
            else LinearProgressIndicator(Modifier.fillMaxWidth(), color = Umt.Accent, trackColor = Umt.Surface2)
        }
        return
    }

    val icon by produceState<ImageBitmap?>(null, a.packageName) {
        value = if (a.source == "installed") tk.scanner.icon(a.packageName) else null
    }
    val caps = remember { tk.deviceCaps() }
    val reports = remember(a) {
        CompatibilityEngine.evaluate(caps, TargetInfo(a.packageName, a.label, a.integrated, a.framework.frameworks, a.isSystem, a.debuggable))
    }
    val df = remember { DateFormat.getDateTimeInstance(DateFormat.MEDIUM, DateFormat.SHORT) }

    ScreenColumn {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(44.dp).clip(RoundedCornerShape(8.dp)).background(Umt.Surface2)) {
                icon?.let { Image(it, null, Modifier.size(44.dp)) }
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(a.label, style = MaterialTheme.typography.titleMedium)
                Text(a.packageName, style = Mono.copy(color = Umt.TextDim))
                Text("${a.versionName ?: "?"} (${a.versionCode}) · ${if (a.source == "installed") "installed" else "file: ${a.location}"}",
                    style = MaterialTheme.typography.bodySmall, color = Umt.TextDim)
            }
        }
        ButtonRow {
            if (a.source == "installed") {
                tk.scanner.launchIntent(a.packageName)?.let { launch -> SmallButton("Open") { context.startActivity(launch) } }
                SmallButton("App info") {
                    context.startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${a.packageName}")))
                }
            }
            if (a.integrated && a.source == "installed") SmallButton("Integrate", primary = true) {
                tk.repo.update { it.copy(integration = it.integration.copy(targetPackage = a.packageName), esp = it.esp.copy(source = "integration")) }
                tk.hub.connect(a.packageName)
                nav.navigate(Dest.INTEGRATION.route)
            }
            SmallButton("Export report") { exporter.launch("${a.packageName}-analysis.json") }
        }

        if (a.warnings.isNotEmpty()) Panel("Warnings") {
            a.warnings.forEach { Note(it, Tone.Warn) }
        }

        Panel("What works with this app") {
            reports.forEachIndexed { i, r ->
                if (i > 0) RowDivider()
                Column(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 6.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(r.module.title, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
                        StatusPill(r.availability.label, when (r.availability) {
                            Availability.AVAILABLE -> Tone.Good
                            Availability.NEEDS_PERMISSION, Availability.NEEDS_INTEGRATION -> Tone.Warn
                            Availability.INFO_ONLY -> Tone.Neutral
                            Availability.UNSUPPORTED -> Tone.Bad
                        })
                    }
                    Text(r.module.tags.joinToString(" · ") { it.label }, style = MaterialTheme.typography.labelSmall, color = Umt.TextFaint)
                    r.reasons.forEach { Text(it, style = MaterialTheme.typography.bodySmall, color = Umt.TextDim) }
                }
            }
        }

        Panel("Package") {
            InfoRow("Min / target SDK", "${a.minSdk} / ${a.targetSdk}" + (a.compileSdk?.let { " (compiled against $it)" } ?: ""))
            InfoRow("This device", "API ${a.deviceSdk}")
            InfoRow(if (a.source == "installed") "Installed in" else "File", a.location, mono = true)
            a.installer?.let { InfoRow("Installed by", it, mono = true) }
            a.firstInstall?.let { InfoRow("First installed", df.format(Date(it))) }
            a.lastUpdate?.let { InfoRow("Last updated", df.format(Date(it))) }
            InfoRow("Size", "${formatBytes(a.totalBytes)} in ${a.files.size} APK file(s)")
            a.files.forEach { InfoRow("  ${it.kind}", "${it.name}  ${formatBytes(it.bytes)}", mono = true) }
            InfoRow("Flags", listOfNotNull(
                if (a.isSystem) "system" else "user",
                if (a.debuggable) "debuggable" else null,
                if (a.integrated) "umt-sdk integrated" else null,
            ).joinToString(", "))
        }

        Panel("Runtime & architecture") {
            if (a.framework.frameworks.isEmpty()) EmptyState("No known runtime detected")
            a.framework.frameworks.forEach { f ->
                InfoRow(f.label, a.framework.evidence[f] ?: "", mono = true)
            }
            RowDivider()
            InfoRow("App ABIs", a.framework.abis.ifEmpty { listOf("none (no native code)") }.joinToString(), mono = true)
            InfoRow("Device ABIs", a.deviceAbis.joinToString(), mono = true)
            InfoRow("DEX", "${a.framework.dexCount} file(s), ${formatBytes(a.framework.dexBytes)}")
            InfoRow("Entries", "${a.framework.entryCount} (${formatBytes(a.framework.uncompressedBytes)} uncompressed), ${a.framework.assetCount} assets")
            if (!a.integrated) Note(CompatibilityEngine.integrationHint(a.framework.frameworks))
        }

        ExpandableList("Native libraries", a.framework.nativeLibs.map { "${it.abi}/${it.name}  ${formatBytes(it.size)}" })
        ExpandableList("Permissions", a.permissions.map { p ->
            p.name.removePrefix("android.permission.") + "  [${p.protection}]" + when (p.granted) { true -> " granted"; false -> " not granted"; null -> "" }
        })
        ExpandableList("Activities", a.activities)
        ExpandableList("Services", a.services)
        ExpandableList("Receivers", a.receivers)
        ExpandableList("Providers", a.providers)
    }
}

@Composable
private fun ExpandableList(title: String, items: List<String>) {
    var open by remember { mutableStateOf(false) }
    Panel("$title (${items.size})", actions = {
        if (items.isNotEmpty()) TextButton(onClick = { open = !open }) {
            Text(if (open) "Hide" else "Show", color = Umt.Accent, style = MaterialTheme.typography.labelMedium)
        }
    }) {
        if (items.isEmpty()) EmptyState("None")
        else if (open) {
            Column(Modifier.padding(horizontal = 12.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                items.take(400).forEach { Text(it, style = Mono.copy(color = Umt.Text)) }
                if (items.size > 400) Text("… ${items.size - 400} more (in the exported report)", style = MaterialTheme.typography.bodySmall, color = Umt.TextDim)
            }
        } else {
            SettingRow(items.take(3).joinToString(", ").take(120) + if (items.size > 3) "…" else "", null, onClick = { open = true })
        }
    }
}
