// Checks the ARM NEON Q1_0/Q2_0 dot products in third_party/patches/q1q2-neon.inc against plain C.
// On ARM it compiles them with the real intrinsics; elsewhere with SIMDe's portable NEON
// (https://github.com/simd-everywhere/simde, path in SIMDE_DIR), so the logic can be checked on
// any computer. Also times them against upstream's plain version when run on ARM.
//
//   cc -O2 -std=c11 [-I$SIMDE_DIR] -I third_party/llama.cpp/ggml/src tools/host-test/test_kernels.c -lm
#define _POSIX_C_SOURCE 199309L
#include <math.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

#if defined(__aarch64__)
#include <arm_neon.h>
#if !defined(__ARM_FEATURE_DOTPROD)
static inline int32x4_t ggml_vdotq_s32(int32x4_t acc, int8x16_t a, int8x16_t b) {
    const int16x8_t p0 = vmull_s8(vget_low_s8(a), vget_low_s8(b));
    const int16x8_t p1 = vmull_s8(vget_high_s8(a), vget_high_s8(b));
    return vaddq_s32(acc, vaddq_s32(vpaddlq_s16(p0), vpaddlq_s16(p1)));
}
#else
#define ggml_vdotq_s32(a, b, c) vdotq_s32(a, b, c)
#endif
#else
#define SIMDE_ENABLE_NATIVE_ALIASES
#include <simde/arm/neon.h>
#define ggml_vdotq_s32(a, b, c) vdotq_s32(a, b, c)
#define __ARM_FEATURE_MATMUL_INT8 1  // SIMDe has vmmlaq_s32: check the 4x4 kernels too
#endif
#define ggml_vqtbl1q_u8 vqtbl1q_u8
#define GGML_RESTRICT restrict

#define GGML_COMMON_DECL_C
#include "ggml-common.h"

static float h2f(uint16_t h) {
    const uint32_t sign = (uint32_t) (h & 0x8000) << 16;
    const uint32_t exp = (h >> 10) & 0x1f;
    const uint32_t man = h & 0x3ff;
    uint32_t f;
    if (exp == 0) {
        if (man == 0) {
            f = sign;
        } else {
            float v = (float) man / 1024.0f / 16384.0f;
            memcpy(&f, &v, 4);
            f |= sign;
        }
    } else if (exp == 31) {
        f = sign | 0x7f800000 | (man << 13);
    } else {
        f = sign | ((exp + 112) << 23) | (man << 13);
    }
    float out;
    memcpy(&out, &f, 4);
    return out;
}
static uint16_t f2h(float v) {  // normal range only, truncating: enough for test data
    uint32_t f;
    memcpy(&f, &v, 4);
    const uint32_t sign = (f >> 16) & 0x8000;
    const int32_t exp = (int32_t) ((f >> 23) & 0xff) - 127 + 15;
    if (exp <= 0) return (uint16_t) sign;
    return (uint16_t) (sign | ((uint32_t) exp << 10) | ((f >> 13) & 0x3ff));
}
#define GGML_CPU_FP16_TO_FP32(x) h2f(x)

#include "../../third_party/patches/q1q2-neon.inc"

// ---------------------------------------------------------------- references

static double ref_q1(int n, const block_q1_0 * x, const block_q8_0 * y) {
    double s = 0;
    for (int i = 0; i < n / QK1_0; i++) {
        const double dx = h2f(x[i].d);
        for (int j = 0; j < QK1_0; j++) {
            const int bit = (x[i].qs[j / 8] >> (j % 8)) & 1;
            const block_q8_0 * yb = &y[(i * QK1_0 + j) / 32];
            s += (bit ? dx : -dx) * h2f(yb->d) * yb->qs[j % 32];
        }
    }
    return s;
}
static double ref_q2(int n, const block_q2_0 * x, const block_q8_0 * y) {
    double s = 0;
    for (int i = 0; i < n / QK2_0; i++) {
        const double dx = h2f(x[i].d);
        for (int j = 0; j < QK2_0; j++) {
            const int q = ((x[i].qs[j / 4] >> (2 * (j % 4))) & 3) - 1;
            const block_q8_0 * yb = &y[(i * QK2_0 + j) / 32];
            s += q * dx * h2f(yb->d) * yb->qs[j % 32];
        }
    }
    return s;
}

