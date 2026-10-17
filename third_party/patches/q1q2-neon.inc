// Faster Q1_0 and Q2_0 dot products for ARM NEON (PrismML's Bonsai models), from Offline AI.
// Included by ggml/src/ggml-cpu/arch/arm/quants.c (see third_party/patches/apply.sh) and by
// tools/host-test/test_kernels.c, which checks them against the plain C versions.
//
// Needs, from the includer: block_q1_0, block_q2_0, block_q8_0, QK1_0, QK2_0, ggml_vdotq_s32,
// ggml_vqtbl1q_u8, GGML_CPU_FP16_TO_FP32 and the NEON intrinsics.
//
// What changed from upstream:
// - Q1_0: the 1-bit signs are expanded with one table lookup and one bit test per 16 weights
//   (upstream: four scalar table loads and five vector ops per 8), and the four int sums of a
//   block are converted to float together instead of one at a time.
// - Both: a 2x2 version (two weight rows against two token columns) for reading prompts, where the
//   sign/value expansion is shared by both columns. ggml calls it when type_traits nrows == 2.

// ---------------------------------------------------------------- Q1_0

// Lanes 0-7 take byte 2t of a block's 16 bytes of bits, lanes 8-15 byte 2t+1.
static const uint8_t oa_q1_idx[8][16] = {
    { 0, 0, 0, 0, 0, 0, 0, 0,  1, 1, 1, 1, 1, 1, 1, 1},
    { 2, 2, 2, 2, 2, 2, 2, 2,  3, 3, 3, 3, 3, 3, 3, 3},
    { 4, 4, 4, 4, 4, 4, 4, 4,  5, 5, 5, 5, 5, 5, 5, 5},
    { 6, 6, 6, 6, 6, 6, 6, 6,  7, 7, 7, 7, 7, 7, 7, 7},
    { 8, 8, 8, 8, 8, 8, 8, 8,  9, 9, 9, 9, 9, 9, 9, 9},
    {10,10,10,10,10,10,10,10, 11,11,11,11,11,11,11,11},
    {12,12,12,12,12,12,12,12, 13,13,13,13,13,13,13,13},
    {14,14,14,14,14,14,14,14, 15,15,15,15,15,15,15,15},
};
static const uint8_t oa_q1_bit[16] = {1, 2, 4, 8, 16, 32, 64, 128, 1, 2, 4, 8, 16, 32, 64, 128};

// -1 where the weight's bit is set (weight +d), +1 where it is clear (weight -d): the negated
// sign, so the sums come out negated and the block scale carries the minus.
static inline int8x16_t oa_q1_nsign(const uint8x16_t bits, const uint8_t * idx, const uint8x16_t bitmask) {
    const uint8x16_t m = vtstq_u8(ggml_vqtbl1q_u8(bits, vld1q_u8(idx)), bitmask);
    return vreinterpretq_s8_u8(vorrq_u8(m, vdupq_n_u8(1)));
}

static inline float32x4_t oa_q8_scales4(const block_q8_0 * y) {
    const float32x4_t d = {
        GGML_CPU_FP16_TO_FP32(y[0].d), GGML_CPU_FP16_TO_FP32(y[1].d),
        GGML_CPU_FP16_TO_FP32(y[2].d), GGML_CPU_FP16_TO_FP32(y[3].d),
    };
    return d;
}

// One Q1_0 block (128 weights) against the four Q8_0 blocks under it: the four negated int sums.
static inline int32x4_t oa_q1_block(const block_q1_0 * x, const block_q8_0 * y, const uint8x16_t bitmask) {
    const uint8x16_t bits = vld1q_u8(x->qs);
    int32x4_t a[4];
    for (int k = 0; k < 4; k++) {
        const int8x16_t s0 = oa_q1_nsign(bits, oa_q1_idx[2 * k], bitmask);
        const int8x16_t s1 = oa_q1_nsign(bits, oa_q1_idx[2 * k + 1], bitmask);
        a[k] = ggml_vdotq_s32(ggml_vdotq_s32(vdupq_n_s32(0), s0, vld1q_s8(y[k].qs)), s1, vld1q_s8(y[k].qs + 16));
    }
    return vpaddq_s32(vpaddq_s32(a[0], a[1]), vpaddq_s32(a[2], a[3]));
}

