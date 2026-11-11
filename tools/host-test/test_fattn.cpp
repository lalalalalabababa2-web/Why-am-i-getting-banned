// Checks Offline AI's attention kernel (third_party/patches/fattn-fast.inc) against the exact
// answer worked out in double precision, and against ggml's own reference path, over the shapes
// the engine meets: one written token against a long memory (every head a block of positions at
// a time, split over threads), a few tokens checked at once (drafting), short memories, masks
// with holes, and head sizes that do not fill a SIMD register. Also times it against the
// reference, which is what ggml did before the patch.
//
//   test_fattn            (built and run by tools/host-test/run.sh)
#include "ggml.h"
#include "ggml-backend.h"
#include "ggml-cpu.h"

#include <chrono>
#include <cmath>
#include <cstdint>
#include <cstdio>
#include <cstring>
#include <random>
#include <vector>

static int g_failures = 0;

struct Case {
    const char * name;
    int   DK, DV;
    int   n_q;        // query positions (1 while writing)
    int   n_head, n_head_kv;
    int   n_kv;
    int   mask;       // 0 none, 1 causal-like holes, 2 holes and finite values, 3 a row with nothing visible
    float softcap;
    int   threads;
    bool  permuted;   // keys and values stored position-major and permuted, as llama.cpp keeps them
};

struct Result {
    std::vector<float> out;
    double             ms = 0;
};

static Result run(const Case & c, const std::vector<float> & qd, const std::vector<ggml_fp16_t> & kd,
                  const std::vector<ggml_fp16_t> & vd, const std::vector<ggml_fp16_t> & md, bool use_ref, int reps) {
    const size_t mem = 64u*1024*1024 + (qd.size()*4 + kd.size()*2 + vd.size()*2 + md.size()*2)*2;
    ggml_init_params ip = {mem, nullptr, false};
    ggml_context * ctx = ggml_init(ip);
    ggml_tensor * q = ggml_new_tensor_4d(ctx, GGML_TYPE_F32, c.DK, c.n_q, c.n_head, 1);
    memcpy(q->data, qd.data(), qd.size()*sizeof(float));
    ggml_tensor *k, *v;
    if (c.permuted) {
        // [D, head, position] in memory, seen as [D, position, head]
        ggml_tensor * k0 = ggml_new_tensor_4d(ctx, GGML_TYPE_F16, c.DK, c.n_head_kv, c.n_kv, 1);
        ggml_tensor * v0 = ggml_new_tensor_4d(ctx, GGML_TYPE_F16, c.DV, c.n_head_kv, c.n_kv, 1);
        for (int i = 0; i < c.n_kv; i++) {
            for (int h = 0; h < c.n_head_kv; h++) {
                memcpy((ggml_fp16_t *) k0->data + ((size_t) i*c.n_head_kv + h)*c.DK, kd.data() + ((size_t) h*c.n_kv + i)*c.DK, c.DK*2);
                memcpy((ggml_fp16_t *) v0->data + ((size_t) i*c.n_head_kv + h)*c.DV, vd.data() + ((size_t) h*c.n_kv + i)*c.DV, c.DV*2);
            }
        }
        k = ggml_permute(ctx, k0, 0, 2, 1, 3);
        v = ggml_permute(ctx, v0, 0, 2, 1, 3);
    } else {
        k = ggml_new_tensor_4d(ctx, GGML_TYPE_F16, c.DK, c.n_kv, c.n_head_kv, 1);
        v = ggml_new_tensor_4d(ctx, GGML_TYPE_F16, c.DV, c.n_kv, c.n_head_kv, 1);
        memcpy(k->data, kd.data(), kd.size()*2);
        memcpy(v->data, vd.data(), vd.size()*2);
    }
    ggml_tensor * mask = nullptr;
    if (c.mask) {
        mask = ggml_new_tensor_4d(ctx, GGML_TYPE_F16, c.n_kv, c.n_q, 1, 1);
        memcpy(mask->data, md.data(), md.size()*2);
    }
    ggml_tensor * out = ggml_flash_attn_ext(ctx, q, k, v, mask, 1.0f/std::sqrt((float) c.DK), 0.0f, c.softcap);
    ggml_cgraph * gf = ggml_new_graph(ctx);
    ggml_build_forward_expand(gf, out);

    ggml_backend_t be = ggml_backend_cpu_init();
    ggml_backend_cpu_set_n_threads(be, c.threads);
    ggml_backend_cpu_set_use_ref(be, use_ref);
    Result r;
    ggml_backend_graph_compute(be, gf);  // threads up, pages in
    const auto t0 = std::chrono::steady_clock::now();
    for (int i = 0; i < reps; i++) ggml_backend_graph_compute(be, gf);
    r.ms = std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - t0).count()/reps;
    r.out.assign((const float *) out->data, (const float *) out->data + ggml_nelements(out));
    ggml_backend_free(be);
    ggml_free(ctx);
    return r;
}

