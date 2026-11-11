// Offline AI: attention over the conversation memory while writing, in three plain passes.
//
// ggml's flash attention handles one remembered position at a time: a dot product with its key,
// a call to expf, then its value added into a half-float sum. With thousands of positions and
// dozens of heads that is millions of tiny steps per written token, and on models that attend to
// the whole conversation in every layer (Llama 3.2, Phi-4, Granite, Ministral) it costs more than
// the weights themselves once a chat is a few thousand tokens long.
//
// Here the same sum is taken as
//   1. every key's dot product with the query, four keys at a time,
//   2. one vectorized exp over all the scores (ggml_vec_soft_max_f32),
//   3. the values added up with their weights, four at a time, in 32-bit floats.
// The result is the same attention output (sums in 32 bits instead of 16, so if anything closer
// to the exact value). Used when keys and values are half floats, which is how the memory is kept
// unless it is set to 8 bits.
//
// Included from ggml-cpu/ops.cpp by third_party/patches/0002-fattn-fast.patch.
// tools/host-test/test_fattn.cpp checks it against ggml's reference path.

#if defined(__AVX512F__) || (defined(__AVX2__) && defined(__FMA__) && defined(__F16C__)) || \
    (defined(__ARM_NEON) && defined(__aarch64__))
#define OA_FA_FAST 1

#include <cstdlib>
#include <vector>

// OA_FATTN_OFF=1 in the environment leaves attention to ggml's own code, for measuring one
// against the other (tools/host-test/real.sh does).
static bool oa_fa_on() {
    static const bool on = getenv("OA_FATTN_OFF") == nullptr;
    return on;
}

