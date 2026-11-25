// Offline AI: F16 weights against many F32 columns (a picture's patches, a prompt) on ARM, as a
// blocked matrix product.
//
// b12670 multiplies F16 weights by F32 activations one weight row and one column at a time
// (ggml_vec_dot_f16_f32): every row is converted again for every column, and each load feeds a
// single multiply-add. llamafile's tinyBLAS, which blocks it, is left out of the builds with int8
// matrix multiply or SVE (every recent phone). Vision towers keep F16 weights where a row's
// length is not a multiple of 32, which Q8_0 cannot hold (Qwen3.5's ffn_down rows are 4304
// long), and on "Detailed" those matmuls were three quarters of a picture's time for the 9B
// Qwen3.5 models. Here 4 weight rows meet 4 columns at a time (16 accumulators: each load feeds 4
// multiply-adds), over K in slices of 256 so a block of 64 rows and 64 columns stays in the
// cache. The products and sums are 32-bit, as ggml's.
//
// Included from ggml-cpu.c (0006); OA_F16_GEMM=0 turns it off for comparisons. C.

#if defined(__ARM_NEON) && defined(__aarch64__)
#include <arm_neon.h>

#define OA_G_R 64   // weight rows per unit of work
#define OA_G_C 64   // columns per unit of work
#define OA_G_K 256  // K slice

// out[i][j] = sum over k < K of w[i][k] * x[j][k]
static inline void oa_g_tile4x4(int64_t K, const ggml_fp16_t * const w[4], const float * const x[4], float out[4][4]) {
    float32x4_t a00 = vdupq_n_f32(0.0f), a01 = a00, a02 = a00, a03 = a00;
    float32x4_t a10 = a00, a11 = a00, a12 = a00, a13 = a00;
    float32x4_t a20 = a00, a21 = a00, a22 = a00, a23 = a00;
    float32x4_t a30 = a00, a31 = a00, a32 = a00, a33 = a00;
    int64_t k = 0;
    for (; k + 4 <= K; k += 4) {
        const float32x4_t w0 = vcvt_f32_f16(vld1_f16((const __fp16 *) (w[0] + k)));
        const float32x4_t w1 = vcvt_f32_f16(vld1_f16((const __fp16 *) (w[1] + k)));
        const float32x4_t w2 = vcvt_f32_f16(vld1_f16((const __fp16 *) (w[2] + k)));
        const float32x4_t w3 = vcvt_f32_f16(vld1_f16((const __fp16 *) (w[3] + k)));
        const float32x4_t x0 = vld1q_f32(x[0] + k);
        const float32x4_t x1 = vld1q_f32(x[1] + k);
        const float32x4_t x2 = vld1q_f32(x[2] + k);
        const float32x4_t x3 = vld1q_f32(x[3] + k);
        a00 = vfmaq_f32(a00, w0, x0); a01 = vfmaq_f32(a01, w0, x1); a02 = vfmaq_f32(a02, w0, x2); a03 = vfmaq_f32(a03, w0, x3);
        a10 = vfmaq_f32(a10, w1, x0); a11 = vfmaq_f32(a11, w1, x1); a12 = vfmaq_f32(a12, w1, x2); a13 = vfmaq_f32(a13, w1, x3);
        a20 = vfmaq_f32(a20, w2, x0); a21 = vfmaq_f32(a21, w2, x1); a22 = vfmaq_f32(a22, w2, x2); a23 = vfmaq_f32(a23, w2, x3);
        a30 = vfmaq_f32(a30, w3, x0); a31 = vfmaq_f32(a31, w3, x1); a32 = vfmaq_f32(a32, w3, x2); a33 = vfmaq_f32(a33, w3, x3);
    }
    out[0][0] = vaddvq_f32(a00); out[0][1] = vaddvq_f32(a01); out[0][2] = vaddvq_f32(a02); out[0][3] = vaddvq_f32(a03);
    out[1][0] = vaddvq_f32(a10); out[1][1] = vaddvq_f32(a11); out[1][2] = vaddvq_f32(a12); out[1][3] = vaddvq_f32(a13);
    out[2][0] = vaddvq_f32(a20); out[2][1] = vaddvq_f32(a21); out[2][2] = vaddvq_f32(a22); out[2][3] = vaddvq_f32(a23);
    out[3][0] = vaddvq_f32(a30); out[3][1] = vaddvq_f32(a31); out[3][2] = vaddvq_f32(a32); out[3][3] = vaddvq_f32(a33);
    for (; k < K; k++) {
        for (int i = 0; i < 4; i++) {
            const float wv = GGML_CPU_FP16_TO_FP32(w[i][k]);
            for (int j = 0; j < 4; j++) {
                out[i][j] += wv * x[j][k];
            }
        }
    }
}

