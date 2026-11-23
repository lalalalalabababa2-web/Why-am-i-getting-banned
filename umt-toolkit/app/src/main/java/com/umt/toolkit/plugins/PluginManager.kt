package com.umt.toolkit.plugins

import com.umt.sdk.ValueSpec
import com.umt.sdk.ValueType
import com.umt.toolkit.Toolkit
import com.umt.toolkit.core.AtomicJsonStore
import com.umt.toolkit.integration.KeyStatus
import com.umt.toolkit.integration.LinkState
import com.umt.toolkit.perf.PerfMath
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.doubleOrNull
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.random.Random

data class InstalledPlugin(
    val id: String,
    val source: String,
    val validation: ValidationResult,
    val state: PluginState,
) {
    val manifest: PluginManifest? get() = validation.manifest
    val usable: Boolean get() = validation.ok && !state.tripped
    val title: String get() = manifest?.panel?.title ?: manifest?.name ?: id
}

/** Range and options for a control, from the manifest or (for bridge: bindings) the app's schema. */
data class ControlRange(val min: Double, val max: Double, val step: Double?, val options: List<String>)

class PluginManager(private val tk: Toolkit, dir: File) {
    private val pluginDir = File(dir, "plugins").apply { mkdirs() }
    private val stateStore = AtomicJsonStore(File(dir, "plugin_state.json"))
    private val _plugins = MutableStateFlow(load())
    val plugins: StateFlow<List<InstalledPlugin>> = _plugins

    /** Short per-plugin status line shown at the bottom of its panel. */
    private val _status = MutableStateFlow<Map<String, String>>(emptyMap())
    val status: StateFlow<Map<String, String>> = _status
    private var saveJob: Job? = null

    private fun load(): List<InstalledPlugin> {
        val states = stateStore.read<Map<String, PluginState>> { emptyMap() }
        return pluginDir.listFiles { f -> f.name.endsWith(".json") }.orEmpty().mapNotNull { f ->
            val text = try { f.readText() } catch (e: Exception) { return@mapNotNull null }
            val v = PluginValidator.validate(text)
            val id = v.manifest?.id ?: f.nameWithoutExtension
            var st = states[id] ?: PluginState(installedAt = f.lastModified())
            if (!v.ok) st = st.copy(enabled = false, panelVisible = false)
            InstalledPlugin(id, text, v, st)
        }.sortedBy { it.title.lowercase() }
    }

    fun get(id: String): InstalledPlugin? = _plugins.value.firstOrNull { it.id == id }

    /** Validates and stores the source. Invalid JSON is not stored; schema errors are stored but disabled. */
    fun install(text: String, replaceId: String? = null): ValidationResult {
        val v = PluginValidator.validate(text)
        val m = v.manifest ?: return v
        File(pluginDir, "${m.id}.json").writeText(text)
        if (replaceId != null && replaceId != m.id) {
            File(pluginDir, "$replaceId.json").delete()
            _plugins.update { list -> list.filterNot { it.id == replaceId } }
        }
        _plugins.update { list ->
            val old = list.firstOrNull { it.id == m.id }?.state ?: PluginState(installedAt = System.currentTimeMillis())
            val st = if (v.ok) old else old.copy(enabled = false, panelVisible = false)
            (list.filterNot { it.id == m.id } + InstalledPlugin(m.id, text, v, st)).sortedBy { it.title.lowercase() }
        }
        saveStates()
        tk.log.i("Plugins", "Saved plugin ${m.id} (${v.errors} errors, ${v.warnings} warnings)")
        tk.syncOverlays()
        return v
    }

    fun delete(id: String) {
        File(pluginDir, "$id.json").delete()
        _plugins.update { list -> list.filterNot { it.id == id } }
        saveStates()
        tk.log.i("Plugins", "Deleted plugin $id")
        tk.syncOverlays()
    }

    fun setEnabled(id: String, on: Boolean): String? {
        val p = get(id) ?: return "No such plugin"
        if (on && !p.validation.ok) return "Fix the plugin's errors first"
        if (on && p.state.tripped) return "Circuit breaker is open; reset faults first"
        mutateState(id) { it.copy(enabled = on, panelVisible = if (on) it.panelVisible else false) }
        tk.syncOverlays()
        return null
    }

    fun setPanelVisible(id: String, on: Boolean): String? {
        val p = get(id) ?: return "No such plugin"
        if (on && !p.state.enabled) return "Enable the plugin first"
        if (on && !tk.canDrawOverlays()) return "Allow \"Display over other apps\" first"
        mutateState(id) { it.copy(panelVisible = on) }
        tk.syncOverlays()
        return null
    }

