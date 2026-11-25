// Offline AI: flash attention over many queries at once (a picture's patches) with 8-bit scores,
// on ARM.
//
// A picture read on "Detailed" is 4096 patches attending to each other in every layer of the
// vision tower: on a phone that attention was most of the time a picture took. ggml's tiled path
// makes the scores (Q times K) and the weighted sums (P times V) as 32-bit float matrix products.
// Here:
//   - Q and K rows are 8-bit with a scale per row, and the scores come from the int8 dot-product
//     instructions: SMMLA (int8 matrix multiply, 32 multiply-adds an instruction) where the CPU
//     has it, SDOT (16) otherwise, against 4 for a 32-bit FMA. K is centred first (its mean over
//     the keys taken out): that shifts every score of a query by the same amount, which the
//     softmax ignores, and leaves the 8 bits for what tells the keys apart. Then each channel d
//     of K is multiplied by s_d and the same channel of Q divided by it, s_d = sqrt(max|Q_d| /
//     max|K_d|) over the head (SmoothQuant's balance): the products are unchanged, and a channel
//     much larger in one of them than in the other no longer takes most of that row's 8 bits.
//     This is about the precision of the 8-bit (Q8_0) projector files, whose matrix products
//     take 8-bit inputs as well.
//   - the softmax is in 32 bits, base 2 (the scale and log2(e) folded into the score's scale);
//   - P times V is summed in 16 bits over 32 keys at a time and added to 32-bit totals (weights
//     are at most 1; a head whose V could overflow 16 bits there is summed in 32 bits instead).
//
// Only for the attention ops mtmd names "oa_fa8" (0004-mtmd-cpu-repack.patch): Q in F32, K and V
// in F16, an optional F16 mask, no sinks, soft-capping or ALiBi, at least 64 queries. Included
// from ggml-cpu/ops.cpp after fa-decode.inc (0003); OA_FA8=0 turns it off for comparisons,
// OA_FA8_SMOOTH=0 the channel balance and OA_FA8_V32=1 the 16-bit V sums.

#include "fa-prefill-size.h"

#if defined(OA_FA_NEON) && (defined(__ARM_FEATURE_DOTPROD) || defined(__ARM_FEATURE_MATMUL_INT8))
#define OA_FA8 1
#if defined(__ARM_FEATURE_MATMUL_INT8)
#define OA_FA8_MMLA 1
#endif
#endif

#if defined(OA_FA8)

static constexpr int     OA8_QB = OA_FA8_QB;
static constexpr int     OA8_KB = OA_FA8_KB;
static constexpr int64_t OA8_RU = 64;   // query rows per unit of work
static constexpr int     OA8_PV = 32;   // keys per 16-bit V sum

// Where 8 bytes (chunk c, dims 8c..8c+7) of row r of an 8-bit matrix go. With SMMLA rows are
// paired, chunk by chunk ([r0 c0][r1 c0][r0 c1][r1 c1]...): one 16-byte load is the 2x8 operand.
// With SDOT each row is contiguous.
static inline int8_t * oa8_at(int8_t * base, int64_t r, int64_t c, int64_t dkp) {
#if defined(OA_FA8_MMLA)
    return base + (((r >> 1) * (dkp / 8) + c) * 2 + (r & 1)) * 8;
#else
    return base + r * dkp + c * 8;
#endif
}

