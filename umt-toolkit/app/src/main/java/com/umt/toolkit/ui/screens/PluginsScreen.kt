@file:OptIn(ExperimentalLayoutApi::class)

package com.umt.toolkit.ui.screens

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.FileOpen
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import com.umt.toolkit.overlay.PanelView
import com.umt.toolkit.plugins.Bindings
import com.umt.toolkit.plugins.CircuitBreaker
import com.umt.toolkit.plugins.InstalledPlugin
import com.umt.toolkit.plugins.PluginTemplates
import com.umt.toolkit.plugins.PluginValidator
import com.umt.toolkit.ui.LocalMessages
import com.umt.toolkit.ui.LocalToolkit
import com.umt.toolkit.ui.components.ButtonRow
import com.umt.toolkit.ui.components.Chip
import com.umt.toolkit.ui.components.CompactField
import com.umt.toolkit.ui.components.ConfirmDialog
import com.umt.toolkit.ui.components.EmptyState
import com.umt.toolkit.ui.components.JsonCodeEditor
import com.umt.toolkit.ui.components.JsonHighlighter
import com.umt.toolkit.ui.components.Note
import com.umt.toolkit.ui.components.Panel
import com.umt.toolkit.ui.components.RowDivider
import com.umt.toolkit.ui.components.ScreenColumn
import com.umt.toolkit.ui.components.SmallButton
import com.umt.toolkit.ui.components.StatusPill
import com.umt.toolkit.ui.components.ToggleRow
import com.umt.toolkit.ui.components.Tone
import com.umt.toolkit.ui.components.selectNext
import com.umt.toolkit.ui.readText
import com.umt.toolkit.ui.theme.Mono
import com.umt.toolkit.ui.theme.Umt
import com.umt.toolkit.ui.writeText
import kotlinx.coroutines.launch

/** Hands a template or imported text to the editor screen. */
object PluginDraft {
    var text: String? = null
}

@Composable
fun PluginsScreen(nav: NavController) {
    val tk = LocalToolkit.current
    val messages = LocalMessages.current
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val plugins by tk.plugins.plugins.collectAsStateWithLifecycle()
    val status by tk.plugins.status.collectAsStateWithLifecycle()
    var choosing by remember { mutableStateOf(false) }
    var deleting by remember { mutableStateOf<String?>(null) }
    var exportId by remember { mutableStateOf<String?>(null) }

    val importer = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri: Uri? ->
        if (uri != null) scope.launch {
            try {
                val text = readText(context, uri, PluginValidator.MAX_BYTES * 2)
                val v = tk.plugins.install(text)
                messages.show(if (v.manifest == null) "Not imported: ${v.problems.firstOrNull()?.message}" else
                    "Imported ${v.manifest.name}" + if (v.ok) "" else " with ${v.errors} error(s); fix them in the editor")
            } catch (e: Exception) {
                messages.show("Import failed: ${e.message}")
            }
        }
    }
    val exporter = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("application/json")) { uri ->
        val id = exportId
        if (uri != null && id != null) scope.launch {
            try { writeText(context, uri, tk.plugins.get(id)?.source.orEmpty()); messages.show("Plugin exported") }
            catch (e: Exception) { messages.show("Export failed: ${e.message}") }
        }
    }

    ScreenColumn {
        Panel("Menu plugins") {
            Note("A plugin is a JSON file that describes a floating menu panel: tabs, sections, toggles, sliders, dropdowns, buttons, value readouts and presets. Each control is bound to something the toolkit really controls, or to a value of an integrated app. No code is loaded.")
            ButtonRow {
                SmallButton("New", icon = Icons.Outlined.Add, primary = true) { choosing = true }
                SmallButton("Import", icon = Icons.Outlined.FileOpen) { importer.launch(arrayOf("application/json", "text/plain", "*/*")) }
            }
        }

        if (plugins.isEmpty()) Panel("Installed") { EmptyState("No plugins yet. Start from a template.") }
        plugins.forEach { p -> PluginCard(p, status[p.id], nav, onDelete = { deleting = p.id }, onExport = { exportId = p.id; exporter.launch("${p.id}.json") }) }

        Panel("Rules") {
            Note("Permissions a plugin may declare: ${PluginValidator.ALLOWED_PERMISSIONS.joinToString()}.")
            Note("Caps: ${PluginValidator.MAX_TABS} tabs, ${PluginValidator.MAX_SECTIONS} sections, ${PluginValidator.MAX_CONTROLS} controls, ${PluginValidator.MAX_PRESETS} presets, refresh ${PluginValidator.MIN_REFRESH_MS}–${PluginValidator.MAX_REFRESH_MS} ms, ${PluginValidator.MAX_BYTES / 1024} KB.")
            Note("Circuit breaker: ${CircuitBreaker.THRESHOLD} faults (a rejected or unanswered value, an unknown profile, a failing action) switch the plugin off until you reset it.")
            Note("Bindings: ${Bindings.local.size} toolkit settings, bridge:<key> for integrated apps, ${Bindings.actions.size} button actions, ${Bindings.sources.size} value sources. The editor lists them.")
        }
    }

    if (choosing) AlertDialog(
        onDismissRequest = { choosing = false },
        containerColor = Umt.Surface2,
        title = { Text("Start from a template", style = MaterialTheme.typography.titleMedium) },
        text = {
            Column {
                PluginTemplates.all.forEach { t ->
                    Column(Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
                        TextButton(onClick = { PluginDraft.text = t.json; choosing = false; nav.navigate("plugin/new") }) {
                            Text(t.name, color = Umt.Accent)
                        }
                        Text(t.description, style = MaterialTheme.typography.bodySmall, color = Umt.TextDim, modifier = Modifier.padding(horizontal = 12.dp))
                    }
                }
            }
        },
        confirmButton = { TextButton(onClick = { choosing = false }) { Text("Cancel", color = Umt.TextDim) } },
    )
    deleting?.let { id ->
        ConfirmDialog("Delete plugin?", "Removes $id and its saved panel position.", "Delete", danger = true, onDismiss = { deleting = null }) {
            tk.plugins.delete(id)
        }
    }
}