// scores[i] = key(idx[i]) . q      (keys are rows of half floats `stride` bytes apart)
static void oa_fa_scores(const char * k, size_t stride, const int32_t * idx, int n,
                         const float * q, int D, float * s) {
    int i = 0;
    for (; i + 4 <= n; i += 4) {
        const ggml_fp16_t * r0 = (const ggml_fp16_t *) (k + (size_t) idx[i + 0]*stride);
        const ggml_fp16_t * r1 = (const ggml_fp16_t *) (k + (size_t) idx[i + 1]*stride);
        const ggml_fp16_t * r2 = (const ggml_fp16_t *) (k + (size_t) idx[i + 2]*stride);
        const ggml_fp16_t * r3 = (const ggml_fp16_t *) (k + (size_t) idx[i + 3]*stride);
        int d = 0;
#if defined(__AVX512F__)
        __m512 a0 = _mm512_setzero_ps(), a1 = a0, a2 = a0, a3 = a0;
        for (; d + 16 <= D; d += 16) {
            const __m512 qv = _mm512_loadu_ps(q + d);
            a0 = _mm512_fmadd_ps(_mm512_cvtph_ps(_mm256_loadu_si256((const __m256i *) (r0 + d))), qv, a0);
            a1 = _mm512_fmadd_ps(_mm512_cvtph_ps(_mm256_loadu_si256((const __m256i *) (r1 + d))), qv, a1);
            a2 = _mm512_fmadd_ps(_mm512_cvtph_ps(_mm256_loadu_si256((const __m256i *) (r2 + d))), qv, a2);
            a3 = _mm512_fmadd_ps(_mm512_cvtph_ps(_mm256_loadu_si256((const __m256i *) (r3 + d))), qv, a3);
        }
        const __m256 h0 = _mm256_add_ps(_mm512_castps512_ps256(a0), _mm256_castpd_ps(_mm512_extractf64x4_pd(_mm512_castps_pd(a0), 1)));
        const __m256 h1 = _mm256_add_ps(_mm512_castps512_ps256(a1), _mm256_castpd_ps(_mm512_extractf64x4_pd(_mm512_castps_pd(a1), 1)));
        const __m256 h2 = _mm256_add_ps(_mm512_castps512_ps256(a2), _mm256_castpd_ps(_mm512_extractf64x4_pd(_mm512_castps_pd(a2), 1)));
        const __m256 h3 = _mm256_add_ps(_mm512_castps512_ps256(a3), _mm256_castpd_ps(_mm512_extractf64x4_pd(_mm512_castps_pd(a3), 1)));
#else
#if defined(__AVX2__)
        __m256 h0 = _mm256_setzero_ps(), h1 = h0, h2 = h0, h3 = h0;
        for (; d + 8 <= D; d += 8) {
            const __m256 qv = _mm256_loadu_ps(q + d);
            h0 = _mm256_fmadd_ps(_mm256_cvtph_ps(_mm_loadu_si128((const __m128i *) (r0 + d))), qv, h0);
            h1 = _mm256_fmadd_ps(_mm256_cvtph_ps(_mm_loadu_si128((const __m128i *) (r1 + d))), qv, h1);
            h2 = _mm256_fmadd_ps(_mm256_cvtph_ps(_mm_loadu_si128((const __m128i *) (r2 + d))), qv, h2);
            h3 = _mm256_fmadd_ps(_mm256_cvtph_ps(_mm_loadu_si128((const __m128i *) (r3 + d))), qv, h3);
        }
#endif
#endif
#if defined(__AVX2__) || defined(__AVX512F__)
        {
            // four sums of eight floats each, taken together
            __m128 x0 = _mm_add_ps(_mm256_castps256_ps128(h0), _mm256_extractf128_ps(h0, 1));
            __m128 x1 = _mm_add_ps(_mm256_castps256_ps128(h1), _mm256_extractf128_ps(h1, 1));
            __m128 x2 = _mm_add_ps(_mm256_castps256_ps128(h2), _mm256_extractf128_ps(h2, 1));
            __m128 x3 = _mm_add_ps(_mm256_castps256_ps128(h3), _mm256_extractf128_ps(h3, 1));
            x0 = _mm_hadd_ps(x0, x1);
            x2 = _mm_hadd_ps(x2, x3);
            _mm_storeu_ps(s + i, _mm_hadd_ps(x0, x2));
        }
#else  // NEON
        float32x4_t a0 = vdupq_n_f32(0.0f), a1 = a0, a2 = a0, a3 = a0;
        float32x4_t b0 = a0, b1 = a0, b2 = a0, b3 = a0;
        for (; d + 8 <= D; d += 8) {
            const float32x4_t q0 = vld1q_f32(q + d);
            const float32x4_t q1 = vld1q_f32(q + d + 4);
            a0 = vfmaq_f32(a0, vcvt_f32_f16(vld1_f16((const __fp16 *) (r0 + d))), q0);
            b0 = vfmaq_f32(b0, vcvt_f32_f16(vld1_f16((const __fp16 *) (r0 + d + 4))), q1);
            a1 = vfmaq_f32(a1, vcvt_f32_f16(vld1_f16((const __fp16 *) (r1 + d))), q0);
            b1 = vfmaq_f32(b1, vcvt_f32_f16(vld1_f16((const __fp16 *) (r1 + d + 4))), q1);
            a2 = vfmaq_f32(a2, vcvt_f32_f16(vld1_f16((const __fp16 *) (r2 + d))), q0);
            b2 = vfmaq_f32(b2, vcvt_f32_f16(vld1_f16((const __fp16 *) (r2 + d + 4))), q1);
            a3 = vfmaq_f32(a3, vcvt_f32_f16(vld1_f16((const __fp16 *) (r3 + d))), q0);
            b3 = vfmaq_f32(b3, vcvt_f32_f16(vld1_f16((const __fp16 *) (r3 + d + 4))), q1);
        }
        {
            a0 = vaddq_f32(a0, b0);
            a1 = vaddq_f32(a1, b1);
            a2 = vaddq_f32(a2, b2);
            a3 = vaddq_f32(a3, b3);
            // [a0 pairs, a1 pairs], [a2 pairs, a3 pairs], then pairs of those
            const float32x4_t p01 = vpaddq_f32(a0, a1);
            const float32x4_t p23 = vpaddq_f32(a2, a3);
            vst1q_f32(s + i, vpaddq_f32(p01, p23));
        }
#endif
        for (; d < D; d++) {
            const float qd = q[d];
            s[i + 0] += GGML_CPU_FP16_TO_FP32(r0[d])*qd;
            s[i + 1] += GGML_CPU_FP16_TO_FP32(r1[d])*qd;
            s[i + 2] += GGML_CPU_FP16_TO_FP32(r2[d])*qd;
            s[i + 3] += GGML_CPU_FP16_TO_FP32(r3[d])*qd;
        }
    }
    for (; i < n; i++) {
        const ggml_fp16_t * r = (const ggml_fp16_t *) (k + (size_t) idx[i]*stride);
        int d = 0;
        float sum = 0.0f;
#if defined(__AVX512F__)
        __m512 a = _mm512_setzero_ps();
        for (; d + 16 <= D; d += 16) {
            a = _mm512_fmadd_ps(_mm512_cvtph_ps(_mm256_loadu_si256((const __m256i *) (r + d))), _mm512_loadu_ps(q + d), a);
        }
        sum = _mm512_reduce_add_ps(a);
#elif defined(__AVX2__)
        __m256 a = _mm256_setzero_ps();
        for (; d + 8 <= D; d += 8) {
            a = _mm256_fmadd_ps(_mm256_cvtph_ps(_mm_loadu_si128((const __m128i *) (r + d))), _mm256_loadu_ps(q + d), a);
        }
        __m128 x = _mm_add_ps(_mm256_castps256_ps128(a), _mm256_extractf128_ps(a, 1));
        x = _mm_hadd_ps(x, x);
        x = _mm_hadd_ps(x, x);
        sum = _mm_cvtss_f32(x);
#else
        float32x4_t a = vdupq_n_f32(0.0f);
        for (; d + 4 <= D; d += 4) {
            a = vfmaq_f32(a, vcvt_f32_f16(vld1_f16((const __fp16 *) (r + d))), vld1q_f32(q + d));
        }
        sum = vaddvq_f32(a);
#endif
        for (; d < D; d++) {
            sum += GGML_CPU_FP16_TO_FP32(r[d])*q[d];
        }
        s[i] = sum;
    }
}