// x[0..n) in 8 bits with one scale (returned) into row r; zeros up to dkp
static inline float oa8_quant_row(const float * x, int64_t n, int64_t dkp, int8_t * base, int64_t r) {
    float32x4_t mx = vdupq_n_f32(0.0f);
    int64_t i = 0;
    for (; i + 4 <= n; i += 4) {
        mx = vmaxq_f32(mx, vabsq_f32(vld1q_f32(x + i)));
    }
    float amax = vmaxvq_f32(mx);
    for (; i < n; i++) {
        amax = std::max(amax, std::fabs(x[i]));
    }
    const float inv = amax > 0.0f ? 127.0f / amax : 0.0f;
    const float32x4_t vi = vdupq_n_f32(inv);
    for (int64_t c = 0; c < dkp / 8; c++) {
        int8_t * out = oa8_at(base, r, c, dkp);
        const int64_t d = c * 8;
        if (d + 8 <= n) {
            const int32x4_t a = vcvtnq_s32_f32(vmulq_f32(vld1q_f32(x + d), vi));
            const int32x4_t b = vcvtnq_s32_f32(vmulq_f32(vld1q_f32(x + d + 4), vi));
            const int16x8_t h = vcombine_s16(vqmovn_s32(a), vqmovn_s32(b));
            vst1_s8(out, vqmovn_s16(h));
        } else {
            for (int t = 0; t < 8; t++) {
                out[t] = d + t < n ? (int8_t) std::lrintf(x[d + t] * inv) : 0;
            }
        }
    }
    return amax / 127.0f;
}

// K of one head: its mean over the keys taken out, each row in 8 bits with its scale; rows past
// the last key are zero. Also the largest |V| of the head (whether 16-bit V sums are safe).
static void oa8_prep_head(const ggml_tensor * q, const ggml_tensor * k, const ggml_tensor * v, int64_t ik2, int64_t ik3, int64_t nk,
                          const oa_fa8_layout & L, char * ws, float * vmax_out) {
    const int64_t DK = k->ne[0];
    const int64_t DV = v->ne[0];
    int8_t * K8   = (int8_t *) (ws + L.k8);
    float *  sk   = (float *) (ws + L.sk);
    float *  kbar = (float *) (ws + L.kbar);
    float *  cs   = (float *) (ws + L.cs);  // K's channel scales, then Q's (their inverses)
    float *  qs   = cs + L.dkp;
    for (int64_t d = 0; d < DK; d++) {
        kbar[d] = 0.0f;
    }
    const char * kb = (const char *) k->data + ik2 * k->nb[2] + ik3 * k->nb[3];
    for (int64_t j = 0; j < nk; j++) {
        const ggml_fp16_t * row = (const ggml_fp16_t *) (kb + j * k->nb[1]);
        int64_t d = 0;
        for (; d + 8 <= DK; d += 8) {
            const float16x8_t h = vld1q_f16((const __fp16 *) row + d);
            vst1q_f32(kbar + d, vaddq_f32(vld1q_f32(kbar + d), vcvt_f32_f16(vget_low_f16(h))));
            vst1q_f32(kbar + d + 4, vaddq_f32(vld1q_f32(kbar + d + 4), vcvt_high_f32_f16(h)));
        }
        for (; d < DK; d++) {
            kbar[d] += GGML_CPU_FP16_TO_FP32(row[d]);
        }
    }
    const float inv_n = 1.0f / (float) nk;
    for (int64_t d = 0; d < DK; d++) {
        kbar[d] *= inv_n;
    }
    // the largest |K - mean| and |Q| of each channel, over the head (and the query heads sharing it)
    float kmax[256], qmax[256];
    for (int64_t d = 0; d < DK; d++) {
        kmax[d] = 0.0f;
        qmax[d] = 0.0f;
    }
    for (int64_t j = 0; j < nk; j++) {
        const ggml_fp16_t * row = (const ggml_fp16_t *) (kb + j * k->nb[1]);
        for (int64_t d = 0; d < DK; d++) {
            kmax[d] = std::max(kmax[d], std::fabs(GGML_CPU_FP16_TO_FP32(row[d]) - kbar[d]));
        }
    }
    const int64_t rk2 = q->ne[2] / k->ne[2];
    const int64_t rk3 = q->ne[3] / k->ne[3];
    for (int64_t i3 = ik3 * rk3; i3 < (ik3 + 1) * rk3; i3++) {
        for (int64_t i2 = ik2 * rk2; i2 < (ik2 + 1) * rk2; i2++) {
            for (int64_t i1 = 0; i1 < q->ne[1]; i1++) {
                const float * qr = (const float *) ((const char *) q->data + i1 * q->nb[1] + i2 * q->nb[2] + i3 * q->nb[3]);
                for (int64_t d = 0; d < DK; d++) {
                    qmax[d] = std::max(qmax[d], std::fabs(qr[d]));
                }
            }
        }
    }
    const char * e = std::getenv("OA_FA8_SMOOTH");
    const bool smooth = !(e != nullptr && std::strcmp(e, "0") == 0);
    for (int64_t d = 0; d < DK; d++) {
        float s = 1.0f;
        if (smooth && kmax[d] > 0.0f && qmax[d] > 0.0f) {
            s = std::min(64.0f, std::max(1.0f / 64.0f, std::sqrt(qmax[d] / kmax[d])));
        }
        cs[d] = s;
        qs[d] = 1.0f / s;
    }
    float x[256];
    for (int64_t j = 0; j < nk; j++) {
        const ggml_fp16_t * row = (const ggml_fp16_t *) (kb + j * k->nb[1]);
        int64_t d = 0;
        for (; d + 8 <= DK; d += 8) {
            const float16x8_t h = vld1q_f16((const __fp16 *) row + d);
            vst1q_f32(x + d, vmulq_f32(vsubq_f32(vcvt_f32_f16(vget_low_f16(h)), vld1q_f32(kbar + d)), vld1q_f32(cs + d)));
            vst1q_f32(x + d + 4, vmulq_f32(vsubq_f32(vcvt_high_f32_f16(h), vld1q_f32(kbar + d + 4)), vld1q_f32(cs + d + 4)));
        }
        for (; d < DK; d++) {
            x[d] = (GGML_CPU_FP16_TO_FP32(row[d]) - kbar[d]) * cs[d];
        }
        sk[j] = oa8_quant_row(x, DK, L.dkp, K8, j);
    }
    for (int64_t j = nk; j < L.nkp; j++) {
        for (int64_t c = 0; c < L.dkp / 8; c++) {
            std::memset(oa8_at(K8, j, c, L.dkp), 0, 8);
        }
        sk[j] = 0.0f;
    }
    float vm = 0.0f;
#if defined(OA_FA_H16)
    const char * vb = (const char *) v->data + ik2 * v->nb[2] + ik3 * v->nb[3];
    for (int64_t j = 0; j < nk; j++) {
        const __fp16 * row = (const __fp16 *) (vb + j * v->nb[1]);
        float16x8_t m = vdupq_n_f16(0);
        for (int64_t d = 0; d < DV; d += 8) {
            m = vmaxq_f16(m, vabsq_f16(vld1q_f16(row + d)));
        }
        vm = std::max(vm, (float) vmaxvq_f16(m));
    }
#else
    (void) v;
    (void) DV;
#endif
    *vmax_out = vm;
}