// The same attention in double precision from the same half-float keys and values.
static std::vector<float> exact(const Case & c, const std::vector<float> & qd, const std::vector<ggml_fp16_t> & kd,
                                const std::vector<ggml_fp16_t> & vd, const std::vector<ggml_fp16_t> & md) {
    std::vector<float> out((size_t) c.DV*c.n_head*c.n_q, 0.0f);
    const double scale = (c.softcap != 0.0f ? 1.0/c.softcap : 1.0)/std::sqrt((double) c.DK);
    const int rk = c.n_head/c.n_head_kv;
    std::vector<double> s(c.n_kv), acc(c.DV);
    for (int h = 0; h < c.n_head; h++) {
        const int hk = h/rk;
        for (int iq = 0; iq < c.n_q; iq++) {
            const float * q = qd.data() + ((size_t) h*c.n_q + iq)*c.DK;
            double M = -INFINITY;
            for (int i = 0; i < c.n_kv; i++) {
                const float mv = c.mask ? ggml_fp16_to_fp32(md[(size_t) iq*c.n_kv + i]) : 0.0f;
                if (std::isinf(mv)) {
                    s[i] = -INFINITY;
                    continue;
                }
                const ggml_fp16_t * k = kd.data() + ((size_t) hk*c.n_kv + i)*c.DK;
                double dot = 0;
                for (int d = 0; d < c.DK; d++) dot += (double) ggml_fp16_to_fp32(k[d])*q[d];
                dot *= scale;
                if (c.softcap != 0.0f) dot = c.softcap*std::tanh(dot);
                s[i] = dot + mv;
                if (s[i] > M) M = s[i];
            }
            std::fill(acc.begin(), acc.end(), 0.0);
            double S = 0;
            for (int i = 0; i < c.n_kv; i++) {
                if (std::isinf(s[i])) continue;
                const double p = std::exp(s[i] - M);
                S += p;
                const ggml_fp16_t * v = vd.data() + ((size_t) hk*c.n_kv + i)*c.DV;
                for (int d = 0; d < c.DV; d++) acc[d] += p*ggml_fp16_to_fp32(v[d]);
            }
            float * o = out.data() + ((size_t) iq*c.n_head + h)*c.DV;
            for (int d = 0; d < c.DV; d++) o[d] = S > 0 ? (float) (acc[d]/S) : 0.0f;
        }
    }
    return out;
}

static double max_err(const std::vector<float> & a, const std::vector<float> & b) {
    double e = 0;
    for (size_t i = 0; i < a.size(); i++) {
        const double d = std::fabs((double) a[i] - b[i]);
        if (!(d <= e)) e = d;  // also catches a NaN
    }
    return e;
}

