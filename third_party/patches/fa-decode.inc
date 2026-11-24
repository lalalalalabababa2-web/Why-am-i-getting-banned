// Offline AI: flash attention for writing (one query) and for checking a draft (a few queries),
// with grouped-query attention.
//
// ggml's split-KV path gives each thread a stretch of the conversation memory and walks it once
// per query head, and with a few queries (a draft of up to 31 tokens being checked) each thread
// walks all of it once per query and head. With grouped-query attention 4 to 8 query heads share
// one K/V head, so the same K and V rows came in from memory 4 to 8 times for every token written:
// on a phone, where the memory is the slow part, that is most of the time spent in attention once
// a chat is long. Here each K/V row is read once for all the heads that share it, the softmax runs
// over blocks of 16 positions (one rescale per block instead of one per position), and each V row
// is loaded (and converted) once for up to four heads.
//
// Where the CPU has 16-bit float arithmetic (ARMv8.2 and later: nearly every phone since 2018) a
// block's V sums are made in 16 bits, twice the lanes of 32-bit ones, and added to the 32-bit
// totals after every block. 16 positions at weights of at most 1 cannot overflow, unlike the
// all-16-bit sums over the whole conversation that ggml used to make (and dropped for that).
// ggml's own K dot on ARM is 16-bit as well.
//
// The conversation memory may be 16-bit or 8-bit (Q8_0, what the app picks when memory is tight).
// For the 8-bit memory ggml has neither its split path nor its tiled one: every query head walks
// all of it on its own, which made the big models that need the 8-bit memory the slowest of all.
//
// Included from ggml-cpu/ops.cpp (0003-fa-decode-grouped.patch). The entry points return false
// when the case is not one they handle (the caller then runs ggml's own path): K and V in F16 or
// Q8_0, the same heads sharing K and V, no kv rows or bias tables, no broadcast over the 4th
// dimension. OA_FA_PLAIN=1 turns them off for comparisons.

#include <cstdlib>
#include <cstring>

#if defined(__ARM_NEON) && defined(__aarch64__)
#include <arm_neon.h>
#define OA_FA_NEON 1
#if defined(__ARM_FEATURE_FP16_VECTOR_ARITHMETIC)
#define OA_FA_H16 1
#endif
#endif

static constexpr int     OA_FA_G = 8;     // rows (query and head) at once
static constexpr int     OA_FA_B = 16;    // positions per softmax block
static constexpr int64_t OA_FA_D = 512;   // largest head size

// a Q8_0 block as ggml-common.h has it (oa_fa_prepare checks the size against ggml's)
struct oa_fa_q8 {
    ggml_fp16_t d;
    int8_t      qs[32];
};
static_assert(sizeof(oa_fa_q8) == 34, "Q8_0 block");

// The V sums: a[i][0..DV) += w[i][j] * (V row j) for j < nb, for N rows of a group at once
// (DV a multiple of 32). A row of V is a 16-bit row, or 8-bit blocks of 32 with a 16-bit scale.
#if defined(OA_FA_H16)
template <bool Q8>
static inline void oa_fa_load32(const void * row, int64_t d, float16x8_t x[4]) {
    if (Q8) {
        const oa_fa_q8 * b = (const oa_fa_q8 *) row + d / 32;
        const float16x8_t sc = vld1q_dup_f16((const __fp16 *) &b->d);
        const int8x16_t q0 = vld1q_s8(b->qs), q1 = vld1q_s8(b->qs + 16);
        x[0] = vmulq_f16(vcvtq_f16_s16(vmovl_s8(vget_low_s8(q0))), sc);
        x[1] = vmulq_f16(vcvtq_f16_s16(vmovl_high_s8(q0)), sc);
        x[2] = vmulq_f16(vcvtq_f16_s16(vmovl_s8(vget_low_s8(q1))), sc);
        x[3] = vmulq_f16(vcvtq_f16_s16(vmovl_high_s8(q1)), sc);
    } else {
        const __fp16 * p = (const __fp16 *) row + d;
        x[0] = vld1q_f16(p);
        x[1] = vld1q_f16(p + 8);
        x[2] = vld1q_f16(p + 16);
        x[3] = vld1q_f16(p + 24);
    }
}