// dots[i][j] = Q8 row i . K8 row (kb + j), 8 rows by 64 keys
static inline void oa8_dots(const int8_t * Q8, const int8_t * K8, int64_t kb, int64_t dkp, int32_t (*dots)[OA8_KB]) {
#if defined(OA_FA8_MMLA)
    const int64_t C = dkp / 8;
    for (int kg = 0; kg < OA8_KB; kg += 8) {
        int32x4_t acc[4][4];
        for (int a = 0; a < 4; a++) {
            for (int b = 0; b < 4; b++) {
                acc[a][b] = vdupq_n_s32(0);
            }
        }
        const int8_t * kp = K8 + ((kb + kg) >> 1) * C * 16;
        for (int64_t c = 0; c < C; c++) {
            int8x16_t qv[4], kv[4];
            for (int a = 0; a < 4; a++) {
                qv[a] = vld1q_s8(Q8 + (a * C + c) * 16);
                kv[a] = vld1q_s8(kp + (a * C + c) * 16);
            }
            for (int a = 0; a < 4; a++) {
                for (int b = 0; b < 4; b++) {
                    acc[a][b] = vmmlaq_s32(acc[a][b], qv[a], kv[b]);
                }
            }
        }
        for (int a = 0; a < 4; a++) {
            for (int b = 0; b < 4; b++) {
                vst1_s32(&dots[2 * a][kg + 2 * b], vget_low_s32(acc[a][b]));
                vst1_s32(&dots[2 * a + 1][kg + 2 * b], vget_high_s32(acc[a][b]));
            }
        }
    }
#else
    for (int rg = 0; rg < OA8_QB; rg += 4) {
        for (int kg = 0; kg < OA8_KB; kg += 4) {
            int32x4_t acc[4][4];
            for (int a = 0; a < 4; a++) {
                for (int b = 0; b < 4; b++) {
                    acc[a][b] = vdupq_n_s32(0);
                }
            }
            for (int64_t d = 0; d < dkp; d += 16) {
                int8x16_t qv[4], kv[4];
                for (int a = 0; a < 4; a++) {
                    qv[a] = vld1q_s8(Q8 + (rg + a) * dkp + d);
                    kv[a] = vld1q_s8(K8 + (kb + kg + a) * dkp + d);
                }
                for (int a = 0; a < 4; a++) {
                    for (int b = 0; b < 4; b++) {
                        acc[a][b] = vdotq_s32(acc[a][b], qv[a], kv[b]);
                    }
                }
            }
            for (int a = 0; a < 4; a++) {
                vst1q_s32(&dots[rg + a][kg], vpaddq_s32(vpaddq_s32(acc[a][0], acc[a][1]), vpaddq_s32(acc[a][2], acc[a][3])));
            }
        }
    }
#endif
}

