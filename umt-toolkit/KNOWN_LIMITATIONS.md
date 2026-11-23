# Known Limitations — Universal Mod Toolkit

1. **No Private Third-Party Process Memory Access**
   - Android isolates each application in its own Linux UID and SELinux domain. Generic Android overlays cannot read another app's private entities, coordinates, or rendering buffers.
   - For ESP visualization, UMT strictly consumes either authorized `:umt-sdk` broadcasts from apps you own or the explicit **Local Sandbox Test Feed**.

2. **Global CPU Usage Restricted on Android 8+**
   - Starting in Android 8.0 (API 26), SELinux blocks non-privileged apps from reading `/proc/stat`.
   - `PerformanceMonitorEngine` measures UMT's own process CPU time via `android.os.Process.getElapsedCpuTime()` and transparently notes when global CPU telemetry is restricted by SELinux rather than fabricating a percentage.

3. **No Forced GPU / FPS Unlocking of Third-Party Apps**
   - UMT cannot override another application's internal frame-rate cap or GPU driver profile.
   - Frame-rate and frame-time graphs measure real `Choreographer` frame pacing within UMT's own process/overlay, and optimization controls tune UMT's own refresh rate, overlay redraw rate, sampling rate, memory caches, and screen-off suspension.

4. **Safe Declarative Plugin Sandbox**
   - To prevent arbitrary untrusted code execution, the plugin engine accepts validated JSON manifests with strict permission allowlists (`SYSTEM_ALERT_WINDOW`, `POST_NOTIFICATIONS`), control/refresh caps, and a 3-fault circuit breaker. Dynamic `.dex` / native `.so` loading is intentionally excluded.

5. **Pass-Through Opacity Cap (Android 12+)**
   - Android 12 blocks touches that pass through overlay windows more opaque than `InputManager.getMaximumObscuringOpacityForTouch()` (0.8 on stock Android). The reticle, guide, dimmer and entity layer share one untouchable window with that alpha, so the app underneath keeps receiving touches; the most opaque any of them can look is that cap.

6. **Overlay Panels Are Not Focusable**
   - Floating panels use `FLAG_NOT_FOCUSABLE` so the app underneath keeps the keyboard and back button. Keyboard shortcuts therefore do not reach the panels; the panel's search field turns its window focusable only while it is being used.

7. **Other Apps' Processes and Frame Rates Are Not Visible**
   - Since Android 5.1 `getRunningAppProcesses()` returns only the caller's own process, and no public API reports another app's frame rate. The Performance screen says so instead of showing estimates. An integrated app can report its own FPS through `UmtSdk.publishDiagnostics()`; the toolkit labels it "self-reported".

8. **Integration Transport Security**
   - Commands and events are explicit broadcasts. On Android 14+ both sides share their identity and verify the sender (`BroadcastReceiver.getSentFromPackage()`). On Android 8–13 the sender cannot be verified, so `umt-sdk` keeps remote changes and streaming **off in non-debuggable builds** unless the developer enables them in `UmtSdk.Config`.

9. **Build Verification**
   - The project was built and tested with the Android SDK (platform 34, build-tools 34.0.0), Gradle 8.9 and JDK 21: JVM unit tests and Robolectric UI tests pass (see `TEST_RESULTS.md`). It has not been run on a physical device or an emulator in this environment (no hardware acceleration was available), so overlay window behaviour on specific OEM skins is untested.
