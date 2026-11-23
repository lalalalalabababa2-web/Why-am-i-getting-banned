# Test Results — Universal Mod Toolkit

Run on 2026-11-23 in a Linux container: JDK 21, Gradle 8.9, Android Gradle Plugin 8.5.2,
Android SDK platform 34 / build-tools 34.0.0, Robolectric 4.13 (API 34).

```
./gradlew :umt-sdk:testDebugUnitTest :app:testDebugUnitTest   # BUILD SUCCESSFUL
./gradlew :app:assembleRelease :sample-app:assembleRelease :umt-sdk:assembleRelease   # BUILD SUCCESSFUL
```

## What the tests cover

- **SDK protocol** – value validation (types, ranges, choices), frame round-trip, forward-compatible parsing.
- **Persistence** – atomic write/read, corrupt-file quarantine, leftover temp files, unknown fields, range sanitising of imported settings.
- **Protected export** – AES-256-GCM round trip, wrong password, tampered header, random salt/IV, absurd KDF parameters.
- **Analyzer** – Unity IL2CPP/Mono, Unreal, Flutter, React Native, Godot, Kotlin/Compose and NDK-only detection; split-APK ABI names.
- **Compatibility engine** – integrated vs third-party apps, missing permissions, release-build warning.
- **Performance maths** – percentiles, jank/stutter classification, CPU share, `/proc/stat` parsing.
- **Entity overlay maths** – filtering/sorting/capping, off-screen arrow placement, radar rotation and clamping, the sandbox projection.
- **Patches** – validation against the app schema (missing keys, bad values, version change, remote changes off), ack verification, before/after diff.
- **Plugins** – every bundled template validates; permission allowlist; binding types; bridge targets; caps; duplicate ids; button actions and presets; format strings; the 3-fault circuit breaker.
- **UI (Robolectric, the real app)** – every one of the ten screens opens and shows its content; a plugin is created from a template, saved, enabled and its preset writes through the real bindings; a profile is saved from the UI and re-applied; an overlay toggle persists without the overlay permission and the kill switch clears it; the sandbox preview produces frames.

## Not covered here

- Overlay windows, the foreground service and the umt-sdk broadcast link were not run on a device or emulator (this container has no hardware virtualisation). Their logic is exercised through the shared engines above; window behaviour on specific OEM skins is untested.
- The Choreographer frame monitor is disabled under Robolectric (simulated vsync fires instantly), so its live sampling is untested here; its statistics are unit-tested.
- Release builds are minified with R8. The tests run against the debug build; all `@Serializable` classes and their generated serializers are kept by explicit rules and confirmed present in the R8 mapping.

## Results

**56 of 56 tests passed.**