static void oa_vec_dot_q1_0_q8_0(int n, float * GGML_RESTRICT s, size_t bs, const void * GGML_RESTRICT vx, size_t bx,
                                 const void * GGML_RESTRICT vy, size_t by, int nrc) {
    const int nb = n / QK1_0;
    const uint8x16_t bitmask = vld1q_u8(oa_q1_bit);

    if (nrc == 2) {
        const block_q1_0 * GGML_RESTRICT x0 = (const block_q1_0 *) vx;
        const block_q1_0 * GGML_RESTRICT x1 = (const block_q1_0 *) ((const uint8_t *) vx + bx);
        const block_q8_0 * GGML_RESTRICT y0 = (const block_q8_0 *) vy;
        const block_q8_0 * GGML_RESTRICT y1 = (const block_q8_0 *) ((const uint8_t *) vy + by);
        // lanes: x0*y0, x1*y0, x0*y1, x1*y1 (the order ggml stores them in: s[0], s[1], s[bs], s[bs+1])
        float32x4_t acc = vdupq_n_f32(0.0f);
        for (int i = 0; i < nb; i++) {
            const uint8x16_t b0 = vld1q_u8(x0[i].qs);
            const uint8x16_t b1 = vld1q_u8(x1[i].qs);
            const float dx0 = -GGML_CPU_FP16_TO_FP32(x0[i].d);
            const float dx1 = -GGML_CPU_FP16_TO_FP32(x1[i].d);
            for (int k = 0; k < 4; k++) {
                const block_q8_0 * ya = &y0[i * 4 + k];
                const block_q8_0 * yb = &y1[i * 4 + k];
                const int8x16_t s0a = oa_q1_nsign(b0, oa_q1_idx[2 * k], bitmask);
                const int8x16_t s0b = oa_q1_nsign(b0, oa_q1_idx[2 * k + 1], bitmask);
                const int8x16_t s1a = oa_q1_nsign(b1, oa_q1_idx[2 * k], bitmask);
                const int8x16_t s1b = oa_q1_nsign(b1, oa_q1_idx[2 * k + 1], bitmask);
                const int8x16_t ya0 = vld1q_s8(ya->qs), ya1 = vld1q_s8(ya->qs + 16);
                const int8x16_t yb0 = vld1q_s8(yb->qs), yb1 = vld1q_s8(yb->qs + 16);
                const int32x4_t z = vdupq_n_s32(0);
                const int32x4_t a00 = ggml_vdotq_s32(ggml_vdotq_s32(z, s0a, ya0), s0b, ya1);
                const int32x4_t a10 = ggml_vdotq_s32(ggml_vdotq_s32(z, s1a, ya0), s1b, ya1);
                const int32x4_t a01 = ggml_vdotq_s32(ggml_vdotq_s32(z, s0a, yb0), s0b, yb1);
                const int32x4_t a11 = ggml_vdotq_s32(ggml_vdotq_s32(z, s1a, yb0), s1b, yb1);
                const int32x4_t v = vpaddq_s32(vpaddq_s32(a00, a10), vpaddq_s32(a01, a11));
                const float dya = GGML_CPU_FP16_TO_FP32(ya->d);
                const float dyb = GGML_CPU_FP16_TO_FP32(yb->d);
                const float32x4_t sc = {dx0 * dya, dx1 * dya, dx0 * dyb, dx1 * dyb};
                acc = vfmaq_f32(acc, vcvtq_f32_s32(v), sc);
            }
        }
        vst1_f32(s, vget_low_f32(acc));
        vst1_f32(s + bs, vget_high_f32(acc));
        return;
    }

    const block_q1_0 * GGML_RESTRICT x = (const block_q1_0 *) vx;
    const block_q8_0 * GGML_RESTRICT y = (const block_q8_0 *) vy;
    float32x4_t acc0 = vdupq_n_f32(0.0f);
    float32x4_t acc1 = vdupq_n_f32(0.0f);
    int i = 0;
    for (; i + 1 < nb; i += 2) {
        const int32x4_t v0 = oa_q1_block(&x[i], &y[i * 4], bitmask);
        const int32x4_t v1 = oa_q1_block(&x[i + 1], &y[(i + 1) * 4], bitmask);
        acc0 = vfmaq_f32(acc0, vcvtq_f32_s32(v0), vmulq_n_f32(oa_q8_scales4(&y[i * 4]), -GGML_CPU_FP16_TO_FP32(x[i].d)));
        acc1 = vfmaq_f32(acc1, vcvtq_f32_s32(v1), vmulq_n_f32(oa_q8_scales4(&y[(i + 1) * 4]), -GGML_CPU_FP16_TO_FP32(x[i + 1].d)));
    }
    for (; i < nb; i++) {
        const int32x4_t v0 = oa_q1_block(&x[i], &y[i * 4], bitmask);
        acc0 = vfmaq_f32(acc0, vcvtq_f32_s32(v0), vmulq_n_f32(oa_q8_scales4(&y[i * 4]), -GGML_CPU_FP16_TO_FP32(x[i].d)));
    }
    *s = vaddvq_f32(vaddq_f32(acc0, acc1));
    (void) bs;
    (void) bx;
    (void) by;
}

