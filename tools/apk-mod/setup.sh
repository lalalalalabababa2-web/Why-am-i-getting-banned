#!/usr/bin/env bash
# Installs the Android game modding tools into tools/apk-mod/bin:
#   apktool   decode an APK to smali + resources and rebuild it
#   jadx      decompile dex to readable Java (for finding the code to patch)
#   zipalign  align a rebuilt APK (Android refuses unaligned ones on 11+)
#   apksigner sign it so it installs
#   adb       install it on a phone over USB or Wi-Fi
# Works on macOS (Homebrew) and Debian/Ubuntu. Needs Java 17+.
set -euo pipefail

APKTOOL_VERSION=3.0.3
JADX_VERSION=1.5.6
BUILD_TOOLS_VERSION=36.0.0

here="$(cd "$(dirname "$0")" && pwd)"
bin="$here/bin"
mkdir -p "$bin"

say() { printf '\033[1m==>\033[0m %s\n' "$*"; }
have() { command -v "$1" >/dev/null 2>&1; }

if ! have java; then
  echo "Java 17+ is needed first: 'brew install openjdk' on macOS, 'sudo apt install openjdk-21-jdk' on Linux." >&2
  exit 1
fi

fetch() { curl -fsSL --retry 3 -o "$2" "$1"; }

# apktool: the release jar from GitHub, the distro package if GitHub is unreachable.
if [ ! -f "$bin/apktool.jar" ]; then
  say "apktool $APKTOOL_VERSION"
  if ! fetch "https://github.com/iBotPeaches/Apktool/releases/download/v$APKTOOL_VERSION/apktool_$APKTOOL_VERSION.jar" "$bin/apktool.jar"; then
    rm -f "$bin/apktool.jar"
    if have brew; then brew install apktool
    elif have apt-get; then sudo apt-get install -y apktool
    fi
    have apktool || { echo "Could not install apktool." >&2; exit 1; }
    echo "  GitHub unreachable; using $(apktool --version 2>/dev/null | tail -1) from the package manager."
  fi
fi

# jadx: the release zip from GitHub, Homebrew's otherwise.
if [ ! -x "$bin/jadx/bin/jadx" ]; then
  say "jadx $JADX_VERSION"
  if fetch "https://github.com/skylot/jadx/releases/download/v$JADX_VERSION/jadx-$JADX_VERSION.zip" "$bin/jadx.zip"; then
    rm -rf "$bin/jadx" && mkdir -p "$bin/jadx"
    unzip -q "$bin/jadx.zip" -d "$bin/jadx" && rm "$bin/jadx.zip"
    chmod +x "$bin/jadx/bin/"*
  else
    rm -f "$bin/jadx.zip"
    if have brew; then brew install jadx; fi
    have jadx || echo "  jadx not installed (optional: only needed to read the code as Java)." >&2
  fi
fi

# zipalign, apksigner, adb.
case "$(uname -s)" in
  Darwin)
    have brew || { echo "Install Homebrew first: https://brew.sh" >&2; exit 1; }
    have adb || { say "adb"; brew install --cask android-platform-tools; }
    if ! have zipalign || ! have apksigner; then
      say "Android build-tools $BUILD_TOOLS_VERSION (zipalign, apksigner)"
      have sdkmanager || brew install --cask android-commandlinetools
      sdk="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
      yes | sdkmanager --sdk_root="$sdk" --licenses >/dev/null || true
      sdkmanager --sdk_root="$sdk" "build-tools;$BUILD_TOOLS_VERSION"
      ln -sf "$sdk/build-tools/$BUILD_TOOLS_VERSION/zipalign" "$bin/zipalign"
      ln -sf "$sdk/build-tools/$BUILD_TOOLS_VERSION/apksigner" "$bin/apksigner"
    fi
    ;;
  Linux)
    missing=""
    have zipalign || missing="$missing zipalign"
    have apksigner || missing="$missing apksigner"
    have adb || missing="$missing android-sdk-platform-tools"
    if [ -n "$missing" ]; then
      say "apt:$missing"
      sudo=""; [ "$(id -u)" -ne 0 ] && sudo=sudo
      $sudo apt-get install -y $missing
    fi
    ;;
esac

# A signing key of your own. Any key works; keep this one so updates of a modded
# game install over each other without wiping its save.
key="$here/mod-key.jks"
if [ ! -f "$key" ]; then
  say "signing key $key"
  keytool -genkeypair -keystore "$key" -alias mod -storepass modkey -keypass modkey \
    -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=mod" >/dev/null 2>&1
fi

say "Done. Tools:"
"$here/env.sh" --check
