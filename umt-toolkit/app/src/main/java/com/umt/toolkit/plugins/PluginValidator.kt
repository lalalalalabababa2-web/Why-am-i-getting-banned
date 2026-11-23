package com.umt.toolkit.plugins

import com.umt.sdk.UmtProtocol
import com.umt.sdk.ValueType
import com.umt.toolkit.core.UmtJson
import kotlinx.serialization.SerializationException

data class Problem(val path: String, val message: String, val error: Boolean)

data class ValidationResult(val manifest: PluginManifest?, val problems: List<Problem>) {
    val ok: Boolean get() = manifest != null && problems.none { it.error }
    val errors: Int get() = problems.count { it.error }
    val warnings: Int get() = problems.count { !it.error }
}

/** Checks a plugin manifest against the schema, the permission allowlist and the caps. */
object PluginValidator {
    const val MAX_BYTES = 64 * 1024
    const val MAX_TABS = 8
    const val MAX_SECTIONS = 16
    const val MAX_CONTROLS = 48
    const val MAX_PRESETS = 16
    const val MIN_REFRESH_MS = 250
    const val MAX_REFRESH_MS = 10_000
    const val SAW = "SYSTEM_ALERT_WINDOW"
    const val NOTIFY = "POST_NOTIFICATIONS"
    val ALLOWED_PERMISSIONS = setOf(SAW, NOTIFY)
    val TYPES = setOf("toggle", "slider", "dropdown", "button", "value", "label")
    private val PLUGIN_ID = Regex("^[a-z][a-z0-9_]*(\\.[a-z0-9_]+)+$")
    private val CONTROL_ID = Regex("^[a-z][a-z0-9_]{0,31}$")
    private val PACKAGE = Regex("^[a-zA-Z][a-zA-Z0-9_]*(\\.[a-zA-Z0-9_]+)+$")

    fun validate(text: String): ValidationResult {
        val problems = ArrayList<Problem>()
        fun err(path: String, msg: String) { problems += Problem(path, msg, true) }
        fun warn(path: String, msg: String) { problems += Problem(path, msg, false) }

        if (text.toByteArray().size > MAX_BYTES) {
            err("$", "Manifest is larger than ${MAX_BYTES / 1024} KB")
            return ValidationResult(null, problems)
        }
        val m = try {
            UmtJson.decodeFromString<PluginManifest>(text)
        } catch (e: SerializationException) {
            err("$", "Not valid plugin JSON: ${e.message?.lineSequence()?.firstOrNull()}")
            return ValidationResult(null, problems)
        } catch (e: IllegalArgumentException) {
            err("$", "Not valid plugin JSON: ${e.message?.lineSequence()?.firstOrNull()}")
            return ValidationResult(null, problems)
        }

        if (m.schema != 1) err("schema", "Unsupported schema ${m.schema} (expected 1)")
        if (!PLUGIN_ID.matches(m.id)) err("id", "Use a lowercase reverse-domain id such as com.example.panel")
        if (m.name.isBlank() || m.name.length > 48) err("name", "Name must be 1-48 characters")
        m.permissions.forEachIndexed { i, p ->
            if (p !in ALLOWED_PERMISSIONS) err("permissions[$i]", "'$p' is not allowed; plugins may only declare ${ALLOWED_PERMISSIONS.joinToString()}")
        }
        if (m.refreshMs !in MIN_REFRESH_MS..MAX_REFRESH_MS) err("refreshMs", "Must be between $MIN_REFRESH_MS and $MAX_REFRESH_MS ms")
        if (m.target != null && !PACKAGE.matches(m.target)) err("target", "'${m.target}' is not a package name")
        if (m.panel.widthDp !in 160..480) err("panel.widthDp", "Must be between 160 and 480")
        if (m.panel.opacity !in 0.3f..1f) err("panel.opacity", "Must be between 0.3 and 1")

        if (m.tabs.isEmpty()) err("tabs", "A plugin needs at least one tab")
        if (m.tabs.size > MAX_TABS) err("tabs", "At most $MAX_TABS tabs")
        if (m.tabs.isNotEmpty() && SAW !in m.permissions) err("permissions", "A panel draws over other apps: declare $SAW")

        val sections = m.tabs.sumOf { it.sections.size }
        if (sections > MAX_SECTIONS) err("tabs", "At most $MAX_SECTIONS sections in total")
        val all = m.allControls()
        if (all.size > MAX_CONTROLS) err("tabs", "At most $MAX_CONTROLS controls in total (found ${all.size})")
        val seen = HashSet<String>()
        val sectionIds = HashSet<String>()

        m.tabs.forEachIndexed { ti, tab ->
            if (tab.title.isBlank()) err("tabs[$ti].title", "Tab title is empty")
            tab.controls.forEachIndexed { ci, c -> checkControl("tabs[$ti].controls[$ci]", c, m, seen, ::err, ::warn) }
            tab.sections.forEachIndexed { si, sec ->
                if (!CONTROL_ID.matches(sec.id)) err("tabs[$ti].sections[$si].id", "Use lowercase letters, digits and _")
                if (!sectionIds.add(sec.id)) err("tabs[$ti].sections[$si].id", "Duplicate section id '${sec.id}'")
                sec.controls.forEachIndexed { ci, c -> checkControl("tabs[$ti].sections[$si].controls[$ci]", c, m, seen, ::err, ::warn) }
            }
        }

        if (m.presets.size > MAX_PRESETS) err("presets", "At most $MAX_PRESETS presets")
        val byId = all.associateBy { it.id }
        val presetNames = HashSet<String>()
        m.presets.forEachIndexed { pi, p ->
            if (p.name.isBlank() || !presetNames.add(p.name)) err("presets[$pi].name", "Preset names must be unique and not empty")
            p.values.keys.forEach { cid ->
                val c = byId[cid]
                if (c == null) err("presets[$pi].values.$cid", "No control with id '$cid'")
                else if (c.bind == null) err("presets[$pi].values.$cid", "Control '$cid' has no binding to set")
            }
        }
        return ValidationResult(m, problems)
    }