// ---------------------------------------------------------------- Q2_0

// 64 weights per block, four to a byte: weight j = ((qs[j / 4] >> 2 * (j % 4)) & 3) - 1.
static const uint8_t oa_q2_idx[4][16] = {
    {0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3},
    {4, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6, 7, 7, 7, 7},
    {8, 8, 8, 8, 9, 9, 9, 9, 10, 10, 10, 10, 11, 11, 11, 11},
    {12, 12, 12, 12, 13, 13, 13, 13, 14, 14, 14, 14, 15, 15, 15, 15},
};
static const int8_t oa_q2_shift[16] = {0, -2, -4, -6, 0, -2, -4, -6, 0, -2, -4, -6, 0, -2, -4, -6};

static inline int8x16_t oa_q2_vals(const uint8x16_t qs, const uint8_t * idx, const int8x16_t shifts) {
    const uint8x16_t b = ggml_vqtbl1q_u8(qs, vld1q_u8(idx));
    return vsubq_s8(vreinterpretq_s8_u8(vandq_u8(vshlq_u8(b, shifts), vdupq_n_u8(3))), vdupq_n_s8(1));
}

// Two Q2_0 blocks (128 weights) against their four Q8_0 blocks: four int sums.
static inline int32x4_t oa_q2_pair(const block_q2_0 * x, const block_q8_0 * y, const int8x16_t shifts) {
    int32x4_t a[4];
    for (int h = 0; h < 2; h++) {
        const uint8x16_t qs = vld1q_u8(x[h].qs);
        for (int k = 0; k < 2; k++) {
            const int8x16_t v0 = oa_q2_vals(qs, oa_q2_idx[2 * k], shifts);
            const int8x16_t v1 = oa_q2_vals(qs, oa_q2_idx[2 * k + 1], shifts);
            const block_q8_0 * yb = &y[2 * h + k];
            a[2 * h + k] = ggml_vdotq_s32(ggml_vdotq_s32(vdupq_n_s32(0), v0, vld1q_s8(yb->qs)), v1, vld1q_s8(yb->qs + 16));
        }
    }
    return vpaddq_s32(vpaddq_s32(a[0], a[1]), vpaddq_s32(a[2], a[3]));
}

