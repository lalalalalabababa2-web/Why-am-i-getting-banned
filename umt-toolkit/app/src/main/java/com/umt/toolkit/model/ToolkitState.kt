package com.umt.toolkit.model

import kotlinx.serialization.Serializable

/** Everything the user configures; persisted atomically and captured by profiles. */
@Serializable
data class ToolkitState(
    val overlays: OverlaySettings = OverlaySettings(),
    val esp: EspSettings = EspSettings(),
    val governor: GovernorSettings = GovernorSettings(),
    val integration: IntegrationSettings = IntegrationSettings(),
    val ui: UiSettings = UiSettings(),
) {
    /** Clamps every number into its valid range (imported profiles may carry anything). */
    fun sanitized(): ToolkitState = copy(
        overlays = overlays.sanitized(),
        esp = esp.sanitized(),
        governor = governor.sanitized(),
        integration = integration.copy(streamHz = integration.streamHz.coerceIn(1, 60)),
    )

    val anyPassthroughLayer: Boolean
        get() = overlays.reticleEnabled || overlays.guideEnabled || overlays.dimmerEnabled || overlays.espEnabled

    val anyOverlay: Boolean get() = anyPassthroughLayer || overlays.hudEnabled
}

object HudMetric {
    const val TIME = "time"
    const val BATTERY = "batt"
    const val TEMP = "temp"
    const val THERMAL = "thermal"
    const val MEMORY = "mem"
    const val CPU = "cpu"
    const val UI_FPS = "uifps"
    const val REFRESH = "hz"
    const val CURRENT = "current"

    val all = listOf(TIME, BATTERY, TEMP, THERMAL, MEMORY, CPU, UI_FPS, REFRESH, CURRENT)
    val defaults = listOf(BATTERY, TEMP, THERMAL, MEMORY)

    fun label(key: String) = when (key) {
        TIME -> "Clock"
        BATTERY -> "Battery %"
        TEMP -> "Battery temp"
        THERMAL -> "Thermal status"
        MEMORY -> "Free RAM"
        CPU -> "Toolkit CPU"
        UI_FPS -> "Toolkit UI fps"
        REFRESH -> "Display Hz"
        CURRENT -> "Battery current"
        else -> key
    }
}

object ReticleStyle {
    val all = listOf("cross", "dot", "circle", "cross_dot", "chevron", "tee")
    fun label(s: String) = when (s) {
        "cross" -> "Cross"; "dot" -> "Dot"; "circle" -> "Ring"; "cross_dot" -> "Cross + dot"
        "chevron" -> "Chevron"; "tee" -> "T"; else -> s
    }
}

/** Named colours shared by overlays, the entity renderer and plugins. */
object Palette {
    val colors: Map<String, Long> = linkedMapOf(
        "white" to 0xFFF2F2F2,
        "gray" to 0xFFA8B0B8,
        "red" to 0xFFE0675C,
        "amber" to 0xFFE0B252,
        "green" to 0xFF79C27F,
        "cyan" to 0xFF5DC4CF,
        "blue" to 0xFF6F9FE0,
        "magenta" to 0xFFD27BD6,
    )
    val names: List<String> get() = colors.keys.toList()
    fun argb(name: String?): Int = (colors[name] ?: colors.getValue("white")).toInt()
}