// 2^x for x <= 0 (relative error about 1e-7; below 2^-125 it is not exactly zero, but tiny)
static inline float32x4_t oa8_exp2(float32x4_t x) {
    x = vmaxq_f32(x, vdupq_n_f32(-125.0f));
    const float32x4_t n = vrndnq_f32(x);
    const float32x4_t f = vsubq_f32(x, n);  // [-0.5, 0.5]
    float32x4_t p = vdupq_n_f32(1.5403530393381606e-4f);
    p = vfmaq_f32(vdupq_n_f32(1.3333558146428443e-3f), p, f);
    p = vfmaq_f32(vdupq_n_f32(9.6181291076284772e-3f), p, f);
    p = vfmaq_f32(vdupq_n_f32(5.5504108664821580e-2f), p, f);
    p = vfmaq_f32(vdupq_n_f32(2.4022650695910071e-1f), p, f);
    p = vfmaq_f32(vdupq_n_f32(6.9314718055994531e-1f), p, f);
    p = vfmaq_f32(vdupq_n_f32(1.0f), p, f);
    const int32x4_t e = vshlq_n_s32(vcvtq_s32_f32(n), 23);
    return vreinterpretq_f32_s32(vaddq_s32(vreinterpretq_s32_f32(p), e));
}

// O[r] += sum over keys j < nb of P[r][j] * V_j, for the 4 rows of a group
#if defined(OA_FA_H16)
template <int NV>
static inline void oa8_pv16_chunk(const __fp16 * const * P, const char * vb, size_t nbv1, int64_t d0, int nb, float * const * O) {
    for (int j0 = 0; j0 < nb; j0 += OA8_PV) {
        const int j1 = std::min(nb, j0 + OA8_PV);
        float16x8_t acc[4][NV];
        for (int r = 0; r < 4; r++) {
            for (int t = 0; t < NV; t++) {
                acc[r][t] = vdupq_n_f16(0);
            }
        }
        for (int j = j0; j < j1; j++) {
            const __fp16 * vr = (const __fp16 *) (vb + j * nbv1) + d0;
            float16x8_t vv[NV];
            for (int t = 0; t < NV; t++) {
                vv[t] = vld1q_f16(vr + 8 * t);
            }
            for (int r = 0; r < 4; r++) {
                const float16x8_t p = vld1q_dup_f16(P[r] + j);
                for (int t = 0; t < NV; t++) {
                    acc[r][t] = vfmaq_f16(acc[r][t], vv[t], p);
                }
            }
        }
        for (int r = 0; r < 4; r++) {
            for (int t = 0; t < NV; t++) {
                float * o = O[r] + d0 + 8 * t;
                vst1q_f32(o, vaddq_f32(vld1q_f32(o), vcvt_f32_f16(vget_low_f16(acc[r][t]))));
                vst1q_f32(o + 4, vaddq_f32(vld1q_f32(o + 4), vcvt_high_f32_f16(acc[r][t])));
            }
        }
    }
}
#endif