@Composable
private fun PluginCard(p: InstalledPlugin, status: String?, nav: NavController, onDelete: () -> Unit, onExport: () -> Unit) {
    val tk = LocalToolkit.current
    val messages = LocalMessages.current
    val m = p.manifest
    Panel(null) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Text(m?.name ?: p.id, style = MaterialTheme.typography.bodyLarge)
                Text("${p.id} · v${m?.version ?: "?"}${m?.author?.takeIf { it.isNotBlank() }?.let { " · $it" } ?: ""}", style = Mono.copy(color = Umt.TextDim))
            }
        }
        FlowRow(Modifier.padding(horizontal = 12.dp), horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            when {
                p.manifest == null -> StatusPill("Unreadable", Tone.Bad)
                !p.validation.ok -> StatusPill("${p.validation.errors} error(s)", Tone.Bad)
                else -> StatusPill("Valid", Tone.Good)
            }
            if (p.state.tripped) StatusPill("Circuit open", Tone.Bad)
            else if (p.state.faults > 0) StatusPill("Faults ${p.state.faults}/${CircuitBreaker.THRESHOLD}", Tone.Warn)
            m?.target?.let { StatusPill("target $it", Tone.Accent) }
            m?.permissions?.forEach { StatusPill(it, Tone.Neutral) }
        }
        m?.description?.takeIf { it.isNotBlank() }?.let { Note(it) }
        p.state.lastFault?.let { Note("Last fault: $it", Tone.Bad) }
        status?.let { Note(it) }
        ToggleRow("Enabled", p.state.enabled, enabled = p.usable || p.state.enabled) { on ->
            tk.plugins.setEnabled(p.id, on)?.let { messages.show(it) }
        }
        ToggleRow("Show floating panel", p.state.panelVisible, enabled = p.state.enabled) { on ->
            tk.plugins.setPanelVisible(p.id, on)?.let { messages.show(it) }
        }
        ButtonRow {
            SmallButton("Edit") { nav.navigate("plugin/${p.id}") }
            SmallButton("Export") { onExport() }
            if (p.state.faults > 0 || p.state.tripped) SmallButton("Reset faults") { tk.plugins.resetFaults(p.id) }
            SmallButton("Delete", danger = true) { onDelete() }
        }
    }
}