@Serializable
data class OverlaySettings(
    val hudEnabled: Boolean = false,
    val hudMetrics: List<String> = HudMetric.defaults,
    val hudX: Int = 16,
    val hudY: Int = 160,
    val hudOpacity: Float = 0.85f,
    val hudTextSp: Float = 11f,

    val reticleEnabled: Boolean = false,
    val reticleStyle: String = "cross",
    val reticleColor: String = "white",
    val reticleSizeDp: Float = 24f,
    val reticleThicknessDp: Float = 2f,
    val reticleGapDp: Float = 4f,
    val reticleOpacity: Float = 0.8f,
    val reticleOffsetXDp: Float = 0f,
    val reticleOffsetYDp: Float = 0f,

    val guideEnabled: Boolean = false,
    val guideThirds: Boolean = true,
    val guideCenter: Boolean = true,
    val guideCutout: Boolean = true,
    val guideMarginPct: Float = 5f,

    val dimmerEnabled: Boolean = false,
    val dimmerLevel: Float = 0.3f,
    val dimmerWarm: Boolean = false,

    val espEnabled: Boolean = false,
) {
    fun sanitized() = copy(
        hudMetrics = hudMetrics.filter { it in HudMetric.all }.distinct(),
        hudX = hudX.coerceIn(0, 10_000),
        hudY = hudY.coerceIn(0, 10_000),
        hudOpacity = hudOpacity.coerceIn(0.3f, 1f),
        hudTextSp = hudTextSp.coerceIn(8f, 18f),
        reticleStyle = reticleStyle.takeIf { it in ReticleStyle.all } ?: "cross",
        reticleColor = reticleColor.takeIf { it in Palette.colors } ?: "white",
        reticleSizeDp = reticleSizeDp.coerceIn(4f, 120f),
        reticleThicknessDp = reticleThicknessDp.coerceIn(1f, 8f),
        reticleGapDp = reticleGapDp.coerceIn(0f, 40f),
        reticleOpacity = reticleOpacity.coerceIn(0.1f, 1f),
        reticleOffsetXDp = reticleOffsetXDp.coerceIn(-300f, 300f),
        reticleOffsetYDp = reticleOffsetYDp.coerceIn(-300f, 300f),
        guideMarginPct = guideMarginPct.coerceIn(0f, 20f),
        dimmerLevel = dimmerLevel.coerceIn(0f, 0.8f),
    )
}

@Serializable
data class EspSettings(
    /** "sandbox" (Local Sandbox Test Feed) or "integration" (an app with umt-sdk). */
    val source: String = "sandbox",
    val boxes: Boolean = true,
    val boxStyle: String = "full",
    val labels: Boolean = true,
    val distance: Boolean = true,
    val health: Boolean = true,
    val lines: Boolean = false,
    val offscreen: Boolean = true,
    val radar: Boolean = true,
    val radarSizeDp: Float = 110f,
    val radarRange: Float = 60f,
    val maxDistance: Float = 250f,
    val maxEntities: Int = 64,
    val opacity: Float = 0.9f,
    val strokeDp: Float = 1.5f,
    val hiddenKinds: Set<String> = emptySet(),
    val kindColors: Map<String, String> = mapOf(
        "npc" to "amber", "item" to "green", "vehicle" to "cyan", "marker" to "magenta",
    ),
    val defaultColor: String = "white",
    val sandboxEntities: Int = 24,
) {
    fun sanitized() = copy(
        source = if (source == "integration") "integration" else "sandbox",
        boxStyle = if (boxStyle == "corners") "corners" else "full",
        radarSizeDp = radarSizeDp.coerceIn(60f, 240f),
        radarRange = radarRange.coerceIn(5f, 1000f),
        maxDistance = maxDistance.coerceIn(5f, 5000f),
        maxEntities = maxEntities.coerceIn(1, 256),
        opacity = opacity.coerceIn(0.1f, 1f),
        strokeDp = strokeDp.coerceIn(0.5f, 6f),
        kindColors = kindColors.filterValues { it in Palette.colors },
        defaultColor = defaultColor.takeIf { it in Palette.colors } ?: "white",
        sandboxEntities = sandboxEntities.coerceIn(1, 128),
    )

    fun colorFor(kind: String): Int = Palette.argb(kindColors[kind] ?: defaultColor)
}

@Serializable
data class GovernorSettings(
    val profile: String = "balanced",
    val sampleIntervalMs: Int = 1000,
    val overlayMaxFps: Int = 30,
    /** 0 = leave it to the system. Applies to the toolkit's own window only. */
    val refreshRateHz: Float = 0f,
    val pauseWhenScreenOff: Boolean = true,
    val logLevel: String = "INFO",
    val logCapacity: Int = 2000,
) {
    fun sanitized() = copy(
        sampleIntervalMs = sampleIntervalMs.coerceIn(250, 5000),
        overlayMaxFps = overlayMaxFps.coerceIn(5, 120),
        refreshRateHz = refreshRateHz.coerceIn(0f, 240f),
        logLevel = logLevel.takeIf { it in listOf("DEBUG", "INFO", "WARN", "ERROR") } ?: "INFO",
        logCapacity = logCapacity.coerceIn(200, 20_000),
    )
}

@Serializable
data class IntegrationSettings(
    val targetPackage: String? = null,
    val streamHz: Int = 20,
)

@Serializable
data class UiSettings(
    val advancedMode: Boolean = false,
)