    private fun checkControl(
        path: String, c: ControlSpec, m: PluginManifest, seen: MutableSet<String>,
        err: (String, String) -> Unit, warn: (String, String) -> Unit,
    ) {
        if (c.type !in TYPES) { err("$path.type", "Unknown type '${c.type}' (use ${TYPES.joinToString()})"); return }
        if (!CONTROL_ID.matches(c.id)) err("$path.id", "Use lowercase letters, digits and _ (max 32)")
        if (!seen.add(c.id)) err("$path.id", "Duplicate control id '${c.id}'")
        if (c.label.isBlank() || c.label.length > 40) err("$path.label", "Label must be 1-40 characters")

        fun needBind(expected: Set<ValueType>) {
            val b = c.bind
            if (b == null) { err("$path.bind", "'${c.type}' needs a bind"); return }
            if (Bindings.isBridge(b)) {
                if (m.target == null) err("$path.bind", "bridge: bindings need a top-level \"target\" package")
                if (!UmtProtocol.KEY_REGEX.matches(Bindings.bridgeKey(b))) err("$path.bind", "'${Bindings.bridgeKey(b)}' is not a valid key")
                warn("$path.bind", "Type and range of '$b' are checked against the app when it is connected")
                return
            }
            val def = Bindings.local[b]
            if (def == null) { err("$path.bind", "Unknown binding '$b'"); return }
            if (def.type !in expected) err("$path.bind", "'$b' is ${def.type.name.lowercase()}, not usable by a ${c.type}")
            if (PluginValidator.SAW !in m.permissions) err("$path.bind", "'$b' controls an overlay: declare ${PluginValidator.SAW}")
            if (c.type == "slider" && def.min != null && def.max != null) {
                if ((c.min ?: def.min) < def.min || (c.max ?: def.max) > def.max) err(path, "Slider range must stay within ${def.min}..${def.max}")
            }
        }

        when (c.type) {
            "toggle" -> needBind(setOf(ValueType.BOOL))
            "slider" -> {
                needBind(setOf(ValueType.INT, ValueType.FLOAT))
                if (c.min != null && c.max != null && c.min >= c.max) err(path, "min must be below max")
                if (c.step != null && c.step <= 0) err("$path.step", "step must be positive")
                if (Bindings.isBridge(c.bind) && (c.min == null || c.max == null)) warn(path, "Without min/max the app's own range is used")
            }
            "dropdown" -> {
                needBind(setOf(ValueType.CHOICE))
                if (Bindings.isBridge(c.bind) && c.options.isEmpty()) warn("$path.options", "Options will come from the app when connected")
            }
            "button" -> {
                val a = c.action
                if (a == null || a !in Bindings.actions) err("$path.action", "Action must be one of ${Bindings.actions.joinToString()}")
                when (a) {
                    "profile.apply" -> if (c.arg?.isString != true) err("$path.arg", "profile.apply needs the profile name as arg")
                    "preset.apply" -> if (c.arg?.isString != true || m.presets.none { it.name == c.arg!!.content }) err("$path.arg", "preset.apply needs the name of a preset in this plugin")
                    "notify" -> {
                        if (PluginValidator.NOTIFY !in m.permissions) err("$path.action", "notify needs ${PluginValidator.NOTIFY}")
                        if (c.arg?.isString != true) err("$path.arg", "notify needs the message text as arg")
                    }
                    "bridge.reconnect" -> if (m.target == null) err("$path.action", "bridge.reconnect needs a top-level \"target\"")
                }
            }
            "value" -> {
                val s = c.source
                when {
                    s == null -> err("$path.source", "'value' needs a source")
                    Bindings.isBridge(s) -> if (m.target == null) err("$path.source", "bridge: sources need a top-level \"target\"")
                    s !in Bindings.sources -> err("$path.source", "Unknown source '$s'")
                }
                c.format?.let { f ->
                    val ok = try { String.format(f, 1.5); true } catch (e: Exception) {
                        try { String.format(f, "x"); true } catch (e2: Exception) { false }
                    }
                    if (!ok) err("$path.format", "'$f' is not a valid format (try \"%.1f °C\")")
                }
            }
            "label" -> Unit
        }
    }
}
