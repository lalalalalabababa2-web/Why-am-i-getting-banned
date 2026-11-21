#!/usr/bin/env bash
# The whole app on the CI emulator with real Shizuku, the way it runs on a phone:
#   1. start Shizuku over adb and allow SIM Toggle in it (tapping its dialog)
#   2. switch SIM 1 off and on from the app
#   3. turn the data watchdog on and see it find data working
#   4. cut the app's network (as if mobile data died) and see the watchdog restart the SIM,
#      then restore it and see the watchdog report data back
# Run after emulator-check.sh (the app is installed). Usage: shizuku-check.sh out-dir
set -u
OUT=$1
PKG=app.simtoggle
SHZ=moe.shizuku.privileged.api
UI="python3 ci/ui.py"
mkdir -p "$OUT"
fail=0

shot() { adb exec-out screencap -p > "$OUT/$1.png"; }
applog() { adb logcat -d -s SimToggle:I; }
wait_log() {
  local pattern=$1 timeout=$2
  for _ in $(seq "$timeout"); do
    applog | grep -qE "$pattern" && { echo "seen: $pattern"; return 0; }
    sleep 1
  done
  echo "::error::not seen within $timeout s: $pattern"
  applog | tail -25
  fail=1
  return 1
}
finish() {
  applog > "$OUT/app-log.txt"
  adb logcat -d > "$OUT/logcat-shizuku.txt"
  exit $fail
}

echo "== Starting Shizuku"
APK=$(ls shizuku/*release*.apk shizuku/*.apk 2>/dev/null | head -1)
if [ -z "$APK" ]; then
  echo "::warning::no Shizuku APK downloaded; skipping the end-to-end test"
  exit 0
fi
adb install -r "$APK" || { echo "::warning::Shizuku didn't install; skipping"; exit 0; }
# Opening it once lets it write its start files.
adb shell monkey -p "$SHZ" -c android.intent.category.LAUNCHER 1 > /dev/null
sleep 6
# The same command Shizuku shows for starting it from a computer (as the shell user).
start_shizuku() {
  local start_sh=/storage/emulated/0/Android/data/$SHZ/start.sh dir lib
  dir=$(adb shell pm path "$SHZ" | head -1 | cut -d: -f2 | tr -d '\r' | sed 's#/base.apk$##')
  lib=$(adb shell "ls $dir/lib/*/libshizuku.so 2>/dev/null" | head -1 | tr -d '\r')
  if [ -n "$lib" ]; then
    adb shell "$lib" | tail -3
  elif adb shell "[ -f $start_sh ]"; then
    adb shell sh "$start_sh" | tail -3
  fi
  sleep 4
  adb shell ps -A | grep -q shizuku_server
}
# iptables needs root, but restarting adb as root stops Shizuku: back to shell, Shizuku again.
as_root() {
  adb root > /dev/null; sleep 3; adb wait-for-device
  adb shell "$@"
  local status=$?
  adb unroot > /dev/null; sleep 3; adb wait-for-device
  start_shizuku && wait_log "Shizuku connected" 30
  return $status
}
if ! start_shizuku; then
  echo "::warning::Shizuku's server didn't start on the emulator; skipping the end-to-end test"
  adb shell ps -A | grep -i shizuku
  exit 0
fi
adb shell input keyevent KEYCODE_HOME

echo "== Allowing SIM Toggle in Shizuku"
adb logcat -c
adb shell am force-stop "$PKG"
adb shell am start -W -n "$PKG/.MainActivity" > /dev/null
sleep 5
shot shizuku-dialog
$UI tap "Allow all the time" || $UI tap "Allow" --exact
wait_log "Shizuku connected" 30 || finish
sleep 3
shot shizuku-connected

echo "== SIM 1 off and on from the app"
adb logcat -c
$UI tap "SIM 1" --exact
wait_log "SIM 1: (off|powered off)" 30
sleep 3
shot sim-off
adb logcat -c
$UI tap "SIM 1" --exact
wait_log "SIM 1: (on|powered back on)" 30
sleep 3

echo "== Watchdog on"
adb shell pm grant "$PKG" android.permission.POST_NOTIFICATIONS || true
adb shell dumpsys deviceidle whitelist +"$PKG" > /dev/null || true
adb logcat -c
$UI tap "Restart SIM when data stops"
wait_log "Watchdog.*data OK" 90
if adb shell dumpsys activity services "$PKG" | grep -q "isForeground=true"; then
  echo "the watchdog service is running in the foreground"
else
  echo "::error::the watchdog service isn't running in the foreground"
  fail=1
fi
shot watchdog-on
adb shell cmd statusbar expand-notifications || true
sleep 3
shot watchdog-notification
adb shell cmd statusbar collapse || true

echo "== Data outage: cut SIM Toggle's network"
blocked=""
APP_UID=$(adb shell pm list packages -U "$PKG" | grep -o 'uid:[0-9]*' | head -1 | cut -d: -f2)
echo "app uid: $APP_UID"
# Without root first (Android's own per-app network switch, Android 15+).
cmd_out=$({ adb shell cmd connectivity set-chain3-enabled true
            adb shell cmd connectivity set-package-networking-enabled false "$PKG"
            adb shell cmd connectivity get-package-networking-enabled "$PKG"; } 2>&1)
echo "$cmd_out" | head -4
if ! echo "$cmd_out" | grep -qi unknown && echo "$cmd_out" | grep -qi false; then
  blocked=cmd
elif [ -n "$APP_UID" ]; then
  adb shell cmd connectivity set-chain3-enabled false > /dev/null 2>&1
  as_root "iptables -I OUTPUT -m owner --uid-owner $APP_UID -j REJECT && ip6tables -I OUTPUT -m owner --uid-owner $APP_UID -j REJECT" &&
    blocked=iptables
fi
echo "network cut with: ${blocked:-nothing}"
if [ -z "$blocked" ]; then
  echo "::error::couldn't cut the app's network, so the watchdog's restart wasn't tested"
  fail=1
  finish
fi
adb logcat -c
# Changing the interval runs a round straight away (and makes the rest quicker).
$UI tap "Check every"
$UI tap "1 minute" --exact
wait_log "no data .*restarting SIM 1" 150
wait_log "Watchdog.*SIM 1 (restarted|switched back on)" 90
shot watchdog-restarted

echo "== Data back"
if [ "$blocked" = cmd ]; then
  adb shell cmd connectivity set-package-networking-enabled true "$PKG"
  adb shell cmd connectivity set-chain3-enabled false
else
  as_root "iptables -D OUTPUT -m owner --uid-owner $APP_UID -j REJECT; ip6tables -D OUTPUT -m owner --uid-owner $APP_UID -j REJECT"
fi
wait_log "data is back after" 200
shot watchdog-recovered
finish
