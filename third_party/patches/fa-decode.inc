// Offline AI: flash attention for writing one token (one query), with grouped-query attention.
//
// ggml's split-KV path gives each thread a stretch of the conversation memory and walks it once
// per query head. With grouped-query attention 4 to 8 query heads share one K/V head, so the same
// K and V rows came in from memory 4 to 8 times for every token written: on a phone, where the
// memory is the slow part, that is most of the time spent in attention once a chat is long. Here
// each K/V row is read once for all the heads that share it, the softmax runs over blocks of 16
// positions (one rescale per block instead of one per position), and the V sums for a block stay
// in registers instead of going back to memory after every position. The V sums are 32-bit, as in
// upstream ggml since it stopped summing in 16 bits (which could overflow on long contexts).
//
// Included from ggml-cpu/ops.cpp (0003-fa-decode-grouped.patch). Returns false when the case is
// not one it handles (the caller then runs ggml's own path): K and V in F16, one query, the same
// heads sharing K and V, no kv rows or bias tables. OA_FA_PLAIN=1 turns it off for comparisons.

#include <cstdlib>
#include <cstring>

#if defined(__ARM_NEON) && defined(__aarch64__)
#include <arm_neon.h>
#endif

// acc[0..DV) += sum over j < nb of w[j] * v[j][0..DV)  (DV a multiple of 32)
static inline void oa_fa_vmad_block(int64_t DV, float * acc, const ggml_fp16_t * const * v, const float * w, int nb) {
#if defined(__ARM_NEON) && defined(__aarch64__)
    for (int64_t d = 0; d < DV; d += 32) {
        float32x4_t a0 = vld1q_f32(acc + d +  0), a1 = vld1q_f32(acc + d +  4);
        float32x4_t a2 = vld1q_f32(acc + d +  8), a3 = vld1q_f32(acc + d + 12);
        float32x4_t a4 = vld1q_f32(acc + d + 16), a5 = vld1q_f32(acc + d + 20);
        float32x4_t a6 = vld1q_f32(acc + d + 24), a7 = vld1q_f32(acc + d + 28);
        for (int j = 0; j < nb; j++) {
            if (w[j] == 0.0f) continue;
            const float32x4_t wj = vdupq_n_f32(w[j]);
            const __fp16 * x = (const __fp16 *) (v[j] + d);
            const float16x8_t x0 = vld1q_f16(x +  0), x1 = vld1q_f16(x +  8);
            const float16x8_t x2 = vld1q_f16(x + 16), x3 = vld1q_f16(x + 24);
            a0 = vfmaq_f32(a0, vcvt_f32_f16(vget_low_f16(x0)), wj);
            a1 = vfmaq_f32(a1, vcvt_high_f32_f16(x0), wj);
            a2 = vfmaq_f32(a2, vcvt_f32_f16(vget_low_f16(x1)), wj);
            a3 = vfmaq_f32(a3, vcvt_high_f32_f16(x1), wj);
            a4 = vfmaq_f32(a4, vcvt_f32_f16(vget_low_f16(x2)), wj);
            a5 = vfmaq_f32(a5, vcvt_high_f32_f16(x2), wj);
            a6 = vfmaq_f32(a6, vcvt_f32_f16(vget_low_f16(x3)), wj);
            a7 = vfmaq_f32(a7, vcvt_high_f32_f16(x3), wj);
        }
        vst1q_f32(acc + d +  0, a0); vst1q_f32(acc + d +  4, a1);
        vst1q_f32(acc + d +  8, a2); vst1q_f32(acc + d + 12, a3);
        vst1q_f32(acc + d + 16, a4); vst1q_f32(acc + d + 20, a5);
        vst1q_f32(acc + d + 24, a6); vst1q_f32(acc + d + 28, a7);
    }
#else
    for (int j = 0; j < nb; j++) {
        if (w[j] != 0.0f) ggml_vec_mad_f16_f32((int) DV, acc, v[j], w[j]);
    }
#endif
}

