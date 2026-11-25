#!/usr/bin/env bash
# How fast real projectors read one large picture (the app's "Detailed": 1024 pixels a side, up to
# 1024 tokens; and "Normal"), with their weights in the plain layout and in the CPU's repacked one
# (third_party/patches/mtmd-repack.inc), where the time goes, and how close the readings are.
#
#   REAL_MODELS=/path/to/models tools/host-test/vision.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/third_party/llama.cpp"
OUT="${HOST_TEST_OUT:-$ROOT/build/host-test}"
: "${REAL_MODELS:?set REAL_MODELS to the folder with the downloaded models}"
THREADS="${THREADS:-4}"

sh "$ROOT/third_party/patches/apply.sh"
if [ ! -f "$OUT/llama/build.ninja" ]; then
  cmake -S "$SRC" -B "$OUT/llama" -G Ninja -DCMAKE_BUILD_TYPE=Release \
    -DLLAMA_BUILD_TESTS=OFF -DLLAMA_BUILD_EXAMPLES=OFF -DLLAMA_BUILD_TOOLS=OFF \
    -DLLAMA_BUILD_SERVER=OFF -DLLAMA_BUILD_APP=OFF -DLLAMA_OPENSSL=OFF -DBUILD_SHARED_LIBS=ON \
    -DLLAMA_BUILD_MTMD=ON -DMTMD_VIDEO=OFF
fi
cmake --build "$OUT/llama" --target llama mtmd
g++ -std=c++17 -O2 -I "$SRC/include" -I "$SRC/ggml/include" -I "$SRC/tools/mtmd" \
  "$ROOT/tools/host-test/bench_vision.cpp" -L "$OUT/llama/bin" -lmtmd -lllama -lggml -lggml-base \
  -Wl,-rpath,"$OUT/llama/bin" -o "$OUT/bench_vision"

one() {  # model, projector, label, [1: also the 8-bit attention's variants]
  local m="$REAL_MODELS/$1" p="$REAL_MODELS/$2"
  if [ ! -f "$m" ] || [ ! -f "$p" ]; then echo "== $3: not downloaded, skipped"; return; fi
  echo "== $3"
  BENCH_VISION_PROFILE=1 BENCH_VISION_MORE=${4:-} "$OUT/bench_vision" "$m" "$p" "$3, Detailed" 1024 1024 "$THREADS" 2>&1 | grep -E '^SPEED|^  |repacked layout|GGML_ASSERT|error' || echo "FAIL: $3 (Detailed)"
  "$OUT/bench_vision" "$m" "$p" "$3, Normal" 768 400 "$THREADS" 2>&1 | grep -E '^SPEED|repacked layout|GGML_ASSERT|error' || echo "FAIL: $3 (Normal)"
}
one Ternary-Bonsai-2-9B-Q2_0.gguf Ternary-Bonsai-2-9B-mmproj-Q8_0.gguf "Ternary Bonsai 2 9B (Q8_0 projector)" 1
one gemma-4-E2B-it-qat-UD-Q4_K_XL.gguf mmproj-F16.gguf "Gemma 4 E2B (F16 projector)"
one Qwen3.5-0.8B-Q4_K_M.gguf mmproj-Qwen3.5-0.8B-F16.gguf "Qwen3.5 0.8B (F16 projector)"
one LFM2.5-VL-1.6B-Q4_K_M.gguf mmproj-LFM2.5-VL-1.6b-Q8_0.gguf "LFM2.5-VL 1.6B (Q8_0 projector)"