static bool oa_f16_gemm(const struct ggml_compute_params * params, struct ggml_tensor * dst) {
    const struct ggml_tensor * src0 = dst->src[0];
    const struct ggml_tensor * src1 = dst->src[1];
    if (src0->type != GGML_TYPE_F16 || src1->type != GGML_TYPE_F32 || dst->type != GGML_TYPE_F32) {
        return false;
    }
    if (src0->ne[2] != 1 || src0->ne[3] != 1 || !ggml_is_contiguous(src0) || !ggml_is_contiguous(src1) ||
        !ggml_is_contiguous(dst) || src0->ne[0] != src1->ne[0]) {
        return false;
    }
    const int64_t K = src0->ne[0];
    const int64_t N = src0->ne[1];                                // weight rows: dst row length
    const int64_t M = src1->ne[1] * src1->ne[2] * src1->ne[3];   // columns
    if (M < 8 || N < 4 || dst->ne[0] != N || dst->ne[1] * dst->ne[2] * dst->ne[3] != M) {
        return false;  // writing a token (one column) stays on ggml's path
    }
    const char * e = getenv("OA_F16_GEMM");
    if (e != NULL && strcmp(e, "0") == 0) {
        return false;
    }

    const int ith = params->ith;
    const int nth = params->nth;
    const int64_t nrb = (N + OA_G_R - 1) / OA_G_R;
    const int64_t ncb = (M + OA_G_C - 1) / OA_G_C;
    const int64_t n_units = nrb * ncb;
    const ggml_fp16_t * W = (const ggml_fp16_t *) src0->data;
    const float * X = (const float *) src1->data;
    float * D = (float *) dst->data;

    if (ith == 0) {
        ggml_threadpool_chunk_set(params->threadpool, nth);
    }
    ggml_barrier(params->threadpool);

    for (int64_t u = ith; u < n_units; u = ggml_threadpool_chunk_add(params->threadpool, 1)) {
        const int64_t r0 = (u % nrb) * OA_G_R;
        const int64_t c0 = (u / nrb) * OA_G_C;
        const int64_t r1 = MIN(N, r0 + OA_G_R);
        const int64_t c1 = MIN(M, c0 + OA_G_C);
        for (int64_t c = c0; c < c1; c++) {
            memset(D + c * N + r0, 0, sizeof(float) * (size_t) (r1 - r0));
        }
        for (int64_t k0 = 0; k0 < K; k0 += OA_G_K) {
            const int64_t kk = MIN(OA_G_K, K - k0);
            for (int64_t r = r0; r < r1; r += 4) {
                const int nr = (int) MIN(4, r1 - r);
                // a short last group repeats its last row; only the real ones are kept
                const ggml_fp16_t * w[4];
                for (int i = 0; i < 4; i++) {
                    w[i] = W + MIN(r + i, r1 - 1) * K + k0;
                }
                for (int64_t c = c0; c < c1; c += 4) {
                    const int nc = (int) MIN(4, c1 - c);
                    const float * x[4];
                    for (int j = 0; j < 4; j++) {
                        x[j] = X + MIN(c + j, c1 - 1) * K + k0;
                    }
                    float out[4][4];
                    oa_g_tile4x4(kk, w, x, out);
                    for (int j = 0; j < nc; j++) {
                        float * d = D + (c + j) * N + r;
                        for (int i = 0; i < nr; i++) {
                            d[i] += out[i][j];
                        }
                    }
                }
            }
        }
    }
    return true;
}

#else

static bool oa_f16_gemm(const struct ggml_compute_params * params, struct ggml_tensor * dst) {
    (void) params;
    (void) dst;
    return false;
}

#endif
