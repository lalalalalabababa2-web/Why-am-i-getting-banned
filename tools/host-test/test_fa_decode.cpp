// Flash attention for one query (writing a token) and a few (a draft being checked) against
// ggml's reference path, over the shapes the app's models use: head sizes 64 to 512, 1 to 8 query
// heads per K/V head, masks with holes, soft-capping, ALiBi slopes and sinks, 1 to 4 threads, the
// 16-bit and the 8-bit (Q8_0) conversation memory. Then how long one attention step takes at 8192
// positions; run again with OA_FA_PLAIN=1 for ggml's own path (fa-decode.inc).
//
//   test_fa_decode            correctness, then the timings
//   test_fa_decode --bench    timings only
#include "ggml.h"
#include "ggml-backend.h"
#include "ggml-cpu.h"

#include <chrono>
#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <random>
#include <string>
#include <vector>

struct Case {
    int dk, dv, n_head, n_head_kv, n_kv;
    float softcap, max_bias;
    bool sinks, holes;
    int nq = 1;  // queries: 1 while writing, a few while a draft is checked
    ggml_type kt = GGML_TYPE_F16, vt = GGML_TYPE_F16;  // the conversation memory
};

// a [n, rows] tensor of the given type filled with random values times mul
static void fill(ggml_tensor * t, std::mt19937 & rng, float mul) {
    std::normal_distribution<float> nd(0.0f, 1.0f);
    std::vector<float> x(ggml_nelements(t));
    for (auto & e : x) e = nd(rng) * mul;
    if (t->type == GGML_TYPE_F16) {
        for (size_t i = 0; i < x.size(); i++) ((ggml_fp16_t *) t->data)[i] = ggml_fp32_to_fp16(x[i]);
    } else {
        ggml_quantize_chunk(t->type, x.data(), t->data, 0, ggml_nelements(t) / t->ne[0], t->ne[0], nullptr);
    }
}

static int g_fail = 0;

// Builds the op the way llama.cpp lays out its cache (K and V rows of all heads side by side for
// each position, viewed per head), computes it, and returns the output.
static std::vector<float> run(const Case & c, int threads, bool ref, double * ms_per_op, int reps) {
    ggml_init_params ip = {(size_t) 64 * 1024 * 1024 + (size_t) c.n_kv * c.n_head_kv * (c.dk + c.dv) * 2 * 2, nullptr, false};
    ggml_context * ctx = ggml_init(ip);
    ggml_tensor * q  = ggml_new_tensor_3d(ctx, GGML_TYPE_F32, c.dk, c.n_head, c.nq);              // [DK, heads, tokens]
    ggml_tensor * kc = ggml_new_tensor_3d(ctx, c.kt, c.dk, c.n_head_kv, c.n_kv);                  // the cache, per position
    ggml_tensor * vc = ggml_new_tensor_3d(ctx, c.vt, c.dv, c.n_head_kv, c.n_kv);
    ggml_tensor * mask = ggml_new_tensor_2d(ctx, GGML_TYPE_F16, c.n_kv, c.nq);
    std::mt19937 rng(c.dk * 131 + c.n_head * 17 + c.n_kv);
    std::normal_distribution<float> nd(0.0f, 1.0f);
    for (int64_t i = 0; i < ggml_nelements(q); i++) ((float *) q->data)[i] = nd(rng);
    fill(kc, rng, 1.0f);
    fill(vc, rng, 3.0f);
    std::uniform_real_distribution<float> ud(0.0f, 1.0f);
    // the queries are the last nq positions before the padding, each seeing itself and what came before
    const int pad = c.holes ? 37 : 0;
    for (int t = 0; t < c.nq; t++) {
        for (int i = 0; i < c.n_kv; i++) {
            float m = 0.0f;
            if (i >= c.n_kv - pad - (c.nq - 1 - t)) m = -INFINITY;
            if (c.holes && ud(rng) < 0.2f) m = -INFINITY;
            if (c.max_bias > 0.0f && m == 0.0f) m = -(float) (c.n_kv - i) * 0.01f;
            ((ggml_fp16_t *) mask->data)[t * c.n_kv + i] = ggml_fp32_to_fp16(m);
        }
    }
    ggml_tensor * qv = ggml_permute(ctx, q, 0, 2, 1, 3);                                          // [DK, tokens, heads]
    ggml_tensor * kv = ggml_permute(ctx, kc, 0, 2, 1, 3);                                         // [DK, n_kv, heads_kv]
    ggml_tensor * vv = ggml_permute(ctx, vc, 0, 2, 1, 3);
    ggml_tensor * out = ggml_flash_attn_ext(ctx, qv, kv, vv, mask, 1.0f / std::sqrt((float) c.dk), c.max_bias, c.softcap);
    if (c.sinks) {
        ggml_tensor * sk = ggml_new_tensor_1d(ctx, GGML_TYPE_F32, c.n_head);
        for (int i = 0; i < c.n_head; i++) ((float *) sk->data)[i] = nd(rng) * 2.0f;
        ggml_flash_attn_ext_add_sinks(out, sk);
    }
    ggml_cgraph * gf = ggml_new_graph(ctx);
    ggml_build_forward_expand(gf, out);

    ggml_backend_t be = ggml_backend_cpu_init();
    ggml_backend_cpu_set_n_threads(be, threads);
    ggml_backend_cpu_set_use_ref(be, ref);
    ggml_backend_graph_compute(be, gf);
    if (ms_per_op) {
        const auto t0 = std::chrono::steady_clock::now();
        for (int r = 0; r < reps; r++) ggml_backend_graph_compute(be, gf);
        *ms_per_op = std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - t0).count() / reps;
    }
    std::vector<float> res((float *) out->data, (float *) out->data + ggml_nelements(out));
    ggml_backend_free(be);
    ggml_free(ctx);
    return res;
}