/** JSON editor with live validation, find, formatting, a binding reference and a live preview. */
@Composable
fun PluginEditorScreen(nav: NavController, id: String) {
    val tk = LocalToolkit.current
    val messages = LocalMessages.current
    val original = remember(id) { if (id == "new") PluginDraft.text ?: PluginTemplates.blank.json else tk.plugins.get(id)?.source ?: "" }
    var value by rememberSaveable(id, stateSaver = TextFieldValue.Saver) { mutableStateOf(TextFieldValue(original)) }
    var query by rememberSaveable { mutableStateOf("") }
    var showRef by rememberSaveable { mutableStateOf(false) }
    var view by rememberSaveable { mutableStateOf("code") }
    val validation = remember(value.text) { PluginValidator.validate(value.text) }
    val plugins by tk.plugins.plugins.collectAsStateWithLifecycle()
    val dirty = value.text != original
    LaunchedEffect(Unit) { if (id == "new") PluginDraft.text = null }

    Column(Modifier.fillMaxSize()) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 6.dp), horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
            Chip("Code", view == "code") { view = "code" }
            Chip("Preview", view == "preview", enabled = validation.manifest != null) { view = "preview" }
            Chip("Reference", showRef) { showRef = !showRef }
            Row(Modifier.weight(1f)) {}
            StatusPill(if (validation.ok) "Valid" else "${validation.errors} error(s)", if (validation.ok) Tone.Good else Tone.Bad)
        }
        FlowRow(Modifier.padding(horizontal = 12.dp), horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            SmallButton("Save", primary = true, enabled = validation.manifest != null && (dirty || id == "new")) {
                val v = tk.plugins.install(value.text, replaceId = if (id == "new") null else id)
                if (v.manifest != null) {
                    messages.show(if (v.ok) "Saved ${v.manifest.name}" else "Saved with ${v.errors} error(s); it stays disabled until they are fixed")
                    nav.popBackStack()
                }
            }
            SmallButton("Format") { value = TextFieldValue(JsonHighlighter.format(value.text)) }
            SmallButton("Revert", enabled = dirty) { value = TextFieldValue(original) }
        }
        Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 6.dp), horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
            CompactField(query, { query = it }, "Find", Modifier.weight(1f), mono = true)
            SmallButton("◀", enabled = query.isNotEmpty()) { value = value.selectNext(query, backwards = true) }
            SmallButton("▶", enabled = query.isNotEmpty()) { value = value.selectNext(query) }
            if (query.isNotEmpty()) Text("${Regex(Regex.escape(query), RegexOption.IGNORE_CASE).findAll(value.text).count()}", style = Mono, color = Umt.TextDim)
        }
        HorizontalDivider(color = Umt.Outline)

        Column(Modifier.weight(1f).verticalScroll(rememberScrollState())) {
            if (showRef) BindingReference()
            if (view == "code") {
                JsonCodeEditor(value, { value = it }, query, errorLines(value.text, validation.problems.filter { it.error }.map { it.path }), Modifier.fillMaxWidth().heightIn(min = 300.dp))
            } else {
                val m = validation.manifest
                if (m != null) {
                    val existing = plugins.firstOrNull { it.id == m.id }
                    val preview = InstalledPlugin(m.id, value.text, validation, (existing?.state ?: com.umt.toolkit.plugins.PluginState()).copy(enabled = validation.ok))
                    Note(if (validation.ok) "Live preview: the controls act on the real bindings, exactly as the floating panel will."
                        else "Fix the errors to make the preview controls act.")
                    key(value.text) {
                        AndroidView(
                            factory = { ctx -> PanelView(ctx, tk, preview, object : PanelView.Callbacks {}, inApp = true) },
                            update = { it.update(preview) },
                            modifier = Modifier.padding(12.dp).fillMaxWidth().background(Umt.Bg),
                        )
                    }
                }
            }
        }

        if (validation.problems.isNotEmpty()) {
            HorizontalDivider(color = Umt.Outline)
            Column(Modifier.fillMaxWidth().heightIn(max = 160.dp).verticalScroll(rememberScrollState()).background(Umt.Surface).padding(vertical = 6.dp)) {
                validation.problems.forEach { pr ->
                    Text(
                        "${if (pr.error) "error" else "note"}  ${pr.path}: ${pr.message}",
                        style = Mono.copy(color = if (pr.error) Umt.Bad else Umt.Warn),
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 1.dp),
                    )
                }
            }
        }
    }
}

/** Best-effort mapping of problem paths to source lines (the line where the referenced key or id appears). */
private fun errorLines(text: String, paths: List<String>): Set<Int> {
    val lines = text.lines()
    val result = HashSet<Int>()
    for (p in paths) {
        val key = p.substringAfterLast('.').substringBefore('[')
        if (key.isEmpty()) continue
        val idx = lines.indexOfFirst { it.contains("\"$key\"") }
        if (idx >= 0) result += idx + 1
    }
    return result
}

@Composable
private fun BindingReference() {
    Panel("Reference") {
        Text("bind (toggle/slider/dropdown)", style = MaterialTheme.typography.labelMedium, color = Umt.TextDim, modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp))
        Bindings.local.values.forEach { b ->
            Text("${b.key}  ${b.type.name.lowercase()}${b.min?.let { " ${it}..${b.max}" } ?: ""}${if (b.choices.isNotEmpty()) " ${b.choices}" else ""}",
                style = Mono.copy(color = Umt.Text), modifier = Modifier.padding(horizontal = 12.dp))
        }
        Text("bridge:<key>  a value the target app registered with umt-sdk", style = Mono.copy(color = Umt.Text), modifier = Modifier.padding(horizontal = 12.dp))
        RowDivider()
        Text("action (button)", style = MaterialTheme.typography.labelMedium, color = Umt.TextDim, modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp))
        Bindings.actions.forEach { Text(it, style = Mono.copy(color = Umt.Text), modifier = Modifier.padding(horizontal = 12.dp)) }
        RowDivider()
        Text("source (value)", style = MaterialTheme.typography.labelMedium, color = Umt.TextDim, modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp))
        Bindings.sources.forEach { (k, l) -> Text("$k  $l", style = Mono.copy(color = Umt.Text), modifier = Modifier.padding(horizontal = 12.dp)) }
        Row(Modifier.height(6.dp)) {}
    }
}
