package com.umt.toolkit.compat

import com.umt.toolkit.apps.Framework

/** The seven capability classes from COMPATIBILITY.md. */
enum class Capability(val label: String, val summary: String) {
    SUPPORTED("Supported", "Works through standard Android APIs."),
    OVERLAY_ONLY("Overlay-Only", "Draws an independent layer above other apps; never reads or changes them."),
    DEVELOPER_INTEGRATION("Developer Integration", "Needs the target app to include umt-sdk and declare com.umt.integration.supported=true."),
    REQUIRES_SOURCE("Requires Source Code", "Has to be compiled into an app you own."),
    REQUIRES_PERMISSION("Requires Permission", "Needs a permission you grant (display over other apps, notifications)."),
    REQUIRES_ROOT_INFO("Requires Root (Info Only)", "Documented for reference; the toolkit does not do it."),
    UNSUPPORTED("Unsupported", "Blocked by Android's app sandbox and SELinux; cannot be enabled."),
}

enum class ModuleId(val title: String, val tags: List<Capability>) {
    PROFILES("Profiles & atomic persistence", listOf(Capability.SUPPORTED)),
    DIAGNOSTICS("Diagnostics & performance monitor", listOf(Capability.SUPPORTED)),
    GOVERNOR("Toolkit resource governor", listOf(Capability.SUPPORTED)),
    KILL_SWITCH("Kill-switch notification", listOf(Capability.SUPPORTED, Capability.REQUIRES_PERMISSION)),
    TELEMETRY_HUD("Telemetry HUD", listOf(Capability.OVERLAY_ONLY, Capability.REQUIRES_PERMISSION)),
    RETICLE_GUIDE("Reticle / safe-area guide", listOf(Capability.OVERLAY_ONLY, Capability.REQUIRES_PERMISSION)),
    SCREEN_DIMMER("Screen dimmer", listOf(Capability.OVERLAY_ONLY, Capability.REQUIRES_PERMISSION)),
    PLUGIN_PANELS("Plugin menu panels", listOf(Capability.OVERLAY_ONLY, Capability.REQUIRES_PERMISSION)),
    ESP_STREAM("Live ESP entity stream", listOf(Capability.DEVELOPER_INTEGRATION)),
    CONFIG_BRIDGE("Diagnostic & config bridge", listOf(Capability.DEVELOPER_INTEGRATION)),
    AUTHORIZED_PATCHES("Authorized patches", listOf(Capability.DEVELOPER_INTEGRATION)),
    SOURCE_MODS("Code-level modifications", listOf(Capability.REQUIRES_SOURCE)),
    ROOT_LEVEL("System-level tweaks", listOf(Capability.REQUIRES_ROOT_INFO)),
    PRIVATE_MEMORY("Reading or patching another app's memory", listOf(Capability.UNSUPPORTED)),
}

enum class Availability(val label: String) {
    AVAILABLE("Available"),
    NEEDS_PERMISSION("Needs permission"),
    NEEDS_INTEGRATION("Needs integration"),
    INFO_ONLY("Info only"),
    UNSUPPORTED("Unsupported"),
}

data class ModuleReport(val module: ModuleId, val availability: Availability, val reasons: List<String>)

data class DeviceCaps(
    val sdkInt: Int,
    val canDrawOverlays: Boolean,
    val canPostNotifications: Boolean,
    /** InputManager.getMaximumObscuringOpacityForTouch() on API 31+, else 1. */
    val maxPassthroughOpacity: Float,
)

data class TargetInfo(
    val packageName: String,
    val label: String,
    val integrated: Boolean,
    val frameworks: List<Framework>,
    val isSystem: Boolean,
    val debuggable: Boolean,
)

object CompatibilityEngine {

