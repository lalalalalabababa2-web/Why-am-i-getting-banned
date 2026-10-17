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

"$OUT/test_engine_real" "$OUT/models" "$SRC" "$REAL_MODELS" --real-only
