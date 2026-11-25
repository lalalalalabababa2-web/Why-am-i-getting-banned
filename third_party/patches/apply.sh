#!/bin/sh
# Applies Offline AI's changes to the llama.cpp and stable-diffusion.cpp submodules. Safe to run
# any number of times, and from two builds at once (the Android build configures each ABI separately).
#
#   0001-q1q2-neon.patch + q1q2-neon.inc: faster ARM dot products for Q1_0 and Q2_0 (Bonsai)
#   0002-rpc-survives-lost-phone.patch: a phone that leaves the Wi-Fi fails a step, not the app
#   0003-fa-decode-grouped.patch + fa-decode.inc: attention while writing reads each K/V row once
#     for all the query heads that share it (grouped-query attention), in blocks of 16 positions,
#     for the 16-bit and the 8-bit conversation memory
#   0004-mtmd-cpu-repack.patch + mtmd-repack.inc: the picture and sound encoders' matmul weights
#     in the CPU's repacked layout (F16/BF16 made Q8_0 for it), as the chat model's already are
#   0005-fa-prefill-int8.patch + fa-prefill.inc + fa-prefill-size.h: attention over a picture's
#     patches with 8-bit scores (ARM int8 dot products) and 16-bit V sums, for mtmd's attention ops
#   sd/0001-ggml-without-diag-mask-inf.patch: stable-diffusion.cpp on a ggml without that op
#   sd/0002-picture-speed-and-memory.patch: the diffusion model's weights in the CPU's own matmul
#     layout (llama.cpp's repacking, about 3x faster), the text encoder's pages let go once the
#     prompt is read, and FLUX.2 klein's prompt left unpadded (512 tokens in the reference)
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
SRC="$HERE/../llama.cpp"
SD="$HERE/../stable-diffusion.cpp"
copy() {
  if ! cmp -s "$1" "$2"; then
    cp "$1" "$2.tmp.$$"
    mv -f "$2.tmp.$$" "$2"
  fi
}
copy "$HERE/q1q2-neon.inc" "$SRC/ggml/src/ggml-cpu/arch/arm/q1q2-neon.inc"
copy "$HERE/fa-decode.inc" "$SRC/ggml/src/ggml-cpu/fa-decode.inc"
copy "$HERE/mtmd-repack.inc" "$SRC/tools/mtmd/mtmd-repack.inc"
copy "$HERE/fa-prefill.inc" "$SRC/ggml/src/ggml-cpu/fa-prefill.inc"
copy "$HERE/fa-prefill-size.h" "$SRC/ggml/src/ggml-cpu/fa-prefill-size.h"
for p in "$HERE"/*.patch; do
  if (cd "$SRC" && git apply --reverse --check "$p" 2>/dev/null); then
    continue  # already in
  fi
  if ! (cd "$SRC" && git apply "$p" 2>/dev/null); then
    # another build may have applied it a moment ago
    sleep 1
    (cd "$SRC" && git apply --reverse --check "$p") || { echo "could not apply $p" >&2; exit 1; }
  fi
done
for p in "$HERE"/sd/*.patch; do
  [ -f "$p" ] || continue
  if (cd "$SD" && git apply --reverse --check "$p" 2>/dev/null); then
    continue
  fi
  if ! (cd "$SD" && git apply "$p" 2>/dev/null); then
    sleep 1
    (cd "$SD" && git apply --reverse --check "$p") || { echo "could not apply $p" >&2; exit 1; }
  fi
done
