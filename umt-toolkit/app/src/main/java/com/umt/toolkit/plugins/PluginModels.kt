package com.umt.toolkit.plugins

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonPrimitive

/**
 * A declarative plugin: a floating menu panel whose controls are bound to things the toolkit
 * really controls (its overlay layers, the entity overlay, profiles) or to values an
 * integrated app exposes through umt-sdk ("bridge:<key>"). No code is loaded.
 */
@Serializable
data class PluginManifest(
    val schema: Int = 1,
    val id: String,
    val name: String,
    val version: String = "1.0.0",
    val author: String = "",
    val description: String = "",
    val permissions: List<String> = emptyList(),
    val refreshMs: Int = 1000,
    /** Package of the integrated app that bridge:<key> bindings talk to. */
    val target: String? = null,
    val panel: PanelSpec = PanelSpec(),
    val tabs: List<TabSpec> = emptyList(),
    val presets: List<PresetSpec> = emptyList(),
) {
    fun allControls(): List<ControlSpec> = tabs.flatMap { t -> t.controls + t.sections.flatMap { it.controls } }
}

@Serializable
data class PanelSpec(
    val title: String? = null,
    val x: Int = 24,
    val y: Int = 220,
    val widthDp: Int = 240,
    val opacity: Float = 0.95f,
    val collapsed: Boolean = false,
    val searchable: Boolean = true,
)

@Serializable
data class TabSpec(
    val title: String,
    val controls: List<ControlSpec> = emptyList(),
    val sections: List<SectionSpec> = emptyList(),
)

@Serializable
data class SectionSpec(
    val id: String,
    val title: String,
    val expanded: Boolean = true,
    val controls: List<ControlSpec> = emptyList(),
)

@Serializable
data class ControlSpec(
    /** toggle, slider, dropdown, button, value, label */
    val type: String,
    val id: String,
    val label: String,
    val bind: String? = null,
    val action: String? = null,
    val arg: JsonPrimitive? = null,
    val source: String? = null,
    val format: String? = null,
    val min: Double? = null,
    val max: Double? = null,
    val step: Double? = null,
    val options: List<String> = emptyList(),
    val description: String? = null,
)

@Serializable
data class PresetSpec(
    val name: String,
    /** control id -> value */
    val values: Map<String, JsonPrimitive>,
)

/** Per-plugin state the user changes; the manifest itself stays as written. */
@Serializable
data class PluginState(
    val enabled: Boolean = false,
    val panelVisible: Boolean = false,
    val x: Int? = null,
    val y: Int? = null,
    val widthDp: Int? = null,
    val opacity: Float? = null,
    val collapsed: Boolean? = null,
    val activeTab: Int = 0,
    val collapsedSections: Set<String> = emptySet(),
    val faults: Int = 0,
    val tripped: Boolean = false,
    val lastFault: String? = null,
    val installedAt: Long = 0,
)

/** The 3-fault circuit breaker from KNOWN_LIMITATIONS.md: three faults switch a plugin off. */
object CircuitBreaker {
    const val THRESHOLD = 3

    fun fault(s: PluginState, reason: String): PluginState {
        val n = s.faults + 1
        val trip = n >= THRESHOLD
        return s.copy(
            faults = n,
            lastFault = reason,
            tripped = trip,
            enabled = if (trip) false else s.enabled,
            panelVisible = if (trip) false else s.panelVisible,
        )
    }

    fun reset(s: PluginState): PluginState = s.copy(faults = 0, tripped = false, lastFault = null)

    fun canEnable(s: PluginState): Boolean = !s.tripped
}