    fun resetFaults(id: String) {
        mutateState(id) { CircuitBreaker.reset(it) }
        tk.log.i("Plugins", "Faults reset for $id")
    }

    fun updateGeometry(id: String, f: (PluginState) -> PluginState) = mutateState(id, f)

    fun hideAllPanels() {
        _plugins.update { list -> list.map { it.copy(state = it.state.copy(panelVisible = false)) } }
        saveStates()
    }

    fun visiblePanels(): List<InstalledPlugin> = _plugins.value.filter { it.usable && it.state.enabled && it.state.panelVisible }

    fun enabledIds(): List<String> = _plugins.value.filter { it.state.enabled }.map { it.id }

    fun applyEnabledSet(ids: Collection<String>) {
        _plugins.update { list ->
            list.map { p ->
                val on = p.id in ids && p.usable
                p.copy(state = p.state.copy(enabled = on, panelVisible = on && p.state.panelVisible))
            }
        }
        saveStates()
        tk.syncOverlays()
    }

    // ---- Runtime -----------------------------------------------------------------------------

    fun read(p: InstalledPlugin, c: ControlSpec): JsonPrimitive? {
        val b = c.bind ?: return null
        return if (Bindings.isBridge(b)) {
            tk.hub.session(p.manifest?.target)?.values?.get(Bindings.bridgeKey(b))
        } else {
            Bindings.local[b]?.read?.invoke(tk.repo.current)
        }
    }

    fun range(p: InstalledPlugin, c: ControlSpec): ControlRange {
        val b = c.bind
        if (b != null && Bindings.isBridge(b)) {
            val spec: ValueSpec? = tk.hub.session(p.manifest?.target)?.schema?.values?.firstOrNull { it.key == Bindings.bridgeKey(b) }
            return ControlRange(c.min ?: spec?.min ?: 0.0, c.max ?: spec?.max ?: 1.0, c.step ?: spec?.step ?: if (spec?.type == ValueType.INT) 1.0 else null,
                c.options.ifEmpty { spec?.choices.orEmpty() })
        }
        val def = b?.let { Bindings.local[it] }
        return ControlRange(c.min ?: def?.min ?: 0.0, c.max ?: def?.max ?: 1.0,
            c.step ?: if (def?.type == ValueType.INT) 1.0 else null, c.options.ifEmpty { def?.choices.orEmpty() })
    }

    fun bridgeStatus(p: InstalledPlugin, c: ControlSpec): KeyStatus? {
        val b = c.bind ?: return null
        if (!Bindings.isBridge(b)) return null
        return tk.hub.session(p.manifest?.target)?.keyStatus?.get(Bindings.bridgeKey(b))
    }

    fun write(p: InstalledPlugin, c: ControlSpec, value: JsonPrimitive) {
        val b = c.bind ?: return
        if (!p.usable || !p.state.enabled) return
        if (Bindings.isBridge(b)) {
            val target = p.manifest?.target ?: return
            val session = tk.hub.session(target)
            if (session?.state != LinkState.CONNECTED) {
                status(p.id, "Not connected to $target")
                return
            }
            val key = Bindings.bridgeKey(b)
            val r = tk.hub.setValue(target, key, value)
            r.onFailure { fault(p.id, "${c.label}: ${it.message}") }
            r.onSuccess { id ->
                tk.scope.launch {
                    // The hub records the outcome per key; a rejection or timeout is a plugin fault.
                    val st = withTimeoutOrNull(4000) {
                        tk.hub.sessions.first { m -> m[target]?.keyStatus?.get(key)?.state.let { it != null && it != "pending" } }
                    }?.get(target)?.keyStatus?.get(key)
                    when (st?.state) {
                        "ok" -> status(p.id, "${c.label}: applied")
                        null -> fault(p.id, "${c.label}: no answer from $target")
                        else -> fault(p.id, "${c.label}: ${st.message ?: st.state}")
                    }
                }
            }
        } else {
            val def = Bindings.local[b] ?: return fault(p.id, "Unknown binding $b")
            try {
                tk.repo.update { def.write(it, value) }
                tk.syncOverlays()
            } catch (e: Exception) {
                fault(p.id, "${c.label}: ${e.message}")
            }
        }
    }