template <int NV>  // NV vectors of 4 floats
static inline void oa8_pv32_chunk(const float * const * P, const char * vb, size_t nbv1, int64_t d0, int nb, float * const * O) {
    float32x4_t acc[4][NV];
    for (int r = 0; r < 4; r++) {
        for (int t = 0; t < NV; t++) {
            acc[r][t] = vld1q_f32(O[r] + d0 + 4 * t);
        }
    }
    for (int j = 0; j < nb; j++) {
        const __fp16 * vr = (const __fp16 *) (vb + j * nbv1) + d0;
        float32x4_t vv[NV];
        for (int t = 0; t < NV; t += 2) {
            const float16x8_t h = vld1q_f16(vr + 4 * t);
            vv[t]     = vcvt_f32_f16(vget_low_f16(h));
            vv[t + 1] = vcvt_high_f32_f16(h);
        }
        for (int r = 0; r < 4; r++) {
            const float32x4_t p = vld1q_dup_f32(P[r] + j);
            for (int t = 0; t < NV; t++) {
                acc[r][t] = vfmaq_f32(acc[r][t], vv[t], p);
            }
        }
    }
    for (int r = 0; r < 4; r++) {
        for (int t = 0; t < NV; t++) {
            vst1q_f32(O[r] + d0 + 4 * t, acc[r][t]);
        }
    }
}

static inline bool oa8_named(const ggml_tensor * dst) {
    return std::strncmp(dst->name, "oa_fa8", 6) == 0;
}