// out[i] = dot(k, q[i]) for G <= 8 heads (DK a multiple of 32): the K row is loaded once for up to
// four heads. Summed like ggml's own vec_dot_f16 on ARM: 16-bit products in four 8-lane sums per
// head over steps of 32, then added up in 32 bits.
static inline void oa_fa_kdot_heads(int64_t DK, const ggml_fp16_t * k, const ggml_fp16_t (*q)[512], int G, float * out) {
#if defined(__ARM_NEON) && defined(__aarch64__) && defined(__ARM_FEATURE_FP16_VECTOR_ARITHMETIC)
    if (DK % 32 == 0) {
        const __fp16 * kp = (const __fp16 *) k;
        for (int i0 = 0; i0 < G; i0 += 4) {
            const int n = G - i0 < 4 ? G - i0 : 4;
            float16x8_t a[4][4];
            for (int i = 0; i < 4; i++) for (int j = 0; j < 4; j++) a[i][j] = vdupq_n_f16(0);
            for (int64_t d = 0; d < DK; d += 32) {
                const float16x8_t k0 = vld1q_f16(kp + d), k1 = vld1q_f16(kp + d + 8);
                const float16x8_t k2 = vld1q_f16(kp + d + 16), k3 = vld1q_f16(kp + d + 24);
                for (int i = 0; i < n; i++) {
                    const __fp16 * qp = (const __fp16 *) q[i0 + i] + d;
                    a[i][0] = vfmaq_f16(a[i][0], k0, vld1q_f16(qp));
                    a[i][1] = vfmaq_f16(a[i][1], k1, vld1q_f16(qp + 8));
                    a[i][2] = vfmaq_f16(a[i][2], k2, vld1q_f16(qp + 16));
                    a[i][3] = vfmaq_f16(a[i][3], k3, vld1q_f16(qp + 24));
                }
            }
            for (int i = 0; i < n; i++) {
                float32x4_t t = vdupq_n_f32(0.0f);
                for (int j = 0; j < 4; j++) {
                    t = vaddq_f32(t, vcvt_f32_f16(vget_low_f16(a[i][j])));
                    t = vaddq_f32(t, vcvt_high_f32_f16(a[i][j]));
                }
                out[i0 + i] = vaddvq_f32(t);
            }
        }
        return;
    }
#endif
    for (int i = 0; i < G; i++) {
        ggml_vec_dot_f16((int) DK, &out[i], 0, (ggml_fp16_t *) k, 0, (ggml_fp16_t *) q[i], 0, 1);
    }
}