static void check(const Case & c, int threads) {
    const auto got = run(c, threads, false, nullptr, 0);
    const auto want = run(c, threads, true, nullptr, 0);
    double err = 0.0, norm = 0.0, se = 0.0, sw = 0.0;
    for (size_t i = 0; i < got.size(); i++) {
        if (!std::isfinite(got[i])) { err = INFINITY; break; }
        err = std::max(err, (double) std::fabs(got[i] - want[i]));
        norm = std::max(norm, (double) std::fabs(want[i]));
        se += (double) (got[i] - want[i]) * (got[i] - want[i]);
        sw += (double) want[i] * want[i];
    }
    const double nmse = sw > 0.0 ? se / sw : se;
    // 16-bit precision: the K dot is summed in 16 bits on ARM (as ggml's own), and so is each
    // block of 16 V rows there. A dropped or doubled position, a wrong weight or a wrong row shows
    // in the mean error long before it shows in the largest one.
    const bool ok = err <= 4e-3 * std::max(1.0, norm) && nmse <= 1e-5;
    if (!ok) g_fail++;
    std::printf("  %s D=%d/%d heads %d/%d positions %d queries %d K/V %s/%s softcap %g alibi %g%s%s, %d threads: max error %.2e (largest value %.2f), mean %.1e\n",
                ok ? "ok  " : "FAIL", c.dk, c.dv, c.n_head, c.n_head_kv, c.n_kv, c.nq, ggml_type_name(c.kt), ggml_type_name(c.vt),
                c.softcap, c.max_bias, c.sinks ? ", sinks" : "", c.holes ? ", holes" : "", threads, err, norm, nmse);
}

