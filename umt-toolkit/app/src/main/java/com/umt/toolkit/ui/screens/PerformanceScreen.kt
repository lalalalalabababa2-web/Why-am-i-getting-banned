package com.umt.toolkit.ui.screens

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.umt.toolkit.perf.Governor
import com.umt.toolkit.perf.PerfMath
import com.umt.toolkit.perf.PerfSession
import com.umt.toolkit.ui.LocalMessages
import com.umt.toolkit.ui.LocalToolkit
import com.umt.toolkit.ui.components.ButtonRow
import com.umt.toolkit.ui.components.CheckRow
import com.umt.toolkit.ui.components.ChoiceRow
import com.umt.toolkit.ui.components.CompactField
import com.umt.toolkit.ui.components.EmptyState
import com.umt.toolkit.ui.components.FrameTimeChart
import com.umt.toolkit.ui.components.InfoRow
import com.umt.toolkit.ui.components.Note
import com.umt.toolkit.ui.components.Panel
import com.umt.toolkit.ui.components.RowDivider
import com.umt.toolkit.ui.components.ScreenColumn
import com.umt.toolkit.ui.components.SmallButton
import com.umt.toolkit.ui.components.Sparkline
import com.umt.toolkit.ui.components.ToggleRow
import com.umt.toolkit.ui.components.Tone
import com.umt.toolkit.ui.theme.Mono
import com.umt.toolkit.ui.theme.Umt
import com.umt.toolkit.ui.writeText
import kotlinx.coroutines.launch
import java.text.DateFormat
import java.util.Date