#if defined(__aarch64__)
// upstream's NEON version (ggml/src/ggml-cpu/arch/arm/quants.c before this patch), for timing
#define B1(c,s,n)  0x ## n ## c ,  0x ## n ## s
#define B2(c,s,n) B1(c,s,n ## c), B1(c,s,n ## s)
#define B3(c,s,n) B2(c,s,n ## c), B2(c,s,n ## s)
#define B4(c,s,n) B3(c,s,n ## c), B3(c,s,n ## s)
#define B5(c,s,n) B4(c,s,n ## c), B4(c,s,n ## s)
#define B6(c,s,n) B5(c,s,n ## c), B5(c,s,n ## s)
#define B7(c,s,n) B6(c,s,n ## c), B6(c,s,n ## s)
#define B8(c,s  ) B7(c,s,     c), B7(c,s,     s)
static const uint64_t table_b2b_0[1 << 8] = { B8(00, 10) };
static float upstream_q1(int n, const block_q1_0 * x, const block_q8_0 * y) {
    const int nb = n / QK1_0;
    float32x4_t sumv = vdupq_n_f32(0.0f);
    for (int i = 0; i < nb; i++) {
        const float d0 = h2f(x[i].d);
        for (int k = 0; k < 4; k++) {
            const block_q8_0 * yb = &y[i * 4 + k];
            const float d1 = h2f(yb->d);
            const uint8_t * bits = &x[i].qs[k * 4];
            const int8x16_t y0 = vld1q_s8(yb->qs);
            const int8x16_t y1 = vld1q_s8(yb->qs + 16);
            int8x8_t s0 = vreinterpret_s8_u8(vshr_n_u8(vcreate_u8(table_b2b_0[bits[0]]), 4));
            int8x8_t s1 = vreinterpret_s8_u8(vshr_n_u8(vcreate_u8(table_b2b_0[bits[1]]), 4));
            int8x8_t s2 = vreinterpret_s8_u8(vshr_n_u8(vcreate_u8(table_b2b_0[bits[2]]), 4));
            int8x8_t s3 = vreinterpret_s8_u8(vshr_n_u8(vcreate_u8(table_b2b_0[bits[3]]), 4));
            const int8x8_t one = vdup_n_s8(1);
            s0 = vsub_s8(vadd_s8(s0, s0), one);
            s1 = vsub_s8(vadd_s8(s1, s1), one);
            s2 = vsub_s8(vadd_s8(s2, s2), one);
            s3 = vsub_s8(vadd_s8(s3, s3), one);
            const int32x4_t p0 = ggml_vdotq_s32(vdupq_n_s32(0), vcombine_s8(s0, s1), y0);
            const int32x4_t p1 = ggml_vdotq_s32(p0, vcombine_s8(s2, s3), y1);
            sumv = vmlaq_n_f32(sumv, vcvtq_f32_s32(p1), d0 * d1);
        }
    }
    return vaddvq_f32(sumv);
}
#endif


static uint32_t rng = 12345;
static uint32_t rnd(void) {
    rng ^= rng << 13;
    rng ^= rng >> 17;
    rng ^= rng << 5;
    return rng;
}
static float rndf(float lo, float hi) { return lo + (hi - lo) * (float) (rnd() & 0xffffff) / (float) 0xffffff; }

static void fill_y(block_q8_0 * y, int nb) {
    for (int i = 0; i < nb; i++) {
        y[i].d = f2h(rndf(0.001f, 0.05f));
        for (int j = 0; j < 32; j++) y[i].qs[j] = (int8_t) ((int) (rnd() % 255) - 127);
    }
}

static int failures = 0;
static void check(const char * what, double got, double want) {
    const double tol = 1e-4 * (fabs(want) + 1.0);
    if (fabs(got - want) > tol) {
        printf("  FAIL %s: got %.6f, want %.6f\n", what, got, want);
        failures++;
    }
}

static double now_s(void) {
    struct timespec t;
    clock_gettime(CLOCK_MONOTONIC, &t);
    return t.tv_sec + t.tv_nsec * 1e-9;
}

