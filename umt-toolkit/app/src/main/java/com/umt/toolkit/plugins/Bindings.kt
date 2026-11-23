package com.umt.toolkit.plugins

import com.umt.sdk.ValueType
import com.umt.toolkit.model.Palette
import com.umt.toolkit.model.ReticleStyle
import com.umt.toolkit.model.ToolkitState
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.doubleOrNull

class BindingDef(
    val key: String,
    val type: ValueType,
    val label: String,
    val min: Double? = null,
    val max: Double? = null,
    val choices: List<String> = emptyList(),
    val read: (ToolkitState) -> JsonPrimitive,
    val write: (ToolkitState, JsonPrimitive) -> ToolkitState,
)

/** Everything a plugin control may bind to, act on or display. Anything else is rejected. */
object Bindings {
    const val BRIDGE_PREFIX = "bridge:"

    private fun bool(key: String, label: String, get: (ToolkitState) -> Boolean, set: (ToolkitState, Boolean) -> ToolkitState) =
        BindingDef(key, ValueType.BOOL, label, read = { JsonPrimitive(get(it)) },
            write = { s, v -> set(s, v.booleanOrNull ?: throw IllegalArgumentException("expected true/false")) })

    private fun num(key: String, label: String, min: Double, max: Double, int: Boolean, get: (ToolkitState) -> Double, set: (ToolkitState, Double) -> ToolkitState) =
        BindingDef(key, if (int) ValueType.INT else ValueType.FLOAT, label, min, max, read = { JsonPrimitive(get(it)) },
            write = { s, v ->
                val d = v.doubleOrNull ?: throw IllegalArgumentException("expected a number")
                if (d < min || d > max) throw IllegalArgumentException("$d is outside $min..$max")
                set(s, d)
            })

    private fun choice(key: String, label: String, choices: List<String>, get: (ToolkitState) -> String, set: (ToolkitState, String) -> ToolkitState) =
        BindingDef(key, ValueType.CHOICE, label, choices = choices, read = { JsonPrimitive(get(it)) },
            write = { s, v -> if (v.content in choices) set(s, v.content) else throw IllegalArgumentException("'${v.content}' is not one of $choices") })