@Composable
fun PerformanceScreen() {
    val tk = LocalToolkit.current
    val messages = LocalMessages.current
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val sample by tk.perf.latest.collectAsStateWithLifecycle()
    val history by tk.perf.history.collectAsStateWithLifecycle()
    val restricted by tk.perf.globalCpuRestricted.collectAsStateWithLifecycle()
    val gpu by tk.perf.gpu.collectAsStateWithLifecycle()
    val sessions by tk.perf.sessions.collectAsStateWithLifecycle()
    val recording by tk.perf.recording.collectAsStateWithLifecycle()
    val state by tk.repo.state.collectAsStateWithLifecycle()
    val static = remember { tk.perf.static }
    var frames by remember { mutableStateOf(FloatArray(0)) }
    var recName by remember { mutableStateOf("") }
    val compare = remember { mutableStateListOf<String>() }
    var compared by remember { mutableStateOf<List<PerfSession>>(emptyList()) }
    var exportId by remember { mutableStateOf<String?>(null) }
    var trimResult by remember { mutableStateOf<String?>(null) }

    DisposableEffect(Unit) {
        tk.perf.acquire("perf-screen")
        tk.perf.probeGpuOnce()
        onDispose { tk.perf.release("perf-screen") }
    }
    // Refresh the frame chart with every telemetry sample (no polling loop).
    LaunchedEffect(sample) { frames = tk.perf.frames.last(120) }
    LaunchedEffect(compare.toList()) {
        compared = compare.mapNotNull { tk.perf.loadSession(it) }
    }
    val exporter = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("application/json")) { uri ->
        val id = exportId
        if (uri != null && id != null) scope.launch {
            try { writeText(context, uri, tk.perf.exportSession(id) ?: error("session missing")); messages.show("Session exported") }
            catch (e: Exception) { messages.show("Export failed: ${e.message}") }
        }
    }

    ScreenColumn {
        Panel("Toolkit frame pacing") {
            Note("Choreographer frame times of this toolkit's own UI thread. Android gives no app the frame rate of another app, so this never claims to be the game's FPS.")
            FrameTimeChart(frames, sample?.refreshHz ?: 60f, Modifier.padding(vertical = 4.dp))
            sample?.let { s ->
                InfoRow("UI fps", "%.1f".format(s.uiFps))
                InfoRow("Frame p50 / p95 / max", "%.1f / %.1f / %.1f ms".format(s.frameP50, s.frameP95, s.frameMax))
                InfoRow("Jank / stutter (last s)", "${s.jank} / ${s.stutter}")
            }
        }

        Panel("CPU") {
            Sparkline("Toolkit CPU, % of device", history.map { it.cpuSelf }, "%")
            sample?.let { s ->
                InfoRow("Toolkit", "%.1f%% of the device, %.1f%% of one core".format(s.cpuSelf, s.cpuSelfCore))
                InfoRow("Device-wide", when {
                    s.cpuGlobal != null -> "%.1f%%".format(s.cpuGlobal)
                    restricted == true -> "Not readable: /proc/stat is blocked by SELinux on Android 8+"
                    else -> "measuring…"
                })
                InfoRow("Threads", "${s.threads}")
            }
            InfoRow("Cores", "${static.cores}" + if (static.maxFreqMhz.isNotEmpty()) " · max ${static.maxFreqMhz.joinToString("/")} MHz" else "")
        }

        Panel("Memory") {
            Sparkline("Free RAM", history.map { it.memAvailMb }, "MB", decimals = 0)
            sample?.let { s ->
                InfoRow("Free / total", "%.0f / %.0f MB%s".format(s.memAvailMb, s.memTotalMb, if (s.lowMemory) " (system reports low memory)" else ""))
                InfoRow("Toolkit PSS", "%.1f MB".format(s.pssMb))
                InfoRow("Toolkit heap", "%.1f MB".format(s.heapMb))
            }
            Note("Other apps' processes are hidden from regular apps since Android 5.1, so per-app background usage is not listed.")
        }

        Panel("Battery & thermal") {
            Sparkline("Battery temperature", history.mapNotNull { it.batteryTempC }, "°C")
            sample?.let { s ->
                InfoRow("Level", "%.0f%% %s".format(s.batteryPct, if (s.charging) "(charging)" else ""))
                InfoRow("Voltage", s.voltageMv?.let { "$it mV" } ?: "n/a")
                InfoRow("Current", s.currentMa?.let { "%.0f mA (sign and unit vary by device)".format(it) } ?: "n/a")
                InfoRow("Thermal status", PerfMath.thermalLabel(s.thermalStatus))
                InfoRow("Thermal headroom", s.thermalHeadroom?.let { "%.2f (1.0 = throttling)".format(it) } ?: "n/a (needs Android 11+)")
            }
        }

        Panel("Graphics & display") {
            val g = gpu
            InfoRow("GPU", g?.let { "${it.vendor} ${it.renderer}" } ?: "probing…")
            g?.let { InfoRow("GL", "${it.version} · ${it.extensions} extensions") }
            InfoRow("OpenGL ES", static.glEs)
            InfoRow("Refresh rates", static.refreshRates.joinToString { "%.0f".format(it) } + " Hz")
            static.modes.forEach { InfoRow("Mode", it, mono = true) }
        }

        Panel("Recording") {
            val r = recording
            if (r == null) {
                Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 4.dp)) {
                    CompactField(recName, { recName = it }, "Session name", Modifier.weight(1f))
                    Row(Modifier.width(8.dp)) {}
                    SmallButton("Record", primary = true) { tk.perf.startRecording(recName.ifBlank { "Session ${sessions.size + 1}" }); recName = "" }
                }
            } else {
                Note("Recording '${r.name}': ${r.samples.size} samples", Tone.Accent)
                ButtonRow {
                    SmallButton("Stop and save", primary = true) {
                        scope.launch { tk.perf.stopRecording()?.let { messages.show("Saved '${it.name}'") } }
                    }
                }
            }
            RowDivider()
            if (sessions.isEmpty()) EmptyState("No saved sessions")
            val df = DateFormat.getDateTimeInstance(DateFormat.SHORT, DateFormat.SHORT)
            sessions.sortedByDescending { it.startedAt }.forEach { s ->
                Column {
                    CheckRow("${s.name} · ${df.format(Date(s.startedAt))} · %.0f s".format(s.summary.durationSec), s.id in compare) { on ->
                        if (on) { if (compare.size >= 2) compare.removeAt(0); compare.add(s.id) } else compare.remove(s.id)
                    }
                    ButtonRow {
                        SmallButton("Export") { exportId = s.id; exporter.launch("${s.name}.umt-session.json") }
                        SmallButton("Delete", danger = true) { scope.launch { tk.perf.deleteSession(s.id); compare.remove(s.id) } }
                    }
                }
            }
            if (compared.size == 2) CompareTable(compared[0], compared[1])
            else if (sessions.size >= 2) Note("Tick two sessions to compare them.")
        }

        Panel("Resource governor (toolkit only)") {
            Note("These settings change how much this toolkit itself does. They do not change another app's frame rate or the GPU driver.")
            ChoiceRow("Profile", Governor.profiles.map { it to Governor.label(it) }, state.governor.profile) { p ->
                tk.repo.updateGovernor { Governor.preset(p, it, static.refreshRates) }
            }
            ChoiceRow("Sample every", listOf(250, 500, 1000, 2000, 5000).map { "$it" to if (it < 1000) "$it ms" else "${it / 1000} s" }, "${state.governor.sampleIntervalMs}") { v ->
                tk.repo.updateGovernor { it.copy(profile = "custom", sampleIntervalMs = v.toInt()) }
            }
            ChoiceRow("Overlay redraw cap", listOf(15, 30, 60, 120).map { "$it" to "$it fps" }, "${state.governor.overlayMaxFps}") { v ->
                tk.repo.updateGovernor { it.copy(profile = "custom", overlayMaxFps = v.toInt()) }
            }
            ChoiceRow("Toolkit window refresh", listOf("0" to "System") + static.refreshRates.map { "%.0f".format(it) to "%.0f Hz".format(it) },
                if (state.governor.refreshRateHz <= 0f) "0" else "%.0f".format(state.governor.refreshRateHz)) { v ->
                tk.repo.updateGovernor { it.copy(profile = "custom", refreshRateHz = v.toFloat()) }
            }
            ToggleRow("Pause overlays with the screen off", state.governor.pauseWhenScreenOff) { v ->
                tk.repo.updateGovernor { it.copy(profile = "custom", pauseWhenScreenOff = v) }
            }
            ButtonRow {
                SmallButton("Trim caches now") {
                    val icons = tk.scanner.clearIconCache()
                    val logs = tk.log.trim(200)
                    tk.perf.clearHistory()
                    trimResult = "Dropped $icons cached icons, $logs log lines and the chart history"
                    tk.log.i("Governor", trimResult!!)
                }
            }
            trimResult?.let { Note(it, Tone.Good) }
        }
    }
}