static void check(const Case & c, bool time_it) {
    std::mt19937 rng(1234u + (uint32_t) c.n_kv*31u + (uint32_t) c.DK);
    std::normal_distribution<float> nd(0.0f, 1.0f);
    std::vector<float> qd((size_t) c.DK*c.n_q*c.n_head);
    std::vector<ggml_fp16_t> kd((size_t) c.DK*c.n_kv*c.n_head_kv), vd((size_t) c.DV*c.n_kv*c.n_head_kv), md;
    // scores a few units apart, like a trained model's: some positions matter, most hardly
    for (auto & x : qd) x = nd(rng)*3.0f;
    for (auto & x : kd) x = ggml_fp32_to_fp16(nd(rng));
    for (auto & x : vd) x = ggml_fp32_to_fp16(nd(rng));
    if (c.mask) {
        md.assign((size_t) c.n_kv*c.n_q, ggml_fp32_to_fp16(0.0f));
        const ggml_fp16_t ninf = ggml_fp32_to_fp16(-INFINITY);
        for (int iq = 0; iq < c.n_q; iq++) {
            ggml_fp16_t * m = md.data() + (size_t) iq*c.n_kv;
            for (int i = 0; i < c.n_kv; i++) {
                // the future of this query, and scattered cells that belong to nothing
                const bool future = i > c.n_kv - c.n_q + iq;
                if (future || rng() % 13 == 0) m[i] = ninf;
                else if (c.mask == 2 && rng() % 5 == 0) m[i] = ggml_fp32_to_fp16(-0.5f*(float) (rng() % 7));
            }
            if (c.mask == 3 && iq == c.n_q - 1) {
                for (int i = 0; i < c.n_kv; i++) m[i] = ninf;
            }
        }
    }
    const auto want = exact(c, qd, kd, vd, md);
    const auto fast = run(c, qd, kd, vd, md, false, time_it ? 20 : 1);
    const auto ref = run(c, qd, kd, vd, md, true, time_it ? 5 : 1);
    const double e_fast = max_err(fast.out, want);
    const double e_ref = max_err(ref.out, want);
    std::printf("  %-34s q %dx%d heads, %d of %d dims, %5d positions, %d threads: off by %.2g (reference %.2g)\n", c.name,
                c.n_q, c.n_head, c.DK, c.DV, c.n_kv, c.threads, e_fast, e_ref);
    if (!(e_fast <= 2e-4)) {
        std::fprintf(stderr, "  FAIL %s: the attention output is off by %g\n", c.name, e_fast);
        g_failures++;
    }
    if (!(e_ref <= 0.05)) {
        // not this kernel's doing: reported, not counted (seen with SVE registers wider than a
        // head size that is not a multiple of them, which no real model has)
        std::printf("  note: ggml's reference path is off by %g here\n", e_ref);
    }
    if (time_it) {
        std::printf("SPEED: attention for one written token, %s: %.2f ms (ggml's reference path: %.2f ms, %.1fx)\n", c.name,
                    fast.ms, ref.ms, ref.ms/fast.ms);
    }
}

int main() {
    ggml_time_init();
    std::printf("== attention kernel\n");
    const Case cases[] = {
        // name                              DK   DV  n_q heads kv   n_kv mask cap  thr  permuted
        {"writing, long memory",              64,  64, 1, 32,  8,  4096, 1, 0.0f, 4, true},
        {"writing, long memory, 1 thread",    64,  64, 1, 32,  8,  2051, 1, 0.0f, 1, true},
        {"writing, 5 threads, odd sizes",     72,  40, 1, 12,  4,  1777, 1, 0.0f, 5, true},
        {"writing, wide heads",              128, 128, 1, 24,  8,  3000, 1, 0.0f, 3, true},
        {"writing, no mask",                  64,  64, 1,  8,  8,   900, 0, 0.0f, 4, false},
        {"writing, mask with values",         64,  64, 1, 16,  4,  1500, 2, 0.0f, 4, true},
        {"writing, soft cap",                 64,  64, 1,  8,  4,   800, 1, 30.0f, 2, true},
        {"writing, nothing visible",          64,  64, 1,  8,  2,   600, 3, 0.0f, 4, true},
        {"writing, short memory",             64,  64, 1, 32,  8,   100, 1, 0.0f, 4, true},
        {"writing, 3 positions",              64,  64, 1,  8,  2,     3, 1, 0.0f, 4, true},
        {"writing, 1 position",               32,  32, 1,  4,  4,     1, 0, 0.0f, 2, false},
        {"checking 4 drafted tokens",         64,  64, 4, 32,  8,  2500, 1, 0.0f, 4, true},
        {"checking 3, one sees nothing",      64,  64, 3,  8,  2,   700, 3, 0.0f, 3, true},
        {"checking 2, mask with values",     100,  52, 2,  6,  3,   333, 2, 0.0f, 2, false},
        {"tiny heads",                         8,   8, 1,  4,  2,   640, 1, 0.0f, 2, true},
    };
    for (const auto & c : cases) check(c, false);

    // how long one layer's attention takes for one written token (Llama 3.2 3B's shape: 24 heads
    // of 128 over 8 key/value heads), at a few sizes of memory
    for (int n_kv : {1024, 4096, 8192}) {
        char name[64];
        std::snprintf(name, sizeof name, "%d positions, 24 heads of 128", n_kv);
        const Case c = {name, 128, 128, 1, 24, 8, n_kv, 1, 0.0f, 4, true};
        check(c, true);
    }
    if (g_failures) {
        std::fprintf(stderr, "%d attention checks failed\n", g_failures);
        return 1;
    }
    std::printf("attention kernel: all checks passed\n");
    return 0;
}
