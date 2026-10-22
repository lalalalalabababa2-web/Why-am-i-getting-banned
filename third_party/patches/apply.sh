#!/bin/sh
# Applies Offline AI's changes to the llama.cpp submodule. Safe to run any number of times, and
# from two builds at once (the Android build configures each ABI separately).
#
#   0001-q1q2-neon.patch + q1q2-neon.inc: faster ARM dot products for Q1_0 and Q2_0 (Bonsai)
#   0002-no-populate.patch: a model parameter to map the file without reading all of it at load
#     (low-memory mode reads only the layers it keeps; see app/src/main/cpp/pager.h)
#   0003-draft-head.patch: an MTP head can draft with the rows of the most used tokens only
#     (llama_model_set_draft_head), and stops at each step's own draft cap; the engine is told
#     which drafter made a draft (see DraftTuner in app/src/main/cpp/engine.h)
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
SRC="$HERE/../llama.cpp"
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
