#!/usr/bin/env bash
# Makes the tiny random test models with llama.cpp's own tool, and nothing else: for jobs that
# only need the models (the Screens workflow), without building and running the engine tests.
#
#   tools/host-test/models.sh         (from the repository root; models land in build/host-test/models)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/third_party/llama.cpp"
OUT="${HOST_TEST_OUT:-$ROOT/build/host-test}"
mkdir -p "$OUT/models"

sh "$ROOT/third_party/patches/apply.sh"
if [ ! -x "$OUT/llama/bin/test-llama-archs" ]; then
  cmake -S "$SRC" -B "$OUT/llama" -G Ninja -DCMAKE_BUILD_TYPE=Release \
    -DLLAMA_BUILD_TESTS=ON -DLLAMA_BUILD_EXAMPLES=OFF -DLLAMA_BUILD_TOOLS=OFF \
    -DLLAMA_BUILD_SERVER=OFF -DLLAMA_BUILD_APP=OFF -DLLAMA_OPENSSL=OFF -DBUILD_SHARED_LIBS=ON \
    -DLLAMA_BUILD_MTMD=ON -DMTMD_VIDEO=OFF
  cmake --build "$OUT/llama" --target test-llama-archs
fi

for arch in llama qwen35; do
  ls "$OUT/models/$arch"-*.gguf >/dev/null 2>&1 || \
    "$OUT/llama/bin/test-llama-archs" -a "^$arch\$" -o "$OUT/models/" >/dev/null
done
ls -la "$OUT/models"
