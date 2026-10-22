#!/usr/bin/env bash
# build-static.sh game.apks.zip [out.apks] [labels]
# Fallback without the menu: the mods are written into libpvz.so itself and are
# always on. labels picks some, e.g. "Unlimited sun,No cooldown" (default: all).
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
. "$here/../env.sh"
repack="$here/../riseup/repack.py"

[ $# -ge 1 ] || { echo "usage: $0 game.apks.zip [out.apks] [labels]" >&2; exit 2; }
src="$1"
out="$here/PvZ-mod-static.apks"
[ $# -ge 2 ] && out="$(cd "$(dirname "$2")" && pwd)/$(basename "$2")"
labels="${3:-}"
[ -f "$APKMOD_KEY" ] || { echo "No signing key; run tools/apk-mod/setup.sh first." >&2; exit 1; }

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
mkdir -p "$work/in" "$work/signed"
unzip -q "$src" -d "$work/in"
lib=lib/arm64-v8a/libpvz.so
unzip -q -o "$work/in/split_config.arm64_v8a.apk" "$lib" -d "$work/lib"
python3 -I "$here/mods.py" "$work/lib/$lib" --bake ${labels:+"$labels"}

for apk in "$work/in"/*.apk; do
  name="$(basename "$apk")"
  if [ "$name" = split_config.arm64_v8a.apk ]; then
    python3 -I "$repack" "$apk" "$work/unsigned.apk" "$lib=$work/lib/$lib"
  else
    python3 -I "$repack" "$apk" "$work/unsigned.apk"
  fi
  zipalign -p -f 4 "$work/unsigned.apk" "$work/signed/$name"
  apksigner sign --ks "$APKMOD_KEY" --ks-pass "pass:$APKMOD_KEY_PASS" --ks-key-alias "$APKMOD_KEY_ALIAS" "$work/signed/$name"
  apksigner verify "$work/signed/$name"
  rm -f "$work/signed/$name.idsig" "$work/unsigned.apk"
done

rm -f "$out"
(cd "$work/signed" && zip -q -0 "$out" ./*.apk)
echo "Built $out"