    val local: Map<String, BindingDef> = listOf(
        bool("overlay.hud.enabled", "Telemetry HUD", { it.overlays.hudEnabled }) { s, v -> s.copy(overlays = s.overlays.copy(hudEnabled = v)) },
        bool("overlay.reticle.enabled", "Reticle", { it.overlays.reticleEnabled }) { s, v -> s.copy(overlays = s.overlays.copy(reticleEnabled = v)) },
        choice("overlay.reticle.style", "Reticle style", ReticleStyle.all, { it.overlays.reticleStyle }) { s, v -> s.copy(overlays = s.overlays.copy(reticleStyle = v)) },
        choice("overlay.reticle.color", "Reticle colour", Palette.names, { it.overlays.reticleColor }) { s, v -> s.copy(overlays = s.overlays.copy(reticleColor = v)) },
        num("overlay.reticle.size", "Reticle size (dp)", 4.0, 120.0, false, { it.overlays.reticleSizeDp.toDouble() }) { s, v -> s.copy(overlays = s.overlays.copy(reticleSizeDp = v.toFloat())) },
        num("overlay.reticle.opacity", "Reticle opacity", 0.1, 1.0, false, { it.overlays.reticleOpacity.toDouble() }) { s, v -> s.copy(overlays = s.overlays.copy(reticleOpacity = v.toFloat())) },
        bool("overlay.guide.enabled", "Safe-area guide", { it.overlays.guideEnabled }) { s, v -> s.copy(overlays = s.overlays.copy(guideEnabled = v)) },
        bool("overlay.dimmer.enabled", "Screen dimmer", { it.overlays.dimmerEnabled }) { s, v -> s.copy(overlays = s.overlays.copy(dimmerEnabled = v)) },
        num("overlay.dimmer.level", "Dimmer level", 0.0, 0.8, false, { it.overlays.dimmerLevel.toDouble() }) { s, v -> s.copy(overlays = s.overlays.copy(dimmerLevel = v.toFloat())) },
        bool("overlay.dimmer.warm", "Warm dimmer", { it.overlays.dimmerWarm }) { s, v -> s.copy(overlays = s.overlays.copy(dimmerWarm = v)) },
        bool("overlay.esp.enabled", "Entity overlay", { it.overlays.espEnabled }) { s, v -> s.copy(overlays = s.overlays.copy(espEnabled = v)) },
        choice("esp.source", "Entity source", listOf("sandbox", "integration"), { it.esp.source }) { s, v -> s.copy(esp = s.esp.copy(source = v)) },
        bool("esp.boxes", "Boxes", { it.esp.boxes }) { s, v -> s.copy(esp = s.esp.copy(boxes = v)) },
        choice("esp.boxStyle", "Box style", listOf("full", "corners"), { it.esp.boxStyle }) { s, v -> s.copy(esp = s.esp.copy(boxStyle = v)) },
        bool("esp.labels", "Labels", { it.esp.labels }) { s, v -> s.copy(esp = s.esp.copy(labels = v)) },
        bool("esp.distance", "Distance", { it.esp.distance }) { s, v -> s.copy(esp = s.esp.copy(distance = v)) },
        bool("esp.health", "Health bars", { it.esp.health }) { s, v -> s.copy(esp = s.esp.copy(health = v)) },
        bool("esp.lines", "Lines", { it.esp.lines }) { s, v -> s.copy(esp = s.esp.copy(lines = v)) },
        bool("esp.offscreen", "Off-screen arrows", { it.esp.offscreen }) { s, v -> s.copy(esp = s.esp.copy(offscreen = v)) },
        bool("esp.radar", "Radar", { it.esp.radar }) { s, v -> s.copy(esp = s.esp.copy(radar = v)) },
        num("esp.maxDistance", "Max distance", 5.0, 5000.0, false, { it.esp.maxDistance.toDouble() }) { s, v -> s.copy(esp = s.esp.copy(maxDistance = v.toFloat())) },
        num("esp.maxEntities", "Max entities", 1.0, 256.0, true, { it.esp.maxEntities.toDouble() }) { s, v -> s.copy(esp = s.esp.copy(maxEntities = v.toInt())) },
        num("esp.opacity", "Overlay opacity", 0.1, 1.0, false, { it.esp.opacity.toDouble() }) { s, v -> s.copy(esp = s.esp.copy(opacity = v.toFloat())) },
    ).associateBy { it.key }

    /** Buttons. "notify" needs POST_NOTIFICATIONS, the rest SYSTEM_ALERT_WINDOW (they act on overlays). */
    val actions: Set<String> = setOf(
        "overlay.stopAll", "panel.close", "profile.apply", "preset.apply", "bridge.reconnect", "esp.reseed", "notify",
    )

    val sources: Map<String, String> = linkedMapOf(
        "telemetry.batteryPct" to "Battery %",
        "telemetry.batteryTempC" to "Battery temperature (°C)",
        "telemetry.thermal" to "Thermal status",
        "telemetry.memAvailMb" to "Free RAM (MB)",
        "telemetry.cpuSelf" to "Toolkit CPU %",
        "telemetry.uiFps" to "Toolkit UI fps",
        "telemetry.refreshHz" to "Display refresh (Hz)",
        "esp.entityCount" to "Entities in the latest frame",
        "esp.frameHz" to "Entity frames per second",
        "clock.time" to "Clock",
    )

    fun isBridge(key: String?) = key != null && key.startsWith(BRIDGE_PREFIX)
    fun bridgeKey(key: String) = key.removePrefix(BRIDGE_PREFIX)
}
