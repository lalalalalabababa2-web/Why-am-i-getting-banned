#!/usr/bin/env bash
# Free Fire graphics performance mod (over ADB, no root, no APK changes)
# Target: com.dts.freefireth 1.132.x (Unity 2018.4 IL2CPP, isGame=true, no game_mode_config)
# Host:   macOS (bash 3.2) or Linux, with Android platform-tools installed.
#
# Works through Android's Game Mode interventions: the OS renders the game at a
# lower resolution and caps its frame rate, then upscales the result to the screen.
# Nothing inside the game's APK or data folder is touched.

set -eu

PKG_DEFAULT="com.dts.freefireth"
PKG_MAX="com.dts.freefiremax"

usage() {
  cat <<'EOF'
usage: ff-perf.sh <preset|command> [options]

presets (render scale / fps cap):
  potato     0.50 / 60   weakest phones, blurry but smooth
  low        0.65 / 60   big gain, still readable
  balanced   0.80 / 60   good default
  smooth     0.90 / 90   high-refresh phones that just dip a little

commands:
  custom     use --scale and --fps
  reset      remove everything this script set
  status     show what the OS currently applies to the game

options:
  --scale F    render scale 0.3-1.0 (custom only)
  --fps N      30|45|60|90|120|disable (custom only, Android 13+)
  --max        target Free Fire MAX instead of regular Free Fire
  --global     Android 11 and older: shrink the whole display instead
               (affects every app until "reset")
  --anim       also turn off system animations (snappier menus)
  --trim       kill cached background apps before launching
  --no-launch  don't start the game afterwards
  -s SERIAL    pick a device when more than one is connected
EOF
}

die() { echo "error: $*" >&2; exit 1; }

[ $# -ge 1 ] || { usage; exit 1; }
CMD="$1"; shift

SCALE=""; FPS=""; PKG="$PKG_DEFAULT"; GLOBAL=0; ANIM=0; TRIM=0; LAUNCH=1; SERIAL=""
while [ $# -gt 0 ]; do
  case "$1" in
    --scale) SCALE="${2:-}"; shift 2 ;;
    --fps) FPS="${2:-}"; shift 2 ;;
    --max) PKG="$PKG_MAX"; shift ;;
    --global) GLOBAL=1; shift ;;
    --anim) ANIM=1; shift ;;
    --trim) TRIM=1; shift ;;
    --no-launch) LAUNCH=0; shift ;;
    -s) SERIAL="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) die "unknown option: $1" ;;
  esac
done

case "$CMD" in
  potato)   SCALE=0.5;  FPS=60 ;;
  low)      SCALE=0.65; FPS=60 ;;
  balanced) SCALE=0.8;  FPS=60 ;;
  smooth)   SCALE=0.9;  FPS=90 ;;
  custom)   [ -n "$SCALE" ] || die "custom needs --scale"; [ -n "$FPS" ] || FPS=disable ;;
  reset|status) ;;
  -h|--help|help) usage; exit 0 ;;
  *) usage; exit 1 ;;
esac

command -v adb >/dev/null 2>&1 || die "adb not found (macOS: brew install android-platform-tools)"

ADB=(adb)
[ -n "$SERIAL" ] && ADB=(adb -s "$SERIAL")
sh_() { "${ADB[@]}" shell "$@" | tr -d '\r'; }

STATE=$("${ADB[@]}" get-state 2>/dev/null || true)
[ "$STATE" = "device" ] || die "no authorized device. Turn on USB debugging (or wireless debugging + adb pair) and accept the prompt."

SDK=$(sh_ getprop ro.build.version.sdk)
REL=$(sh_ getprop ro.build.version.release)
sh_ pm path "$PKG" | grep -q '^package:' || die "$PKG is not installed on this device"

if [ -n "$SCALE" ]; then
  awk -v s="$SCALE" 'BEGIN{exit !(s>=0.3 && s<=1.0)}' || die "--scale must be between 0.3 and 1.0"
fi
case "$FPS" in ""|30|45|60|90|120|disable) ;; *) die "--fps must be 30|45|60|90|120|disable" ;; esac

