@file:OptIn(ExperimentalLayoutApi::class)

package com.umt.toolkit.ui.screens

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.umt.sdk.ValueSpec
import com.umt.sdk.ValueType
import com.umt.toolkit.apps.InstalledApp
import com.umt.toolkit.esp.EspRenderer
import com.umt.toolkit.integration.LinkState
import com.umt.toolkit.integration.PatchPlanner
import com.umt.toolkit.integration.Session
import com.umt.toolkit.model.EspSettings
import com.umt.toolkit.model.Palette
import com.umt.toolkit.ui.LocalMessages
import com.umt.toolkit.ui.LocalToolkit
import com.umt.toolkit.ui.components.ButtonRow
import com.umt.toolkit.ui.components.CheckRow
import com.umt.toolkit.ui.components.Chip
import com.umt.toolkit.ui.components.ChoiceRow
import com.umt.toolkit.ui.components.CompactField
import com.umt.toolkit.ui.components.ConfirmDialog
import com.umt.toolkit.ui.components.EmptyState
import com.umt.toolkit.ui.components.InfoRow
import com.umt.toolkit.ui.components.Note
import com.umt.toolkit.ui.components.Panel
import com.umt.toolkit.ui.components.RowDivider
import com.umt.toolkit.ui.components.ScreenColumn
import com.umt.toolkit.ui.components.SettingRow
import com.umt.toolkit.ui.components.SliderRow
import com.umt.toolkit.ui.components.SmallButton
import com.umt.toolkit.ui.components.StatusPill
import com.umt.toolkit.ui.components.ToggleRow
import com.umt.toolkit.ui.components.Tone
import com.umt.toolkit.ui.readText
import com.umt.toolkit.ui.theme.Mono
import com.umt.toolkit.ui.theme.Umt
import com.umt.toolkit.ui.writeText
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.doubleOrNull
import java.text.DateFormat
import java.util.Date
import kotlin.random.Random

@Composable
fun IntegrationScreen() {
    val tk = LocalToolkit.current
    val state by tk.repo.state.collectAsStateWithLifecycle()
    val sessions by tk.hub.sessions.collectAsStateWithLifecycle()
    var integrated by remember { mutableStateOf<List<InstalledApp>?>(null) }
    var reload by remember { mutableIntStateOf(0) }
    var tab by rememberSaveable { mutableStateOf("stream") }
    LaunchedEffect(reload) { integrated = try { tk.scanner.listInstalled().filter { it.integrated } } catch (e: Exception) { emptyList() } }

    val source = state.esp.source
    val target = state.integration.targetPackage
    val session = target?.let { sessions[it] }

    ScreenColumn {
        Panel("Source") {
            ChoiceRow(null, listOf("sandbox" to "Local Sandbox Test Feed", "integration" to "Integrated app"), source) { v ->
                tk.repo.updateEsp { it.copy(source = v) }
                if (v == "integration") tk.ensureStream()
            }
            if (source == "sandbox") {
                Note("Simulated entities moving in a small world, for trying the entity overlay. Nothing here comes from another app.")
            } else {
                val list = integrated
                when {
                    list == null -> Note("Looking for apps that include umt-sdk…")
                    list.isEmpty() -> Note("No installed app declares com.umt.integration.supported. Install the bundled SDK demo app (sample-app) or add umt-sdk to your own app.", Tone.Warn)
                    else -> FlowRow(Modifier.padding(horizontal = 12.dp, vertical = 4.dp), horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        list.forEach { app ->
                            Chip(app.label, app.packageName == target) {
                                tk.repo.update { it.copy(integration = it.integration.copy(targetPackage = app.packageName)) }
                            }
                        }
                    }
                }
                if (target != null) {
                    RowDivider()
                    SettingRow(target, session?.schema?.let { "v${it.appVersion} · SDK ${it.sdkVersion} · ${it.values.size} values" } ?: "Not connected") {
                        StatusPill(session?.state?.label ?: "Idle", when (session?.state) {
                            LinkState.CONNECTED -> Tone.Good
                            LinkState.CONNECTING -> Tone.Accent
                            LinkState.NO_RESPONSE, LinkState.DISCONNECTED -> Tone.Warn
                            null -> Tone.Neutral
                        })
                    }
                    session?.schema?.let { s ->
                        InfoRow("Remote changes", if (s.allowRemoteChanges) "allowed by the app" else "off in this build of the app")
                        InfoRow("Streaming", if (s.allowStreaming) "allowed, up to ${s.maxStreamHz} Hz" else "off in this build of the app")
                    }
                    if (session?.state == LinkState.NO_RESPONSE) Note("No answer. Open the app first; it must call UmtSdk.init() and be installed with the meta-data flag.", Tone.Warn)
                    ButtonRow {
                        if (session == null || session.state != LinkState.CONNECTED) SmallButton("Connect", primary = true) { tk.hub.connect(target) }
                        else SmallButton("Disconnect") { tk.hub.disconnect(target) }
                        SmallButton("Rescan apps") { reload++ }
                    }
                }
            }
        }

        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            listOf("stream" to "Stream", "config" to "Config", "patches" to "Patches", "diag" to "Diagnostics").forEach { (k, l) ->
                Chip(l, tab == k) { tab = k }
            }
        }

        when (tab) {
            "stream" -> StreamTab(state.esp, source, target, session, state.overlays.espEnabled, state.integration.streamHz)
            "config" -> if (source == "integration" && session?.schema != null) ConfigTab(target!!, session)
                else Panel("Config bridge") { Note("Connect to an integrated app to see and change the values it exposes.") }
            "patches" -> if (source == "integration" && target != null) PatchesTab(target, session)
                else Panel("Authorized patches") { Note("Patches are named sets of values for an integrated app. Select and connect one first.") }
            else -> if (session != null) DiagTab(session) else Panel("Diagnostics") { Note("Connect to an integrated app to see what it reports.") }
        }
    }
}