template <int N, bool Q8>
static inline void oa_fa_vmad_n(int64_t DV, float * const * a, const void * const * v, const float * const * w, int nb) {
    __fp16 wh[N][OA_FA_B];
    bool live[OA_FA_B];
    for (int j = 0; j < nb; j++) {
        live[j] = false;
        for (int i = 0; i < N; i++) {
            wh[i][j] = (__fp16) w[i][j];
            live[j] = live[j] || w[i][j] != 0.0f;
        }
    }
    for (int64_t d = 0; d < DV; d += 32) {
        float16x8_t h[N][4];
        for (int i = 0; i < N; i++) {
            for (int r = 0; r < 4; r++) h[i][r] = vdupq_n_f16(0);
        }
        for (int j = 0; j < nb; j++) {
            if (!live[j]) continue;
            float16x8_t x[4];
            oa_fa_load32<Q8>(v[j], d, x);
            for (int i = 0; i < N; i++) {
                const float16x8_t wi = vdupq_n_f16(wh[i][j]);
                for (int r = 0; r < 4; r++) h[i][r] = vfmaq_f16(h[i][r], x[r], wi);
            }
        }
        for (int i = 0; i < N; i++) {
            float * p = a[i] + d;
            for (int r = 0; r < 4; r++) {
                vst1q_f32(p + 8*r,     vaddq_f32(vld1q_f32(p + 8*r),     vcvt_f32_f16(vget_low_f16(h[i][r]))));
                vst1q_f32(p + 8*r + 4, vaddq_f32(vld1q_f32(p + 8*r + 4), vcvt_high_f32_f16(h[i][r])));
            }
        }
    }
}
#elif defined(OA_FA_NEON)
// ARMv8.0: 32-bit sums, 16 values of V at a time
template <bool Q8>
static inline void oa_fa_load16(const void * row, int64_t d, float32x4_t x[4]) {
    if (Q8) {
        const oa_fa_q8 * b = (const oa_fa_q8 *) row + d / 32;
        const float sc = GGML_CPU_FP16_TO_FP32(b->d);
        const int8x16_t q = vld1q_s8(b->qs + d % 32);
        const int16x8_t lo = vmovl_s8(vget_low_s8(q)), hi = vmovl_high_s8(q);
        x[0] = vmulq_n_f32(vcvtq_f32_s32(vmovl_s16(vget_low_s16(lo))), sc);
        x[1] = vmulq_n_f32(vcvtq_f32_s32(vmovl_high_s16(lo)), sc);
        x[2] = vmulq_n_f32(vcvtq_f32_s32(vmovl_s16(vget_low_s16(hi))), sc);
        x[3] = vmulq_n_f32(vcvtq_f32_s32(vmovl_high_s16(hi)), sc);
    } else {
        const __fp16 * p = (const __fp16 *) row + d;
        const float16x8_t x0 = vld1q_f16(p), x1 = vld1q_f16(p + 8);
        x[0] = vcvt_f32_f16(vget_low_f16(x0));
        x[1] = vcvt_high_f32_f16(x0);
        x[2] = vcvt_f32_f16(vget_low_f16(x1));
        x[3] = vcvt_high_f32_f16(x1);
    }
}

template <int N, bool Q8>
static inline void oa_fa_vmad_n(int64_t DV, float * const * a, const void * const * v, const float * const * w, int nb) {
    bool live[OA_FA_B];
    for (int j = 0; j < nb; j++) {
        live[j] = false;
        for (int i = 0; i < N; i++) live[j] = live[j] || w[i][j] != 0.0f;
    }
    for (int64_t d = 0; d < DV; d += 16) {
        float32x4_t s[N][4];
        for (int i = 0; i < N; i++) {
            for (int r = 0; r < 4; r++) s[i][r] = vld1q_f32(a[i] + d + 4*r);
        }
        for (int j = 0; j < nb; j++) {
            if (!live[j]) continue;
            float32x4_t x[4];
            oa_fa_load16<Q8>(v[j], d, x);
            for (int i = 0; i < N; i++) {
                const float32x4_t wi = vdupq_n_f32(w[i][j]);
                for (int r = 0; r < 4; r++) s[i][r] = vfmaq_f32(s[i][r], x[r], wi);
            }
        }
        for (int i = 0; i < N; i++) {
            for (int r = 0; r < 4; r++) vst1q_f32(a[i] + d + 4*r, s[i][r]);
        }
    }
}
#else
template <int N, bool Q8>
static inline void oa_fa_vmad_n(int64_t DV, float * const * a, const void * const * v, const float * const * w, int nb) {
    float row[OA_FA_D];
    for (int j = 0; j < nb; j++) {
        bool live = false;
        for (int i = 0; i < N; i++) live = live || w[i][j] != 0.0f;
        if (!live) continue;
        if (Q8) ggml_get_type_traits(GGML_TYPE_Q8_0)->to_float(v[j], row, DV);
        for (int i = 0; i < N; i++) {
            if (w[i][j] == 0.0f) continue;
            if (Q8) ggml_vec_mad_f32((int) DV, a[i], row, w[i][j]);
            else    ggml_vec_mad_f16_f32((int) DV, a[i], (const ggml_fp16_t *) v[j], w[i][j]);
        }
    }
}
#endif

