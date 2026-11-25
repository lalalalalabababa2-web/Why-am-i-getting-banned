// Attention over many queries at once with 8-bit scores (fa-prefill.inc), as a picture's patches
// attend to each other in a vision tower, against ggml's reference path: head sizes 64 to 128
// (and ones that are not a multiple of 16), no mask, a mask with whole blocks hidden (windows)
// and with holes, keys that share a large offset, queries and keys not a multiple of the tile
// sizes, 1 to 4 threads. Then how long one such attention takes at 1024 and 4096 patches, with
// the 8-bit scores and with ggml's own tiled path (OA_FA8=0).
//
//   test_fa_prefill            correctness, then the timings
//   test_fa_prefill --bench    timings only
//   test_fa_prefill --check    correctness only (under qemu)
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
    int d, n_head, n;           // head size, heads, patches (queries = keys)
    int mask = 0;               // 0 none, 1 windows of 256 patches, 2 holes
    float k_offset = 0.0f;      // a shift shared by every key (what centring K takes out)
    float v_mul = 3.0f;
    float outliers = 0.0f;      // a few channels this many times larger in K (and others in Q)
};

static int g_fail = 0;

static std::vector<float> run(const Case & c, int threads, bool ref, bool named, double * ms, int reps) {
    ggml_init_params ip = {(size_t) 64 * 1024 * 1024 + (size_t) c.n * c.n_head * c.d * 12 + (size_t) c.n * c.n * 2, nullptr, false};
    ggml_context * ctx = ggml_init(ip);
    // the layout mtmd has: Q, K and V as [D, heads, patches], viewed per head
    ggml_tensor * q = ggml_new_tensor_3d(ctx, GGML_TYPE_F32, c.d, c.n_head, c.n);
    ggml_tensor * k = ggml_new_tensor_3d(ctx, GGML_TYPE_F16, c.d, c.n_head, c.n);
    ggml_tensor * v = ggml_new_tensor_3d(ctx, GGML_TYPE_F16, c.d, c.n_head, c.n);
    std::mt19937 rng(c.d * 7 + c.n_head * 131 + c.n + c.mask * 3);
    std::normal_distribution<float> nd(0.0f, 1.0f);
    std::vector<float> off(c.d);
    for (auto & o : off) o = nd(rng) * c.k_offset;
    // with outliers: channels 3 and 17 of K, and 5 of Q, much larger than the rest, as vision towers have
    auto kmul = [&](int64_t i) { const int d = (int) (i % c.d); return c.outliers > 0.0f && (d == 3 || d == 17) ? c.outliers : 1.0f; };
    auto qmul = [&](int64_t i) { const int d = (int) (i % c.d); return c.outliers > 0.0f && d == 5 ? c.outliers : (c.outliers > 0.0f && (d == 3 || d == 17) ? 1.0f / c.outliers : 1.0f); };
    for (int64_t i = 0; i < ggml_nelements(q); i++) ((float *) q->data)[i] = nd(rng) * 1.5f * qmul(i);
    for (int64_t i = 0; i < ggml_nelements(k); i++) ((ggml_fp16_t *) k->data)[i] = ggml_fp32_to_fp16(nd(rng) * 1.5f * kmul(i) + off[i % c.d]);
    for (int64_t i = 0; i < ggml_nelements(v); i++) ((ggml_fp16_t *) v->data)[i] = ggml_fp32_to_fp16(nd(rng) * c.v_mul);
    ggml_tensor * mask = nullptr;
    if (c.mask) {
        mask = ggml_new_tensor_2d(ctx, GGML_TYPE_F16, c.n, c.n);
        std::uniform_real_distribution<float> ud(0.0f, 1.0f);
        for (int i = 0; i < c.n; i++) {
            for (int j = 0; j < c.n; j++) {
                float m = 0.0f;
                if (c.mask == 1 && i / 256 != j / 256) m = -INFINITY;
                if (c.mask == 2 && ud(rng) < 0.3f) m = -INFINITY;
                ((ggml_fp16_t *) mask->data)[(size_t) i * c.n + j] = ggml_fp32_to_fp16(m);
            }
        }
    }
    ggml_tensor * qv = ggml_permute(ctx, q, 0, 2, 1, 3);
    ggml_tensor * kv = ggml_permute(ctx, k, 0, 2, 1, 3);
    ggml_tensor * vv = ggml_permute(ctx, v, 0, 2, 1, 3);
    ggml_tensor * kc = ggml_cont(ctx, kv);  // mtmd casts K and V to F16: contiguous per head
    ggml_tensor * vc = ggml_cont(ctx, vv);
    ggml_tensor * out = ggml_flash_attn_ext(ctx, qv, kc, vc, mask, 1.0f / std::sqrt((float) c.d), 0.0f, 0.0f);
    ggml_prec_set_acc(out, GGML_PREC_F32);
    if (named) ggml_set_name(out, "oa_fa8");
    ggml_cgraph * gf = ggml_new_graph(ctx);
    ggml_build_forward_expand(gf, out);

    ggml_backend_t be = ggml_backend_cpu_init();
    ggml_backend_cpu_set_n_threads(be, threads);
    ggml_backend_cpu_set_use_ref(be, ref);
    ggml_backend_graph_compute(be, gf);
    if (ms) {
        const auto t0 = std::chrono::steady_clock::now();
        for (int r = 0; r < reps; r++) ggml_backend_graph_compute(be, gf);
        *ms = std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - t0).count() / reps;
    }
    std::vector<float> res((float *) out->data, (float *) out->data + ggml_nelements(out));
    ggml_backend_free(be);
    ggml_free(ctx);
    return res;
}

