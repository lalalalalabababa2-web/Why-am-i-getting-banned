#!/usr/bin/env bash
# Runs inside the CI emulator: installs the APK, opens the app and its Quick Settings tile,
# screenshots both, then runs the app's own SIM calls as the shell user (ShellCheck), the identity
# Shizuku gives the app on a phone. Usage: emulator-check.sh SimToggle.apk out-dir
set -u
APK=$1
OUT=$2
PKG=app.simtoggle
mkdir -p "$OUT"
fail=0

shot() { adb exec-out screencap -p > "$OUT/$1.png"; }
crashed() {
  adb logcat -d -b crash > "$OUT/crash.txt"
  if grep -q "$PKG" "$OUT/crash.txt"; then
    echo "::error::SIM Toggle crashed ($1)"
    cat "$OUT/crash.txt"
    fail=1
  fi
}

adb wait-for-device
adb shell settings put system screen_off_timeout 1800000 || true
adb shell svc power stayon true || true
adb shell input keyevent KEYCODE_WAKEUP || true
adb shell wm dismiss-keyguard || true
adb shell am broadcast -a android.intent.action.CLOSE_SYSTEM_DIALOGS > /dev/null || true

adb install -r "$APK" || { echo "::error::the APK didn't install"; exit 1; }
adb shell pm grant "$PKG" android.permission.READ_PHONE_STATE || true
adb logcat -c

echo "== Opening the app"
adb shell am start -W -n "$PKG/.MainActivity"
sleep 6
shot app-light
if [ -z "$(adb shell pidof "$PKG" | tr -d '\r')" ]; then
  echo "::error::SIM Toggle isn't running after launch"
  fail=1
fi
crashed "on launch"

adb shell cmd uimode night yes || true
sleep 4
shot app-dark
adb shell cmd uimode night no || true

echo "== Quick Settings tile"
adb shell cmd statusbar add-tile "$PKG/.SimTileService" || true
adb shell cmd statusbar expand-settings || true
sleep 4
shot tile
# Without Shizuku, a tap opens the app.
adb shell cmd statusbar click-tile "$PKG/.SimTileService" || true
sleep 5
shot tile-tapped
adb shell cmd statusbar collapse || true
crashed "from the tile"

echo "== The app's SIM calls, as the shell user"
APK_PATH=$(adb shell pm path "$PKG" | head -1 | cut -d: -f2 | tr -d '\r')
adb shell "CLASSPATH=$APK_PATH app_process /system/bin $PKG.ShellCheck --toggle" 2>&1 | tee "$OUT/shell-check.txt"
grep -q '^RESULT: ok' "$OUT/shell-check.txt" || { echo "::error::ShellCheck failed (see shell-check.txt)"; fail=1; }

adb logcat -d > "$OUT/logcat.txt"
exit $fail