| Module | Class | Test | Result | Time | Note |
|---|---|---|---|---|---|
| umt-sdk | ProtocolTest | choiceAndBool | pass | 0.03 s |  |
| umt-sdk | ProtocolTest | intAcceptsWholeNumbersInRange | pass | 0.00 s |  |
| umt-sdk | ProtocolTest | floatRejectsNanAndRange | pass | 0.00 s |  |
| umt-sdk | ProtocolTest | unknownFieldsAreIgnored | pass | 0.02 s |  |
| umt-sdk | ProtocolTest | frameRoundTrips | pass | 0.01 s |  |
| umt-sdk | ProtocolTest | intRejectsFractionsAndOutOfRange | pass | 0.00 s |  |
| app | AtomicJsonStoreTest | unknownFieldsAreIgnored | pass | 0.05 s |  |
| app | AtomicJsonStoreTest | writeThenRead | pass | 0.01 s |  |
| app | AtomicJsonStoreTest | corruptFileFallsBackAndIsKept | pass | 0.00 s |  |
| app | AtomicJsonStoreTest | leftoverTempFileIsIgnored | pass | 0.00 s |  |
| app | CircuitBreakerTest | tripsOnTheThirdFault | pass | 0.00 s |  |
| app | CompatibilityEngineTest | integratedAppGetsIntegrationModules | pass | 0.01 s |  |
| app | CompatibilityEngineTest | missingPermissionsAreReported | pass | 0.00 s |  |
| app | CompatibilityEngineTest | thirdPartyAppNeedsIntegrationWithHint | pass | 0.00 s |  |
| app | CompatibilityEngineTest | releaseBuildOfIntegratedAppIsFlagged | pass | 0.00 s |  |
| app | EspMathTest | edgeArrowLandsOnTheBorder | pass | 0.00 s |  |
| app | EspMathTest | selectFiltersSortsAndCaps | pass | 0.01 s |  |
| app | EspMathTest | radarRotatesWithYaw | pass | 0.00 s |  |
| app | EspMathTest | sandboxProducesPlausibleFrames | pass | 0.01 s |  |
| app | FrameworkDetectorTest | nativeOnlyWhenNoEngine | pass | 0.01 s |  |
| app | FrameworkDetectorTest | unityMono | pass | 0.00 s |  |
| app | FrameworkDetectorTest | splitNames | pass | 0.00 s |  |
| app | FrameworkDetectorTest | plainKotlinComposeApp | pass | 0.00 s |  |
| app | FrameworkDetectorTest | unrealFlutterReactNativeGodot | pass | 0.00 s |  |
| app | FrameworkDetectorTest | unityIl2cpp | pass | 0.00 s |  |
| app | JsonFormatTest | formatKeepsValues | pass | 0.02 s |  |
| app | PatchPlannerTest | verifyComparesTheAck | pass | 0.00 s |  |
| app | PatchPlannerTest | validPatchHasNoErrors | pass | 0.00 s |  |
| app | PatchPlannerTest | detectsIncompatibleUpdatesAndBadValues | pass | 0.00 s |  |
| app | PatchPlannerTest | diffShowsBeforeAndAfter | pass | 0.00 s |  |
| app | PatchPlannerTest | blockedWhenRemoteChangesOffOrDisconnected | pass | 0.00 s |  |
| app | PerfMathTest | procStat | pass | 0.00 s |  |
| app | PerfMathTest | cpuPercent | pass | 0.00 s |  |
| app | PerfMathTest | frameStatsCountsJankAndStutter | pass | 0.00 s |  |
| app | PerfMathTest | percentiles | pass | 0.00 s |  |
| app | PluginValidatorTest | overlayBindingsNeedTheOverlayPermission | pass | 0.02 s |  |
| app | PluginValidatorTest | unknownBindingAndWrongType | pass | 0.00 s |  |
| app | PluginValidatorTest | capsAndDuplicates | pass | 0.01 s |  |
| app | PluginValidatorTest | bridgeBindingsNeedATarget | pass | 0.00 s |  |
| app | PluginValidatorTest | permissionAllowlist | pass | 0.00 s |  |
| app | PluginValidatorTest | formatStringsAreChecked | pass | 0.00 s |  |
| app | PluginValidatorTest | everyTemplateIsValid | pass | 0.01 s |  |
| app | PluginValidatorTest | buttonsAndPresets | pass | 0.00 s |  |
| app | PluginValidatorTest | badJsonIsReported | pass | 0.00 s |  |
| app | ProtectedExportTest | tamperedHeaderFails | pass | 0.06 s |  |
| app | ProtectedExportTest | wrongPasswordFails | pass | 0.01 s |  |
| app | ProtectedExportTest | saltAndIvAreRandom | pass | 0.01 s |  |
| app | ProtectedExportTest | roundTrip | pass | 0.01 s |  |
| app | ProtectedExportTest | rejectsAbsurdIterationCounts | pass | 0.00 s |  |
| app | ToolkitStateTest | passthroughFlags | pass | 0.00 s |  |
| app | ToolkitStateTest | sanitizeClampsEverything | pass | 0.00 s |  |
| app | UiSmokeTest | pluginFromTemplateSavesAndEnables | pass | 5.43 s |  |
| app | UiSmokeTest | everyScreenOpens | pass | 1.12 s |  |
| app | UiSmokeTest | overlayTogglesPersistWithoutPermission | pass | 0.20 s |  |
| app | UiSmokeTest | sandboxPreviewProducesFrames | pass | 0.18 s |  |
| app | UiSmokeTest | profileSaveAndApply | pass | 0.25 s |  |
