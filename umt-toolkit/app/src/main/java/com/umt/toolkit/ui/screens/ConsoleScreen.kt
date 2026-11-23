package com.umt.toolkit.ui.screens

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.umt.toolkit.core.CrashHandler
import com.umt.toolkit.core.LogLevel
import com.umt.toolkit.ui.LocalMessages
import com.umt.toolkit.ui.LocalToolkit
import com.umt.toolkit.ui.components.Chip
import com.umt.toolkit.ui.components.CompactField
import com.umt.toolkit.ui.components.SmallButton
import com.umt.toolkit.ui.theme.Mono
import com.umt.toolkit.ui.theme.Umt
import com.umt.toolkit.ui.writeText
import kotlinx.coroutines.launch
import java.io.File

@Composable
fun ConsoleScreen() {
    val tk = LocalToolkit.current
    val messages = LocalMessages.current
    val context = LocalContext.current
    val clipboard = LocalClipboardManager.current
    val scope = rememberCoroutineScope()
    val entries by tk.log.entries.collectAsStateWithLifecycle()
    var minLevel by rememberSaveable { mutableStateOf(LogLevel.DEBUG) }
    var query by rememberSaveable { mutableStateOf("") }
    var follow by rememberSaveable { mutableStateOf(true) }
    var crashTick by remember { mutableIntStateOf(0) }
    val crashes = remember(crashTick) { CrashHandler.reports(context.filesDir) }
    var viewing by remember { mutableStateOf<File?>(null) }
    val listState = rememberLazyListState()

    val shown = remember(entries, minLevel, query) {
        entries.filter { it.level.ordinal >= minLevel.ordinal && (query.isBlank() || it.message.contains(query, true) || it.tag.contains(query, true)) }
    }
    LaunchedEffect(shown.size, follow) { if (follow && shown.isNotEmpty()) listState.scrollToItem(shown.size - 1) }

    val exporter = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("text/plain")) { uri ->
        if (uri != null) scope.launch {
            try { writeText(context, uri, tk.log.exportText()); messages.show("Log exported") }
            catch (e: Exception) { messages.show("Export failed: ${e.message}") }
        }
    }

    Column(Modifier.fillMaxSize()) {
        Column(Modifier.padding(horizontal = 12.dp, vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                LogLevel.entries.forEach { l -> Chip(l.name.lowercase(), minLevel == l) { minLevel = l } }
                Spacer(Modifier.weight(1f))
                Chip("follow", follow) { follow = !follow }
            }
            CompactField(query, { query = it }, "Filter", Modifier.fillMaxWidth())
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                SmallButton("Copy") {
                    clipboard.setText(AnnotatedString(shown.joinToString("\n") { it.format() }))
                    messages.show("${shown.size} lines copied")
                }
                SmallButton("Export") { exporter.launch("umt-log.txt") }
                SmallButton("Clear") { tk.log.clear() }
            }
            Text("Showing ${shown.size} of ${entries.size} · level saved in the log file: ${tk.log.minLevel.name.lowercase()} and above",
                style = MaterialTheme.typography.labelSmall, color = Umt.TextFaint)
        }
        if (crashes.isNotEmpty()) {
            HorizontalDivider(color = Umt.Outline)
            Column(Modifier.padding(horizontal = 12.dp, vertical = 6.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Crash reports (${crashes.size})", style = MaterialTheme.typography.labelMedium, color = Umt.Bad, modifier = Modifier.weight(1f))
                    TextButton(onClick = { CrashHandler.clear(context.filesDir); crashTick++ }) { Text("Delete all", color = Umt.TextDim) }
                }
                crashes.take(5).forEach { f ->
                    Text(f.name, style = Mono.copy(color = Umt.Accent), modifier = Modifier.clickable { viewing = f }.padding(vertical = 2.dp))
                }
            }
        }
        HorizontalDivider(color = Umt.Outline)
        LazyColumn(Modifier.fillMaxSize(), state = listState) {
            items(shown) { e ->
                Text(
                    e.format(),
                    style = Mono.copy(color = when (e.level) {
                        LogLevel.ERROR -> Umt.Bad
                        LogLevel.WARN -> Umt.Warn
                        LogLevel.INFO -> Umt.Text
                        LogLevel.DEBUG -> Umt.TextDim
                    }),
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 1.dp),
                )
            }
        }
    }

    viewing?.let { f ->
        AlertDialog(
            onDismissRequest = { viewing = null },
            containerColor = Umt.Surface2,
            title = { Text(f.name, style = MaterialTheme.typography.titleSmall) },
            text = { Text(remember(f) { f.readText() }, style = Mono.copy(color = Umt.Text), modifier = Modifier.verticalScroll(rememberScrollState())) },
            confirmButton = {
                TextButton(onClick = { clipboard.setText(AnnotatedString(f.readText())); messages.show("Report copied") }) { Text("Copy", color = Umt.Accent) }
            },
            dismissButton = { TextButton(onClick = { viewing = null }) { Text("Close", color = Umt.TextDim) } },
        )
    }
}