    fun action(p: InstalledPlugin, c: ControlSpec) {
        if (!p.usable || !p.state.enabled) return
        try {
            when (c.action) {
                "overlay.stopAll" -> { tk.killAll(); status(p.id, "All overlays stopped") }
                "panel.close" -> setPanelVisible(p.id, false)
                "profile.apply" -> {
                    val name = c.arg?.content.orEmpty()
                    val prof = tk.profiles.findByName(name) ?: return fault(p.id, "No profile named '$name'")
                    tk.applyProfile(prof)
                    status(p.id, "Profile '$name' applied")
                }
                "preset.apply" -> applyPreset(p, c.arg?.content.orEmpty())
                "bridge.reconnect" -> p.manifest?.target?.let { tk.hub.connect(it); status(p.id, "Connecting to $it") }
                "esp.reseed" -> { tk.sandbox.reset(tk.repo.current.esp.sandboxEntities, Random.nextLong()); status(p.id, "Sandbox reseeded") }
                "notify" -> {
                    if (tk.notifier.pluginMessage(p.title, c.arg?.content.orEmpty())) status(p.id, "Notification sent")
                    else status(p.id, "Notifications are not allowed")
                }
                else -> fault(p.id, "Unknown action ${c.action}")
            }
        } catch (e: Exception) {
            fault(p.id, "${c.label}: ${e.message}")
        }
    }

    fun applyPreset(p: InstalledPlugin, name: String) {
        val m = p.manifest ?: return
        val preset = m.presets.firstOrNull { it.name == name } ?: return fault(p.id, "No preset '$name'")
        val controls = m.allControls().associateBy { it.id }
        for ((cid, v) in preset.values) controls[cid]?.let { write(p, it, v) }
        status(p.id, "Preset '$name' applied")
    }

    fun display(p: InstalledPlugin, c: ControlSpec): String {
        val s = c.source ?: return ""
        val raw: Any? = if (Bindings.isBridge(s)) {
            tk.hub.session(p.manifest?.target)?.values?.get(Bindings.bridgeKey(s))?.let { it.doubleOrNull ?: it.content }
        } else {
            val t = tk.perf.latest.value
            when (s) {
                "telemetry.batteryPct" -> t?.batteryPct
                "telemetry.batteryTempC" -> t?.batteryTempC
                "telemetry.thermal" -> t?.let { PerfMath.thermalLabel(it.thermalStatus) }
                "telemetry.memAvailMb" -> t?.memAvailMb
                "telemetry.cpuSelf" -> t?.cpuSelf
                "telemetry.uiFps" -> t?.uiFps
                "telemetry.refreshHz" -> t?.refreshHz
                "esp.entityCount" -> tk.frames.frame.value?.entities?.size?.toDouble()
                "esp.frameHz" -> tk.frames.rate.value.toDouble()
                "clock.time" -> SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date())
                else -> null
            }
        }
        if (raw == null) return "—"
        val f = c.format
        return try {
            when {
                f != null && raw is Number -> String.format(Locale.getDefault(), f, raw.toDouble())
                f != null -> String.format(Locale.getDefault(), f, raw.toString())
                raw is Float || raw is Double -> "%.1f".format(Locale.getDefault(), (raw as Number).toDouble())
                else -> raw.toString()
            }
        } catch (e: Exception) {
            raw.toString()
        }
    }

    private fun fault(id: String, reason: String) {
        var tripped = false
        mutateState(id) { s ->
            val n = CircuitBreaker.fault(s, reason)
            tripped = n.tripped && !s.tripped
            n
        }
        val faults = get(id)?.state?.faults ?: 0
        tk.log.w("Plugins", "$id fault $faults/${CircuitBreaker.THRESHOLD}: $reason")
        status(id, "Fault $faults/${CircuitBreaker.THRESHOLD}: $reason")
        if (tripped) {
            tk.log.e("Plugins", "$id switched off by the circuit breaker after ${CircuitBreaker.THRESHOLD} faults")
            tk.syncOverlays()
        }
    }

    private fun status(id: String, text: String) {
        _status.update { it + (id to text) }
    }

    private fun mutateState(id: String, f: (PluginState) -> PluginState) {
        _plugins.update { list -> list.map { if (it.id == id) it.copy(state = f(it.state)) else it } }
        saveStates()
    }

    private fun saveStates() {
        saveJob?.cancel()
        saveJob = tk.scope.launch(Dispatchers.IO) {
            delay(250)
            try {
                stateStore.write(_plugins.value.associate { it.id to it.state })
            } catch (e: Exception) {
                tk.log.e("Plugins", "Could not save plugin state", e)
            }
        }
    }
}
