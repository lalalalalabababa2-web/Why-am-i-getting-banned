// Checks ggml's mul_mat for Q1_0/Q2_0 weights, as patched by third_party/patches (rows four at a
// time, 2x2 and 4x4 kernels, split row streams), against a plain double-precision reference, for
// odd and even shapes and thread counts. Built for ARM (in CI, or here under qemu-aarch64):
//   tools/host-test/q1q2_mulmat.sh
#include "ggml.h"
#include "ggml-cpu.h"
#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static double worst = 0;

static float frand(unsigned * s) { *s = *s * 1664525u + 1013904223u; return ((*s >> 8) / 16777216.0f) * 2.0f - 1.0f; }

static int run(enum ggml_type type, int K, int M, int N, int nth) {
    struct ggml_init_params ip = { (size_t) 64 * 1024 * 1024, NULL, false };
    struct ggml_context * ctx = ggml_init(ip);
    struct ggml_tensor * a = ggml_new_tensor_2d(ctx, type, K, M);
    struct ggml_tensor * b = ggml_new_tensor_2d(ctx, GGML_TYPE_F32, K, N);
    unsigned seed = 1234u + (unsigned) (K * 7 + M * 13 + N * 17 + type);
    float * af = malloc(sizeof(float) * K * M);
    for (int i = 0; i < K * M; i++) af[i] = frand(&seed);
    ggml_quantize_chunk(type, af, a->data, 0, M, K, NULL);
    for (int i = 0; i < K * N; i++) ((float *) b->data)[i] = frand(&seed);
    struct ggml_tensor * c = ggml_mul_mat(ctx, a, b);
    struct ggml_cgraph * gf = ggml_new_graph(ctx);
    ggml_build_forward_expand(gf, c);
    ggml_graph_compute_with_ctx(ctx, gf, nth);

    // reference: the weights as stored, the activations rounded to Q8_0 as the kernels see them
    const struct ggml_type_traits * ta = ggml_get_type_traits(type);
    const struct ggml_type_traits * t8 = ggml_get_type_traits(GGML_TYPE_Q8_0);
    float * aq = malloc(sizeof(float) * K);
    float * bq = malloc(sizeof(float) * K);
    void * b8 = malloc(ggml_row_size(GGML_TYPE_Q8_0, K));
    double err = 0, ref2 = 0;
    for (int j = 0; j < N; j++) {
        ggml_quantize_chunk(GGML_TYPE_Q8_0, (float *) b->data + (size_t) j * K, b8, 0, 1, K, NULL);
        t8->to_float(b8, bq, K);
        for (int i = 0; i < M; i++) {
            ta->to_float((const char *) a->data + (size_t) i * a->nb[1], aq, K);
            double r = 0;
            for (int k = 0; k < K; k++) r += (double) aq[k] * bq[k];
            const double got = ((float *) c->data)[(size_t) j * M + i];
            err += (got - r) * (got - r);
            ref2 += r * r;
        }
    }
    const double nmse = err / (ref2 > 0 ? ref2 : 1);
    // float sums against a double reference stay far below this; a wrong row or column is ~1
    const int ok = nmse < 1e-6;
    if (nmse > worst) worst = nmse;
    if (!ok) printf("FAIL %s K=%d M=%d N=%d threads=%d nmse=%.3g\n", ggml_type_name(type), K, M, N, nth, nmse);
    free(af); free(aq); free(bq); free(b8);
    ggml_free(ctx);
    return ok;
}

int main(void) {
    const enum ggml_type types[] = { GGML_TYPE_Q1_0, GGML_TYPE_Q2_0 };
    const int Ms[] = { 4, 6, 64, 100, 258, 1024 };
    const int Ns[] = { 1, 2, 3, 4, 5, 8, 12, 16, 33 };
    const int ths[] = { 1, 3, 4 };
    int n = 0, failed = 0;
    for (int t = 0; t < 2; t++)
        for (unsigned m = 0; m < sizeof Ms / sizeof *Ms; m++)
            for (unsigned c = 0; c < sizeof Ns / sizeof *Ns; c++)
                for (unsigned h = 0; h < sizeof ths / sizeof *ths; h++) {
                    n++;
                    if (!run(types[t], 1024, Ms[m], Ns[c], ths[h])) failed++;
                }
    printf("%d of %d mul_mat shapes match the reference (worst nmse %.2g)\n", n - failed, n, worst);
    return failed ? 1 : 0;
}
