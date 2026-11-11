#!/usr/bin/env bash
# The engine against real models (CI downloads them; see .github/workflows/build.yml): drafting
# with an MTP head (same words, how much faster), pictures and video frames, compute memory,
# and the Bonsai models. Built without sanitizers so the speeds it prints mean something.
#
#   REAL_MODELS=/path/to/models tools/host-test/real.sh      (after tools/host-test/run.sh)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/third_party/llama.cpp"
OUT="${HOST_TEST_OUT:-$ROOT/build/host-test}"
: "${REAL_MODELS:?set REAL_MODELS to the folder with the downloaded models}"
mkdir -p "$OUT/models"

sh "$ROOT/third_party/patches/apply.sh"
if [ ! -f "$OUT/llama/bin/libmtmd.so" ]; then
  cmake -S "$SRC" -B "$OUT/llama" -G Ninja -DCMAKE_BUILD_TYPE=Release \
    -DLLAMA_BUILD_TESTS=OFF -DLLAMA_BUILD_EXAMPLES=OFF -DLLAMA_BUILD_TOOLS=OFF \
    -DLLAMA_BUILD_SERVER=OFF -DLLAMA_BUILD_APP=OFF -DLLAMA_OPENSSL=OFF -DBUILD_SHARED_LIBS=ON \
    -DLLAMA_BUILD_MTMD=ON -DMTMD_VIDEO=OFF
  cmake --build "$OUT/llama" --target llama llama-common mtmd
fi

g++ -std=c++17 -O2 -DNDEBUG \
  -I "$SRC/include" -I "$SRC/common" -I "$SRC/ggml/include" -I "$SRC/vendor" -I "$SRC/src" -I "$SRC/tools/mtmd" \
  -I "$ROOT/app/src/main/cpp" \
  "$ROOT/app/src/main/cpp/engine.cpp" "$ROOT/tools/host-test/test_engine.cpp" \
  -L "$OUT/llama/bin" -lllama-common -lmtmd -lllama -lggml -lggml-base -lpthread \
  -Wl,-rpath,"$OUT/llama/bin" -o "$OUT/test_engine_real"

# Offline AI's attention kernel on this CPU: right, and how fast against ggml's reference path
g++ -std=c++17 -O2 -I "$SRC/ggml/include" "$ROOT/tools/host-test/test_fattn.cpp" \
  -L "$OUT/llama/bin" -lggml -lggml-cpu -lggml-base -lpthread \
  -Wl,-rpath,"$OUT/llama/bin" -o "$OUT/test_fattn"
"$OUT/test_fattn"

"$OUT/test_engine_real" "$OUT/models" "$SRC" "$REAL_MODELS" --real-only

# the same long conversation with ggml's own attention, to set beside the numbers above
if [ -f "$REAL_MODELS/Llama-3.2-1B-Instruct-Q4_K_M.gguf" ]; then
  OA_FATTN_OFF=1 "$OUT/test_engine_real" "$OUT/models" "$SRC" --context \
    "$REAL_MODELS/Llama-3.2-1B-Instruct-Q4_K_M.gguf" "Llama 3.2 1B Q4_K_M" | sed 's/^SPEED: /SPEED: [ggml attention] /'
fi
