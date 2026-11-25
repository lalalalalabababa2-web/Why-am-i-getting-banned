// F16 weights against many F32 columns (f16-gemm.inc) against ggml's reference path: lengths that
// are and are not multiples of 4 and of the 256 slice, row and column counts with short last
// groups, 3-D activations, 1 to 4 threads. Then how long Qwen3.5-VL's ffn_down takes for 1024
// patches, against ggml's own path (OA_F16_GEMM=0).
//
//   test_mm_f16            correctness, then the timing
//   test_mm_f16 --check    correctness only (under qemu)
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

static int g_fail = 0;

static std::vector<float> run(int K, int N, int M, int M2, int threads, bool ref, double * ms, int reps) {
    ggml_init_params ip = {(size_t) 64 * 1024 * 1024 + (size_t) K * (N * 2 + M * M2 * 4) + (size_t) N * M * M2 * 4, nullptr, false};
    ggml_context * ctx = ggml_init(ip);
    ggml_tensor * w = ggml_new_tensor_2d(ctx, GGML_TYPE_F16, K, N);
    ggml_tensor * x = ggml_new_tensor_3d(ctx, GGML_TYPE_F32, K, M, M2);
    std::mt19937 rng(K * 31 + N * 7 + M);
    std::normal_distribution<float> nd(0.0f, 1.0f);
    for (int64_t i = 0; i < ggml_nelements(w); i++) ((ggml_fp16_t *) w->data)[i] = ggml_fp32_to_fp16(nd(rng) * 0.05f);
    for (int64_t i = 0; i < ggml_nelements(x); i++) ((float *) x->data)[i] = nd(rng) * (i % 97 == 0 ? 30.0f : 1.0f);
    ggml_tensor * y = ggml_mul_mat(ctx, w, x);
    ggml_cgraph * gf = ggml_new_graph(ctx);
    ggml_build_forward_expand(gf, y);
    ggml_backend_t be = ggml_backend_cpu_init();
    ggml_backend_cpu_set_n_threads(be, threads);
    ggml_backend_cpu_set_use_ref(be, ref);
    ggml_backend_graph_compute(be, gf);
    if (ms) {
        const auto t0 = std::chrono::steady_clock::now();
        for (int r = 0; r < reps; r++) ggml_backend_graph_compute(be, gf);
        *ms = std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - t0).count() / reps;
    }
    std::vector<float> res((float *) y->data, (float *) y->data + ggml_nelements(y));
    ggml_backend_free(be);
    ggml_free(ctx);
    return res;
}

static void check(int K, int N, int M, int M2, int threads) {
    const auto got = run(K, N, M, M2, threads, false, nullptr, 0);
    const auto want = run(K, N, M, M2, threads, true, nullptr, 0);
    double se = 0, sw = 0, err = 0, norm = 0;
    for (size_t i = 0; i < got.size(); i++) {
        if (!std::isfinite(got[i])) { err = INFINITY; break; }
        err = std::max(err, (double) std::fabs(got[i] - want[i]));
        norm = std::max(norm, (double) std::fabs(want[i]));
        se += (double) (got[i] - want[i]) * (got[i] - want[i]);
        sw += (double) want[i] * want[i];
    }
    const double nmse = sw > 0 ? se / sw : se;
    // the same 32-bit products, summed in another order
    const bool ok = std::isfinite(err) && err <= 1e-4 * std::max(1.0, norm) && nmse <= 1e-10;
    if (!ok) g_fail++;
    std::printf("  %s K=%d rows %d columns %dx%d, %d threads: max error %.2e (largest %.2f), mean %.1e\n",
                ok ? "ok  " : "FAIL", K, N, M, M2, threads, err, norm, nmse);
}

int main(int argc, char ** argv) {
    const bool check_only = argc > 1 && std::string(argv[1]) == "--check";
    std::printf("== F16 weights against many columns, against the reference\n");
    check(4304, 1152, 77, 1, 4);
    check(1152, 4304, 64, 1, 4);
    check(13, 7, 9, 1, 2);
    check(4, 4, 8, 1, 1);
    check(72, 5, 33, 1, 3);
    check(4304, 12, 8, 1, 4);
    check(300, 70, 130, 1, 4);
    check(257, 66, 20, 3, 4);
    check(512, 3, 40, 1, 2);   // fewer rows than a group: ggml's path
    check(512, 64, 5, 1, 2);   // fewer columns than 8: ggml's path
    if (!check_only) {
        const int threads = std::max(1, std::atoi(std::getenv("BENCH_THREADS") ? std::getenv("BENCH_THREADS") : "4"));
        double ms = 0, ms0 = 0;
        run(4304, 1152, 1024, 1, threads, false, &ms, 3);
        setenv("OA_F16_GEMM", "0", 1);
        run(4304, 1152, 1024, 1, threads, false, &ms0, 3);
        unsetenv("OA_F16_GEMM");
        std::printf("SPEED: F16 ffn_down (4304 x 1152) for 1024 patches, %d threads: blocked %.1f ms, ggml's own %.1f ms (%.2fx)\n",
                    threads, ms, ms0, ms0 / ms);
    }
    std::printf("\n%s (%d failures)\n", g_fail ? "FAILED" : "ALL PASSED", g_fail);
    return g_fail ? 1 : 0;
}
