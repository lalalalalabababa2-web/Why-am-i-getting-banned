#!/usr/bin/env bash
# Installs the Android game modding toolkit into tools/apkmod/lib (gitignored).
# Safe to re-run: anything already downloaded is skipped.
set -euo pipefail

APKTOOL=3.0.3
JADX=1.5.6
UBER_SIGNER=1.3.0
APKEDITOR=1.4.9
IL2CPPDUMPER=6.7.46
FRIDA=17.24.3

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIB="$HERE/lib"
mkdir -p "$LIB"
GH=https://github.com

fetch() { # url dest
  if [[ -s "$2" ]]; then echo "  have $(basename "$2")"; return; fi
  echo "  get  $(basename "$2")"
  curl -fsSL --retry 4 --retry-delay 2 -o "$2.part" "$1"
  mv "$2.part" "$2"
}

need() { command -v "$1" >/dev/null 2>&1; }

echo "== Java tools"
need java || { echo "Java 17+ is required (apt install openjdk-21-jre-headless / brew install openjdk)"; exit 1; }
fetch "$GH/iBotPeaches/Apktool/releases/download/v$APKTOOL/apktool_$APKTOOL.jar" "$LIB/apktool.jar"
fetch "$GH/patrickfav/uber-apk-signer/releases/download/v$UBER_SIGNER/uber-apk-signer-$UBER_SIGNER.jar" "$LIB/uber-apk-signer.jar"
fetch "$GH/REAndroid/APKEditor/releases/download/V$APKEDITOR/APKEditor-$APKEDITOR.jar" "$LIB/APKEditor.jar"
if [[ ! -x "$LIB/jadx/bin/jadx" ]]; then
  fetch "$GH/skylot/jadx/releases/download/v$JADX/jadx-$JADX.zip" "$LIB/jadx.zip"
  rm -rf "$LIB/jadx" && unzip -q "$LIB/jadx.zip" -d "$LIB/jadx" && rm "$LIB/jadx.zip"
  chmod +x "$LIB/jadx/bin/"*
fi

echo "== Il2CppDumper (Unity IL2CPP games)"
if [[ ! -f "$LIB/il2cppdumper/Il2CppDumper.dll" ]]; then
  fetch "$GH/Perfare/Il2CppDumper/releases/download/v$IL2CPPDUMPER/Il2CppDumper-net6-v$IL2CPPDUMPER.zip" "$LIB/il2cppdumper.zip"
  rm -rf "$LIB/il2cppdumper" && unzip -q "$LIB/il2cppdumper.zip" -d "$LIB/il2cppdumper" && rm "$LIB/il2cppdumper.zip"
fi

echo "== Frida gadget and server (android arm64)"
for f in "frida-gadget-$FRIDA-android-arm64.so" "frida-server-$FRIDA-android-arm64"; do
  if [[ ! -f "$LIB/$f" ]]; then
    fetch "$GH/frida/frida/releases/download/$FRIDA/$f.xz" "$LIB/$f.xz"
    xz -d "$LIB/$f.xz"
  fi
done
ln -sf "frida-gadget-$FRIDA-android-arm64.so" "$LIB/frida-gadget-arm64.so"
ln -sf "frida-server-$FRIDA-android-arm64" "$LIB/frida-server-arm64"

echo "== .NET runtime (runs Il2CppDumper and ilspycmd)"
if ! need dotnet; then
  if need apt-get && [[ $(id -u) == 0 ]]; then
    apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq dotnet8 >/dev/null
  elif need brew; then
    brew install --cask dotnet-sdk
  else
    echo "  install the .NET 8 SDK yourself to use 'apkmod il2cpp' and 'apkmod cs'"
  fi
fi
if need dotnet && [[ ! -x "$HOME/.dotnet/tools/ilspycmd" ]]; then
  # 9.1 is the last ilspycmd that runs on .NET 8
  dotnet tool install -g ilspycmd --version 9.1.0.7988 >/dev/null && echo "  installed ilspycmd"
fi

echo "== Python tools (frida-tools for hooking a running game)"
if ! need frida; then
  python3 -m pip install -q --user frida-tools 2>/dev/null \
    || python3 -m pip install -q --user --break-system-packages frida-tools
fi

echo
echo "Done. Put tools/apkmod on your PATH or run tools/apkmod/apkmod directly:"
echo "  export PATH=\"$HERE:\$PATH\""
