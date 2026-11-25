#!/usr/bin/env bash
# Builds ggml for ARM (with 16-bit float arithmetic and int8 dot products, with int8 matrix multiply
# too, ARMv9 with SVE2, dot products alone, then plain ARMv8.0) and runs test_fa_decode.cpp: the attention kernel for
# writing one token (fa-decode.inc) against ggml's reference, then its speed against ggml's own
# path; and test_fa_prefill.cpp: attention over a picture's patches with 8-bit scores
# (fa-prefill.inc), the same way; and test_mm_f16.cpp: F16 weights against many columns
# (f16-gemm.inc). On an x86 computer it cross-compiles and runs under qemu-aarch64
# (the timings mean nothing there), see q1q2_mulmat.sh for the packages.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/third_party/llama.cpp"
OUT="${HOST_TEST_OUT:-$ROOT/build/host-test}/fa-decode"
sh "$ROOT/third_party/patches/apply.sh"
RUN=()
CROSS=()
if [ "$(uname -m)" != "aarch64" ]; then
  CROSS=(-DCMAKE_SYSTEM_NAME=Linux -DCMAKE_SYSTEM_PROCESSOR=aarch64
         -DCMAKE_C_COMPILER=aarch64-linux-gnu-gcc -DCMAKE_CXX_COMPILER=aarch64-linux-gnu-g++)
  RUN=(qemu-aarch64-static -cpu max -L /usr/aarch64-linux-gnu)
fi
CXX="${CROSS:+aarch64-linux-gnu-g++}"
CXX="${CXX:-c++}"
for arch in "armv8.2-a+dotprod+fp16" "armv8.6-a+dotprod+fp16+i8mm" "armv9-a+i8mm+dotprod+fp16" "armv8.2-a+dotprod" "armv8-a"; do
  B="$OUT/${arch//+/_}"
  cmake -S "$SRC" -B "$B" -G Ninja -DCMAKE_BUILD_TYPE=Release "${CROSS[@]}" \
    -DLLAMA_BUILD_TESTS=OFF -DLLAMA_BUILD_EXAMPLES=OFF -DLLAMA_BUILD_TOOLS=OFF -DLLAMA_BUILD_SERVER=OFF \
    -DLLAMA_BUILD_COMMON=OFF -DLLAMA_BUILD_APP=OFF -DLLAMA_OPENSSL=OFF -DLLAMA_BUILD_UI=OFF \
    -DBUILD_SHARED_LIBS=OFF -DGGML_NATIVE=OFF -DGGML_CPU_ARM_ARCH="$arch" -DGGML_OPENMP=OFF \
    -DGGML_BACKEND_DL=OFF -DGGML_LLAMAFILE=OFF >/dev/null
  cmake --build "$B" --target ggml >/dev/null
  "$CXX" -std=c++17 -O2 -march="$arch" -I "$SRC/ggml/include" "$ROOT/tools/host-test/test_fa_decode.cpp" \
    "$B/ggml/src/libggml.a" "$B/ggml/src/libggml-cpu.a" "$B/ggml/src/libggml-base.a" -lm -lpthread -o "$B/test_fa_decode"
  "$CXX" -std=c++17 -O2 -march="$arch" -I "$SRC/ggml/include" "$ROOT/tools/host-test/test_fa_prefill.cpp" \
    "$B/ggml/src/libggml.a" "$B/ggml/src/libggml-cpu.a" "$B/ggml/src/libggml-base.a" -lm -lpthread -o "$B/test_fa_prefill"
  "$CXX" -std=c++17 -O2 -march="$arch" -I "$SRC/ggml/include" "$ROOT/tools/host-test/test_mm_f16.cpp" \
    "$B/ggml/src/libggml.a" "$B/ggml/src/libggml-cpu.a" "$B/ggml/src/libggml-base.a" -lm -lpthread -o "$B/test_mm_f16"
  echo "== $arch"
  if [ ${#RUN[@]} -eq 0 ]; then
    if [ "${FA_ONLY_PREFILL:-0}" != 1 ]; then
      "$B/test_fa_decode"
      OA_FA_PLAIN=1 "$B/test_fa_decode" --bench
    fi
    # attention over a picture's patches: 8-bit scores (fa-prefill.inc) against ggml's tiled path
    "$B/test_fa_prefill"
    # F16 weights against many columns (f16-gemm.inc)
    "$B/test_mm_f16"
  else
    # correctness only: under qemu the timings say nothing
    if [ "${FA_ONLY_PREFILL:-0}" != 1 ]; then
      "${RUN[@]}" "$B/test_fa_decode" | grep -v '^SPEED'
    fi
    "${RUN[@]}" "$B/test_fa_prefill" --check
    "${RUN[@]}" "$B/test_mm_f16" --check
  fi
done
