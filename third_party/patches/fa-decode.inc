// Offline AI: flash attention for writing (one query) and for checking a draft (a few queries),
// with grouped-query attention.
//
// ggml's split-KV path gives each thread a stretch of the conversation memory and walks it once
// per query head, and with a few queries (a draft of up to 31 tokens being checked) each thread
// walks all of it once per query and head. With grouped-query attention 4 to 8 query heads share one K/V head, so the same
// K and V rows came in from memory 4 to 8 times for every token written: on a phone, where the
// memory is the slow part, that is most of the time spent in attention once a chat is long. Here
// each K/V row is read once for all the heads that share it, the softmax runs over blocks of 16
// positions (one rescale per block instead of one per position), and the V sums for a block stay
// in registers instead of going back to memory after every position. The V sums are 32-bit, as in
// upstream ggml since it stopped summing in 16 bits (which could overflow on long contexts).
//
// Included from ggml-cpu/ops.cpp (0003-fa-decode-grouped.patch). The entry points return false
// when the case is not one they handle (the caller then runs ggml's own path): K and V in F16,
// the same heads sharing K and V, no kv rows or bias tables, no broadcast over the 4th dimension.
// OA_FA_PLAIN=1 turns them off for comparisons.

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

struct oa_fa_op {
    const ggml_tensor * q;
    const ggml_tensor * k;
    const ggml_tensor * v;
    const ggml_tensor * mask;
    const ggml_tensor * sinks;
    ggml_tensor * dst;
    int64_t DK, DV, n_head, n_head_k, rk2;
    float scale, max_bias, softcap, m0, m1;
    uint32_t n_head_log2;
};

static constexpr int     OA_FA_G = 8;     // rows (query and head) at once
static constexpr int     OA_FA_B = 16;    // positions per softmax block
static constexpr int64_t OA_FA_D = 512;   // largest head size

static bool oa_fa_off() {
    static const bool plain = [] {
        const char * e = std::getenv("OA_FA_PLAIN");
        return e && *e && std::strcmp(e, "0") != 0;
    }();
    return plain;
}

static bool oa_fa_prepare(ggml_tensor * dst, oa_fa_op & o) {
    if (oa_fa_off()) return false;
    o.dst   = dst;
    o.q     = dst->src[0];
    o.k     = dst->src[1];
    o.v     = dst->src[2];
    o.mask  = dst->src[3];
    o.sinks = dst->src[4];
    if (dst->src[5] || dst->src[6] || dst->src[7]) return false;  // kv rows, bias tables
    if (o.q->type != GGML_TYPE_F32 || o.k->type != GGML_TYPE_F16 || o.v->type != GGML_TYPE_F16) return false;
    if (o.mask && o.mask->type != GGML_TYPE_F16) return false;
    o.DK = o.k->ne[0];
    o.DV = o.v->ne[0];
    if (o.DK > OA_FA_D || o.DV > OA_FA_D || o.DV % 32 != 0) return false;
    if (o.k->ne[3] != o.q->ne[3] || o.v->ne[3] != o.q->ne[3]) return false;
    o.n_head   = o.q->ne[2];
    o.n_head_k = o.k->ne[2];
    if (o.n_head_k <= 0 || o.v->ne[2] != o.n_head_k || o.n_head % o.n_head_k != 0) return false;
    o.rk2 = o.n_head / o.n_head_k;
    // rows must be plain, as the vec dot and the loads assume
    if (o.k->nb[0] != sizeof(ggml_fp16_t) || o.v->nb[0] != sizeof(ggml_fp16_t) || o.q->nb[0] != sizeof(float)) return false;
    o.scale = 1.0f;
    o.max_bias = 0.0f;
    o.softcap = 0.0f;
    memcpy(&o.scale,    (float *) dst->op_params + 0, sizeof(float));
    memcpy(&o.max_bias, (float *) dst->op_params + 1, sizeof(float));
    memcpy(&o.softcap,  (float *) dst->op_params + 2, sizeof(float));
    if (o.softcap != 0) o.scale /= o.softcap;
    o.n_head_log2 = 1u << (uint32_t) floor(log2((double) o.n_head));
    o.m0 = powf(2.0f, -(o.max_bias       ) / o.n_head_log2);
    o.m1 = powf(2.0f, -(o.max_bias / 2.0f) / o.n_head_log2);
    return true;
}

