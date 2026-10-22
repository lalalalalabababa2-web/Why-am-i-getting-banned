#!/usr/bin/env bash
# build.sh Plants_vs._Zombies_FREE_com.ea.game.pvzfree_row_v3.18.0.apks.zip [out.apks]
# Adds the floating mod menu (src/pvzmod) to the game, re-signs both splits with
# tools/apk-mod/mod-key.jks and packs them into one .apks for SAI.
# Needs: javac, dx (apt: dalvik-exchange), android.jar (apt: libandroid-23-java),
# apktool (setup.sh), pip install capstone keystone-engine.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
. "$here/../env.sh"
repack="$here/../riseup/repack.py"

[ $# -ge 1 ] || { echo "usage: $0 game.apks.zip [out.apks]" >&2; exit 2; }
src="$1"
out="$here/PvZ-mod.apks"
[ $# -ge 2 ] && out="$(cd "$(dirname "$2")" && pwd)/$(basename "$2")"
[ -f "$APKMOD_KEY" ] || { echo "No signing key; run tools/apk-mod/setup.sh first." >&2; exit 1; }
android_jar="${ANDROID_JAR:-/usr/lib/android-sdk/platforms/android-23/android.jar}"
dx="$(command -v dalvik-exchange || command -v dx)"

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
mkdir -p "$work/in" "$work/signed" "$work/gen" "$work/classes"
unzip -q "$src" -d "$work/in"

# 1. Check the patch sites against this libpvz.so and generate the menu's table.
unzip -q -o -j "$work/in/split_config.arm64_v8a.apk" lib/arm64-v8a/libpvz.so -d "$work"
python3 -I "$here/mods.py" "$work/libpvz.so" "$work/gen/Patches.java"

# 2. Compile the menu into its own dex, the base APK's 8th.
javac -nowarn --release 8 -cp "$android_jar" -d "$work/classes" "$here"/src/pvzmod/*.java "$work/gen/Patches.java"
"$dx" --dex --min-sdk-version=24 --output="$work/menu.dex" "$work/classes"
next=$(( $(unzip -Z1 "$work/in/base.apk" | grep -cE '^classes[0-9]*\.dex$') + 1 ))

# 3. Start the menu from PvZActivity.onCreate, right after the call to super.
activity=com/ea/game/pvzfree_row/PvZActivity.smali
apktool d -q -f -r -o "$work/base" "$work/in/base.apk"
smali="$(cd "$work/base" && ls smali*/"$activity")"
python3 -I - "$work/base/$smali" <<'EOF'
import sys
p = sys.argv[1]
s = open(p).read()
anchor = "invoke-super {p0, p1}, Lcom/ea/blast/MainActivity;->onCreate(Landroid/os/Bundle;)V\n"
call = "\n    invoke-static {p0}, Lpvzmod/ModMenu;->init(Landroid/app/Activity;)V\n"
if s.count(anchor) != 1:
    sys.exit("onCreate anchor not found: different game version?")
open(p, "w").write(s.replace(anchor, anchor + call))
EOF
apktool b -q -o "$work/base-rebuilt.apk" "$work/base"
dexname="classes${smali#smali_classes}"; dexname="${dexname%%/*}.dex"
unzip -q -o "$work/base-rebuilt.apk" "$dexname" -d "$work"

# 4. Re-sign both splits with the same key.
for apk in "$work/in"/*.apk; do
  name="$(basename "$apk")"
  if [ "$name" = base.apk ]; then
    python3 -I "$repack" "$apk" "$work/unsigned.apk" "$dexname=$work/$dexname" "+classes$next.dex=$work/menu.dex"
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
