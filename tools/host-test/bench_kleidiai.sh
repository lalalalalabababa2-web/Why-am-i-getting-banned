#!/usr/bin/env bash
# Measures llama-bench with ggml's own ARM kernels (its repacked Q4_0/Q4_K layouts) against Arm's
# KleidiAI kernels, on the models given, so the app's build can use whichever is faster for the
# Q4_0 files it now downloads (Google's 4-bit trained Gemma 4). Prints "SPEED:" lines for CI.
#
#   tools/host-test/bench_kleidiai.sh model.gguf [model.gguf ...]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/third_party/llama.cpp"
OUT="${HOST_TEST_OUT:-$ROOT/build/host-test}"
sh "$ROOT/third_party/patches/apply.sh"
THREADS="${BENCH_THREADS:-$(nproc)}"
for kind in ggml kleidiai; do
  B="$OUT/bench-$kind"
  cmake -S "$SRC" -B "$B" -G Ninja -DCMAKE_BUILD_TYPE=Release -DGGML_NATIVE=ON \
    -DGGML_CPU_KLEIDIAI=$([ $kind = kleidiai ] && echo ON || echo OFF) \
    -DLLAMA_BUILD_TESTS=OFF -DLLAMA_BUILD_EXAMPLES=OFF -DLLAMA_BUILD_TOOLS=ON -DLLAMA_BUILD_SERVER=OFF \
    -DLLAMA_BUILD_APP=OFF -DLLAMA_OPENSSL=OFF -DLLAMA_BUILD_UI=OFF -DLLAMA_BUILD_MTMD=OFF >/dev/null
  cmake --build "$B" --target llama-bench >/dev/null
done
for m in "$@"; do
  name=$(basename "$m" .gguf)
  for kind in ggml kleidiai; do
    # reading a 512-token message and writing 64 tokens, best of 3; the page cache is warm after the first
    "$OUT/bench-$kind/bin/llama-bench" -m "$m" -t "$THREADS" -p 512 -n 64 -r 3 -o csv 2>/dev/null | python3 -c '
import csv, sys
kind, name = sys.argv[1], sys.argv[2]
rows = list(csv.DictReader(sys.stdin))
pp = next((r for r in rows if int(r["n_prompt"]) > 0), None)
tg = next((r for r in rows if int(r["n_gen"]) > 0), None)
f = lambda r: "%.1f" % float(r["avg_ts"]) if r else "?"
print(f"SPEED: [{kind}] {name}: reading {f(pp)} tokens/s, writing {f(tg)} tokens/s")
' "$kind" "$name" || echo "SPEED: [$kind] $name: failed"
  done
done