// acc[d] += sum over i of p[i] * value(idx[i])[d]
static void oa_fa_values(const char * v, size_t stride, const int32_t * idx, const float * p, int n,
                         int D, float * acc) {
    int i = 0;
    for (; i + 4 <= n; i += 4) {
        const ggml_fp16_t * r0 = (const ggml_fp16_t *) (v + (size_t) idx[i + 0]*stride);
        const ggml_fp16_t * r1 = (const ggml_fp16_t *) (v + (size_t) idx[i + 1]*stride);
        const ggml_fp16_t * r2 = (const ggml_fp16_t *) (v + (size_t) idx[i + 2]*stride);
        const ggml_fp16_t * r3 = (const ggml_fp16_t *) (v + (size_t) idx[i + 3]*stride);
        int d = 0;
#if defined(__AVX512F__)
        const __m512 p0 = _mm512_set1_ps(p[i + 0]), p1 = _mm512_set1_ps(p[i + 1]);
        const __m512 p2 = _mm512_set1_ps(p[i + 2]), p3 = _mm512_set1_ps(p[i + 3]);
        for (; d + 16 <= D; d += 16) {
            __m512 t = _mm512_mul_ps(_mm512_cvtph_ps(_mm256_loadu_si256((const __m256i *) (r0 + d))), p0);
            __m512 u = _mm512_mul_ps(_mm512_cvtph_ps(_mm256_loadu_si256((const __m256i *) (r2 + d))), p2);
            t = _mm512_fmadd_ps(_mm512_cvtph_ps(_mm256_loadu_si256((const __m256i *) (r1 + d))), p1, t);
            u = _mm512_fmadd_ps(_mm512_cvtph_ps(_mm256_loadu_si256((const __m256i *) (r3 + d))), p3, u);
            _mm512_storeu_ps(acc + d, _mm512_add_ps(_mm512_loadu_ps(acc + d), _mm512_add_ps(t, u)));
        }
#elif defined(__AVX2__)
        const __m256 p0 = _mm256_set1_ps(p[i + 0]), p1 = _mm256_set1_ps(p[i + 1]);
        const __m256 p2 = _mm256_set1_ps(p[i + 2]), p3 = _mm256_set1_ps(p[i + 3]);
        for (; d + 8 <= D; d += 8) {
            __m256 t = _mm256_mul_ps(_mm256_cvtph_ps(_mm_loadu_si128((const __m128i *) (r0 + d))), p0);
            __m256 u = _mm256_mul_ps(_mm256_cvtph_ps(_mm_loadu_si128((const __m128i *) (r2 + d))), p2);
            t = _mm256_fmadd_ps(_mm256_cvtph_ps(_mm_loadu_si128((const __m128i *) (r1 + d))), p1, t);
            u = _mm256_fmadd_ps(_mm256_cvtph_ps(_mm_loadu_si128((const __m128i *) (r3 + d))), p3, u);
            _mm256_storeu_ps(acc + d, _mm256_add_ps(_mm256_loadu_ps(acc + d), _mm256_add_ps(t, u)));
        }
#else
        const float32x4_t p0 = vdupq_n_f32(p[i + 0]), p1 = vdupq_n_f32(p[i + 1]);
        const float32x4_t p2 = vdupq_n_f32(p[i + 2]), p3 = vdupq_n_f32(p[i + 3]);
        for (; d + 4 <= D; d += 4) {
            float32x4_t t = vmulq_f32(vcvt_f32_f16(vld1_f16((const __fp16 *) (r0 + d))), p0);
            float32x4_t u = vmulq_f32(vcvt_f32_f16(vld1_f16((const __fp16 *) (r2 + d))), p2);
            t = vfmaq_f32(t, vcvt_f32_f16(vld1_f16((const __fp16 *) (r1 + d))), p1);
            u = vfmaq_f32(u, vcvt_f32_f16(vld1_f16((const __fp16 *) (r3 + d))), p3);
            vst1q_f32(acc + d, vaddq_f32(vld1q_f32(acc + d), vaddq_f32(t, u)));
        }
#endif
        for (; d < D; d++) {
            acc[d] += GGML_CPU_FP16_TO_FP32(r0[d])*p[i + 0] + GGML_CPU_FP16_TO_FP32(r1[d])*p[i + 1] +
                      GGML_CPU_FP16_TO_FP32(r2[d])*p[i + 2] + GGML_CPU_FP16_TO_FP32(r3[d])*p[i + 3];
        }
    }
    for (; i < n; i++) {
        const ggml_fp16_t * r = (const ggml_fp16_t *) (v + (size_t) idx[i]*stride);
        const float pi = p[i];
        int d = 0;
#if defined(__AVX512F__)
        const __m512 pv = _mm512_set1_ps(pi);
        for (; d + 16 <= D; d += 16) {
            _mm512_storeu_ps(acc + d, _mm512_fmadd_ps(_mm512_cvtph_ps(_mm256_loadu_si256((const __m256i *) (r + d))), pv,
                                                      _mm512_loadu_ps(acc + d)));
        }
#elif defined(__AVX2__)
        const __m256 pv = _mm256_set1_ps(pi);
        for (; d + 8 <= D; d += 8) {
            _mm256_storeu_ps(acc + d, _mm256_fmadd_ps(_mm256_cvtph_ps(_mm_loadu_si128((const __m128i *) (r + d))), pv,
                                                      _mm256_loadu_ps(acc + d)));
        }
#else
        const float32x4_t pv = vdupq_n_f32(pi);
        for (; d + 4 <= D; d += 4) {
            vst1q_f32(acc + d, vfmaq_f32(vld1q_f32(acc + d), vcvt_f32_f16(vld1_f16((const __fp16 *) (r + d))), pv));
        }
#endif
        for (; d < D; d++) {
            acc[d] += GGML_CPU_FP16_TO_FP32(r[d])*pi;
        }
    }
}