static void oa_vec_dot_q2_0_q8_0(int n, float * GGML_RESTRICT s, size_t bs, const void * GGML_RESTRICT vx, size_t bx,
                                 const void * GGML_RESTRICT vy, size_t by, int nrc) {
    const int nb = n / QK2_0;
    const int8x16_t shifts = vld1q_s8(oa_q2_shift);

    if (nrc == 2) {
        const block_q2_0 * GGML_RESTRICT x0 = (const block_q2_0 *) vx;
        const block_q2_0 * GGML_RESTRICT x1 = (const block_q2_0 *) ((const uint8_t *) vx + bx);
        const block_q8_0 * GGML_RESTRICT y0 = (const block_q8_0 *) vy;
        const block_q8_0 * GGML_RESTRICT y1 = (const block_q8_0 *) ((const uint8_t *) vy + by);
        float32x4_t acc = vdupq_n_f32(0.0f);
        for (int i = 0; i < nb; i++) {
            const uint8x16_t q0 = vld1q_u8(x0[i].qs);
            const uint8x16_t q1 = vld1q_u8(x1[i].qs);
            const float dx0 = GGML_CPU_FP16_TO_FP32(x0[i].d);
            const float dx1 = GGML_CPU_FP16_TO_FP32(x1[i].d);
            for (int k = 0; k < 2; k++) {
                const block_q8_0 * ya = &y0[i * 2 + k];
                const block_q8_0 * yb = &y1[i * 2 + k];
                const int8x16_t v0a = oa_q2_vals(q0, oa_q2_idx[2 * k], shifts);
                const int8x16_t v0b = oa_q2_vals(q0, oa_q2_idx[2 * k + 1], shifts);
                const int8x16_t v1a = oa_q2_vals(q1, oa_q2_idx[2 * k], shifts);
                const int8x16_t v1b = oa_q2_vals(q1, oa_q2_idx[2 * k + 1], shifts);
                const int8x16_t ya0 = vld1q_s8(ya->qs), ya1 = vld1q_s8(ya->qs + 16);
                const int8x16_t yb0 = vld1q_s8(yb->qs), yb1 = vld1q_s8(yb->qs + 16);
                const int32x4_t z = vdupq_n_s32(0);
                const int32x4_t a00 = ggml_vdotq_s32(ggml_vdotq_s32(z, v0a, ya0), v0b, ya1);
                const int32x4_t a10 = ggml_vdotq_s32(ggml_vdotq_s32(z, v1a, ya0), v1b, ya1);
                const int32x4_t a01 = ggml_vdotq_s32(ggml_vdotq_s32(z, v0a, yb0), v0b, yb1);
                const int32x4_t a11 = ggml_vdotq_s32(ggml_vdotq_s32(z, v1a, yb0), v1b, yb1);
                const int32x4_t v = vpaddq_s32(vpaddq_s32(a00, a10), vpaddq_s32(a01, a11));
                const float dya = GGML_CPU_FP16_TO_FP32(ya->d);
                const float dyb = GGML_CPU_FP16_TO_FP32(yb->d);
                const float32x4_t sc = {dx0 * dya, dx1 * dya, dx0 * dyb, dx1 * dyb};
                acc = vfmaq_f32(acc, vcvtq_f32_s32(v), sc);
            }
        }
        vst1_f32(s, vget_low_f32(acc));
        vst1_f32(s + bs, vget_high_f32(acc));
        return;
    }

    const block_q2_0 * GGML_RESTRICT x = (const block_q2_0 *) vx;
    const block_q8_0 * GGML_RESTRICT y = (const block_q8_0 *) vy;
    float32x4_t acc = vdupq_n_f32(0.0f);
    int i = 0;
    for (; i + 1 < nb; i += 2) {
        const int32x4_t v = oa_q2_pair(&x[i], &y[i * 2], shifts);
        const float d0 = GGML_CPU_FP16_TO_FP32(x[i].d);
        const float d1 = GGML_CPU_FP16_TO_FP32(x[i + 1].d);
        const float32x4_t dy = oa_q8_scales4(&y[i * 2]);
        const float32x4_t dx = {d0, d0, d1, d1};
        acc = vfmaq_f32(acc, vcvtq_f32_s32(v), vmulq_f32(dy, dx));
    }
    float tail = 0.0f;
    for (; i < nb; i++) {
        const uint8x16_t qs = vld1q_u8(x[i].qs);
        const float d0 = GGML_CPU_FP16_TO_FP32(x[i].d);
        for (int k = 0; k < 2; k++) {
            const block_q8_0 * yb = &y[i * 2 + k];
            const int8x16_t v0 = oa_q2_vals(qs, oa_q2_idx[2 * k], shifts);
            const int8x16_t v1 = oa_q2_vals(qs, oa_q2_idx[2 * k + 1], shifts);
            const int32x4_t a = ggml_vdotq_s32(ggml_vdotq_s32(vdupq_n_s32(0), v0, vld1q_s8(yb->qs)), v1, vld1q_s8(yb->qs + 16));
            tail += (float) vaddvq_s32(a) * d0 * GGML_CPU_FP16_TO_FP32(yb->d);
        }
    }
    *s = vaddvq_f32(acc) + tail;
    (void) bs;
    (void) bx;
    (void) by;
}
