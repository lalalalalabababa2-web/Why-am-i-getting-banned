# Universal Mod Toolkit

An Android utility for inspecting apps, drawing overlays above them, and driving apps you build
yourself through a small SDK. It is honest about where Android draws the line: other apps are
analysed read-only and can only be drawn *over*; live entity data, value changes and patches
come only from apps that integrate `:umt-sdk`. See [COMPATIBILITY.md](COMPATIBILITY.md) and
[KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md).

| | |
|---|---|
| Platform | Android 8.0+ (API 26), target API 34 |
| Language | Kotlin, Jetpack Compose (app UI), Android Views (overlay windows) |
| Toolchain | Gradle 8.9, Android Gradle Plugin 8.5.2, Kotlin 2.0.20, JDK 17+ |
| Modules | `:app` (the toolkit), `:umt-sdk` (library for your apps), `:sample-app` (SDK demo) |
| Root | Never used |

## Screens

1. **Home** – permission status (overlay, notifications), overlay service state and kill switch, live battery/thermal/memory readings, device summary.
2. **Apps** – every installed app with search, User/System/Integrated filters and sorting; or pick an `.apk`, `.apks` or `.xapk` file. Tap an app for its analysis.
3. **App analysis** – package, SDK levels, install location, installer, APK and split sizes, ABIs against the device, runtime detection with evidence (Unity IL2CPP/Mono, Unreal, Godot, Flutter, React Native, Xamarin, Cordova, Cocos, Defold, GameMaker, libGDX, Compose, Kotlin, NDK), native libraries, permissions with protection level and grant state, components, warnings, and a per-module "what works with this app" report. Exports as JSON.
4. **Overlays** – telemetry HUD (draggable, chosen readouts), reticle (6 styles, 8 colours, size, thickness, gap, opacity, offset; live preview), safe-area guide (thirds, centre, margins, camera cutout), screen dimmer (with warm tint), entity overlay switch, kill switch.
5. **Integration** – entity source (Local Sandbox Test Feed or an integrated app), connect/disconnect, and four tabs:
   - *Stream*: live preview drawn by the same renderer as the overlay, stream start/stop and rate, boxes (full or corners), labels, distance, health bars, lines, off-screen arrows, radar (size, range), max distance/entities, opacity, line width, per-kind visibility and colour.
   - *Config*: every value the app registered, as toggles, sliders, choices or fields; each change is validated against the app's schema and shows the app's acknowledgement (applied, rejected with reason, or no answer).
   - *Patches*: named value sets created from current values; before/after preview, apply with per-value verification, revert to the backed-up values, export/import, history. Detects incompatible app updates (missing keys, out-of-range values, version change).
   - *Diagnostics*: what the app reports (self-reported FPS, metrics, log lines), frames received, events dropped.
6. **Plugins & menus** – the mod-menu builder: JSON-defined floating panels with tabs, collapsible sections, toggles, sliders, dropdowns, buttons, value readouts, search and presets; drag, resize, collapse, opacity, position memory. Editor with syntax colouring, line numbers, find, formatting, live validation and a live preview that uses the real bindings. Import/export.
7. **Performance** – the toolkit's own Choreographer frame pacing (chart, p50/p95/max, jank/stutter), own CPU, device-wide CPU where readable, memory, battery (level, temperature, voltage, current), thermal status and headroom, GPU strings, display modes; session recording, comparison of two sessions, export; resource governor profiles.
8. **Profiles** – save/overwrite/rename/delete/apply full setting snapshots (including which plugins are on); export plain or password-protected (AES-256-GCM), import either.
9. **Console** – live log with level filter, search, follow, copy, export; crash reports from previous runs.
10. **Settings** – permissions, kill switch, logging, compatibility matrix, known limitations, advanced (root reference, info only), data reset, about.

## Build

Needs JDK 17 or newer and the Android SDK (platform 34, build-tools 34). In Android Studio,
open the `umt-toolkit` folder. From a shell:

```bash
cd umt-toolkit
echo "sdk.dir=$ANDROID_HOME" > local.properties     # once

./gradlew testDebugUnitTest            # JVM + Robolectric tests
./gradlew :app:assembleRelease         # app/build/outputs/apk/release/app-release.apk
./gradlew :sample-app:assembleRelease  # sample-app/build/outputs/apk/release/sample-app-release.apk
./gradlew :app:assembleDebug           # debug build, installs beside the release as com.umt.toolkit.debug
```

Release builds are signed with the sideload key in `keystore/umt-sideload.jks` so every build
installs over the previous one. To use your own key, set `UMT_KEYSTORE`, `UMT_KEYSTORE_PASSWORD`,
`UMT_KEY_ALIAS` and `UMT_KEY_PASSWORD`.