int main(int argc, char ** argv) {
    const bool bench_only = argc > 1 && std::string(argv[1]) == "--bench";
    const char * pe = std::getenv("OA_FA_PLAIN");
    const bool plain = pe && *pe && std::strcmp(pe, "0") != 0;
    if (!bench_only) {
        std::printf("== attention for one query against the reference\n");
        for (int d : {64, 128, 256, 512}) {
            for (auto hk : std::vector<std::pair<int, int>>{{8, 8}, {32, 8}, {8, 1}, {16, 2}, {24, 2}, {12, 4}}) {
                for (int n_kv : {512, 1280, 4096}) {
                    check({d, d, hk.first, hk.second, n_kv, 0.0f, 0.0f, false, true}, 4);
                }
            }
        }
        // the rarer parts, and other thread counts
        check({128, 128, 32, 8, 2048, 30.0f, 0.0f, false, true}, 3);
        check({64, 64, 16, 4, 1024, 0.0f, 8.0f, false, true}, 4);
        check({64, 64, 8, 2, 1024, 0.0f, 0.0f, true, true}, 2);
        check({256, 256, 8, 1, 1536, 0.0f, 0.0f, false, false}, 1);
        check({96, 64, 16, 4, 1024, 0.0f, 0.0f, false, true}, 4);   // K and V of different sizes
        check({192, 80, 16, 16, 777, 0.0f, 0.0f, false, true}, 4);   // V not a multiple of 32 wide: ggml's own path
        // a draft being checked: a few queries at once, under and over 512 positions
        for (int nq : {2, 4, 8, 31}) {
            for (auto hk : std::vector<std::pair<int, int>>{{32, 8}, {8, 1}, {16, 4}, {12, 12}}) {
                for (int d : {64, 256}) {
                    check({d, d, hk.first, hk.second, 300, 0.0f, 0.0f, false, true, nq}, 4);
                    check({d, d, hk.first, hk.second, 2048, 0.0f, 0.0f, false, true, nq}, 3);
                }
            }
        }
        check({128, 128, 32, 8, 1024, 30.0f, 0.0f, true, true, 8}, 4);
        check({64, 64, 16, 4, 1024, 0.0f, 8.0f, false, true, 5}, 2);
        check({512, 512, 8, 1, 700, 0.0f, 0.0f, false, false, 3}, 1);
        // the 8-bit memory: writing (ggml's split path, which takes it through fa-decode.inc), a
        // draft, a prompt (64 queries and more), and one of K and V in 8 bits
        const ggml_type Q8 = GGML_TYPE_Q8_0, F16 = GGML_TYPE_F16;
        for (int d : {64, 128, 256, 512}) {
            for (auto hk : std::vector<std::pair<int, int>>{{32, 8}, {8, 1}, {16, 4}, {12, 12}}) {
                for (int nq : {1, 4, 64}) {
                    for (int n_kv : {300, 1280}) {
                        check({d, d, hk.first, hk.second, n_kv, 0.0f, 0.0f, false, true, nq, Q8, Q8}, 4);
                    }
                }
            }
        }
        check({128, 128, 32, 8, 2048, 30.0f, 0.0f, true, true, 1, Q8, Q8}, 3);
        check({64, 64, 16, 4, 1024, 0.0f, 8.0f, false, true, 8, Q8, Q8}, 2);
        check({256, 256, 8, 1, 1536, 0.0f, 0.0f, false, false, 1, Q8, Q8}, 1);
        check({128, 128, 32, 8, 1024, 0.0f, 0.0f, false, true, 1, Q8, F16}, 4);
        check({128, 128, 32, 8, 1024, 0.0f, 0.0f, false, true, 1, F16, Q8}, 4);
        check({256, 256, 16, 4, 700, 0.0f, 0.0f, false, true, 5, F16, Q8}, 4);
        check({96, 64, 16, 4, 1024, 0.0f, 0.0f, false, true, 1, Q8, Q8}, 4);
    }
    std::printf("== one attention step at 8192 positions (%s)\n", plain ? "ggml's own path" : "fa-decode.inc");
    const int threads = std::max(1, std::atoi(std::getenv("BENCH_THREADS") ? std::getenv("BENCH_THREADS") : "4"));
    for (ggml_type t : {GGML_TYPE_F16, GGML_TYPE_Q8_0}) {
        for (int nq : {1, 8}) {
            for (auto c : std::vector<Case>{
                     {64, 64, 32, 8, 8192, 0.0f, 0.0f, false, false},     // Llama 3.2 1B
                     {256, 256, 8, 1, 8192, 0.0f, 0.0f, false, false},    // Gemma 4 E2B (its global layers: 512)
                     {512, 512, 8, 1, 8192, 0.0f, 0.0f, false, false},
                     {256, 256, 16, 4, 8192, 0.0f, 0.0f, false, false},   // Qwen3.5 4B / 9B
                     {128, 128, 32, 8, 8192, 0.0f, 0.0f, false, false},   // Llama 8B class
                 }) {
                c.nq = nq;
                c.kt = c.vt = t;
                double ms = 0.0;
                run(c, threads, false, &ms, nq == 1 ? 50 : 10);
                std::printf("SPEED: attention, D=%d heads %d/%d, 8192 positions, %s memory, %d %s, %d threads, %s: %.3f ms a step\n",
                            c.dk, c.n_head, c.n_head_kv, t == GGML_TYPE_F16 ? "16-bit" : "8-bit", nq,
                            nq == 1 ? "query" : "queries (a draft)", threads, plain ? "ggml's own" : "grouped", ms);
            }
        }
    }
    if (!bench_only) std::printf("\n%s (%d failures)\n", g_fail ? "FAILED" : "ALL PASSED", g_fail);
    return g_fail ? 1 : 0;
}
