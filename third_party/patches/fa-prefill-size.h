// Offline AI: where fa-prefill.inc keeps its per-thread scratch, for ggml-cpu.c's work buffer size
// and for the kernel itself (both include this file). C and C++.
#pragma once

#include <stddef.h>
#include <stdint.h>

#define OA_FA8_QB 8   // query rows at once
#define OA_FA8_KB 64  // keys per softmax block

struct oa_fa8_layout {
    size_t k8, sk, kbar, q8, sq, dots, l, p16, mf, o;  // offsets
    size_t total;                                      // bytes for one thread
    int64_t dkp, nkp;                                  // padded head size and key count
};

static inline size_t oa_fa8_pad64(size_t x) { return (x + 63) & ~(size_t) 63; }

static inline struct oa_fa8_layout oa_fa8_layout_for(int64_t nk, int64_t dk, int64_t dv) {
    struct oa_fa8_layout l;
    size_t at = 0;
    l.dkp  = (dk + 15) / 16 * 16;
    l.nkp  = (nk + OA_FA8_KB - 1) / OA_FA8_KB * OA_FA8_KB;
    l.k8   = at; at = oa_fa8_pad64(at + (size_t) (l.nkp * l.dkp));                // K, 8-bit
    l.sk   = at; at = oa_fa8_pad64(at + sizeof(float) * (size_t) l.nkp);         // K scales
    l.kbar = at; at = oa_fa8_pad64(at + sizeof(float) * (size_t) l.dkp);         // K mean
    l.q8   = at; at = oa_fa8_pad64(at + (size_t) (OA_FA8_QB * l.dkp));           // Q rows, 8-bit
    l.sq   = at; at = oa_fa8_pad64(at + sizeof(float) * OA_FA8_QB);              // Q scales
    l.dots = at; at = oa_fa8_pad64(at + sizeof(int32_t) * OA_FA8_QB * OA_FA8_KB); // integer scores
    l.l    = at; at = oa_fa8_pad64(at + sizeof(float) * OA_FA8_QB * OA_FA8_KB);  // scores, then weights
    l.p16  = at; at = oa_fa8_pad64(at + sizeof(uint16_t) * OA_FA8_QB * OA_FA8_KB); // weights, 16-bit
    l.mf   = at; at = oa_fa8_pad64(at + sizeof(float) * OA_FA8_QB * OA_FA8_KB);  // mask
    l.o    = at; at = oa_fa8_pad64(at + sizeof(float) * (size_t) (OA_FA8_QB * dv)); // output rows
    l.total = at + 64;  // the thread's start is aligned up to 64 bytes
    return l;
}