// Scores to weights for one row: scale, soft cap and mask, then exp(score - largest) in place.
// Returns the sum of the weights and sets *M_out to the largest score (-inf: nothing visible).
static float oa_fa_weights(float * s, const int32_t * idx, int n, const ggml_fp16_t * mp, bool mask_adds,
                           float slope, float scale, float logit_softcap, float * M_out) {
    float M = -INFINITY;
    if (logit_softcap != 0.0f || mask_adds) {
        for (int i = 0; i < n; i++) {
            float x = s[i]*scale;
            if (logit_softcap != 0.0f) {
                x = logit_softcap*tanhf(x);
            }
            if (mask_adds) {
                x += slope*GGML_CPU_FP16_TO_FP32(mp[idx[i]]);
            }
            s[i] = x;
            if (x > M) {
                M = x;
            }
        }
    } else {
        ggml_vec_scale_f32(n, s, scale);
        ggml_vec_max_f32(n, &M, s);
    }
    *M_out = M;
    if (!(M > -INFINITY)) {
        return 0.0f;  // every score is -inf (or not a number): nothing to add, as in the reference
    }
    return (float) ggml_vec_soft_max_f32(n, s, s, M);
}

// The positions of [ic_start, ic_end) a mask row lets through, in order. Returns how many;
// *mask_adds says whether any of them carries a mask value other than 0.
static int oa_fa_visible(const ggml_fp16_t * mp, int64_t ic_start, int64_t ic_end, int32_t * idx, bool * mask_adds) {
    int n = 0;
    *mask_adds = false;
    if (mp) {
        bool adds = false;
        for (int64_t ic = ic_start; ic < ic_end; ic++) {
            const ggml_fp16_t m = mp[ic];
            if (m == 0xFC00) {  // -inf
                continue;
            }
            adds |= (m & 0x7FFF) != 0;
            idx[n++] = (int32_t) ic;
        }
        *mask_adds = adds;
    } else {
        for (int64_t ic = ic_start; ic < ic_end; ic++) {
            idx[n++] = (int32_t) ic;
        }
    }
    return n;
}