// One thread's stretch [ic_start, ic_end) of the memory for every query head; writes the partial
// results (M, S, VKQ) the way ggml_compute_forward_flash_attn_ext_f16_one_chunk does.
static bool oa_fa_decode_grouped(
        const ggml_compute_params * params, ggml_tensor * dst,
        int64_t ic_start, int64_t ic_end, float * partials, int64_t partial_stride) {
    static const bool plain = [] {
        const char * e = std::getenv("OA_FA_PLAIN");
        return e && *e && std::strcmp(e, "0") != 0;
    }();
    if (plain) return false;

    const ggml_tensor * q     = dst->src[0];
    const ggml_tensor * k     = dst->src[1];
    const ggml_tensor * v     = dst->src[2];
    const ggml_tensor * mask  = dst->src[3];
    const ggml_tensor * sinks = dst->src[4];
    if (dst->src[5] || dst->src[6] || dst->src[7]) return false;  // kv rows, bias tables
    if (q->type != GGML_TYPE_F32 || k->type != GGML_TYPE_F16 || v->type != GGML_TYPE_F16) return false;
    if (mask && mask->type != GGML_TYPE_F16) return false;

    constexpr int     G_MAX = 8;    // query heads at once
    constexpr int     B     = 16;   // positions per softmax block
    constexpr int64_t D_MAX = 512;

    const int64_t DK = k->ne[0];
    const int64_t DV = v->ne[0];
    if (DK > D_MAX || DV > D_MAX || DV % 32 != 0) return false;
    if (q->ne[1] != 1 || q->ne[3] != 1 || k->ne[3] != 1 || v->ne[3] != 1) return false;
    const int64_t n_head   = q->ne[2];
    const int64_t n_head_k = k->ne[2];
    if (n_head_k <= 0 || v->ne[2] != n_head_k || n_head % n_head_k != 0) return false;
    const int64_t rk2 = n_head / n_head_k;
    // rows must be plain, as the vec dot and the loads assume
    if (k->nb[0] != sizeof(ggml_fp16_t) || v->nb[0] != sizeof(ggml_fp16_t) || q->nb[0] != sizeof(float)) return false;

    float scale = 1.0f, max_bias = 0.0f, logit_softcap = 0.0f;
    memcpy(&scale,         (float *) dst->op_params + 0, sizeof(float));
    memcpy(&max_bias,      (float *) dst->op_params + 1, sizeof(float));
    memcpy(&logit_softcap, (float *) dst->op_params + 2, sizeof(float));
    if (logit_softcap != 0) scale /= logit_softcap;

    const uint32_t n_head_log2 = 1u << (uint32_t) floor(log2((double) n_head));
    const float m0 = powf(2.0f, -(max_bias       ) / n_head_log2);
    const float m1 = powf(2.0f, -(max_bias / 2.0f) / n_head_log2);

    alignas(64) float       acc[G_MAX][D_MAX];
    alignas(64) ggml_fp16_t qh[G_MAX][D_MAX];
    float s[G_MAX][B];
    float w[G_MAX][B];
    float M[G_MAX], S[G_MAX], slope[G_MAX], mvs[G_MAX], dots[G_MAX];
    const ggml_fp16_t * mp[G_MAX];
    const ggml_fp16_t * vrow[B];

    for (int64_t g = 0; g < n_head_k; g++) {
        for (int64_t h0 = g * rk2; h0 < (g + 1) * rk2; h0 += G_MAX) {
            const int G = (int) std::min<int64_t>(G_MAX, (g + 1) * rk2 - h0);
            for (int i = 0; i < G; i++) {
                const int64_t h = h0 + i;
                M[i] = -INFINITY;
                S[i] = 0.0f;
                slope[i] = (max_bias > 0.0f) ? (h < n_head_log2 ? powf(m0, h + 1) : powf(m1, 2*(h - n_head_log2) + 1)) : 1.0f;
                memset(acc[i], 0, DV * sizeof(float));
                const float * pq = (const float *) ((const char *) q->data + h * q->nb[2]);
                ggml_cpu_fp32_to_fp16(pq, qh[i], DK);
                mp[i] = mask ? (const ggml_fp16_t *) ((const char *) mask->data + (h % mask->ne[2]) * mask->nb[2]) : nullptr;
            }
            const char * kbase = (const char *) k->data + g * k->nb[2];
            const char * vbase = (const char *) v->data + g * v->nb[2];

            for (int64_t c0 = ic_start; c0 < ic_end; c0 += B) {
                const int nb = (int) std::min<int64_t>(B, ic_end - c0);
                // scores: each K row once, for every head that reads it
                for (int j = 0; j < nb; j++) {
                    const int64_t c = c0 + j;
                    const ggml_fp16_t * kr = (const ggml_fp16_t *) (kbase + c * k->nb[1]);
                    vrow[j] = (const ggml_fp16_t *) (vbase + c * v->nb[1]);
                    // a position no head of the group sees (padding past the end) is not read at all
                    bool any = false;
                    for (int i = 0; i < G; i++) {
                        mvs[i] = mp[i] ? slope[i] * GGML_CPU_FP16_TO_FP32(mp[i][c]) : 0.0f;
                        any = any || mvs[i] != -INFINITY;
                    }
                    if (!any) {
                        for (int i = 0; i < G; i++) s[i][j] = -INFINITY;
                        continue;
                    }
                    oa_fa_kdot_heads(DK, kr, qh, G, dots);
                    for (int i = 0; i < G; i++) {
                        if (mvs[i] == -INFINITY) {
                            s[i][j] = -INFINITY;
                            continue;
                        }
                        float d = dots[i] * scale;
                        if (logit_softcap != 0.0f) d = logit_softcap * tanhf(d);
                        s[i][j] = d + mvs[i];
                    }
                }
                // online softmax over the block, then the V sums
                for (int i = 0; i < G; i++) {
                    float bm = -INFINITY;
                    for (int j = 0; j < nb; j++) bm = std::max(bm, s[i][j]);
                    if (bm == -INFINITY) continue;  // all masked
                    if (bm > M[i]) {
                        const float ms = M[i] == -INFINITY ? 0.0f : expf(M[i] - bm);
                        if (ms != 1.0f) {
                            ggml_vec_scale_f32((int) DV, acc[i], ms);
                            S[i] *= ms;
                        }
                        M[i] = bm;
                    }
                    float sum = 0.0f;
                    for (int j = 0; j < nb; j++) {
                        w[i][j] = s[i][j] == -INFINITY ? 0.0f : expf(s[i][j] - M[i]);
                        sum += w[i][j];
                    }
                    S[i] += sum;
                    oa_fa_vmad_block(DV, acc[i], vrow, w[i], nb);
                }
            }

            for (int i = 0; i < G; i++) {
                const int64_t h = h0 + i;
                // sinks count once, with the first stretch
                if (sinks && ic_start == 0) {
                    const float sv = ((const float *) sinks->data)[h];
                    if (sv > M[i]) {
                        const float ms = M[i] == -INFINITY ? 0.0f : expf(M[i] - sv);
                        ggml_vec_scale_f32((int) DV, acc[i], ms);
                        S[i] = S[i] * ms + 1.0f;
                        M[i] = sv;
                    } else {
                        S[i] += expf(sv - M[i]);
                    }
                }
                float * partial = partials + h * partial_stride;
                partial[0] = M[i];
                partial[1] = S[i];
                memcpy(partial + 2, acc[i], DV * sizeof(float));
            }
        }
    }
    GGML_UNUSED(params);
    return true;
}