@Composable
private fun CompareTable(a: PerfSession, b: PerfSession) {
    fun f(v: Float?, d: Int = 1) = v?.let { "%.${d}f".format(it) } ?: "—"
    val rows = listOf(
        Triple("Duration (s)", f(a.summary.durationSec, 0), f(b.summary.durationSec, 0)),
        Triple("Avg UI fps", f(a.summary.avgUiFps), f(b.summary.avgUiFps)),
        Triple("Worst p95 frame (ms)", f(a.summary.worstP95FrameMs), f(b.summary.worstP95FrameMs)),
        Triple("Jank / stutter", "${a.summary.jankTotal} / ${a.summary.stutterTotal}", "${b.summary.jankTotal} / ${b.summary.stutterTotal}"),
        Triple("Avg toolkit CPU %", f(a.summary.avgCpuSelf), f(b.summary.avgCpuSelf)),
        Triple("Peak PSS (MB)", f(a.summary.peakPssMb), f(b.summary.peakPssMb)),
        Triple("Min free RAM (MB)", f(a.summary.minMemAvailMb, 0), f(b.summary.minMemAvailMb, 0)),
        Triple("Battery %", "${f(a.summary.batteryStart, 0)} → ${f(a.summary.batteryEnd, 0)}", "${f(b.summary.batteryStart, 0)} → ${f(b.summary.batteryEnd, 0)}"),
        Triple("Temp °C", "${f(a.summary.tempStart)} → ${f(a.summary.tempEnd)}", "${f(b.summary.tempStart)} → ${f(b.summary.tempEnd)}"),
        Triple("Max thermal", PerfMath.thermalLabel(a.summary.maxThermal), PerfMath.thermalLabel(b.summary.maxThermal)),
    )
    Column(Modifier.padding(horizontal = 12.dp, vertical = 6.dp)) {
        Row {
            Text("", Modifier.weight(1.3f))
            Text(a.name, Modifier.weight(1f), style = MaterialTheme.typography.labelMedium, color = Umt.TextDim, maxLines = 1)
            Text(b.name, Modifier.weight(1f), style = MaterialTheme.typography.labelMedium, color = Umt.TextDim, maxLines = 1)
        }
        rows.forEach { (k, x, y) ->
            Row(Modifier.padding(vertical = 2.dp)) {
                Text(k, Modifier.weight(1.3f), style = MaterialTheme.typography.bodySmall, color = Umt.TextDim)
                Text(x, Modifier.weight(1f), style = Mono, color = Umt.Text)
                Text(y, Modifier.weight(1f), style = Mono, color = Umt.Text)
            }
        }
    }
}