// One query row against the remembered positions [ic_start, ic_end): the largest score M, the sum
// S of exp(score - M), and acc = sum of exp(score - M) * value. `mp` is the row's mask (half
// floats, -inf where a position must not be seen) or NULL; `k` and `v` point at position 0 of
// this head's keys and values.
static void oa_fa_row(const float * q, const char * k, size_t k_stride, const char * v, size_t v_stride,
                      const ggml_fp16_t * mp, float slope, int64_t ic_start, int64_t ic_end,
                      int DK, int DV, float scale, float logit_softcap,
                      float * acc, float * M_out, float * S_out) {
    static thread_local std::vector<int32_t> idx_buf;
    static thread_local std::vector<float>   s_buf;

    const int n_max = (int) (ic_end - ic_start);
    memset(acc, 0, (size_t) DV*sizeof(float));
    *M_out = -INFINITY;
    *S_out = 0.0f;
    if (n_max <= 0) {
        return;
    }
    if ((int) idx_buf.size() < n_max) {
        idx_buf.resize((size_t) n_max);
        s_buf.resize((size_t) n_max);
    }
    int32_t * idx = idx_buf.data();
    float *   s   = s_buf.data();

    bool mask_adds = false;
    const int n = oa_fa_visible(mp, ic_start, ic_end, idx, &mask_adds);
    if (n == 0) {
        return;
    }
    oa_fa_scores(k, k_stride, idx, n, q, DK, s);
    const float S = oa_fa_weights(s, idx, n, mp, mask_adds, slope, scale, logit_softcap, M_out);
    if (!(*M_out > -INFINITY)) {
        *M_out = -INFINITY;
        return;
    }
    *S_out = S;
    oa_fa_values(v, v_stride, idx, s, n, DV, acc);
}

