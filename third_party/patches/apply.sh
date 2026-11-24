#!/bin/sh
# Applies Offline AI's changes to the llama.cpp and stable-diffusion.cpp submodules. Safe to run
# any number of times, and from two builds at once (the Android build configures each ABI separately).
#
#   0001-q1q2-neon.patch + q1q2-neon.inc: faster ARM dot products for Q1_0 and Q2_0 (Bonsai)
#   0002-rpc-survives-lost-phone.patch: a phone that leaves the Wi-Fi fails a step, not the app
#   sd/0001-ggml-without-diag-mask-inf.patch: stable-diffusion.cpp on a ggml without that op
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
SRC="$HERE/../llama.cpp"
SD="$HERE/../stable-diffusion.cpp"
INC="$SRC/ggml/src/ggml-cpu/arch/arm/q1q2-neon.inc"
if ! cmp -s "$HERE/q1q2-neon.inc" "$INC"; then
  cp "$HERE/q1q2-neon.inc" "$INC.tmp.$$"
  mv -f "$INC.tmp.$$" "$INC"
fi
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
