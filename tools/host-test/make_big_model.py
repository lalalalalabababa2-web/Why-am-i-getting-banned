#!/usr/bin/env python3
"""A random Llama-architecture model of a chosen size (Q4_0 weights), for testing how the engine
copes with a model bigger than the memory it is given. Its words are nonsense; its weights are
laid out like a real model's, so reading it costs what reading a real one of that size costs.

    PYTHONPATH=third_party/llama.cpp/gguf-py python3 tools/host-test/make_big_model.py out.gguf \
        [--layers 32] [--embd 3072] [--ff 8192]

The tokenizer is copied from one of the tiny test models (build/host-test/models/llama-dense.gguf).
"""
import argparse
import sys

import numpy as np
import gguf


def q4_0(rows: int, cols: int, rng: np.random.Generator) -> np.ndarray:
    """Random Q4_0 blocks: a small fp16 scale and 16 bytes of 4-bit values per 32 weights."""
    assert cols % 32 == 0
    nb = rows * cols // 32
    blocks = np.empty((nb, 18), dtype=np.uint8)
    d = (rng.random(nb, dtype=np.float32) * 0.02 + 0.005).astype(np.float16)
    blocks[:, 0:2] = d.view(np.uint8).reshape(nb, 2)
    blocks[:, 2:] = rng.integers(0, 256, size=(nb, 16), dtype=np.uint8)
    return blocks.reshape(rows, cols // 32 * 18)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("out")
    ap.add_argument("--layers", type=int, default=32)
    ap.add_argument("--embd", type=int, default=3072)
    ap.add_argument("--ff", type=int, default=8192)
    ap.add_argument("--heads", type=int, default=24)
    ap.add_argument("--kv-heads", type=int, default=8)
    ap.add_argument("--tokenizer-from", default="build/host-test/models/llama-dense.gguf")
    a = ap.parse_args()

    src = gguf.GGUFReader(a.tokenizer_from)
    tok = {k: f for k, f in src.fields.items() if k.startswith("tokenizer.")}
    tokens = tok["tokenizer.ggml.tokens"].contents()
    n_vocab = len(tokens)
    head = a.embd // a.heads

    w = gguf.GGUFWriter(a.out, "llama")
    w.add_name("big random test model")
    w.add_context_length(4096)
    w.add_embedding_length(a.embd)
    w.add_block_count(a.layers)
    w.add_feed_forward_length(a.ff)
    w.add_head_count(a.heads)
    w.add_head_count_kv(a.kv_heads)
    w.add_layer_norm_rms_eps(1e-5)
    w.add_rope_dimension_count(head)
    w.add_rope_freq_base(10000.0)
    w.add_vocab_size(n_vocab)
    w.add_tokenizer_model(tok["tokenizer.ggml.model"].contents())
    w.add_token_list(tokens)
    w.add_token_types(tok["tokenizer.ggml.token_type"].contents())
    w.add_token_scores(tok["tokenizer.ggml.scores"].contents())
    w.add_add_bos_token(False)
    w.add_add_eos_token(False)

    rng = np.random.default_rng(1)
    f32 = lambda *shape: (rng.standard_normal(shape, dtype=np.float32) * 0.02)
    Q = gguf.GGMLQuantizationType.Q4_0

    def add_q(name, rows, cols):
        w.add_tensor(name, q4_0(rows, cols, rng), raw_dtype=Q)  # shape in bytes per row

    w.add_tensor("token_embd.weight", f32(n_vocab, a.embd))
    w.add_tensor("output_norm.weight", np.ones(a.embd, dtype=np.float32))
    add_q("output.weight", n_vocab, a.embd)
    kv = a.kv_heads * head
    for i in range(a.layers):
        p = f"blk.{i}."
        w.add_tensor(p + "attn_norm.weight", np.ones(a.embd, dtype=np.float32))
        add_q(p + "attn_q.weight", a.embd, a.embd)
        add_q(p + "attn_k.weight", kv, a.embd)
        add_q(p + "attn_v.weight", kv, a.embd)
        add_q(p + "attn_output.weight", a.embd, a.embd)
        w.add_tensor(p + "ffn_norm.weight", np.ones(a.embd, dtype=np.float32))
        add_q(p + "ffn_gate.weight", a.ff, a.embd)
        add_q(p + "ffn_up.weight", a.ff, a.embd)
        add_q(p + "ffn_down.weight", a.embd, a.ff)

    w.write_header_to_file()
    w.write_kv_data_to_file()
    w.write_tensors_to_file(progress=False)
    w.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
