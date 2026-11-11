#!/bin/sh
# Applies Offline AI's changes to the llama.cpp submodule. Safe to run any number of times, and
# from two builds at once (the Android build configures each ABI separately).
#
#   0001-q1q2-neon.patch + q1q2-neon.inc: faster ARM dot products for Q1_0 and Q2_0 (Bonsai)
#   0002-fattn-fast.patch + fattn-fast.inc: attention over a long conversation while writing,
#       in three vectorized passes instead of position by position
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
SRC="$HERE/../llama.cpp"
# file in this folder : where it goes in llama.cpp
for pair in "q1q2-neon.inc:ggml/src/ggml-cpu/arch/arm/q1q2-neon.inc" "fattn-fast.inc:ggml/src/ggml-cpu/fattn-fast.inc"; do
  INC="$SRC/${pair#*:}"
  if ! cmp -s "$HERE/${pair%%:*}" "$INC"; then
    cp "$HERE/${pair%%:*}" "$INC.tmp.$$"
    mv -f "$INC.tmp.$$" "$INC"
  fi
done
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
