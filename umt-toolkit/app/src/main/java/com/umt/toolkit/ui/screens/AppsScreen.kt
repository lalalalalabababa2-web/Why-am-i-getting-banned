package com.umt.toolkit.ui.screens

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.FileOpen
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.umt.toolkit.apps.AppAnalysis
import com.umt.toolkit.apps.InstalledApp
import com.umt.toolkit.ui.LocalMessages
import com.umt.toolkit.ui.LocalToolkit
import com.umt.toolkit.ui.components.Chip
import com.umt.toolkit.ui.components.CompactField
import com.umt.toolkit.ui.components.SmallButton
import com.umt.toolkit.ui.components.StatusPill
import com.umt.toolkit.ui.components.Tone
import com.umt.toolkit.ui.components.formatBytes
import com.umt.toolkit.ui.theme.Mono
import com.umt.toolkit.ui.theme.Umt
import kotlinx.coroutines.launch

/** Holds the latest APK-file analysis between the Apps screen and the detail screen. */
object ApkResult {
    var last: AppAnalysis? = null
}

@Composable
fun AppsScreen(nav: NavController) {
    val tk = LocalToolkit.current
    val messages = LocalMessages.current
    val scope = rememberCoroutineScope()
    var reload by remember { mutableIntStateOf(0) }
    var apps by remember { mutableStateOf<List<InstalledApp>?>(null) }
    var query by rememberSaveable { mutableStateOf("") }
    var filter by rememberSaveable { mutableStateOf("user") }
    var sort by rememberSaveable { mutableStateOf("name") }
    var busy by remember { mutableStateOf(false) }

    LaunchedEffect(reload) {
        apps = try {
            tk.scanner.listInstalled()
        } catch (e: Exception) {
            messages.show("Could not list apps: ${e.message}")
            emptyList()
        }
    }

    val picker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) scope.launch {
            busy = true
            try {
                ApkResult.last = tk.scanner.analyzeUri(uri)
                nav.navigate("apk")
            } catch (e: Exception) {
                messages.show(e.message ?: "Analysis failed")
                tk.log.w("Analyzer", "APK analysis failed", e)
            } finally {
                busy = false
            }
        }
    }

    val shown = remember(apps, query, filter, sort) {
        apps.orEmpty().asSequence()
            .filter {
                when (filter) {
                    "user" -> !it.isSystem
                    "system" -> it.isSystem
                    "integrated" -> it.integrated
                    else -> true
                }
            }
            .filter { query.isBlank() || it.label.contains(query, true) || it.packageName.contains(query, true) }
            .let { seq ->
                when (sort) {
                    "size" -> seq.sortedByDescending { it.apkBytes }
                    "updated" -> seq.sortedByDescending { it.lastUpdate }
                    else -> seq.sortedBy { it.label.lowercase() }
                }
            }.toList()
    }

    Column(Modifier.fillMaxSize()) {
        Column(Modifier.padding(horizontal = 12.dp, vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                CompactField(query, { query = it }, "Search name or package", Modifier.weight(1f))
                SmallButton("APK file", icon = Icons.Outlined.FileOpen, enabled = !busy) {
                    picker.launch(arrayOf("application/vnd.android.package-archive", "application/zip", "application/octet-stream", "*/*"))
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                listOf("user" to "User", "system" to "System", "integrated" to "Integrated", "all" to "All").forEach { (k, l) ->
                    Chip(l, filter == k) { filter = k }
                }
                Spacer(Modifier.weight(1f))
                Box(Modifier.clickable { reload++ }.padding(4.dp)) {
                    androidx.compose.material3.Icon(Icons.Outlined.Refresh, "Reload", tint = Umt.TextDim, modifier = Modifier.size(18.dp))
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                Text("Sort", style = MaterialTheme.typography.labelSmall, color = Umt.TextDim)
                listOf("name" to "Name", "size" to "Size", "updated" to "Updated").forEach { (k, l) -> Chip(l, sort == k) { sort = k } }
                Spacer(Modifier.weight(1f))
                Text("${shown.size} apps", style = MaterialTheme.typography.labelSmall, color = Umt.TextDim)
            }
        }
        if (busy || apps == null) LinearProgressIndicator(Modifier.fillMaxWidth(), color = Umt.Accent, trackColor = Umt.Surface2)
        HorizontalDivider(color = Umt.Outline)
        LazyColumn(Modifier.fillMaxSize()) {
            items(shown, key = { it.packageName }) { app ->
                AppRow(app) { nav.navigate("app/${app.packageName}") }
                HorizontalDivider(color = Umt.Outline, modifier = Modifier.padding(start = 56.dp))
            }
        }
    }
}

@Composable
private fun AppRow(app: InstalledApp, onClick: () -> Unit) {
    val tk = LocalToolkit.current
    val icon by produceState<ImageBitmap?>(null, app.packageName) { value = tk.scanner.icon(app.packageName) }
    Row(
        Modifier.fillMaxWidth().clickable(onClick = onClick).padding(horizontal = 12.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.size(32.dp).clip(RoundedCornerShape(6.dp)).background(Umt.Surface2)) {
            icon?.let { Image(it, null, Modifier.size(32.dp)) }
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(app.label, style = MaterialTheme.typography.bodyMedium, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f, fill = false))
                if (app.integrated) StatusPill("SDK", Tone.Accent)
                if (app.debuggable) StatusPill("debug", Tone.Warn)
                if (!app.enabled) StatusPill("disabled", Tone.Neutral)
            }
            Text(app.packageName, style = Mono.copy(color = Umt.TextDim), maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(
                "${app.versionName ?: "?"} · ${formatBytes(app.apkBytes)}${if (app.splitCount > 0) " · ${app.splitCount} splits" else ""} · API ${app.targetSdk}",
                style = MaterialTheme.typography.labelSmall, color = Umt.TextFaint,
            )
        }
    }
}
