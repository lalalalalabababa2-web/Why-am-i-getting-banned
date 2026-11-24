#!/usr/bin/env bash
# Builds ggml for ARM (with int8 matrix multiply, then without: the 4x4 and the 2x2 kernels) and
# runs test_q1q2_mulmat.c. On an x86 computer it cross-compiles and runs under qemu-aarch64:
#   sudo apt-get install qemu-user-static gcc-aarch64-linux-gnu g++-aarch64-linux-gnu
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/third_party/llama.cpp"
OUT="${HOST_TEST_OUT:-$ROOT/build/host-test}/q1q2"
sh "$ROOT/third_party/patches/apply.sh"
RUN=()
CROSS=()
if [ "$(uname -m)" != "aarch64" ]; then
  CROSS=(-DCMAKE_SYSTEM_NAME=Linux -DCMAKE_SYSTEM_PROCESSOR=aarch64
         -DCMAKE_C_COMPILER=aarch64-linux-gnu-gcc -DCMAKE_CXX_COMPILER=aarch64-linux-gnu-g++)
  RUN=(qemu-aarch64-static -cpu max -L /usr/aarch64-linux-gnu)
fi
CC="${CROSS:+aarch64-linux-gnu-gcc}"
CC="${CC:-cc}"
for arch in "armv8.6-a+dotprod+i8mm" "armv8.2-a+dotprod"; do
  B="$OUT/${arch//+/_}"
  cmake -S "$SRC" -B "$B" -G Ninja -DCMAKE_BUILD_TYPE=Release "${CROSS[@]}" \
    -DLLAMA_BUILD_TESTS=OFF -DLLAMA_BUILD_EXAMPLES=OFF -DLLAMA_BUILD_TOOLS=OFF -DLLAMA_BUILD_SERVER=OFF \
    -DLLAMA_BUILD_COMMON=OFF -DLLAMA_BUILD_APP=OFF -DLLAMA_OPENSSL=OFF -DLLAMA_BUILD_UI=OFF \
    -DBUILD_SHARED_LIBS=OFF -DGGML_NATIVE=OFF -DGGML_CPU_ARM_ARCH="$arch" -DGGML_OPENMP=OFF \
    -DGGML_BACKEND_DL=OFF -DGGML_LLAMAFILE=OFF -DGGML_CPU_REPACK=OFF >/dev/null
  cmake --build "$B" --target ggml >/dev/null
  "$CC" -O2 -march="$arch" -I "$SRC/ggml/include" "$ROOT/tools/host-test/test_q1q2_mulmat.c" \
    "$B/ggml/src/libggml.a" "$B/ggml/src/libggml-cpu.a" "$B/ggml/src/libggml-base.a" -lstdc++ -lm -lpthread -o "$B/test_q1q2_mulmat"
  echo "== $arch"
  "${RUN[@]}" "$B/test_q1q2_mulmat"
done
