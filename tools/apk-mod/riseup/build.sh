#!/usr/bin/env bash
# build.sh Rise_Up_com.riseup.game_v300000.15.0.apks.zip [out.apks] [--only god,skins,coins,slow,score]
# Patches libil2cpp.so, re-signs every split with tools/apk-mod/mod-key.jks and packs
# them into one .apks that SAI (Split APKs Installer) installs on the phone.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
. "$here/../env.sh"

[ $# -ge 1 ] || { echo "usage: $0 game.apks.zip [out.apks] [--only list]" >&2; exit 2; }
src="$1"; shift
out="$here/RiseUp-mod.apks"
only=()
while [ $# -gt 0 ]; do
  case "$1" in
    --only) only=(--only "$2"); shift 2 ;;
    *) out="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"; shift ;;
  esac
done
[ -f "$APKMOD_KEY" ] || { echo "No signing key; run tools/apk-mod/setup.sh first." >&2; exit 1; }

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
mkdir -p "$work/in" "$work/signed"
unzip -q "$src" -d "$work/in"

lib=lib/arm64-v8a/libil2cpp.so
unzip -q -o "$work/in/split_config.arm64_v8a.apk" "$lib" -d "$work/lib"
python3 -I "$here/patch.py" "$work/lib/$lib" ${only[@]+"${only[@]}"}

for apk in "$work/in"/*.apk; do
  name="$(basename "$apk")"
  if [ "$name" = split_config.arm64_v8a.apk ]; then
    python3 -I "$here/repack.py" "$apk" "$work/unsigned.apk" "$lib=$work/lib/$lib"
  else
    python3 -I "$here/repack.py" "$apk" "$work/unsigned.apk"
  fi
  zipalign -p -f 4 "$work/unsigned.apk" "$work/signed/$name"
  apksigner sign --ks "$APKMOD_KEY" --ks-pass "pass:$APKMOD_KEY_PASS" --ks-key-alias "$APKMOD_KEY_ALIAS" "$work/signed/$name"
  apksigner verify "$work/signed/$name"
  rm -f "$work/signed/$name.idsig" "$work/unsigned.apk"
done

rm -f "$out"
(cd "$work/signed" && zip -q -0 "$out" ./*.apk)
echo "Built $out"