// Positions handled together so that their keys (or values) for every head stay in the nearest
// cache while all the heads use them.
static int oa_fa_block(size_t row_bytes) {
    int b = (int) (24*1024/(row_bytes ? row_bytes : 1));
    if (b < 4) b = 4;
    if (b > 256) b = 256;
    return b & ~3;
}

// One written token, every head, against the positions [ic_start, ic_end): what the split path
// of ggml_compute_forward_flash_attn_ext_f16 does head by head, but a block of positions at a
// time, so each key and value row comes in from memory once and serves every head that uses it.
// One mask row for all heads, no ALiBi slope. Writes [M, S, sum of values] per head to
// partials + head*partial_stride.
static void oa_fa_heads(const char * q, size_t q_stride_head, int n_head,
                        const char * k, size_t k_stride_pos, size_t k_stride_head, int rk2,
                        const char * v, size_t v_stride_pos, size_t v_stride_head, int rv2,
                        const ggml_fp16_t * mp, int64_t ic_start, int64_t ic_end,
                        int DK, int DV, float scale, float logit_softcap,
                        float * partials, int64_t partial_stride) {
    static thread_local std::vector<int32_t> idx_buf;
    static thread_local std::vector<float>   s_buf;
    static thread_local std::vector<float>   acc_buf;

    const int n_max = (int) (ic_end - ic_start);
    if ((int) idx_buf.size() < n_max) {
        idx_buf.resize((size_t) n_max);
    }
    if (s_buf.size() < (size_t) n_max*n_head) {
        s_buf.resize((size_t) n_max*n_head);
    }
    if (acc_buf.size() < (size_t) DV*n_head) {
        acc_buf.resize((size_t) DV*n_head);
    }
    int32_t * idx = idx_buf.data();
    float *   s   = s_buf.data();
    float *   acc = acc_buf.data();
    memset(acc, 0, (size_t) DV*n_head*sizeof(float));

    bool mask_adds = false;
    const int n = n_max > 0 ? oa_fa_visible(mp, ic_start, ic_end, idx, &mask_adds) : 0;

    const int kb = oa_fa_block(k_stride_pos);
    for (int i0 = 0; i0 < n; i0 += kb) {
        const int cnt = n - i0 < kb ? n - i0 : kb;
        for (int h = 0; h < n_head; h++) {
            oa_fa_scores(k + (size_t) (h/rk2)*k_stride_head, k_stride_pos, idx + i0, cnt,
                         (const float *) (q + (size_t) h*q_stride_head), DK, s + (size_t) h*n + i0);
        }
    }

    for (int h = 0; h < n_head; h++) {
        float * partial = partials + h*partial_stride;
        float M = -INFINITY;
        float S = 0.0f;
        if (n > 0) {
            S = oa_fa_weights(s + (size_t) h*n, idx, n, mp, mask_adds, 1.0f, scale, logit_softcap, &M);
        }
        if (!(M > -INFINITY)) {
            // nothing visible: tell the last pass to add nothing for this head
            M = -INFINITY;
            S = 0.0f;
            if (n > 0) {
                memset(s + (size_t) h*n, 0, (size_t) n*sizeof(float));
            }
        }
        partial[0] = M;
        partial[1] = S;
    }

    const int vb = oa_fa_block(v_stride_pos);
    for (int i0 = 0; i0 < n; i0 += vb) {
        const int cnt = n - i0 < vb ? n - i0 : vb;
        for (int h = 0; h < n_head; h++) {
            oa_fa_values(v + (size_t) (h/rv2)*v_stride_head, v_stride_pos, idx + i0, s + (size_t) h*n + i0, cnt,
                         DV, acc + (size_t) h*DV);
        }
    }

    for (int h = 0; h < n_head; h++) {
        memcpy(partials + h*partial_stride + 2, acc + (size_t) h*DV, (size_t) DV*sizeof(float));
    }
}

#endif  // a SIMD target with half-float conversion
