#!/usr/bin/env python3
"""A copy of one of llama.cpp's tiny random mixture-of-experts test models with 8 experts (4 used
per token) instead of 2, each a slightly changed copy of the originals, so tests can tell experts
apart (reading the picked ones ahead, using fewer per token).

    PYTHONPATH=third_party/llama.cpp/gguf-py python3 tools/host-test/make_moe8.py in.gguf out.gguf
"""
import sys

import numpy as np
import gguf

N_EXPERT, N_USED = 8, 4


def main() -> int:
    src, dst = sys.argv[1], sys.argv[2]
    r = gguf.GGUFReader(src)
    arch = bytes(r.fields["general.architecture"].parts[-1]).decode()
    old = int(r.fields[f"{arch}.expert_count"].parts[-1][0])
    w = gguf.GGUFWriter(dst, arch)
    for key, f in r.fields.items():
        if key.startswith("GGUF.") or key == "general.architecture":
            continue
        vtype = f.types[0]
        if key == f"{arch}.expert_count":
            w.add_uint32(key, N_EXPERT)
            continue
        if key == f"{arch}.expert_used_count":
            w.add_uint32(key, N_USED)
            continue
        if vtype == gguf.GGUFValueType.ARRAY:
            w.add_array(key, f.contents())
        else:
            w.add_key_value(key, f.contents(), vtype)
    rng = np.random.default_rng(5)
    for t in r.tensors:
        data = np.array(t.data)
        # the expert dimension is the outermost one (numpy's first) for tensors that have one
        if old > 1 and data.ndim >= 1 and data.shape[0] == old and ("_exps" in t.name or "ffn_gate_inp" in t.name and data.ndim == 2):
            reps = [data] + [data[i % old] [None] * (1.0 + 0.1 * rng.standard_normal(data.shape[1:]).astype(data.dtype))
                             for i in range(old, N_EXPERT)]
            data = np.concatenate(reps, axis=0).astype(data.dtype)
        w.add_tensor(t.name, data, raw_dtype=t.tensor_type)
    w.write_header_to_file()
    w.write_kv_data_to_file()
    w.write_tensors_to_file(progress=False)
    w.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