int main(void) {
    // Q1_0 needs multiples of 128, Q2_0 of 64; 192 gives Q2_0 an odd number of blocks, 640 Q1_0
    const int sizes[] = {128, 192, 384, 640, 5120, 17408};
    for (size_t si = 0; si < sizeof sizes / sizeof sizes[0]; si++) {
        const int n = sizes[si];
        const int q1 = n % QK1_0 == 0;  // Q1_0 checks only for whole blocks
        // two rows of weights, two columns of tokens
        block_q1_0 * x1 = malloc(sizeof(block_q1_0) * (n / QK1_0) * 4);
        block_q2_0 * x2 = malloc(sizeof(block_q2_0) * (n / QK2_0) * 4);
        block_q8_0 * y = malloc(sizeof(block_q8_0) * (n / 32) * 4);
        for (int i = 0; i < (n / QK1_0) * 4; i++) {
            x1[i].d = f2h(rndf(0.002f, 0.03f));
            for (int j = 0; j < QK1_0 / 8; j++) x1[i].qs[j] = (uint8_t) rnd();
        }
        for (int i = 0; i < (n / QK2_0) * 4; i++) {
            x2[i].d = f2h(rndf(0.002f, 0.03f));
            for (int j = 0; j < QK2_0 / 4; j++) x2[i].qs[j] = (uint8_t) rnd();
        }
        fill_y(y, (n / 32) * 4);
        const block_q1_0 * x1r[2] = {x1, x1 + n / QK1_0};
        const block_q2_0 * x2r[2] = {x2, x2 + n / QK2_0};
        const block_q8_0 * yc[2] = {y, y + n / 32};
        char what[64];

        for (int r = 0; r < 2; r++) {
            for (int c = 0; c < 2; c++) {
                float s = 0;
                if (q1) {
                    oa_vec_dot_q1_0_q8_0(n, &s, 0, x1r[r], 0, yc[c], 0, 1);
                    snprintf(what, sizeof what, "q1 n=%d row %d col %d", n, r, c);
                    check(what, s, ref_q1(n, x1r[r], yc[c]));
                }
                oa_vec_dot_q2_0_q8_0(n, &s, 0, x2r[r], 0, yc[c], 0, 1);
                snprintf(what, sizeof what, "q2 n=%d row %d col %d", n, r, c);
                check(what, s, ref_q2(n, x2r[r], yc[c]));
            }
        }
        float out[32];
        memset(out, 0, sizeof out);
        if (q1) oa_vec_dot_q1_0_q8_0(n, out, 16, x1, sizeof(block_q1_0) * (n / QK1_0), y, sizeof(block_q8_0) * (n / 32), 2);
        if (q1) for (int r = 0; r < 2; r++) for (int c = 0; c < 2; c++) {
            snprintf(what, sizeof what, "q1 2x2 n=%d row %d col %d", n, r, c);
            check(what, out[c * 16 + r], ref_q1(n, x1r[r], yc[c]));
        }
        memset(out, 0, sizeof out);
        oa_vec_dot_q2_0_q8_0(n, out, 16, x2, sizeof(block_q2_0) * (n / QK2_0), y, sizeof(block_q8_0) * (n / 32), 2);
        for (int r = 0; r < 2; r++) for (int c = 0; c < 2; c++) {
            snprintf(what, sizeof what, "q2 2x2 n=%d row %d col %d", n, r, c);
            check(what, out[c * 16 + r], ref_q2(n, x2r[r], yc[c]));
        }
        {
            float o4[4];
            if (q1) oa_vec_dot_q1_0_q8_0(n, o4, 1, x1, sizeof(block_q1_0) * (n / QK1_0), y, 0, OA_NRC_ROWS4);
            if (q1) for (int r = 0; r < 4; r++) {
                snprintf(what, sizeof what, "q1 4 rows n=%d row %d", n, r);
                check(what, o4[r], ref_q1(n, x1 + r * (n / QK1_0), y));
            }
            oa_vec_dot_q2_0_q8_0(n, o4, 1, x2, sizeof(block_q2_0) * (n / QK2_0), y, 0, OA_NRC_ROWS4);
            for (int r = 0; r < 4; r++) {
                snprintf(what, sizeof what, "q2 4 rows n=%d row %d", n, r);
                check(what, o4[r], ref_q2(n, x2 + r * (n / QK2_0), y));
            }
        }
#if defined(__ARM_FEATURE_MATMUL_INT8)
        {
            float out4[64];
            memset(out4, 0, sizeof out4);
            if (q1) oa_vec_dot_q1_0_q8_0(n, out4, 16, x1, sizeof(block_q1_0) * (n / QK1_0), y, sizeof(block_q8_0) * (n / 32), 4);
            if (q1) for (int r = 0; r < 4; r++) for (int c = 0; c < 4; c++) {
                snprintf(what, sizeof what, "q1 4x4 n=%d row %d col %d", n, r, c);
                check(what, out4[c * 16 + r], ref_q1(n, x1 + r * (n / QK1_0), y + c * (n / 32)));
            }
            memset(out4, 0, sizeof out4);
            oa_vec_dot_q2_0_q8_0(n, out4, 16, x2, sizeof(block_q2_0) * (n / QK2_0), y, sizeof(block_q8_0) * (n / 32), 4);
            for (int r = 0; r < 4; r++) for (int c = 0; c < 4; c++) {
                snprintf(what, sizeof what, "q2 4x4 n=%d row %d col %d", n, r, c);
                check(what, out4[c * 16 + r], ref_q2(n, x2 + r * (n / QK2_0), y + c * (n / 32)));
            }
            if (n == 5120) printf("checked the 4x4 (i8mm) kernels\n");
        }
#endif

#if defined(__aarch64__)
        if (n == 5120 || n == 17408) {
            const int reps = n == 5120 ? 20000 : 6000;
            volatile float sink = 0;
            double t0 = now_s();
            for (int k = 0; k < reps; k++) sink += upstream_q1(n, x1, y);
            const double t_up = (now_s() - t0) / reps;
            t0 = now_s();
            for (int k = 0; k < reps; k++) {
                float sv;
                oa_vec_dot_q1_0_q8_0(n, &sv, 0, x1, 0, y, 0, 1);
                sink += sv;
            }
            const double t_new = (now_s() - t0) / reps;
            t0 = now_s();
            for (int k = 0; k < reps / 4; k++) {
                float o4[4];
                oa_vec_dot_q1_0_q8_0(n, o4, 1, x1, sizeof(block_q1_0) * (n / QK1_0), y, 0, OA_NRC_ROWS4);
                sink += o4[0];
            }
            const double t_rows4 = (now_s() - t0) / reps;  // reps/4 calls of 4 dots
            t0 = now_s();
            for (int k = 0; k < reps / 4; k++) {
                oa_vec_dot_q1_0_q8_0(n, out, 16, x1, sizeof(block_q1_0) * (n / QK1_0), y, sizeof(block_q8_0) * (n / 32), 2);
                sink += out[0];
            }
            const double t_2x2 = (now_s() - t0) / reps;  // reps/4 calls of 4 dots
            double t_4x4 = 0;
#if defined(__ARM_FEATURE_MATMUL_INT8)
            {
                float out4[64];
                t0 = now_s();
                for (int k = 0; k < reps / 16; k++) {
                    oa_vec_dot_q1_0_q8_0(n, out4, 16, x1, sizeof(block_q1_0) * (n / QK1_0), y, sizeof(block_q8_0) * (n / 32), 4);
                    sink += out4[0];
                }
                t_4x4 = (now_s() - t0) / reps;  // reps/16 calls of 16 dots
            }
#endif
            printf("SPEED: q1_0 dot of %d weights on one core, ns per dot: upstream NEON %.0f; new: one row %.0f (%.2fx), "
                   "4 rows %.0f (%.2fx), 2x2 %.0f, 4x4 %.0f (%.2fx)\n", n, t_up * 1e9, t_new * 1e9, t_up / t_new,
                   t_rows4 * 1e9, t_up / t_rows4, t_2x2 * 1e9, t_4x4 * 1e9, t_4x4 > 0 ? t_up / t_4x4 : 0.0);
            (void) sink;
        }
#endif
        free(x1);
        free(x2);
        free(y);
    }
    printf("%s (%d failures)\n", failures ? "FAILED" : "ALL PASSED", failures);
    return failures ? 1 : 0;
}
