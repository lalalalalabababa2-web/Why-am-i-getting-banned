// Offline AI: the picture (and sound) encoder's matmul weights in the CPU's own layout.
//
// mtmd loads its weights into a plain CPU buffer, so every matmul of the vision tower ran ggml's
// generic row-by-row dot products, while the chat model next to it gets llama.cpp's repacked
// layouts (4x4 / 4x8 interleaved rows for the ARM dot-product and int8 matrix-multiply
// instructions). Reading a picture is one big batch of matmuls (4096 patches on "Detailed"), where
// those layouts pay most.
//
// After the first graph is built, every weight that only ever feeds a 2-D matmul as its first
// input moves to the CPU's repack buffer. F16 and BF16 weights become Q8_0 on the way: the repack
// kernels need a quantized type, Q8_0 is what most projector files ship in anyway, and it halves
// their memory. The old copy's pages go back to the system tensor by tensor, so memory never holds
// both. Weights used any other way (convolutions, embeddings, transposes) stay as they are.
//
// MTMD_CPU_REPACK=0 keeps the plain layout; MTMD_CPU_REPACK=native repacks the quantized weights
// only and leaves F16/BF16 alone.

#include <atomic>
#include <thread>
#include <unordered_map>
#if !defined(_WIN32)
#include <sys/mman.h>
#include <unistd.h>
#endif

static std::vector<ggml_backend_buffer_type_t> oa_cpu_extra_bufts(ggml_backend_dev_t cpu) {
    std::vector<ggml_backend_buffer_type_t> out;
    ggml_backend_reg_t reg = cpu != nullptr ? ggml_backend_dev_backend_reg(cpu) : nullptr;
    auto get = reg != nullptr ? (ggml_backend_dev_get_extra_bufts_t) ggml_backend_reg_get_proc_address(reg, "ggml_backend_dev_get_extra_bufts") : nullptr;
    if (get != nullptr) {
        for (ggml_backend_buffer_type_t * p = get(cpu); p != nullptr && *p != nullptr; ++p) {
            out.push_back(*p);
        }
    }
    return out;
}

// whether a matmul with a [ne0, ne1] weight of this type runs from this buffer type (as llama.cpp's
// model loader asks it: a dummy op whose weight sits in an empty buffer of that type)
static bool oa_buft_takes(ggml_backend_dev_t cpu, ggml_backend_buffer_type_t buft, ggml_type type, int64_t ne0, int64_t ne1) {
    ggml_init_params ip = { 3 * ggml_tensor_overhead(), nullptr, true };
    ggml_context_ptr ctx(ggml_init(ip));
    if (!ctx) {
        return false;
    }
    ggml_tensor * w = ggml_new_tensor_2d(ctx.get(), type, ne0, ne1);
    ggml_tensor * x = ggml_new_tensor_2d(ctx.get(), GGML_TYPE_F32, ne0, 16);
    ggml_tensor * y = ggml_mul_mat(ctx.get(), w, x);
    ggml_backend_buffer_ptr dummy(ggml_backend_buft_alloc_buffer(buft, 0));
    if (!dummy) {
        return false;
    }
    w->buffer = dummy.get();
    const bool ok = ggml_backend_dev_supports_op(cpu, y);
    w->buffer = nullptr;
    return ok;
}

// a contiguous tensor's type, and the strides that go with it
static void oa_set_type(ggml_tensor * t, ggml_type type) {
    t->type  = type;
    t->nb[0] = ggml_type_size(type);
    t->nb[1] = ggml_row_size(type, t->ne[0]);
    for (int d = 2; d < GGML_MAX_DIMS; d++) {
        t->nb[d] = t->nb[d - 1] * t->ne[d - 1];
    }
}