// Rows (head hs[i], query q1s[i]) of batch iq3, all reading K/V head g, over the positions
// [c_begin, c_end). With partials: M, S and the V sums go to partials + head * partial_stride
// for ggml's reduction (one query); without: the finished rows go to dst.
static void oa_fa_group(const oa_fa_op & o, int64_t iq3, int64_t g, const int64_t * hs, const int64_t * q1s, int G,
                        int64_t c_begin, int64_t c_end, bool with_sinks, float * partials, int64_t partial_stride) {
    const ggml_tensor * q = o.q;
    const ggml_tensor * k = o.k;
    const ggml_tensor * v = o.v;
    const ggml_tensor * mask = o.mask;
    const int64_t DK = o.DK, DV = o.DV;

    alignas(64) float       acc[OA_FA_G][OA_FA_D];
    alignas(64) ggml_fp16_t qh[OA_FA_G][OA_FA_D];
    float s[OA_FA_G][OA_FA_B];
    float w[OA_FA_G][OA_FA_B];
    float M[OA_FA_G], S[OA_FA_G], slope[OA_FA_G], mvs[OA_FA_G], dots[OA_FA_G];
    const ggml_fp16_t * mp[OA_FA_G];
    const ggml_fp16_t * vrow[OA_FA_B];

    for (int i = 0; i < G; i++) {
        const int64_t h = hs[i];
        M[i] = -INFINITY;
        S[i] = 0.0f;
        slope[i] = (o.max_bias > 0.0f) ? (h < o.n_head_log2 ? powf(o.m0, h + 1) : powf(o.m1, 2*(h - o.n_head_log2) + 1)) : 1.0f;
        memset(acc[i], 0, DV * sizeof(float));
        const float * pq = (const float *) ((const char *) q->data + q1s[i] * q->nb[1] + h * q->nb[2] + iq3 * q->nb[3]);
        ggml_cpu_fp32_to_fp16(pq, qh[i], DK);
        mp[i] = mask ? (const ggml_fp16_t *) ((const char *) mask->data + q1s[i] * mask->nb[1] +
                                              (h % mask->ne[2]) * mask->nb[2] + (iq3 % mask->ne[3]) * mask->nb[3]) : nullptr;
    }
    const char * kbase = (const char *) k->data + g * k->nb[2] + iq3 * k->nb[3];
    const char * vbase = (const char *) v->data + g * v->nb[2] + iq3 * v->nb[3];

    for (int64_t c0 = c_begin; c0 < c_end; c0 += OA_FA_B) {
        const int nb = (int) std::min<int64_t>(OA_FA_B, c_end - c0);
        // scores: each K row once, for every row of the group that reads it
        for (int j = 0; j < nb; j++) {
            const int64_t c = c0 + j;
            const ggml_fp16_t * kr = (const ggml_fp16_t *) (kbase + c * k->nb[1]);
            vrow[j] = (const ggml_fp16_t *) (vbase + c * v->nb[1]);
            // a position no row of the group sees (padding past the end, the future of a draft) is not read
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
                float d = dots[i] * o.scale;
                if (o.softcap != 0.0f) d = o.softcap * tanhf(d);
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
        const int64_t h = hs[i];
        // sinks count once: with the first stretch, or the whole of it
        if (o.sinks && with_sinks) {
            const float sv = ((const float *) o.sinks->data)[h];
            if (sv > M[i]) {
                const float ms = M[i] == -INFINITY ? 0.0f : expf(M[i] - sv);
                ggml_vec_scale_f32((int) DV, acc[i], ms);
                S[i] = S[i] * ms + 1.0f;
                M[i] = sv;
            } else {
                S[i] += expf(sv - M[i]);
            }
        }
        if (partials) {
            float * partial = partials + h * partial_stride;
            partial[0] = M[i];
            partial[1] = S[i];
            memcpy(partial + 2, acc[i], DV * sizeof(float));
        } else {
            ggml_vec_scale_f32((int) DV, acc[i], S[i] == 0.0f ? 0.0f : 1.0f / S[i]);
            const ggml_tensor * dst = o.dst;
            // permute(0, 2, 1, 3)
            memcpy((char *) dst->data + (iq3 * dst->ne[2] * dst->ne[1] + h + q1s[i] * dst->ne[1]) * dst->nb[1], acc[i],
                   DV * sizeof(float));
        }
    }
}

// Writing one token: this thread's stretch [ic_start, ic_end) of the memory for every query head,
// as partial results for ggml's reduction (ggml's split-KV path).
static bool oa_fa_decode_grouped(
        const ggml_compute_params * params, ggml_tensor * dst,
        int64_t ic_start, int64_t ic_end, float * partials, int64_t partial_stride) {
    oa_fa_op o;
    if (!oa_fa_prepare(dst, o) || o.q->ne[1] != 1 || o.q->ne[3] != 1) return false;
    int64_t hs[OA_FA_G];
    const int64_t q1s[OA_FA_G] = {0};
    for (int64_t g = 0; g < o.n_head_k; g++) {
        for (int64_t h0 = g * o.rk2; h0 < (g + 1) * o.rk2; h0 += OA_FA_G) {
            const int G = (int) std::min<int64_t>(OA_FA_G, (g + 1) * o.rk2 - h0);
            for (int i = 0; i < G; i++) hs[i] = h0 + i;
            oa_fa_group(o, 0, g, hs, q1s, G, ic_start, ic_end, ic_start == 0, partials, partial_stride);
        }
    }
    GGML_UNUSED(params);
    return true;
}

// A few queries (a draft being checked, 2 to 63 tokens): the work is split into groups of up to
// eight rows (query and head) that read the same K/V head, each walking the whole memory once,
// handed out to the threads as they come free. The threadpool's chunk counter must stand at
// the thread count, as ggml's own loop expects it.
static bool oa_fa_rows_grouped(const ggml_compute_params * params, ggml_tensor * dst) {
    oa_fa_op o;
    if (!oa_fa_prepare(dst, o)) return false;
    const int64_t nq  = o.q->ne[1];
    const int64_t nq3 = o.q->ne[3];
    if (nq < 2) return false;
    const int64_t R   = o.rk2 * nq;                          // rows reading one K/V head
    const int64_t per = (R + OA_FA_G - 1) / OA_FA_G;         // groups of them
    const int64_t n_items = nq3 * o.n_head_k * per;
    const int64_t n_kv = o.k->ne[1];
    int64_t hs[OA_FA_G], q1s[OA_FA_G];
    for (int64_t item = params->ith; item < n_items; item = ggml_threadpool_chunk_add(params->threadpool, 1)) {
        const int64_t iq3 = item / (o.n_head_k * per);
        const int64_t rem = item % (o.n_head_k * per);
        const int64_t g   = rem / per;
        const int64_t r0  = (rem % per) * OA_FA_G;
        const int G = (int) std::min<int64_t>(OA_FA_G, R - r0);
        for (int i = 0; i < G; i++) {
            hs[i]  = g * o.rk2 + (r0 + i) % o.rk2;
            q1s[i] = (r0 + i) / o.rk2;
        }
        oa_fa_group(o, iq3, g, hs, q1s, G, 0, n_kv, true, nullptr, 0);
    }
    return true;
}
