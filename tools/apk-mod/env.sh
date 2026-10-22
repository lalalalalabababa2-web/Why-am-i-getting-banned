#!/usr/bin/env bash
# Finds the tools setup.sh installed (bin/ first, then PATH). Sourced by the other
# scripts; run with --check to see what was found.

APKMOD_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APKMOD_KEY="$APKMOD_DIR/mod-key.jks"
APKMOD_KEY_PASS=modkey
APKMOD_KEY_ALIAS=mod

apktool() {
  if [ -f "$APKMOD_DIR/bin/apktool.jar" ]; then java -jar "$APKMOD_DIR/bin/apktool.jar" "$@"
  else command apktool "$@"; fi
}
jadx() {
  if [ -x "$APKMOD_DIR/bin/jadx/bin/jadx" ]; then "$APKMOD_DIR/bin/jadx/bin/jadx" "$@"
  else command jadx "$@"; fi
}
zipalign() {
  if [ -x "$APKMOD_DIR/bin/zipalign" ]; then "$APKMOD_DIR/bin/zipalign" "$@"
  else command zipalign "$@"; fi
}
apksigner() {
  if [ -x "$APKMOD_DIR/bin/apksigner" ]; then "$APKMOD_DIR/bin/apksigner" "$@"
  else command apksigner "$@"; fi
}

if [ "${1:-}" = "--check" ]; then
  ok=0
  check() {
    if "$@" >/dev/null 2>&1; then printf '  %-10s ok\n' "$1"
    else printf '  %-10s MISSING\n' "$1"; ok=1; fi
  }
  check apktool --version
  check jadx --version
  check zipalign -h
  check apksigner version
  if command -v adb >/dev/null 2>&1; then printf '  %-10s ok\n' adb; else printf '  %-10s missing (only needed to install over USB)\n' adb; fi
  [ -f "$APKMOD_KEY" ] && printf '  %-10s %s\n' key "$APKMOD_KEY" || { printf '  %-10s MISSING (run setup.sh)\n' key; ok=1; }
  exit $ok
fi
