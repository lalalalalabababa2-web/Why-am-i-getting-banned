#!/bin/sh
# Installs the Android game modding toolkit on Ubuntu/Debian (also works in a
# Claude Code cloud session). Re-run any time; every step is idempotent.
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
JADX_VERSION=1.5.6
SUDO=; [ "$(id -u)" = 0 ] || SUDO=sudo

$SUDO apt-get update -q
DEBIAN_FRONTEND=noninteractive $SUDO apt-get install -y -q \
  openjdk-21-jdk-headless maven apktool zipalign apksigner adb aapt \
  radare2 binwalk xxd python3-pip

pip3 install -q --break-system-packages --ignore-installed blinker \
  frida-tools objection androguard UnityPy lief capstone keystone-engine

# jadx from Maven Central. The Google-hosted deps (r8, smali) are left out:
# they only matter for .class/.jar input and the smali view, not APK -> Java.
if [ ! -f /opt/modtools/jadx/jadx-cli-$JADX_VERSION.jar ]; then
  tmp=$(mktemp -d)
  cat > "$tmp/pom.xml" <<EOF
<project xmlns="http://maven.apache.org/POM/4.0.0"><modelVersion>4.0.0</modelVersion>
<groupId>x</groupId><artifactId>x</artifactId><version>1</version>
<dependencies><dependency><groupId>io.github.skylot</groupId><artifactId>jadx-cli</artifactId><version>$JADX_VERSION</version>
<exclusions>
<exclusion><groupId>com.android.tools</groupId><artifactId>*</artifactId></exclusion>
<exclusion><groupId>com.android.tools.smali</groupId><artifactId>*</artifactId></exclusion>
<exclusion><groupId>com.android.tools.build</groupId><artifactId>*</artifactId></exclusion>
</exclusions></dependency></dependencies></project>
EOF
  $SUDO mkdir -p /opt/modtools/jadx
  (cd "$tmp" && $SUDO mvn -q dependency:copy-dependencies -DoutputDirectory=/opt/modtools/jadx -DincludeScope=runtime)
  rm -rf "$tmp"
fi
printf '#!/bin/sh\nexec java -Xmx4g -cp "/opt/modtools/jadx/*" jadx.cli.JadxCLI "$@"\n' | $SUDO tee /usr/local/bin/jadx >/dev/null
$SUDO chmod +x /usr/local/bin/jadx "$HERE/apkmod.py"
$SUDO ln -sf "$HERE/apkmod.py" /usr/local/bin/apkmod

echo "ready: apkmod, apktool $(apktool --version 2>/dev/null), jadx $(jadx --version 2>/dev/null), frida $(frida --version)"
