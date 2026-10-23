#!/bin/bash
# Rebuild the v12.1 APK from the original v11 APK.
#   tools/build.sh path/to/Afterlight_v11.0.0.apk keystore.p12 storepass alias
# Needs: python3, java 17+, unzip, and apksig.jar (Google Maven:
# com.android.tools.build:apksig) next to this script.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(dirname "$HERE")"
SRC_APK="$1"; KS="$2"; PASS="$3"; ALIAS="$4"
WORK="$(mktemp -d)"
unzip -q "$SRC_APK" 'assets/public/*' -d "$WORK/orig"
cp -r "$WORK/orig/assets/public" "$WORK/mod"
B=assets/index-CvZQ0_if.js
sed -e "s#VERSION 11.0 / SHOT AWARENESS#VERSION 12.1 / REALISM#" "$WORK/mod/$B" | cat - "$ROOT/src/realism_v12.js" > "$WORK/bundle.js"
mv "$WORK/bundle.js" "$WORK/mod/$B"
cp -r "$ROOT/assets/realism" "$WORK/mod/assets/realism"
{ cat "$WORK/orig/assets/public/LICENSES.txt"; printf "\n\n===== realism/CREDITS.md =====\n\n"; cat "$ROOT/assets/realism/CREDITS.md"; } > "$WORK/mod/LICENSES.txt"
python3 "$HERE/pack_apk.py" "$SRC_APK" "$WORK/mod" "$WORK/unsigned.apk"
javac -cp "$HERE/apksig.jar" -d "$WORK" "$HERE/Sign.java"
java -cp "$HERE/apksig.jar:$WORK" Sign "$WORK/unsigned.apk" "$ROOT/apk/Afterlight_Blood_Steel_v12.1.0_Realism.apk" "$KS" "$PASS" "$ALIAS"