static void oa_release_pages(const void * data, size_t size) {
#if !defined(_WIN32)
    const uintptr_t page  = (uintptr_t) sysconf(_SC_PAGESIZE);
    const uintptr_t begin = (uintptr_t) data;
    const uintptr_t first = (begin + page - 1) & ~(page - 1);
    const uintptr_t last  = (begin + size) & ~(page - 1);
    if (last > first) {
        madvise((void *) first, last - first, MADV_DONTNEED);
    }
#else
    (void) data;
    (void) size;
#endif
}

static void oa_mtmd_repack(const mtmd_model & model, ggml_cgraph * gf, ggml_backend_t backend_cpu) {
    // pictures and sound in only: a speech generator runs several graphs, and one built at
    // warm-up would not show every use of its weights
    if (model.oa_repacked || !model.buf || gf == nullptr || backend_cpu == nullptr ||
        (model.modality != MTMD_MODALITY_VISION && model.modality != MTMD_MODALITY_AUDIO)) {
        return;
    }
    model.oa_repacked = true;
    const char * env = std::getenv("MTMD_CPU_REPACK");
    if (env != nullptr && std::strcmp(env, "0") == 0) {
        return;
    }
    const bool convert = !(env != nullptr && std::strcmp(env, "native") == 0);

    ggml_backend_buffer_t wbuf = model.buf.get();
    if (!ggml_backend_buffer_is_host(wbuf)) {
        return;
    }
    ggml_backend_dev_t cpu = ggml_backend_get_device(backend_cpu);
    const std::vector<ggml_backend_buffer_type_t> extras = oa_cpu_extra_bufts(cpu);
    if (extras.empty()) {
        return;
    }

    // the weights that only ever feed a matmul as its first input (a view, transpose, reshape,
    // convolution or lookup of a weight is a node of its own, with the weight as its source)
    std::unordered_map<ggml_tensor *, bool> uses;
    for (int i = 0; i < ggml_graph_n_nodes(gf); i++) {
        ggml_tensor * n = ggml_graph_node(gf, i);
        for (int s = 0; s < GGML_MAX_SRC; s++) {
            ggml_tensor * t = n->src[s];
            if (t == nullptr || t->buffer != wbuf) {
                continue;
            }
            const bool ok = n->op == GGML_OP_MUL_MAT && s == 0 && n->src[1] != nullptr &&
                            n->src[1]->type == GGML_TYPE_F32 && n->src[1]->ne[3] == 1 &&
                            t->view_src == nullptr && ggml_n_dims(t) == 2 && ggml_is_contiguous(t);
            auto it = uses.find(t);
            if (it == uses.end()) {
                uses.emplace(t, ok);
            } else {
                it->second = it->second && ok;
            }
        }
    }

    struct item {
        ggml_tensor * t;
        ggml_type     to;
        size_t        buft;  // index into extras
        size_t        off;
    };
    std::vector<item> plan;
    for (const auto & u : uses) {
        if (!u.second) {
            continue;
        }
        ggml_tensor * t = u.first;
        ggml_type to = t->type;
        if (convert && (t->type == GGML_TYPE_F16 || t->type == GGML_TYPE_BF16) && t->ne[0] % ggml_blck_size(GGML_TYPE_Q8_0) == 0) {
            to = GGML_TYPE_Q8_0;
        }
        if (!ggml_is_quantized(to)) {
            continue;  // 16-bit weights in a repacked layout (x86 AMX) ran slower than plain
        }
        for (size_t b = 0; b < extras.size(); b++) {
            if (oa_buft_takes(cpu, extras[b], to, t->ne[0], t->ne[1])) {
                plan.push_back({ t, to, b, 0 });
                break;
            }
        }
    }
    if (plan.empty()) {
        return;
    }
    // in file order: the new buffer is read in about the order the old one was
    std::sort(plan.begin(), plan.end(), [](const item & a, const item & b) { return a.t->data < b.t->data; });

    // a layout may pad its tensors: each buffer type says how much room a tensor takes
    std::vector<size_t> total(extras.size(), 0);
    for (auto & p : plan) {
        ggml_tensor as = *p.t;
        oa_set_type(&as, p.to);
        const size_t align = ggml_backend_buft_get_alignment(extras[p.buft]);
        p.off = GGML_PAD(total[p.buft], align);
        total[p.buft] = p.off + ggml_backend_buft_get_alloc_size(extras[p.buft], &as);
    }
    std::vector<ggml_backend_buffer_t> bufs(extras.size(), nullptr);
    for (size_t b = 0; b < extras.size(); b++) {
        if (total[b] == 0) {
            continue;
        }
        bufs[b] = ggml_backend_buft_alloc_buffer(extras[b], total[b]);
        if (bufs[b] == nullptr) {
            LOG_WRN("%s: no memory for the repacked weights (%.1f MB), keeping the plain layout\n", __func__, total[b] / 1048576.0);
            for (auto * x : bufs) {
                if (x != nullptr) {
                    ggml_backend_buffer_free(x);
                }
            }
            return;
        }
        ggml_backend_buffer_set_usage(bufs[b], GGML_BACKEND_BUFFER_USAGE_WEIGHTS);
        model.oa_bufs_repack.emplace_back(bufs[b]);
    }

    // a few tensors at a time: converting and repacking is plain memory work
    std::atomic<size_t> next{ 0 };
    std::atomic<int>    converted{ 0 };
    auto work = [&]() {
        std::vector<float>   row;
        std::vector<uint8_t> q;
        for (size_t i = next++; i < plan.size(); i = next++) {
            const item &  p   = plan[i];
            ggml_tensor * t   = p.t;
            const void *  old = t->data;
            const size_t  old_size = ggml_nbytes(t);
            const void *  src = old;
            size_t        n   = old_size;
            if (p.to != t->type) {
                const int64_t ne0 = t->ne[0];
                const int64_t ne1 = t->ne[1];
                const size_t  rs  = ggml_row_size(p.to, ne0);
                row.resize(ne0);
                q.resize(rs * ne1);
                for (int64_t r = 0; r < ne1; r++) {
                    const char * in = (const char *) old + r * t->nb[1];
                    if (t->type == GGML_TYPE_F16) {
                        ggml_fp16_to_fp32_row((const ggml_fp16_t *) in, row.data(), ne0);
                    } else {
                        ggml_bf16_to_fp32_row((const ggml_bf16_t *) in, row.data(), ne0);
                    }
                    ggml_quantize_chunk(p.to, row.data(), q.data() + r * rs, 0, 1, ne0, nullptr);
                }
                src = q.data();
                n   = q.size();
                oa_set_type(t, p.to);
                converted++;
            }
            t->buffer = nullptr;
            t->data   = nullptr;
            ggml_backend_buffer_t b = bufs[p.buft];
            ggml_backend_tensor_alloc(b, t, (char *) ggml_backend_buffer_get_base(b) + p.off);
            ggml_backend_tensor_set(t, src, 0, n);
            oa_release_pages(old, old_size);
        }
    };
    const int n_workers = (int) std::max(1u, std::min(4u, std::thread::hardware_concurrency()));
    std::vector<std::thread> workers;
    for (int w = 1; w < n_workers; w++) {
        workers.emplace_back(work);
    }
    work();
    for (auto & w : workers) {
        w.join();
    }

    size_t bytes = 0;
    for (size_t x : total) {
        bytes += x;
    }
    std::string names;
    for (size_t b = 0; b < extras.size(); b++) {
        if (total[b] > 0) {
            names += std::string(names.empty() ? "" : ", ") + ggml_backend_buft_name(extras[b]);
        }
    }
    LOG_INF("%s: %zu weights (%.1f MB) in the CPU's repacked layout (%s), %d of them made Q8_0 from F16/BF16\n",
            __func__, plan.size(), bytes / 1048576.0, names.c_str(), converted.load());
}