static void check_ggml(const Case & c, int threads);

static void check(const Case & c, int threads) {
    check_ggml(c, threads);
    const auto got  = run(c, threads, false, true, nullptr, 0);
    const auto want = run(c, threads, true, false, nullptr, 0);
    double err = 0.0, norm = 0.0, se = 0.0, sw = 0.0, dot = 0.0, gg = 0.0;
    for (size_t i = 0; i < got.size(); i++) {
        if (!std::isfinite(got[i])) { err = INFINITY; break; }
        err = std::max(err, (double) std::fabs(got[i] - want[i]));
        norm = std::max(norm, (double) std::fabs(want[i]));
        se += (double) (got[i] - want[i]) * (got[i] - want[i]);
        sw += (double) want[i] * want[i];
        dot += (double) got[i] * want[i];
        gg += (double) got[i] * got[i];
    }
    const double nmse = sw > 0.0 ? se / sw : se;
    const double cosv = dot / std::sqrt(gg * sw + 1e-30);
    // 8-bit scores: a mean error of about 2e-4 (each of Q and K rounded to 1/254 of its largest
    // value), like the 8-bit inputs of a Q8_0 projector's matrix products. A dropped key, a wrong
    // row or a wrong weight shows as a mean error a hundred times that. With outlier channels the
    // balance between Q and K must at least halve the error it would have without.
    bool ok = std::isfinite(err) && nmse <= 5e-4 && cosv >= 0.9997;
    double plain = 0.0;
    if (c.outliers > 0.0f) {
        setenv("OA_FA8_SMOOTH", "0", 1);
        const auto raw = run(c, threads, false, true, nullptr, 0);
        unsetenv("OA_FA8_SMOOTH");
        double se0 = 0.0;
        for (size_t i = 0; i < raw.size(); i++) se0 += (double) (raw[i] - want[i]) * (raw[i] - want[i]);
        plain = sw > 0.0 ? se0 / sw : se0;
        // (a CPU without int8 dot products runs ggml's path both times: exact, nothing to halve)
        ok = std::isfinite(err) && (plain <= 1e-8 ? nmse <= 1e-8 : (nmse <= 1.5e-3 && nmse * 2.0 <= plain));
        std::printf("       (without the channel balance: mean %.1e)\n", plain);
    }
    if (!ok) g_fail++;
    std::printf("  %s D=%d heads %d patches %d mask %s k-offset %g outliers %g, %d threads: max error %.2e (largest %.2f), mean %.1e, cosine %.6f\n",
                ok ? "ok  " : "FAIL", c.d, c.n_head, c.n, c.mask == 0 ? "none" : c.mask == 1 ? "windows" : "holes",
                c.k_offset, c.outliers, threads, err, norm, nmse, cosv);
}

