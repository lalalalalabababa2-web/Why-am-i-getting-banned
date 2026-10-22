#!/usr/bin/env bash
# build-menu.sh Rise_Up_com.riseup.game_v300000.15.0.apks.zip [out.apks]
# Rise Up with the floating mod menu (tools/apk-mod/menu) instead of always-on patches.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"

[ $# -ge 1 ] || { echo "usage: $0 game.apks.zip [out.apks]" >&2; exit 2; }
src="$1"
out="$here/RiseUp-menu.apks"
[ $# -ge 2 ] && out="$(cd "$(dirname "$2")" && pwd)/$(basename "$2")"

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
unzip -q -o -j "$src" split_config.arm64_v8a.apk -d "$work"
unzip -q -o -j "$work/split_config.arm64_v8a.apk" lib/arm64-v8a/libil2cpp.so -d "$work"
python3 -I "$here/patch.py" "$work/libil2cpp.so" --java "$work/Patches.java"

"$here/../menu/build.sh" "$src" "$out" "$work/Patches.java" \
  com/unity3d/player/UnityPlayerActivity.smali \
  "invoke-super {p0, p1}, Landroid/app/Activity;->onCreate(Landroid/os/Bundle;)V"
