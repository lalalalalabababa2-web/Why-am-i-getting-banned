#!/bin/bash
# Builds HumKiller.app with just the Xcode Command Line Tools - no Xcode project.
#   ./build.sh        build
#   ./build.sh run    build and open
#   ./build.sh sim    build and run the offline test bench instead
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v swiftc >/dev/null 2>&1; then
    echo "Needs the Xcode Command Line Tools. Run:  xcode-select --install"
    exit 1
fi

OUT=build
mkdir -p "$OUT/obj"

if [ "${1:-}" = "sim" ]; then
    clang++ -std=c++17 -O2 sim/sim.cpp core/hk_core.cpp -o "$OUT/sim"
    exec "$OUT/sim"
fi

TARGET="$(uname -m)-apple-macos13.0"
APP="$OUT/HumKiller.app"
mkdir -p "$APP/Contents/MacOS"

# miniaudio is a 4 MB file; only rebuild it when it changes.
if [ ! -f "$OUT/obj/miniaudio.o" ] || [ core/miniaudio/miniaudio.h -nt "$OUT/obj/miniaudio.o" ] \
   || [ core/ma_config.h -nt "$OUT/obj/miniaudio.o" ]; then
    echo "compiling miniaudio (first build only, ~20 s)"
    clang -O2 -target "$TARGET" -c core/miniaudio_impl.c -o "$OUT/obj/miniaudio.o"
fi
clang++ -std=c++17 -O2 -target "$TARGET" -c core/hk_core.cpp -o "$OUT/obj/hk_core.o"
clang++ -std=c++17 -O2 -target "$TARGET" -c core/hk_audio.cpp -o "$OUT/obj/hk_audio.o"

swiftc -O -swift-version 5 -parse-as-library -target "$TARGET" \
    -import-objc-header core/hk_core.h \
    app/HumKiller.swift "$OUT/obj/miniaudio.o" "$OUT/obj/hk_core.o" "$OUT/obj/hk_audio.o" \
    -lc++ -framework CoreAudio -framework AudioToolbox -framework CoreFoundation -framework AVFoundation \
    -o "$APP/Contents/MacOS/HumKiller"

cp app/Info.plist "$APP/Contents/Info.plist"
codesign --force --sign - "$APP" >/dev/null 2>&1   # ad-hoc signature so macOS will ask for the mic
echo "built $APP"

if [ "${1:-}" = "run" ]; then open "$APP"; fi