@Composable
private fun StreamTab(esp: EspSettings, source: String, target: String?, session: Session?, onScreen: Boolean, hz: Int) {
    val tk = LocalToolkit.current
    DisposableEffect(Unit) {
        tk.frames.acquire()
        onDispose { tk.frames.release() }
    }
    val frame by tk.frames.frame.collectAsStateWithLifecycle()
    val rate by tk.frames.rate.collectAsStateWithLifecycle()
    val density = LocalDensity.current.density
    val renderer = remember(density) { EspRenderer(density) }
    fun set(f: (EspSettings) -> EspSettings) = tk.repo.updateEsp(f)

    Panel("Preview", actions = {
        Text(
            "${frame?.entities?.size ?: 0} entities · %.0f fps".format(rate),
            style = Mono, color = Umt.TextDim, modifier = Modifier.padding(end = 8.dp),
        )
    }) {
        val f = frame
        val aspect = if (f != null && f.viewW > 0 && f.viewH > 0) (f.viewW.toFloat() / f.viewH).coerceIn(0.4f, 2.5f) else 16f / 9f
        Canvas(
            Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 4.dp)
                .heightIn(max = 420.dp)
                .aspectRatio(aspect)
                .clip(RoundedCornerShape(6.dp))
                .background(Color(0xFF232B33)),
        ) {
            val fr = frame ?: return@Canvas
            drawIntoCanvas { c ->
                val r = android.graphics.RectF(0f, 0f, size.width, size.height)
                renderer.draw(c.nativeCanvas, fr, esp, r, r)
            }
        }
        if (frame == null) Note(if (source == "sandbox") "Starting the sandbox…" else "No frames yet. Connect, then start the stream.")
        if (source == "integration" && target != null) {
            session?.streamMessage?.let { Note(it, if (session.streaming) Tone.Good else Tone.Warn) }
            ButtonRow {
                val connected = session?.state == LinkState.CONNECTED
                if (session?.streaming == true) SmallButton("Stop stream") { tk.hub.setStreaming(target, false, hz) }
                else SmallButton("Start stream", primary = true, enabled = connected) { tk.hub.setStreaming(target, true, hz) }
            }
            SliderRow("Requested rate", hz.toFloat(), 1f..60f, { "%.0f Hz".format(it) }) { v ->
                tk.repo.update { it.copy(integration = it.integration.copy(streamHz = v.toInt())) }
            }
        } else if (source == "sandbox") {
            SliderRow("Simulated entities", esp.sandboxEntities.toFloat(), 1f..128f, { "%.0f".format(it) }) { v ->
                set { it.copy(sandboxEntities = v.toInt()) }
            }
            ButtonRow { SmallButton("Reseed") { tk.sandbox.reset(esp.sandboxEntities, Random.nextLong()) } }
        }
        ToggleRow("Show over the screen", onScreen, "Needs \"Display over other apps\"") { v ->
            tk.repo.updateOverlays { it.copy(espEnabled = v) }
            if (v) tk.ensureStream()
            tk.syncOverlays()
        }
    }

    Panel("Drawing") {
        ToggleRow("Boxes", esp.boxes) { v -> set { it.copy(boxes = v) } }
        ChoiceRow("Box style", listOf("full" to "Full", "corners" to "Corners"), esp.boxStyle) { v -> set { it.copy(boxStyle = v) } }
        ToggleRow("Labels", esp.labels) { v -> set { it.copy(labels = v) } }
        ToggleRow("Distance", esp.distance) { v -> set { it.copy(distance = v) } }
        ToggleRow("Health bars", esp.health) { v -> set { it.copy(health = v) } }
        ToggleRow("Lines from bottom edge", esp.lines) { v -> set { it.copy(lines = v) } }
        ToggleRow("Off-screen arrows", esp.offscreen) { v -> set { it.copy(offscreen = v) } }
        ToggleRow("Radar", esp.radar, "Needs the app to send ground positions") { v -> set { it.copy(radar = v) } }
        SliderRow("Radar size", esp.radarSizeDp, 60f..240f, { "%.0f dp".format(it) }) { v -> set { it.copy(radarSizeDp = v) } }
        SliderRow("Radar range", esp.radarRange, 5f..500f, { "%.0f m".format(it) }) { v -> set { it.copy(radarRange = v) } }
        SliderRow("Max distance", esp.maxDistance, 5f..1000f, { "%.0f m".format(it) }) { v -> set { it.copy(maxDistance = v) } }
        SliderRow("Max entities", esp.maxEntities.toFloat(), 1f..256f, { "%.0f".format(it) }) { v -> set { it.copy(maxEntities = v.toInt()) } }
        SliderRow("Opacity", esp.opacity, 0.1f..1f, { "%.0f%%".format(it * 100) }) { v -> set { it.copy(opacity = v) } }
        SliderRow("Line width", esp.strokeDp, 0.5f..6f, { "%.1f dp".format(it) }) { v -> set { it.copy(strokeDp = v) } }
    }

    val kinds = remember(frame?.entities?.map { it.kind }?.toSet(), esp.kindColors.keys) {
        ((frame?.entities?.map { it.kind } ?: emptyList()) + esp.kindColors.keys).distinct().sorted()
    }
    Panel("Kinds") {
        if (kinds.isEmpty()) EmptyState("No kinds seen yet")
        kinds.forEach { kind ->
            Column(Modifier.padding(vertical = 2.dp)) {
                ToggleRow(kind, kind !in esp.hiddenKinds) { show ->
                    set { it.copy(hiddenKinds = if (show) it.hiddenKinds - kind else it.hiddenKinds + kind) }
                }
                FlowRow(Modifier.padding(horizontal = 12.dp), horizontalArrangement = Arrangement.spacedBy(5.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                    Palette.colors.forEach { (name, argb) ->
                        Chip(name, (esp.kindColors[kind] ?: esp.defaultColor) == name, leading = Color(argb.toInt())) {
                            set { it.copy(kindColors = it.kindColors + (kind to name)) }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ConfigTab(pkg: String, session: Session) {
    val tk = LocalToolkit.current
    val messages = LocalMessages.current
    val schema = session.schema ?: return
    if (!schema.allowRemoteChanges) Note("This build of the app keeps remote changes off; values are shown read-only.", Tone.Warn)
    schema.values.groupBy { it.group }.forEach { (group, specs) ->
        Panel(group) {
            specs.forEachIndexed { i, spec ->
                if (i > 0) RowDivider()
                ValueControl(spec, session.values[spec.key], schema.allowRemoteChanges, session.keyStatus[spec.key]?.let { it.state to it.message }) { v ->
                    tk.hub.setValue(pkg, spec.key, v).onFailure { messages.show("${spec.label}: ${it.message}") }
                }
            }
        }
    }
}

@Composable
private fun ValueControl(spec: ValueSpec, value: JsonPrimitive?, editable: Boolean, status: Pair<String, String?>?, send: (JsonPrimitive) -> Unit) {
    Column {
        when (spec.type) {
            ValueType.BOOL -> ToggleRow(spec.label, value?.booleanOrNull == true, spec.description.ifBlank { null }, enabled = editable) { send(JsonPrimitive(it)) }
            ValueType.INT, ValueType.FLOAT -> {
                val min = spec.min
                val max = spec.max
                val cur = value?.doubleOrNull
                if (min != null && max != null && max > min) {
                    val steps = if (spec.type == ValueType.INT) ((max - min).toInt() - 1).coerceIn(0, 200) else 0
                    SliderRow(spec.label, (cur ?: min).toFloat(), min.toFloat()..max.toFloat(),
                        { if (spec.type == ValueType.INT) "%.0f".format(it) else "%.2f".format(it) }, steps = if (steps > 200) 0 else steps, enabled = editable) { v ->
                        send(if (spec.type == ValueType.INT) JsonPrimitive(Math.round(v)) else JsonPrimitive(v.toDouble()))
                    }
                } else FreeField(spec.label, value?.content ?: "", editable) { send(JsonPrimitive(it.toDoubleOrNull() ?: Double.NaN)) }
                if (spec.description.isNotBlank()) Note(spec.description)
            }
            ValueType.CHOICE -> ChoiceRow(spec.label, spec.choices.map { it to it }, value?.content, enabled = editable) { send(JsonPrimitive(it)) }
            ValueType.TEXT -> FreeField(spec.label, value?.content ?: "", editable) { send(JsonPrimitive(it)) }
        }
        status?.let { (st, msg) ->
            when (st) {
                "pending" -> Note("sending…")
                "ok" -> Unit
                else -> Note("${if (st == "timeout") "No answer" else "Rejected"}: ${msg ?: st}", Tone.Bad)
            }
        }
    }
}

@Composable
private fun FreeField(label: String, current: String, editable: Boolean, onSend: (String) -> Unit) {
    var text by remember(current) { mutableStateOf(current) }
    Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(label, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
        CompactField(text, { text = it }, "value", Modifier.weight(1f), mono = true)
        SmallButton("Send", enabled = editable && text != current) { onSend(text) }
    }
}

@Composable
private fun PatchesTab(pkg: String, session: Session?) {
    val tk = LocalToolkit.current
    val messages = LocalMessages.current
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val store by tk.patches.state.collectAsStateWithLifecycle()
    val patches = store.patches.filter { it.targetPackage == pkg }
    var creating by remember { mutableStateOf(false) }
    var preview by remember { mutableStateOf<String?>(null) }
    var deleting by remember { mutableStateOf<String?>(null) }
    var exportIds by remember { mutableStateOf<List<String>>(emptyList()) }
    var busy by remember { mutableStateOf<String?>(null) }
    val df = remember { DateFormat.getDateTimeInstance(DateFormat.SHORT, DateFormat.SHORT) }

    val exporter = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("application/json")) { uri ->
        if (uri != null) scope.launch {
            try { writeText(context, uri, tk.patches.exportJson(exportIds)); messages.show("Exported ${exportIds.size} patch(es)") }
            catch (e: Exception) { messages.show("Export failed: ${e.message}") }
        }
    }
    val importer = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) scope.launch {
            try { messages.show("Imported ${tk.patches.importJson(readText(context, uri))} patch(es)") }
            catch (e: Exception) { messages.show("Import failed: ${e.message}") }
        }
    }

    Panel("Patches for $pkg", actions = {
        TextButton(onClick = { importer.launch(arrayOf("application/json", "*/*")) }) { Text("Import", color = Umt.Accent, style = MaterialTheme.typography.labelMedium) }
    }) {
        Note("A patch is a named set of values this app exposes. Applying one sends them through umt-sdk; the app's acknowledgement is checked value by value, and the previous values are kept so it can be reverted.")
        ButtonRow {
            SmallButton("New from current values", primary = true, enabled = session?.schema != null && session.values.isNotEmpty()) { creating = true }
        }
        if (patches.isEmpty()) EmptyState("No patches for this app yet")
        patches.forEach { p ->
            RowDivider()
            val issues = PatchPlanner.validate(p, session?.schema, session?.state == LinkState.CONNECTED)
            val active = store.active[p.id]
            Column(Modifier.padding(horizontal = 12.dp, vertical = 6.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(p.name, style = MaterialTheme.typography.bodyMedium)
                        Text("${p.values.size} values · ${df.format(Date(p.createdAt))}${p.appVersion?.let { " · for v$it" } ?: ""}",
                            style = MaterialTheme.typography.labelSmall, color = Umt.TextFaint)
                    }
                    if (active != null) StatusPill("Applied (${active.result})", Tone.Good)
                }
                issues.forEach { Text(it.message, style = MaterialTheme.typography.bodySmall, color = if (it.error) Umt.Bad else Umt.Warn) }
            }
            FlowRow(Modifier.padding(horizontal = 12.dp, vertical = 2.dp), horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                SmallButton("Preview") { preview = p.id }
                SmallButton(if (busy == p.id) "Applying…" else "Apply", primary = true, enabled = busy == null && issues.none { it.error }) {
                    busy = p.id
                    scope.launch {
                        val r = tk.patches.apply(p.id)
                        busy = null
                        messages.show("${p.name}: ${r.result}" + (r.message?.let { " – $it" } ?: ""))
                    }
                }
                if (active != null) SmallButton("Revert", enabled = busy == null) {
                    busy = p.id
                    scope.launch {
                        val r = tk.patches.revert(p.id)
                        busy = null
                        messages.show("Revert ${p.name}: ${r.result}")
                    }
                }
                SmallButton("Export") { exportIds = listOf(p.id); exporter.launch("${p.name}.umt-patch.json") }
                SmallButton("Delete", danger = true) { deleting = p.id }
            }
        }
    }

    val history = store.history.filter { it.targetPackage == pkg }.take(20)
    Panel("History", actions = {
        if (history.isNotEmpty()) TextButton(onClick = { tk.patches.clearHistory() }) { Text("Clear", color = Umt.TextDim, style = MaterialTheme.typography.labelMedium) }
    }) {
        if (history.isEmpty()) EmptyState("Nothing applied yet")
        history.forEach { h ->
            SettingRow("${h.action.replaceFirstChar { it.uppercase() }} ${h.patchName}",
                "${df.format(Date(h.time))} · ${h.applied.size}/${h.requested.size} applied" +
                    (if (h.rejected.isNotEmpty()) " · rejected: " + h.rejected.entries.joinToString { "${it.key} (${it.value})" } else "") +
                    (h.message?.let { " · $it" } ?: "")) {
                StatusPill(h.result, when (h.result) { "verified" -> Tone.Good; "partial" -> Tone.Warn; else -> Tone.Bad })
            }
        }
    }

    if (creating && session?.schema != null) {
        NewPatchDialog(session, onDismiss = { creating = false }) { name, values ->
            tk.patches.create(name, pkg, session.schema.appVersion, values)
            messages.show("Patch '$name' created")
        }
    }
    preview?.let { id ->
        val p = patches.firstOrNull { it.id == id }
        if (p != null) AlertDialog(
            onDismissRequest = { preview = null },
            containerColor = Umt.Surface2,
            title = { Text("Before and after: ${p.name}", style = MaterialTheme.typography.titleMedium) },
            text = {
                Column(Modifier.verticalScroll(rememberScrollState())) {
                    PatchPlanner.diff(p, session?.schema, session?.values.orEmpty()).forEach { d ->
                        Text(d.label, style = MaterialTheme.typography.bodySmall, color = Umt.TextDim)
                        Text("${d.current ?: "?"}  →  ${d.patched}${if (!d.changes) "  (no change)" else ""}",
                            style = Mono.copy(color = if (d.changes) Umt.Text else Umt.TextFaint), modifier = Modifier.padding(bottom = 6.dp))
                    }
                }
            },
            confirmButton = { TextButton(onClick = { preview = null }) { Text("Close", color = Umt.Accent) } },
        ) else preview = null
    }
    deleting?.let { id ->
        ConfirmDialog("Delete patch?", "The patch and its active state are removed. Values already in the app stay as they are.", "Delete", danger = true,
            onDismiss = { deleting = null }) { tk.patches.delete(id) }
    }
}

@Composable
private fun NewPatchDialog(session: Session, onDismiss: () -> Unit, onCreate: (String, Map<String, JsonPrimitive>) -> Unit) {
    val schema = session.schema ?: return
    var name by remember { mutableStateOf("") }
    val chosen = remember { mutableStateMapOf<String, Boolean>() }
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Umt.Surface2,
        title = { Text("New patch", style = MaterialTheme.typography.titleMedium) },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState())) {
                CompactField(name, { name = it }, "Name", Modifier.fillMaxWidth())
                Text("Values to include (current value)", style = MaterialTheme.typography.bodySmall, color = Umt.TextDim, modifier = Modifier.padding(top = 8.dp))
                schema.values.forEach { spec ->
                    val v = session.values[spec.key]
                    CheckRow("${spec.label} = ${v?.content ?: "?"}", chosen[spec.key] == true) { chosen[spec.key] = it }
                }
            }
        },
        confirmButton = {
            TextButton(
                enabled = name.isNotBlank() && chosen.values.any { it },
                onClick = {
                    onCreate(name, chosen.filterValues { it }.keys.mapNotNull { k -> session.values[k]?.let { k to it } }.toMap())
                    onDismiss()
                },
            ) { Text("Create", color = Umt.Accent) }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel", color = Umt.TextDim) } },
    )
}

