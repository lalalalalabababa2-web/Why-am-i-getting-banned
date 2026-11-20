# SIM Toggle

An Android app that switches a SIM on and off: the same switch as **Settings → Connections →
SIM manager → SIM 1** on a Samsung phone, without going through Settings. One tap in the app or
on a Quick Settings tile.

**Download:** [SimToggle.apk](https://github.com/lalalalalabababa2-web/why-am-i-getting-banned/releases/download/sim-toggle-latest/SimToggle.apk)
(the newest build; the link stays the same).

| | |
|---|---|
| Platform | Android 11+ (API 30), built and checked against Android 14 and 16 |
| Needs | [Shizuku](https://shizuku.rikka.app/download/) running (Wireless debugging or root) |
| Language | Kotlin, no AndroidX UI libraries |
| Toolchain | Gradle 9.7.1, AGP 9.4.0, Kotlin 2.4.20 (same as Offline AI) |

## Why it needs Shizuku

Android only lets system apps switch SIMs: the call behind the SIM manager switch,
`ISub.setUiccApplicationsEnabled`, checks for `MODIFY_PHONE_STATE`, which a normal app can't be
granted. The shell user (what `adb shell` runs as) does hold it. Shizuku runs a small server as
the shell user and passes this app's calls through it, so the phone's telephony service sees the
shell user as the caller and lets the call through. No root and no computer needed.

## Setup on the phone

1. Install **Shizuku** (from the Play Store or its site).
2. Turn on Developer options: Settings → About phone → Software information → tap
   *Build number* seven times.
3. Connect to Wi-Fi, open Shizuku, tap **Start** under *Start via Wireless debugging*, and follow
   its pairing steps (pair once, using the notification it shows).
4. Install `SimToggle.apk`, open it, and tap **Allow** when Shizuku asks.
5. Optional: pull down the notification shade, tap the pencil (edit), and drag the **SIM** tile
   in.

Shizuku stops when the phone restarts. After a restart, open Shizuku and tap Start again (it
remembers the pairing); the app says so at the top when Shizuku isn't running.

## Using it

- **SIM cards**: one switch per slot, like the SIM manager. A slot without a card shows "No SIM
  card".
- **Quick Settings tile**: switches SIM 1 (change the slot in the app). Its subtitle shows the
  carrier when on, "Off" when off. From the lock screen it asks you to unlock first. If Shizuku
  isn't running, tapping it opens the app.
- **Turn SIMs off by**:
  - *Auto* (default): the SIM manager switch; if the phone refuses it, the SIM card is powered
    down instead.
  - *SIM manager switch*: only the Settings way. The SIM stays listed as off, and stays off
    across restarts.
  - *Power off the SIM card*: cuts power to the card, as if it were taken out. It comes back
    when switched on, or by itself when the phone restarts.
- **Activity**: what each switch did, or why it failed. If something doesn't work on your phone,
  this is what to look at.

With your only SIM off, there are no calls, texts or mobile data until it's back on (Wi-Fi still
works). Emergency calls are still allowed while the SIM is off.

## How it works

- `Telephony.kt` makes the hidden calls by reflection on `com.android.internal.telephony.ISub`
  and `ITelephony`, with each system service's binder wrapped in Shizuku's `ShizukuBinderWrapper`.
  `hiddenapibypass` lets the app reflect on hidden API at all.
- Switching off uses `ISub.setUiccApplicationsEnabled(false, subId)`, the AOSP call behind the
  "Use SIM" switch since Android 11. The SIM then shows as inactive (slot -1) but stays in
  `getAvailableSubscriptionInfoList`, which is how the app still lists it and switches it back on.
- Powering off uses `ITelephony.setSimPowerStateForSlot(slot, 0)`; on is `1`.
- `ShellCheck.kt` runs the same calls as the shell user without Shizuku. CI runs it on Android 14
  and 16 emulators (switching the emulator's SIM off and on both ways), and you can run it on your
  phone over adb to see what the phone says:

  ```
  adb shell 'CLASSPATH=$(pm path app.simtoggle | cut -d: -f2) app_process /system/bin app.simtoggle.ShellCheck'
  ```

  Add `--toggle` at the end to switch the first SIM off and on.

## Building

```
cd sim-toggle
./gradlew :app:assembleRelease      # app/build/outputs/apk/release/app-release.apk
```

Needs JDK 17+ and the Android SDK with platform `android-37.2` (set `ANDROID_HOME`).

## The signing key

`ci/sim-toggle.jks` signs every build and is in the repository on purpose, as with Offline AI:
Android only installs a new build over the old one when both carry the same signature. Anyone
could sign an APK with it, so install builds only from this repository's releases. To use a
private key instead, set `SIM_TOGGLE_KEYSTORE`, `SIM_TOGGLE_KEYSTORE_PASSWORD`,
`SIM_TOGGLE_KEY_ALIAS` and `SIM_TOGGLE_KEY_PASSWORD` (switching keys means uninstalling once).
