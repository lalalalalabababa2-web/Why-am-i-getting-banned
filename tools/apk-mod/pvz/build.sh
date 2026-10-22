#!/usr/bin/env bash
# build.sh Plants_vs._Zombies_FREE_com.ea.game.pvzfree_row_v3.18.0.apks.zip [out.apks]
# PvZ with the floating mod menu (tools/apk-mod/menu). Needs: pip install capstone keystone-engine
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"

[ $# -ge 1 ] || { echo "usage: $0 game.apks.zip [out.apks]" >&2; exit 2; }
src="$1"
out="$here/PvZ-mod.apks"
[ $# -ge 2 ] && out="$(cd "$(dirname "$2")" && pwd)/$(basename "$2")"

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
unzip -q -o -j "$src" split_config.arm64_v8a.apk -d "$work"
unzip -q -o -j "$work/split_config.arm64_v8a.apk" lib/arm64-v8a/libpvz.so -d "$work"
python3 -I "$here/mods.py" "$work/libpvz.so" "$work/Patches.java"

"$here/../menu/build.sh" "$src" "$out" "$work/Patches.java" \
  com/ea/game/pvzfree_row/PvZActivity.smali \
  "invoke-super {p0, p1}, Lcom/ea/blast/MainActivity;->onCreate(Landroid/os/Bundle;)V"
