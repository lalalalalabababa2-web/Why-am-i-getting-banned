# Compatibility Documentation — Universal Mod Toolkit

Universal Mod Toolkit enforces strict technical honesty about what Android permits on stock (non-rooted) devices versus apps you own and integrate with `:umt-sdk`.

## Android API Level Matrix

| Feature | Min Android API | Notes |
|---|---|---|
| Core App, Profiles, Atomic JSON Persistence | API 26 (Android 8.0) | Works across all supported devices. Writes go to `name.tmp`, are fsync'd, then atomically renamed. |
| AES-256-GCM Protected Export / Import | API 26 (Android 8.0) | Uses standard JCA `PBKDF2WithHmacSHA256` (210 000 iterations) + `AES/GCM/NoPadding`; header bound as associated data. |
| Floating Overlay Engine (`TYPE_APPLICATION_OVERLAY`) | API 26 (Android 8.0) | Requires user-granted `SYSTEM_ALERT_WINDOW`. On API 31+ pass-through layers use the system's maximum obscuring opacity (0.8) so touches reach the app below. |
| Foreground Service Kill Switch Notification | API 26+ (Runtime permission on API 33+) | Uses `FOREGROUND_SERVICE_SPECIAL_USE` on Android 14+, with the required `PROPERTY_SPECIAL_USE_FGS_SUBTYPE` declared in the manifest. |
| Thermal Status Telemetry (`PowerManager.currentThermalStatus`) | API 29 (Android 10) | Reports `"Unavailable (needs Android 10+)"` on API 26–28. Thermal headroom needs API 30. |
| Installed Package Query (`QUERY_ALL_PACKAGES`) | API 26–34 | Declared transparently for the Installed App Manager (sideloaded build; Google Play restricts this permission). |
| Sender verification for umt-sdk broadcasts | API 34 (Android 14) | `BroadcastOptions.setShareIdentityEnabled()` + `getSentFromPackage()`. Older versions rely on the SDK's debuggable-only default. |
| GPU strings | API 26 | Read from a throwaway 1×1 EGL pbuffer context. |
| SoC name | API 31 | `Build.SOC_MANUFACTURER` / `Build.SOC_MODEL`. |

## Capability Classification

Every module in UMT is explicitly tagged with one of seven capabilities and gated by `CompatibilityEngine`:

1. **Supported** — Works natively via standard Android APIs (e.g., Toolkit Resource Governor, Profiles, Diagnostics).
2. **Overlay-Only** — Renders an independent floating panel or touch-passthrough visual layer without inspecting or modifying the target app's process memory (e.g., Telemetry HUD, Reticle/Safe-Area Guide, Screen Dimmer, plugin menu panels).
3. **Developer Integration** — Requires the target app to declare `com.umt.integration.supported=true` and integrate `:umt-sdk` (e.g., Live ESP Entity Stream, Developer Diagnostic & Config Bridge, Authorized Patches).
4. **Requires Source Code** — Modifications that must be compiled into an app or game you own.
5. **Requires Permission** — Requires explicit user approval (`SYSTEM_ALERT_WINDOW` or `POST_NOTIFICATIONS`).
6. **Requires Root (Info Only)** — Documented in Advanced Mode reference only; UMT does not execute root exploits or silent privilege escalation.
7. **Unsupported** — Blocked by Android's UID sandbox and SELinux (e.g., reading/patching third-party private memory). Cannot be enabled in UMT.

## Module Matrix

| Module | Capability | Third-party app | App with `:umt-sdk` |
|---|---|---|---|
| Profiles & atomic persistence | Supported | n/a | n/a |
| Diagnostics & performance monitor | Supported | Toolkit's own metrics only | App may self-report FPS/metrics |
| Toolkit resource governor | Supported | n/a | n/a |
| Kill-switch notification | Supported · Requires Permission | ✔ | ✔ |
| Telemetry HUD | Overlay-Only · Requires Permission | ✔ (drawn above it) | ✔ |
| Reticle / safe-area guide | Overlay-Only · Requires Permission | ✔ (drawn above it) | ✔ |
| Screen dimmer | Overlay-Only · Requires Permission | ✔ | ✔ |
| Plugin menu panels | Overlay-Only · Requires Permission | Toolkit bindings only | + `bridge:<key>` values |
| Live ESP entity stream | Developer Integration | ✘ | ✔ (debuggable builds by default) |
| Diagnostic & config bridge | Developer Integration | ✘ | ✔ |
| Authorized patches | Developer Integration | ✘ | ✔ |
| Code-level modifications | Requires Source Code | ✘ | In the app's own source |
| System-level tweaks | Requires Root (Info Only) | ✘ | ✘ |
| Reading/patching another app's memory | Unsupported | ✘ | ✘ |

## Framework Detection (Apps screen)

Detected from file names inside the APK and its splits (read-only): Unity (IL2CPP / Mono), Unreal Engine, Godot, Cocos2d-x / Cocos Creator, Defold, GameMaker, libGDX, Flutter, React Native, Xamarin / .NET MAUI, Cordova / Capacitor, Jetpack Compose, Kotlin, DEX bytecode, and plain NDK native code. For each, the analyzer shows how that app's developer would add `:umt-sdk`.

Accepted inputs: installed apps (base + split APKs), `.apk`, `.apks` and `.xapk` files. Encrypted bundles (`.apkm`) are reported as unsupported.