    fun evaluate(device: DeviceCaps, target: TargetInfo?): List<ModuleReport> = ModuleId.entries.map { m ->
        when (m) {
            ModuleId.PROFILES, ModuleId.GOVERNOR -> ModuleReport(m, Availability.AVAILABLE, emptyList())
            ModuleId.DIAGNOSTICS -> ModuleReport(m, Availability.AVAILABLE, listOf(
                "Measures this toolkit's own frame pacing and CPU time; other apps' frame rates are not visible to it.",
            ) + if (device.sdkInt >= 26) listOf("Device-wide CPU usage is blocked by SELinux on Android 8+.") else emptyList())
            ModuleId.KILL_SWITCH -> if (device.sdkInt >= 33 && !device.canPostNotifications)
                ModuleReport(m, Availability.NEEDS_PERMISSION, listOf("Android 13+: allow notifications to see the Stop-all button. Overlays still stop from inside the app."))
            else ModuleReport(m, Availability.AVAILABLE, emptyList())
            ModuleId.TELEMETRY_HUD, ModuleId.RETICLE_GUIDE, ModuleId.SCREEN_DIMMER, ModuleId.PLUGIN_PANELS -> overlay(m, device, target)
            ModuleId.ESP_STREAM, ModuleId.CONFIG_BRIDGE, ModuleId.AUTHORIZED_PATCHES -> integration(m, device, target)
            ModuleId.SOURCE_MODS -> ModuleReport(m, Availability.INFO_ONLY, listOf(
                "Changes to an app's code belong in that app's source, built by its developer.",
                "For your own apps, expose tunable values through umt-sdk instead of patching builds.",
            ))
            ModuleId.ROOT_LEVEL -> ModuleReport(m, Availability.INFO_ONLY, listOf(
                "Listed in Settings > Advanced for reference. The toolkit never asks for or uses root.",
            ))
            ModuleId.PRIVATE_MEMORY -> ModuleReport(m, Availability.UNSUPPORTED, listOf(
                "Every app runs under its own Linux user ID in its own SELinux domain; another app's memory is not readable or writable.",
            ))
        }
    }

    private fun overlay(m: ModuleId, device: DeviceCaps, target: TargetInfo?): ModuleReport {
        val reasons = ArrayList<String>()
        if (target != null) reasons += "Draws above ${target.label}; does not read its screen or input."
        if (m != ModuleId.TELEMETRY_HUD && m != ModuleId.PLUGIN_PANELS && device.sdkInt >= 31) {
            reasons += "Android 12+: pass-through layers are capped at ${(device.maxPassthroughOpacity * 100).toInt()}% opacity so touches still reach the app underneath."
        }
        if (target?.isSystem == true) reasons += "Some system screens hide third-party overlays."
        return if (device.canDrawOverlays) ModuleReport(m, Availability.AVAILABLE, reasons)
        else ModuleReport(m, Availability.NEEDS_PERMISSION, listOf("Allow \"Display over other apps\" for the toolkit.") + reasons)
    }

    private fun integration(m: ModuleId, device: DeviceCaps, target: TargetInfo?): ModuleReport {
        if (target == null) return ModuleReport(m, Availability.INFO_ONLY, listOf(
            "Select an app that includes umt-sdk, or use the Local Sandbox Test Feed.",
        ))
        if (!target.integrated) return ModuleReport(m, Availability.NEEDS_INTEGRATION, listOf(
            "${target.label} does not declare com.umt.integration.supported.",
            integrationHint(target.frameworks),
        ))
        val reasons = ArrayList<String>()
        if (!target.debuggable) reasons += "Release build: umt-sdk keeps remote changes and streaming off unless the developer enables them in UmtSdk.Config."
        if (m == ModuleId.ESP_STREAM && !device.canDrawOverlays) reasons += "In-app preview works; drawing over the app needs \"Display over other apps\"."
        return ModuleReport(m, Availability.AVAILABLE, reasons)
    }

    /** How the developer of an app built with these frameworks would add umt-sdk. */
    fun integrationHint(frameworks: List<Framework>): String {
        val f = frameworks.firstOrNull { it.engine }
        return when (f) {
            Framework.UNITY_IL2CPP, Framework.UNITY_MONO ->
                "Unity: put umt-sdk.aar in Assets/Plugins/Android and call com.umt.sdk.UmtSdk through AndroidJavaClass; add the meta-data to a custom AndroidManifest.xml."
            Framework.UNREAL ->
                "Unreal: add umt-sdk.aar through an Unreal Plugin Language (UPL) file and call it over JNI from the game module."
            Framework.GODOT ->
                "Godot: wrap umt-sdk in a Godot Android plugin (v2) and call it from GDScript."
            Framework.FLUTTER ->
                "Flutter: add umt-sdk to the android/ Gradle module and bridge it with a MethodChannel."
            Framework.REACT_NATIVE ->
                "React Native: expose umt-sdk through a native module in the android/ project."
            Framework.XAMARIN ->
                "Xamarin/.NET: bind umt-sdk.aar with an Android binding library."
            Framework.CORDOVA ->
                "Cordova/Capacitor: wrap umt-sdk in a plugin and call it from JavaScript."
            Framework.COCOS, Framework.DEFOLD, Framework.GAMEMAKER, Framework.LIBGDX ->
                "${f.label}: add umt-sdk.aar to the Android export and call it over JNI or the engine's Java bridge."
            else ->
                "Android app: implementation(project(\":umt-sdk\")), UmtSdk.init(this) in Application.onCreate, and the meta-data in the manifest."
        }
    }
}