// ggml's own tiled path (the op not named) against its reference: on SVE builds its small GEMM
// is now NEON instead of scalar (0006), so it is checked here too
static void check_ggml(const Case & c, int threads) {
    const auto got  = run(c, threads, false, false, nullptr, 0);
    const auto want = run(c, threads, true, false, nullptr, 0);
    double se = 0.0, sw = 0.0;
    bool finite = true;
    for (size_t i = 0; i < got.size(); i++) {
        finite = finite && std::isfinite(got[i]);
        se += (double) (got[i] - want[i]) * (got[i] - want[i]);
        sw += (double) want[i] * want[i];
    }
    const double nmse = sw > 0.0 ? se / sw : se;
    if (!finite || nmse > 1e-8) {
        g_fail++;
        std::printf("  FAIL ggml's tiled path, D=%d heads %d patches %d: mean error %.1e\n", c.d, c.n_head, c.n, nmse);
    }
}

int main(int argc, char ** argv) {
    const bool bench_only = argc > 1 && std::string(argv[1]) == "--bench";
    const bool check_only = argc > 1 && std::string(argv[1]) == "--check";
    if (!bench_only) {
        std::printf("== attention over many queries (8-bit scores) against the reference\n");
        for (int d : {64, 72, 80, 128}) {
            for (int n : {64, 200, 577}) {
                check({d, 4, n}, 4);
            }
        }
        check({72, 16, 1024}, 4);
        check({64, 12, 1024, 1}, 4);
        check({64, 12, 1000, 2}, 3);
        check({72, 4, 700, 0, 8.0f}, 4);
        check({80, 4, 300, 2, 4.0f}, 2);
        check({64, 2, 129, 0}, 1);
        check({96, 3, 150, 0, 0.0f, 2000.0f}, 4);  // V too large for 16-bit sums: 32-bit ones
        check({40, 4, 100, 0}, 4);                 // a head size not a multiple of 16
        check({72, 4, 500, 0, 0.0f, 3.0f, 12.0f}, 4);  // outlier channels (the channel balance)
        check({64, 4, 300, 2, 2.0f, 3.0f, 30.0f}, 3);
    }
    if (check_only) {
        std::printf("\n%s (%d failures)\n", g_fail ? "FAILED" : "ALL PASSED", g_fail);
        return g_fail ? 1 : 0;
    }
    std::printf("== one vision-tower attention (16 heads)\n");
    const int threads = std::max(1, std::atoi(std::getenv("BENCH_THREADS") ? std::getenv("BENCH_THREADS") : "4"));
    for (int n : {1024, 4096}) {
        for (int d : {64, 72}) {
            Case c{d, 16, n};
            double ms8 = 0.0, ms = 0.0;
            run(c, threads, false, true, &ms8, n > 2048 ? 2 : 5);
            run(c, threads, false, false, &ms, n > 2048 ? 2 : 5);
            std::printf("SPEED: vision attention, D=%d, 16 heads, %d patches, %d threads: 8-bit scores %.1f ms, ggml's tiled path %.1f ms (%.2fx)\n",
                        d, n, threads, ms8, ms, ms / ms8);
        }
    }
    if (!bench_only) std::printf("\n%s (%d failures)\n", g_fail ? "FAILED" : "ALL PASSED", g_fail);
    return g_fail ? 1 : 0;
}
