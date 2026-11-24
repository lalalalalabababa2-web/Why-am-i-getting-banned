#!/usr/bin/env bash
# Writing speed with more and more conversation in memory, llama.cpp as the app has it against an
# older llama.cpp, with flash attention on and off and the 16- and 8-bit conversation memory: which
# attention path is fastest on this CPU, and whether an update made one slower. "SPEED:" lines for CI.
#
#   tools/host-test/bench_versions.sh <older llama.cpp commit> model.gguf [model.gguf ...]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/third_party/llama.cpp"
OUT="${HOST_TEST_OUT:-$ROOT/build/host-test}"
OLD="$1"
shift
THREADS="${BENCH_THREADS:-$(nproc)}"
sh "$ROOT/third_party/patches/apply.sh"
if [ ! -d "$OUT/llama-old" ]; then
  git -C "$SRC" fetch -q --depth 1 origin "$OLD"
  git -C "$SRC" worktree add -q --detach "$OUT/llama-old" "$OLD"
fi
for kind in old new; do
  S=$([ $kind = old ] && echo "$OUT/llama-old" || echo "$SRC")
  B="$OUT/bench-$kind"
  cmake -S "$S" -B "$B" -G Ninja -DCMAKE_BUILD_TYPE=Release -DGGML_NATIVE=ON \
    -DLLAMA_BUILD_TESTS=OFF -DLLAMA_BUILD_EXAMPLES=OFF -DLLAMA_BUILD_TOOLS=ON -DLLAMA_BUILD_SERVER=OFF \
    -DLLAMA_BUILD_APP=OFF -DLLAMA_OPENSSL=OFF -DLLAMA_CURL=OFF -DLLAMA_BUILD_UI=OFF -DLLAMA_BUILD_MTMD=OFF >/dev/null
  cmake --build "$B" --target llama-bench >/dev/null
done
for m in "$@"; do
  name=$(basename "$m" .gguf)
  # "new" is llama.cpp as the app has it, with Offline AI's attention for writing (fa-decode.inc);
  # "new-plain" the same with ggml's own attention path
  for kind in old new-plain new; do
    bin="$OUT/bench-${kind%-plain}/bin/llama-bench"
    plain=$([ "$kind" = new-plain ] && echo 1 || echo "")
    for cache in f16 q8_0; do
      for fa in 0 1; do
        # a quantized V cache needs flash attention; without flash attention the paths are the same
        [ "$cache" = q8_0 ] && [ "$fa" = 0 ] && continue
        [ "$kind" = new-plain ] && { [ "$fa" = 0 ] || [ "$cache" = q8_0 ]; } && continue
        OA_FA_PLAIN=$plain "$bin" -m "$m" -t "$THREADS" -p 0 -n 32 -d 0,4096,8192 -r 1 \
          -fa "$fa" -ctk "$cache" -ctv "$cache" -o csv 2>/dev/null | python3 -c '
import csv, sys
kind, name, cache, fa = sys.argv[1:5]
rows = list(csv.DictReader(sys.stdin))
cells = ", ".join("%.1f at %s" % (float(r["avg_ts"]), r["n_depth"]) for r in rows)
print(f"SPEED: [{kind} llama.cpp] {name}, {cache} memory, flash attention {\"on\" if fa == \"1\" else \"off\"}: tokens/s writing {cells}")
' "$kind" "$name" "$cache" "$fa" || echo "SPEED: [$kind] $name $cache fa=$fa: failed"
      done
    done
  done
done
