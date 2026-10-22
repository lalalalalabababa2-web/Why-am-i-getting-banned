#!/usr/bin/env bash
# build.sh game.apks.zip out.apks Patches.java activity.smali super-call
# Shared by the games' menu builds: compiles the floating menu (src/modmenu) with
# the game's generated Patches.java into a new dex, starts it from the activity's
# onCreate right after the given super call, re-signs every split with
# tools/apk-mod/mod-key.jks and packs them into one .apks for SAI.
# Needs: javac, dx (apt: dalvik-exchange), android.jar (apt: libandroid-23-java), apktool.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
. "$here/../env.sh"
repack="$here/../riseup/repack.py"

[ $# -eq 5 ] || { echo "usage: $0 game.apks.zip out.apks Patches.java activity.smali super-call" >&2; exit 2; }
src="$1"; out="$2"; patches="$3"; activity="$4"; anchor="$5"
[ -f "$APKMOD_KEY" ] || { echo "No signing key; run tools/apk-mod/setup.sh first." >&2; exit 1; }
android_jar="${ANDROID_JAR:-/usr/lib/android-sdk/platforms/android-23/android.jar}"
dx="$(command -v dalvik-exchange || command -v dx)"

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
mkdir -p "$work/in" "$work/signed" "$work/classes"
unzip -q "$src" -d "$work/in"

# The menu goes into its own dex, after the base APK's last one.
javac -nowarn --release 8 -cp "$android_jar" -d "$work/classes" "$here"/src/modmenu/*.java "$patches"
"$dx" --dex --min-sdk-version=24 --output="$work/menu.dex" "$work/classes"
next=$(( $(unzip -Z1 "$work/in/base.apk" | grep -cE '^classes[0-9]*\.dex$') + 1 ))

apktool d -q -f -r -o "$work/base" "$work/in/base.apk"
smali="$(cd "$work/base" && ls smali*/"$activity")"
python3 -I - "$work/base/$smali" "$anchor" <<'EOF'
import sys
p, anchor = sys.argv[1], sys.argv[2] + "\n"
s = open(p).read()
call = "\n    invoke-static {p0}, Lmodmenu/ModMenu;->init(Landroid/app/Activity;)V\n"
if s.count(anchor) != 1:
    sys.exit(f"'{anchor.strip()}' not found once in {p}: different game version?")
open(p, "w").write(s.replace(anchor, anchor + call))
EOF
apktool b -q -o "$work/base-rebuilt.apk" "$work/base"
dir="${smali%%/*}"
case "$dir" in smali) dexname=classes.dex ;; smali_classes*) dexname="classes${dir#smali_classes}.dex" ;; esac
unzip -q -o "$work/base-rebuilt.apk" "$dexname" -d "$work"

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
