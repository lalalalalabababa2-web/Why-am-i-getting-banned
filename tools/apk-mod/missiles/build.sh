#!/usr/bin/env bash
# build.sh Missiles_pl.macaque.Missiles_v1.41.apks.zip [out.apks]
# Missiles! with the floating mod menu (tools/apk-mod/menu); score uploads removed.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"

[ $# -ge 1 ] || { echo "usage: $0 game.apks.zip [out.apks]" >&2; exit 2; }
src="$1"
out="$here/Missiles-mod.apks"
[ $# -ge 2 ] && out="$(cd "$(dirname "$2")" && pwd)/$(basename "$2")"

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
unzip -q -o -j "$src" split_config.arm64_v8a.apk -d "$work"
unzip -q -o -j "$work/split_config.arm64_v8a.apk" lib/arm64-v8a/libil2cpp.so -d "$work"
python3 -I "$here/mods.py" "$work/libil2cpp.so" "$work/Patches.java"

"$here/../menu/build.sh" "$src" "$out" "$work/Patches.java" \
  com/unity3d/player/UnityPlayerActivity.smali \
  "invoke-super {p0, p1}, Landroid/app/Activity;->onCreate(Landroid/os/Bundle;)V" \
  "lib/arm64-v8a/libil2cpp.so=$work/libil2cpp.so"
