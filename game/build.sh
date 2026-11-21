#!/usr/bin/env bash
# Builds Neon Tide: bundles the web game, then the Android APK, and copies it to dist/NeonTide.apk.
# Needs: Node 18+, JDK 17+, Android SDK (ANDROID_HOME or android/local.properties sdk.dir).
set -euo pipefail
cd "$(dirname "$0")"
( cd web && { [ -d node_modules ] || npm install --no-audit --no-fund; } && node build.mjs )
( cd android && ./gradlew --no-daemon -q assembleRelease )
mkdir -p dist
cp android/app/build/outputs/apk/release/app-release.apk dist/NeonTide.apk
echo "APK: $(pwd)/dist/NeonTide.apk ($(du -h dist/NeonTide.apk | cut -f1))"
