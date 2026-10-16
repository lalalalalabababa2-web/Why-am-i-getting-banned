#!/usr/bin/env bash
# Builds llama.cpp for this computer, makes tiny random test models with llama.cpp's own
# tool, and runs the engine tests against them. Nothing is downloaded beyond the submodule.
#
#   tools/host-test/run.sh            (from the repository root)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/third_party/llama.cpp"
OUT="${HOST_TEST_OUT:-$ROOT/build/host-test}"
mkdir -p "$OUT/models"

if [ ! -f "$OUT/llama/bin/libllama.so" ]; then
  cmake -S "$SRC" -B "$OUT/llama" -G Ninja -DCMAKE_BUILD_TYPE=Release \
    -DLLAMA_BUILD_TESTS=ON -DLLAMA_BUILD_EXAMPLES=OFF -DLLAMA_BUILD_TOOLS=OFF \
    -DLLAMA_BUILD_SERVER=OFF -DLLAMA_BUILD_APP=OFF -DLLAMA_OPENSSL=OFF -DBUILD_SHARED_LIBS=ON
  cmake --build "$OUT/llama" --target llama llama-common test-llama-archs
fi

for arch in llama qwen35 gemma3 mistral3; do
  ls "$OUT/models/$arch"-*.gguf >/dev/null 2>&1 || \
    "$OUT/llama/bin/test-llama-archs" -a "^$arch\$" -o "$OUT/models/" >/dev/null
done

g++ -std=c++17 -O1 -g -fsanitize=address,undefined -fno-omit-frame-pointer \
  -I "$SRC/include" -I "$SRC/common" -I "$SRC/ggml/include" -I "$SRC/vendor" -I "$ROOT/app/src/main/cpp" \
  "$ROOT/app/src/main/cpp/engine.cpp" "$ROOT/tools/host-test/test_engine.cpp" \
  -L "$OUT/llama/bin" -lllama-common -lllama -lggml -lggml-base -lpthread \
  -Wl,-rpath,"$OUT/llama/bin" -o "$OUT/test_engine"

ASAN_OPTIONS=detect_leaks=0 "$OUT/test_engine" "$OUT/models" "$SRC"
