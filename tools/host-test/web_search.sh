#!/usr/bin/env bash
# Builds WebSearch.kt (the app's web search: plain Java and org.json) with WebSearchTest.kt on this
# computer and runs it. Needs a JDK; the Kotlin compiler and standard library come from Gradle's own
# distribution (./gradlew downloads it), org.json from Maven Central.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="${HOST_TEST_OUT:-$ROOT/build/host-test}/web-search"
mkdir -p "$OUT"
LIB="${GRADLE_LIB:-$(ls -d "$HOME"/.gradle/wrapper/dists/gradle-*/*/gradle-*/lib /opt/gradle*/lib 2>/dev/null | head -1)}"
KC="$(ls "$LIB"/kotlin-compiler-embeddable-*.jar | head -1)"
STD="$(ls "$LIB"/kotlin-stdlib-[0-9]*.jar | head -1)"
CP="$KC:$STD:$(ls "$LIB"/kotlin-script-runtime-*.jar | head -1):$(ls "$LIB"/kotlin-reflect-*.jar | head -1):$(ls "$LIB"/kotlin-daemon-embeddable-*.jar | head -1):$(ls "$LIB"/kotlinx-coroutines-core-jvm-*.jar | head -1):$(ls "$LIB"/annotations-*.jar | head -1)"

JSON="$OUT/json.jar"
[ -f "$JSON" ] || curl -fsSL --retry 4 --retry-delay 5 -o "$JSON" https://repo.maven.apache.org/maven2/org/json/json/20240303/json-20240303.jar
# one file at a time, by relative path: the embedded compiler wants trove4j (which newer Gradle
# distributions leave out) for more than one, or for absolute paths
mkdir -p "$OUT/src"
cp "$ROOT/app/src/main/java/app/offlineai/chat/data/WebSearch.kt" "$ROOT/tools/host-test/WebSearchTest.kt" "$OUT/src/"
kc() { (cd "$OUT/src" && java -cp "$CP" org.jetbrains.kotlin.cli.jvm.K2JVMCompiler -no-stdlib -nowarn -cp "$STD:$JSON:../classes" -d ../classes "$1" 2>&1 | grep -v "^Picked up" || true); }
kc WebSearch.kt
kc WebSearchTest.kt
java -cp "$OUT/classes:$STD:$JSON" WebSearchTestKt 2>&1 | grep -v "^Picked up"