template <bool Q8>
static void oa_fa_vmad(int64_t DV, float (*acc)[OA_FA_D], const void * const * v, const float (*w)[OA_FA_B], int nb, int G) {
    for (int i0 = 0; i0 < G; i0 += 4) {
        float * a[4];
        const float * ww[4];
        const int n = G - i0 < 4 ? G - i0 : 4;
        for (int i = 0; i < n; i++) {
            a[i]  = acc[i0 + i];
            ww[i] = w[i0 + i];
        }
        switch (n) {
            case 1:  oa_fa_vmad_n<1, Q8>(DV, a, v, ww, nb); break;
            case 2:  oa_fa_vmad_n<2, Q8>(DV, a, v, ww, nb); break;
            case 3:  oa_fa_vmad_n<3, Q8>(DV, a, v, ww, nb); break;
            default: oa_fa_vmad_n<4, Q8>(DV, a, v, ww, nb); break;
        }
    }
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
        ggml_vec_dot_f16((int) DK, &out[i], 0, const_cast<ggml_fp16_t *>(k), 0, const_cast<ggml_fp16_t *>(q[i]), 0, 1);
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
    ggml_from_float_t q_to_k;   // for 8-bit K: a query row as ggml's K dot takes it, and that dot
    ggml_vec_dot_t    k_dot;    // (16-bit K: 16-bit queries and oa_fa_kdot_heads)
};

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
    const auto kv_type = [](ggml_type t) { return t == GGML_TYPE_F16 || t == GGML_TYPE_Q8_0; };
    if (o.q->type != GGML_TYPE_F32 || !kv_type(o.k->type) || !kv_type(o.v->type)) return false;
    if (ggml_type_size(GGML_TYPE_Q8_0) != sizeof(oa_fa_q8) || ggml_blck_size(GGML_TYPE_Q8_0) != 32) return false;
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
    if (o.k->nb[0] != ggml_type_size(o.k->type) || o.v->nb[0] != ggml_type_size(o.v->type) || o.q->nb[0] != sizeof(float)) return false;
    o.q_to_k = nullptr;
    o.k_dot  = nullptr;
    if (o.k->type != GGML_TYPE_F16) {
        const ggml_type kq = ggml_get_type_traits_cpu(o.k->type)->vec_dot_type;
        o.q_to_k = ggml_get_type_traits_cpu(kq)->from_float;
        o.k_dot  = ggml_get_type_traits_cpu(o.k->type)->vec_dot;
        if (!o.q_to_k || !o.k_dot || ggml_row_size(kq, o.DK) > (size_t) OA_FA_D * sizeof(ggml_fp16_t)) return false;
    }
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

// Whether fa-decode.inc takes this op: ggml's split path (one query, a long memory) then runs for
// the 8-bit memory as well, which ggml leaves to its one-head-at-a-time path.
static bool oa_fa_takes(ggml_tensor * dst) {
    oa_fa_op o;
    return oa_fa_prepare(dst, o);
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
    const bool k16 = k->type == GGML_TYPE_F16;
    const bool v8  = v->type == GGML_TYPE_Q8_0;

    alignas(64) float acc[OA_FA_G][OA_FA_D];
    alignas(64) char  qk[OA_FA_G][OA_FA_D * sizeof(ggml_fp16_t)];  // the queries as the K dot takes them
    float s[OA_FA_G][OA_FA_B];
    float w[OA_FA_G][OA_FA_B];
    float M[OA_FA_G], S[OA_FA_G], slope[OA_FA_G], mvs[OA_FA_G], dots[OA_FA_G];
    const ggml_fp16_t * mp[OA_FA_G];
    const void * vrow[OA_FA_B];

    for (int i = 0; i < G; i++) {
        const int64_t h = hs[i];
        M[i] = -INFINITY;
        S[i] = 0.0f;
        slope[i] = (o.max_bias > 0.0f) ? (h < o.n_head_log2 ? powf(o.m0, h + 1) : powf(o.m1, 2*(h - o.n_head_log2) + 1)) : 1.0f;
        memset(acc[i], 0, DV * sizeof(float));
        const float * pq = (const float *) ((const char *) q->data + q1s[i] * q->nb[1] + h * q->nb[2] + iq3 * q->nb[3]);
        if (k16) ggml_cpu_fp32_to_fp16(pq, (ggml_fp16_t *) qk[i], DK);
        else     o.q_to_k(pq, qk[i], DK);
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
            const char * kr = kbase + c * k->nb[1];
            vrow[j] = vbase + c * v->nb[1];
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
            if (k16) {
                oa_fa_kdot_heads(DK, (const ggml_fp16_t *) kr, (const ggml_fp16_t (*)[OA_FA_D]) qk, G, dots);
            } else {
                for (int i = 0; i < G; i++) {
                    if (mvs[i] != -INFINITY) o.k_dot((int) DK, &dots[i], 0, kr, 0, qk[i], 0, 1);
                }
            }
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
        // online softmax over the block, then the V sums of all the rows together
        bool live = false;
        for (int i = 0; i < G; i++) {
            float bm = -INFINITY;
            for (int j = 0; j < nb; j++) bm = std::max(bm, s[i][j]);
            if (bm == -INFINITY) {  // all masked
                for (int j = 0; j < nb; j++) w[i][j] = 0.0f;
                continue;
            }
            live = true;
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
        }
        if (!live) continue;
        if (v8) oa_fa_vmad<true>(DV, acc, vrow, w, nb, G);
        else    oa_fa_vmad<false>(DV, acc, vrow, w, nb, G);
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