echo "device: Android $REL (SDK $SDK)   game: $PKG"

# Shrinks the whole display (pre-Android 12 fallback). Density is scaled by the
# same factor so other apps keep their layout, just rendered with fewer pixels.
global_res() {
  local phys dens w h nw nh nd
  phys=$(sh_ wm size | sed -n 's/^Physical size: //p')
  dens=$(sh_ wm density | sed -n 's/^Physical density: //p')
  [ -n "$phys" ] && [ -n "$dens" ] || die "couldn't read display size/density"
  w=${phys%x*}; h=${phys#*x}
  nw=$(awk -v v="$w" -v s="$SCALE" 'BEGIN{printf "%d", (v*s)/2*2}')
  nh=$(awk -v v="$h" -v s="$SCALE" 'BEGIN{printf "%d", (v*s)/2*2}')
  nd=$(awk -v v="$dens" -v s="$SCALE" 'BEGIN{printf "%d", v*s}')
  sh_ wm size "${nw}x${nh}" >/dev/null
  sh_ wm density "$nd" >/dev/null
  echo "display: ${phys} @ ${dens}dpi -> ${nw}x${nh} @ ${nd}dpi (whole phone, undo with: reset --global)"
}

apply() {
  if [ "$SDK" -ge 33 ]; then
    # Android 13+: per-app downscale + fps cap, attached to "performance" game mode.
    sh_ cmd game set --mode 2 --downscale "$SCALE" --fps "$FPS" "$PKG"
    sh_ cmd game mode performance "$PKG"
    echo "game mode: performance, render scale $SCALE, fps cap $FPS"
  elif [ "$SDK" -ge 31 ]; then
    # Android 12: downscale lives in device_config; there is no fps override yet.
    sh_ device_config put game_overlay "$PKG" "mode=2,downscaleFactor=$SCALE"
    sh_ cmd game mode performance "$PKG"
    echo "game mode: performance, render scale $SCALE (fps cap needs Android 13+)"
  elif [ "$GLOBAL" -eq 1 ]; then
    global_res
  else
    die "Android $REL has no per-app game mode. Re-run with --global to shrink the whole display instead."
  fi

  if [ "$ANIM" -eq 1 ]; then
    for k in window_animation_scale transition_animation_scale animator_duration_scale; do
      sh_ settings put global "$k" 0
    done
    echo "system animations: off"
  fi

  if [ "$TRIM" -eq 1 ]; then
    sh_ am kill-all
    echo "background apps: trimmed"
  fi

  # Interventions are read when the process starts, so the game has to restart.
  sh_ am force-stop "$PKG"
  if [ "$LAUNCH" -eq 1 ]; then
    sh_ monkey -p "$PKG" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1 || true
    echo "launched $PKG"
  fi
}

reset_all() {
  if [ "$SDK" -ge 33 ]; then
    sh_ cmd game reset "$PKG" || true
    sh_ cmd game mode standard "$PKG" || true
  elif [ "$SDK" -ge 31 ]; then
    sh_ device_config delete game_overlay "$PKG" || true
    sh_ cmd game mode standard "$PKG" || true
  fi
  if [ "$GLOBAL" -eq 1 ] || [ "$SDK" -lt 31 ]; then
    sh_ wm size reset; sh_ wm density reset
  fi
  # Only put animations back if they're still at the 0 this script sets.
  for k in window_animation_scale transition_animation_scale animator_duration_scale; do
    [ "$(sh_ settings get global "$k")" = "0" ] && sh_ settings put global "$k" 1
  done
  sh_ am force-stop "$PKG"
  echo "reset done"
}

status() {
  if [ "$SDK" -ge 31 ]; then
    sh_ dumpsys game | grep -A12 "$PKG" || echo "no game-mode config for $PKG"
  fi
  sh_ wm size; sh_ wm density
  for k in window_animation_scale transition_animation_scale animator_duration_scale; do
    echo "$k=$(sh_ settings get global $k)"
  done
}

case "$CMD" in
  reset) reset_all ;;
  status) status ;;
  *) apply ;;
esac