static bool oa_fa8_prefill(const ggml_compute_params * params, ggml_tensor * dst) {
    if (!oa8_named(dst)) {
        return false;
    }
    if (const char * e = std::getenv("OA_FA8")) {
        if (std::strcmp(e, "0") == 0) {
            return false;
        }
    }
    const ggml_tensor * q    = dst->src[0];
    const ggml_tensor * k    = dst->src[1];
    const ggml_tensor * v    = dst->src[2];
    const ggml_tensor * mask = dst->src[3];
    for (int s = 4; s < GGML_MAX_SRC; s++) {
        if (dst->src[s] != nullptr) {
            return false;  // sinks, kv rows, bias tables
        }
    }
    if (q->type != GGML_TYPE_F32 || k->type != GGML_TYPE_F16 || v->type != GGML_TYPE_F16 || dst->type != GGML_TYPE_F32) {
        return false;
    }
    if (mask && (mask->type != GGML_TYPE_F16 || mask->nb[0] != sizeof(ggml_fp16_t))) {
        return false;
    }
    float scale = 1.0f, max_bias = 0.0f, softcap = 0.0f;
    std::memcpy(&scale,    (const float *) dst->op_params + 0, sizeof(float));
    std::memcpy(&max_bias, (const float *) dst->op_params + 1, sizeof(float));
    std::memcpy(&softcap,  (const float *) dst->op_params + 2, sizeof(float));
    const int64_t DK = k->ne[0], DV = v->ne[0];
    const int64_t nq = q->ne[1], nk = k->ne[1];
    if (max_bias != 0.0f || softcap != 0.0f || nq < 64 || nk < 1 || DK > 256 || DV > 256 || DV % 8 != 0 ||
        q->ne[0] != DK || v->ne[1] != nk || k->ne[2] != v->ne[2] || k->ne[3] != v->ne[3] ||
        q->ne[2] % k->ne[2] != 0 || q->ne[3] % k->ne[3] != 0 ||
        q->nb[0] != sizeof(float) || k->nb[0] != sizeof(ggml_fp16_t) || v->nb[0] != sizeof(ggml_fp16_t) ||
        dst->ne[0] != DV || dst->ne[1] != q->ne[2] || dst->ne[2] != nq || dst->nb[0] != sizeof(float)) {
        return false;
    }
    if (mask && (mask->ne[0] < nk || mask->ne[1] < nq)) {
        return false;
    }

    const int ith = params->ith;
    const int nth = params->nth;
    const oa_fa8_layout L = oa_fa8_layout_for(nk, DK, DV);
    char * ws = (char *) params->wdata + (size_t) ith * L.total;
    ws = (char *) (((uintptr_t) ws + 63) & ~(uintptr_t) 63);

    const int64_t nh  = q->ne[2];
    const int64_t n3  = q->ne[3];
    const int64_t rk2 = nh / k->ne[2];
    const int64_t rk3 = n3 / k->ne[3];
    const int64_t nch = (nq + OA8_RU - 1) / OA8_RU;
    const int64_t n_units = n3 * nh * nch;
    // scores in base 2: exp(x) = 2^(x * log2(e))
    const float s2 = scale * 1.4426950408889634f;

    int8_t *  K8   = (int8_t *) (ws + L.k8);
    float *   sk   = (float *) (ws + L.sk);
    int8_t *  Q8   = (int8_t *) (ws + L.q8);
    float *   sq   = (float *) (ws + L.sq);
    int32_t (*dots)[OA8_KB] = (int32_t (*)[OA8_KB]) (ws + L.dots);
    float (*Lg)[OA8_KB]     = (float (*)[OA8_KB]) (ws + L.l);
    __fp16 (*P16)[OA8_KB]   = (__fp16 (*)[OA8_KB]) (ws + L.p16);
    float (*MF)[OA8_KB]     = (float (*)[OA8_KB]) (ws + L.mf);
    float *   O    = (float *) (ws + L.o);
    const float * qsc = (const float *) (ws + L.cs) + L.dkp;  // Q's channel scales (oa8_prep_head)

    if (ith == 0) {
        ggml_threadpool_chunk_set(params->threadpool, nth);
    }
    ggml_barrier(params->threadpool);

    int64_t prepared = -1;
    bool    v16 = false;
    for (int64_t u = ith; u < n_units; u = ggml_threadpool_chunk_add(params->threadpool, 1)) {
        const int64_t iq3 = u / (nh * nch);
        const int64_t iq2 = (u / nch) % nh;
        const int64_t ch  = u % nch;
        const int64_t ik2 = iq2 / rk2;
        const int64_t ik3 = iq3 / rk3;
        const int64_t head = ik3 * k->ne[2] + ik2;
        if (head != prepared) {
            float vmax = 0.0f;
            oa8_prep_head(q, k, v, ik2, ik3, nk, L, ws, &vmax);
            // 32 weights of at most 1 times |V|, with room to spare under 16 bits' 65504
            // (OA_FA8_V32=1: always 32-bit sums, for comparisons)
            const char * e32 = std::getenv("OA_FA8_V32");
            v16 = vmax * OA8_PV < 30000.0f && !(e32 != nullptr && std::strcmp(e32, "1") == 0);
            prepared = head;
        }
        const char * vb = (const char *) v->data + ik2 * v->nb[2] + ik3 * v->nb[3];
        const int64_t r_end = std::min(nq, (ch + 1) * OA8_RU);
        for (int64_t r0 = ch * OA8_RU; r0 < r_end; r0 += OA8_QB) {
            const int rows = (int) std::min<int64_t>(OA8_QB, r_end - r0);
            // the query rows in 8 bits (missing rows zero)
            for (int i = 0; i < OA8_QB; i++) {
                if (i < rows) {
                    const float * qr = (const float *) ((const char *) q->data + (r0 + i) * q->nb[1] + iq2 * q->nb[2] + iq3 * q->nb[3]);
                    // each channel divided by K's scale for it (the products stay the same)
                    float qx[256];
                    int64_t d = 0;
                    for (; d + 4 <= DK; d += 4) {
                        vst1q_f32(qx + d, vmulq_f32(vld1q_f32(qr + d), vld1q_f32(qsc + d)));
                    }
                    for (; d < DK; d++) {
                        qx[d] = qr[d] * qsc[d];
                    }
                    sq[i] = oa8_quant_row(qx, DK, L.dkp, Q8, i) * s2;
                } else {
                    for (int64_t c = 0; c < L.dkp / 8; c++) {
                        std::memset(oa8_at(Q8, i, c, L.dkp), 0, 8);
                    }
                    sq[i] = 0.0f;
                }
            }
            float M[OA8_QB], S[OA8_QB];
            for (int i = 0; i < OA8_QB; i++) {
                M[i] = -INFINITY;
                S[i] = 0.0f;
            }
            std::memset(O, 0, sizeof(float) * OA8_QB * DV);

            for (int64_t kb = 0; kb < nk; kb += OA8_KB) {
                const int nb = (int) std::min<int64_t>(OA8_KB, nk - kb);
                // the mask (in base 2), and whether anything in this block is seen at all
                if (mask) {
                    bool any = false;
                    for (int i = 0; i < rows; i++) {
                        const ggml_fp16_t * mr = (const ggml_fp16_t *) ((const char *) mask->data + (r0 + i) * mask->nb[1] +
                            (iq2 % mask->ne[2]) * mask->nb[2] + (iq3 % mask->ne[3]) * mask->nb[3]) + kb;
                        int j = 0;
                        for (; j + 8 <= nb; j += 8) {
                            const float16x8_t h = vld1q_f16((const __fp16 *) mr + j);
                            const float32x4_t a = vmulq_n_f32(vcvt_f32_f16(vget_low_f16(h)), 1.4426950408889634f);
                            const float32x4_t b = vmulq_n_f32(vcvt_high_f32_f16(h), 1.4426950408889634f);
                            vst1q_f32(&MF[i][j], a);
                            vst1q_f32(&MF[i][j + 4], b);
                        }
                        for (; j < nb; j++) {
                            MF[i][j] = GGML_CPU_FP16_TO_FP32(mr[j]) * 1.4426950408889634f;
                        }
                        for (j = 0; j < nb && !any; j++) {
                            any = MF[i][j] != -INFINITY;
                        }
                    }
                    if (!any) {
                        continue;
                    }
                }
                oa8_dots(Q8, K8, kb, L.dkp, dots);
                for (int i = 0; i < rows; i++) {
                    float * lr = Lg[i];
                    const float a = sq[i];
                    float32x4_t mx = vdupq_n_f32(-INFINITY);
                    int j = 0;
                    for (; j + 4 <= nb; j += 4) {
                        float32x4_t x = vmulq_f32(vcvtq_f32_s32(vld1q_s32(&dots[i][j])), vmulq_n_f32(vld1q_f32(sk + kb + j), a));
                        if (mask) {
                            x = vaddq_f32(x, vld1q_f32(&MF[i][j]));
                        }
                        vst1q_f32(lr + j, x);
                        mx = vmaxq_f32(mx, x);
                    }
                    float bm = vmaxvq_f32(mx);
                    for (; j < nb; j++) {
                        lr[j] = (float) dots[i][j] * sk[kb + j] * a + (mask ? MF[i][j] : 0.0f);
                        bm = std::max(bm, lr[j]);
                    }
                    for (; j < OA8_KB; j++) {
                        lr[j] = -INFINITY;  // past the last key: no weight
                    }
                    const float Mn = std::max(M[i], bm);
                    if (Mn == -INFINITY) {
                        for (j = 0; j < OA8_KB; j++) {
                            lr[j] = 0.0f;
                            P16[i][j] = 0;
                        }
                        continue;  // nothing seen in this row yet
                    }
                    if (Mn > M[i]) {
                        // the totals so far shrink to the new largest score (from nothing: 0)
                        const float alpha = M[i] == -INFINITY ? 0.0f : vgetq_lane_f32(oa8_exp2(vdupq_n_f32(M[i] - Mn)), 0);
                        if (alpha != 1.0f) {
                            float * o = O + i * DV;
                            for (int64_t d = 0; d < DV; d += 4) {
                                vst1q_f32(o + d, vmulq_n_f32(vld1q_f32(o + d), alpha));
                            }
                            S[i] *= alpha;
                        }
                        M[i] = Mn;
                    }
                    float32x4_t sum = vdupq_n_f32(0.0f);
                    const float32x4_t mv = vdupq_n_f32(Mn);
                    for (j = 0; j < OA8_KB; j += 4) {
                        const float32x4_t p = oa8_exp2(vsubq_f32(vld1q_f32(lr + j), mv));
                        vst1q_f32(lr + j, p);
                        sum = vaddq_f32(sum, p);
#if defined(OA_FA_H16)
                        vst1_f16(&P16[i][j], vcvt_f16_f32(p));
#endif
                    }
                    // the clamped exp of a masked or missing key is about 2^-125, not 0: drop it
                    for (j = nb; j < OA8_KB; j++) {
                        lr[j] = 0.0f;
                        P16[i][j] = 0;
                    }
                    if (mask) {
                        for (j = 0; j < nb; j++) {
                            if (MF[i][j] == -INFINITY) {
                                lr[j] = 0.0f;
                                P16[i][j] = 0;
                            }
                        }
                    }
                    S[i] += vaddvq_f32(sum);
                }
                for (int i = rows; i < OA8_QB; i++) {
                    for (int j = 0; j < OA8_KB; j++) {
                        Lg[i][j] = 0.0f;
                        P16[i][j] = 0;
                    }
                }
                // the weighted sums of V, four rows at a time
                for (int g = 0; g < OA8_QB; g += 4) {
                    if (g >= rows) {
                        break;
                    }
                    float * Og[4] = { O + (g + 0) * DV, O + (g + 1) * DV, O + (g + 2) * DV, O + (g + 3) * DV };
                    const char * vbk = vb + kb * v->nb[1];
#if defined(OA_FA_H16)
                    if (v16) {
                        const __fp16 * Pg[4] = { P16[g], P16[g + 1], P16[g + 2], P16[g + 3] };
                        int64_t d0 = 0;
                        for (; d0 + 32 <= DV; d0 += 32) {
                            oa8_pv16_chunk<4>(Pg, vbk, v->nb[1], d0, nb, Og);
                        }
                        for (; d0 + 16 <= DV; d0 += 16) {
                            oa8_pv16_chunk<2>(Pg, vbk, v->nb[1], d0, nb, Og);
                        }
                        for (; d0 < DV; d0 += 8) {
                            oa8_pv16_chunk<1>(Pg, vbk, v->nb[1], d0, nb, Og);
                        }
                        continue;
                    }
#endif
                    const float * Pg[4] = { Lg[g], Lg[g + 1], Lg[g + 2], Lg[g + 3] };
                    int64_t d0 = 0;
                    for (; d0 + 16 <= DV; d0 += 16) {
                        oa8_pv32_chunk<4>(Pg, vbk, v->nb[1], d0, nb, Og);
                    }
                    for (; d0 < DV; d0 += 8) {
                        oa8_pv32_chunk<2>(Pg, vbk, v->nb[1], d0, nb, Og);
                    }
                }
            }
            for (int i = 0; i < rows; i++) {
                const float inv = S[i] == 0.0f ? 0.0f : 1.0f / S[i];
                const int64_t i1 = r0 + i;
                float * out = (float *) ((char *) dst->data + (iq3 * dst->ne[2] * dst->ne[1] + iq2 + i1 * dst->ne[1]) * dst->nb[1]);
                const float * o = O + i * DV;
                for (int64_t d = 0; d < DV; d += 4) {
                    vst1q_f32(out + d, vmulq_n_f32(vld1q_f32(o + d), inv));
                }
            }
        }
    }
    return true;
}

#else  // no int8 dot products: ggml's own path

static bool oa_fa8_prefill(const ggml_compute_params *, ggml_tensor *) {
    return false;
}

#endif