@Composable
private fun DiagTab(session: Session) {
    val tk = LocalToolkit.current
    Panel("Reported by the app") {
        val d = session.diag
        if (d == null) EmptyState("The app has not sent diagnostics (UmtSdk.publishDiagnostics)")
        else {
            d.fps?.let { InfoRow("App fps (self-reported)", "%.1f".format(it)) }
            d.metrics.forEach { (k, v) -> InfoRow(k, v, mono = true) }
        }
        RowDivider()
        InfoRow("Frames received", "${session.frames} (${"%.0f".format(session.frameHz)}/s)")
        InfoRow("Events dropped", "${session.dropped}")
        InfoRow("Last seen", if (session.lastSeen == 0L) "never" else DateFormat.getTimeInstance().format(Date(session.lastSeen)))
    }
    Panel("App log", actions = {
        if (session.logs.isNotEmpty()) TextButton(onClick = { tk.hub.clearLogs(session.pkg) }) { Text("Clear", color = Umt.TextDim, style = MaterialTheme.typography.labelMedium) }
    }) {
        if (session.logs.isEmpty()) EmptyState("No log lines (UmtSdk.log)")
        val tf = remember { DateFormat.getTimeInstance(DateFormat.MEDIUM) }
        session.logs.takeLast(100).reversed().forEach { l ->
            Text("${tf.format(Date(l.timeMs))}  ${l.message}", style = Mono.copy(color = Umt.Text), modifier = Modifier.padding(horizontal = 12.dp, vertical = 1.dp))
        }
    }
}