## Install

1. Copy `UniversalModToolkit.apk` to the phone and open it; allow installs from that source when Android asks.
2. Open **Mod Toolkit**. On Home, tap **Grant** for *Display over other apps* and **Allow** for notifications (Android 13+).
3. Optional: install `UMT-SDK-Demo.apk` too, open it, then in the toolkit go to **Integration → Integrated app → UMT SDK Demo → Connect**.

With adb: `adb install -r UniversalModToolkit.apk`.

## Integrating your own app

```kotlin
// build.gradle.kts of your app
dependencies { implementation(project(":umt-sdk")) }   // or the AAR from :umt-sdk:assembleRelease
```

```xml
<!-- AndroidManifest.xml, inside <application> -->
<meta-data android:name="com.umt.integration.supported" android:value="true" />
```

```kotlin
class MyApp : Application() {
    override fun onCreate() {
        super.onCreate()
        UmtSdk.init(this)  // remote changes + streaming on in debuggable builds only
        UmtSdk.registerFloat("time_scale", "Time scale", 1f, 0f, 4f, 0.1f, group = "Debug") { Game.timeScale = it }
        UmtSdk.registerBool("show_colliders", "Show colliders", false, group = "Debug") { Game.showColliders = it }
    }
}

// each frame, in your view's coordinates (sent only while the toolkit asks, throttled)
UmtSdk.publishFrame(gameView, entities.map { Entity(it.id, it.kind, it.x, it.y, it.w, it.h, it.name, it.distance) }, Pose(px, pz, yaw))
UmtSdk.publishDiagnostics(fps = measuredFps, metrics = mapOf("draw calls" to "$drawCalls"))
```

`sample-app/` is a complete example.

## Plugin format

```json
{
  "schema": 1,
  "id": "com.example.quickpanel",
  "name": "Quick Panel",
  "permissions": ["SYSTEM_ALERT_WINDOW"],
  "refreshMs": 1000,
  "target": "com.example.mygame",
  "panel": { "title": "Quick Panel", "x": 24, "y": 220, "widthDp": 240, "opacity": 0.95 },
  "tabs": [
    { "title": "Layers", "sections": [
      { "id": "screen", "title": "Screen", "controls": [
        { "type": "toggle", "id": "dim", "label": "Dimmer", "bind": "overlay.dimmer.enabled" },
        { "type": "slider", "id": "lvl", "label": "Level", "bind": "overlay.dimmer.level", "min": 0, "max": 0.8, "step": 0.05 }
      ]}
    ]},
    { "title": "Game", "controls": [
      { "type": "slider", "id": "ts", "label": "Time scale", "bind": "bridge:time_scale" },
      { "type": "value", "id": "t", "label": "Battery", "source": "telemetry.batteryTempC", "format": "%.1f °C" },
      { "type": "button", "id": "night", "label": "Night", "action": "preset.apply", "arg": "Night" }
    ]}
  ],
  "presets": [ { "name": "Night", "values": { "dim": true, "lvl": 0.5 } } ]
}
```

Control types: `toggle`, `slider`, `dropdown`, `button`, `value`, `label`. The editor's
*Reference* lists every `bind`, `action` and `source`. Caps: 8 tabs, 16 sections, 48 controls,
16 presets, refresh 250–10 000 ms, 64 KB. Three faults switch a plugin off until reset.

## Feature status

**Implemented and tested**: everything listed under *Screens*, the SDK, the demo app, atomic
persistence, protected export, crash reports, the kill switch, the 3-fault circuit breaker.

**Not provided, by design** (see KNOWN_LIMITATIONS.md): reading or writing another app's memory,
injecting code into other apps, entity data for apps without `:umt-sdk`, changing other apps'
frame rate or the GPU driver, device-wide CPU on Android 8+, root features, loading plugin code.

## Project layout

```
umt-toolkit/
  app/src/main/java/com/umt/toolkit/
    apps/         APK and installed-app analysis, framework detection
    compat/       CompatibilityEngine and the capability classes
    core/         atomic JSON store, protected export, logger, crash handler
    data/         settings and profile repositories
    esp/          entity renderer, geometry, sandbox feed, frame router
    integration/  umt-sdk link (IntegrationHub) and patch manager
    model/        persisted settings
    overlay/      overlay service, windows, HUD, menu panel, kill switch
    perf/         performance monitor, frame monitor, GPU probe, governor
    plugins/      plugin schema, validator, bindings, manager, templates
    ui/           Compose screens and components
  umt-sdk/        the library integrated apps use
  sample-app/     demo app that integrates umt-sdk
```
