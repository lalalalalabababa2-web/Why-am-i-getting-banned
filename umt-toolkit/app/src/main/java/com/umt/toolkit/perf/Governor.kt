package com.umt.toolkit.perf

import android.view.Display
import android.view.Window
import com.umt.toolkit.model.GovernorSettings

/**
 * Optimisation profiles for the toolkit itself: how often it samples, how fast its overlays
 * redraw, which refresh rate its own window asks for, and whether it pauses with the screen off.
 * It never changes another app's frame rate or the GPU driver.
 */
object Governor {
    val profiles = listOf("battery", "balanced", "responsive", "custom")

    fun label(p: String) = when (p) {
        "battery" -> "Battery saver"
        "balanced" -> "Balanced"
        "responsive" -> "Responsive"
        else -> "Custom"
    }

    fun preset(profile: String, current: GovernorSettings, refreshRates: List<Float>): GovernorSettings = when (profile) {
        "battery" -> current.copy(profile = profile, sampleIntervalMs = 2000, overlayMaxFps = 15,
            refreshRateHz = refreshRates.minOrNull() ?: 0f, pauseWhenScreenOff = true, logLevel = "WARN")
        "balanced" -> current.copy(profile = profile, sampleIntervalMs = 1000, overlayMaxFps = 30,
            refreshRateHz = 0f, pauseWhenScreenOff = true, logLevel = "INFO")
        "responsive" -> current.copy(profile = profile, sampleIntervalMs = 250, overlayMaxFps = 60,
            refreshRateHz = refreshRates.maxOrNull() ?: 0f, pauseWhenScreenOff = false, logLevel = "INFO")
        else -> current.copy(profile = "custom")
    }

    /** Asks the system for the display mode with [hz] at the current resolution for this window. */
    fun applyRefreshRate(window: Window, display: Display?, hz: Float) {
        val attrs = window.attributes
        val wanted = if (hz <= 0f || display == null) 0 else {
            val cur = display.mode
            display.supportedModes
                .filter { it.physicalWidth == cur.physicalWidth && it.physicalHeight == cur.physicalHeight }
                .minByOrNull { kotlin.math.abs(it.refreshRate - hz) }?.modeId ?: 0
        }
        if (attrs.preferredDisplayModeId != wanted) {
            attrs.preferredDisplayModeId = wanted
            window.attributes = attrs
        }
    }
}
