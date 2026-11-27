// HumKiller DSP core. Portable C++17, no platform headers.
//
// The output side plays up to four harmonics of a fundamental, each with its own complex weight
// (level + phase). The input side runs lock-in detectors at those same harmonics on the mic, and
// depending on the mode:
//   MANUAL  nothing listens back; the tones free-run at the frequency you set.
//   LOCK    a PLL keeps the tones locked to the hum the mic hears, so a level/phase you tune by ear
//           stays tuned while the mains frequency wanders.
//   ANC     the mic sits inside the earcup. The secondary path (headphone driver -> mic) is measured
//           with probe tones, then a narrowband LMS drives the residual down. A small alternating
//           wobble on the weights keeps re-measuring the path so it follows volume changes, the cups
//           shifting and clock drift between the mic and the headphones.
//
// Everything works on per-segment phasors, not per-sample filters, so the few milliseconds of
// CoreAudio latency only shift a phase the adaptation absorbs. That is what makes tonal ANC
// possible off-device, and also why broadband ANC isn't.

#include "hk_core.h"

#include <algorithm>
#include <atomic>
#include <cmath>
#include <complex>
#include <cstdint>
#include <cstring>
#include <mutex>
#include <vector>

namespace {

using cpx = std::complex<double>;
constexpr int K = HK_MAX_HARMONICS;
constexpr double PI = 3.14159265358979323846;
constexpr double TAU = 2.0 * PI;

// Lock-in window: at least this long, rounded up to whole cycles of the fundamental.
constexpr double MIN_WINDOW_S = 0.08;
constexpr int    MIN_CYCLES = 5;          // >= 5 keeps the noise bins off the harmonics
constexpr int    NOISE_BIN_OFF = 3;       // noise is read 3 DFT bins either side of each harmonic
constexpr double ANC_SETTLE_S = 0.12;     // after a weight change: output buffer + smoothing + mic buffer
constexpr double SMOOTH_S = 0.008;        // output weight smoothing (no clicks)
constexpr double W_MAX = 0.1;             // per-harmonic output cap, -20 dBFS
constexpr double OUT_CLIP = 0.5;
constexpr double PROBE_START = 0.01;      // -40 dBFS, tripled until the mic hears it
constexpr double PROBE_MAX = 0.09;
// PLL gains per segment: LOCK listens to the room (strong hum, short segments); ANC listens to a
// residual that's mostly cancelled, so it gets a narrower loop. Both settle in a couple of seconds,
// far faster than mains frequency actually moves.
constexpr double PLL_KP_LOCK = 0.2, PLL_KI_LOCK = 0.008;
constexpr double PLL_KP_ANC = 0.12, PLL_KI_ANC = 0.004;
constexpr double PLL_MAX_DF = 2.0;        // Hz either side of the frequency you set
constexpr double LOCK_SNR = 3.0;          // ~10 dB over the neighbouring noise
constexpr double ANC_MU_FAST = 0.25;      // while far from cancelled
constexpr double ANC_MU_SLOW = 0.08;      // once within 10 dB: less noise in the weights
constexpr double S_BETA = 0.03;
constexpr double WATCHDOG = 1.3;          // residual this far above the un-cancelled hum = diverging
constexpr double DITHER_FRAC = 0.05;      // wobble at -26 dB re. the un-cancelled hum
constexpr int    FIND_N = 1 << 16;

double wrap_pi(double a) {
    a = std::fmod(a + PI, TAU);
    if (a < 0) a += TAU;
    return a - PI;
}
float to_db(double v) { return (float)(20.0 * std::log10(std::max(v, 1e-9))); }
double frac(double x) { return x - std::floor(x); }

// A complex weight as two floats in one 64-bit atomic, so the audio threads never see half an update.
struct AtomicCpx {
    std::atomic<uint64_t> bits{0};
    void store(cpx c) {
        float re = (float)c.real(), im = (float)c.imag();
        uint32_t a, b;
        std::memcpy(&a, &re, 4);
        std::memcpy(&b, &im, 4);
        bits.store((uint64_t)a | ((uint64_t)b << 32), std::memory_order_relaxed);
    }
    cpx load() const {
        uint64_t v = bits.load(std::memory_order_relaxed);
        uint32_t a = (uint32_t)v, b = (uint32_t)(v >> 32);
        float re, im;
        std::memcpy(&re, &a, 4);
        std::memcpy(&im, &b, 4);
        return {re, im};
    }
};

struct Shared {
    // UI -> audio
    std::atomic<int> mode{HK_MODE_LOCK};
    std::atomic<int> armed{0};
    std::atomic<double> f_user{60.0};
    std::atomic<uint32_t> f_gen{1};
    std::atomic<int> enabled[K];
    AtomicCpx w_user[K];
    std::atomic<float> master{1.0f};
    std::atomic<uint32_t> anc_gen{0};
    std::atomic<int> input_active{0};
    std::atomic<int> input_reset{1};
    std::atomic<double> fs_out{48000.0};
    std::atomic<double> fs_in{48000.0};
    std::atomic<int> find_state{HK_FIND_IDLE};
    std::atomic<uint32_t> find_gen{0};

    // input -> output
    std::atomic<double> f_live{60.0};
    AtomicCpx w_anc[K];

    // input -> UI. The audio thread only ever try_locks, so it never waits on the UI.
    std::mutex st_mu;
    hk_status st{};
    hk_harmonic_status hst[K]{};
};

Shared g;
std::vector<float> g_find_buf(FIND_N);

// ---------------------------------------------------------------------------------------------
// Output

struct OutState {
    double psi = 0;     // fundamental phase in cycles
    cpx w[K] = {};
    double gain = 0;
};
OutState out_s;

// ---------------------------------------------------------------------------------------------
// Input

struct InState {
    double fs = 48000;
    double psi = 0;
    double f = 60, f_nom = 60;
    uint32_t f_gen_seen = 0, anc_gen_seen = 0, find_gen_seen = 0;
    int mode = -1;
    int en_seen[K] = {};

    // segment
    int pos = 0, settle = 0, win = 1;
    cpx acc[K], acc_lo[K], acc_hi[K];
    double ph_lo[K] = {}, ph_hi[K] = {}, inc_lo[K] = {}, inc_hi[K] = {};
    double sumsq = 0;
    int nsq = 0;
    size_t find_pos = 0;

    // PLL
    bool acquired = false, locked = false;
    double phi_target = 0, integ = 0;
    int good = 0, bad = 0;
    int pll_k = 0;

    // ANC
    int anc_state = HK_ANC_IDLE, anc_err = HK_ANC_ERR_NONE;
    int cal_step = 0;
    double probe = PROBE_START;
    bool active[K] = {};
    cpx W[K], Wapp[K], Wapp_prev[K], E_prev[K], S[K];
    cpx cal_e0[K], cal_sp[K];
    double D0[K] = {}, D0_cal[K] = {};
    int diverge[K] = {};
    bool prev_valid = false;
    int parity = 0;
    double reduction[K] = {};

    // meters
    double mic[K] = {}, snr[K] = {};
    double f_disp = 60;
    double rms = 0;
};
InState in_s;

void publish_w(InState& s) {
    for (int k = 0; k < K; k++) g.w_anc[k].store(s.active[k] ? s.Wapp[k] : cpx(0));
}

void setup_segment(InState& s) {
    const double f = s.f;
    const int cycles = std::max(MIN_CYCLES, (int)std::ceil(MIN_WINDOW_S * f));
    s.win = std::max(16, (int)std::lround(cycles * s.fs / f));
    s.settle = (s.mode == HK_MODE_ANC) ? (int)std::lround(ANC_SETTLE_S * s.fs) : 0;
    s.pos = 0;
    const double T = s.win / s.fs;
    for (int k = 0; k < K; k++) {
        s.acc[k] = s.acc_lo[k] = s.acc_hi[k] = 0;
        s.ph_lo[k] = s.ph_hi[k] = 0;
        s.inc_lo[k] = ((k + 1) * f - NOISE_BIN_OFF / T) / s.fs;
        s.inc_hi[k] = ((k + 1) * f + NOISE_BIN_OFF / T) / s.fs;
    }
    s.sumsq = 0;
    s.nsq = 0;
}

void anc_idle(InState& s) {
    s.anc_state = HK_ANC_IDLE;
    for (int k = 0; k < K; k++) {
        s.W[k] = s.Wapp[k] = 0;
        s.active[k] = false;
        s.reduction[k] = 0;
    }
    publish_w(s);
}

void anc_start_cal(InState& s) {
    s.anc_state = HK_ANC_CALIBRATING;
    s.anc_err = HK_ANC_ERR_NONE;
    s.cal_step = 0;
    s.probe = PROBE_START;
    s.prev_valid = false;
    s.acquired = false;
    s.integ = 0;
    s.locked = false;
    for (int k = 0; k < K; k++) {
        s.active[k] = g.enabled[k].load(std::memory_order_relaxed) != 0;
        s.W[k] = s.Wapp[k] = 0;
        s.S[k] = 0;
        s.cal_e0[k] = s.cal_sp[k] = 0;
        s.D0[k] = s.D0_cal[k] = 0;
        s.diverge[k] = 0;
        s.reduction[k] = 0;
    }
    publish_w(s);
}

void anc_fail(InState& s, int err) {
    anc_idle(s);
    s.anc_state = HK_ANC_FAILED;
    s.anc_err = err;
}

// Called at segment boundaries: picks up whatever the UI changed.
void sync_controls(InState& s) {
    s.fs = g.fs_in.load(std::memory_order_relaxed);
    const int mode = g.mode.load(std::memory_order_relaxed);
    const bool armed = g.armed.load(std::memory_order_relaxed) != 0;
    const uint32_t fg = g.f_gen.load(std::memory_order_acquire);
    const uint32_t ag = g.anc_gen.load(std::memory_order_relaxed);

    const bool retune = fg != s.f_gen_seen;
    if (retune) {
        s.f_gen_seen = fg;
        s.f_nom = g.f_user.load(std::memory_order_relaxed);
        s.f = s.f_disp = s.f_nom;
        s.acquired = false;
        s.locked = false;
        s.integ = 0;
    }
    if (mode != s.mode && mode == HK_MODE_LOCK) {
        s.acquired = false;
        s.locked = false;
        s.integ = 0;
    }
    s.mode = mode;
    if (mode == HK_MODE_MANUAL) {
        s.f = s.f_nom;
        s.locked = false;
    }

    bool en_changed = false;
    for (int k = 0; k < K; k++) {
        int e = g.enabled[k].load(std::memory_order_relaxed);
        if (e != s.en_seen[k]) en_changed = true;
        s.en_seen[k] = e;
    }

    const bool want_anc = mode == HK_MODE_ANC && armed;
    if (!want_anc) {
        if (s.anc_state != HK_ANC_IDLE) anc_idle(s);
        s.anc_err = HK_ANC_ERR_NONE;
    } else if (s.anc_state == HK_ANC_IDLE || ag != s.anc_gen_seen || retune || en_changed) {
        anc_start_cal(s);
    }
    s.anc_gen_seen = ag;
    g.f_live.store(s.f, std::memory_order_relaxed);
}

// Type-2 PLL. P is the measured phasor at harmonic m (1-based); a phase error there is m times
// the fundamental's. The target phase is kept across dropouts, so when the hum comes back the
// tones return to the same alignment and a by-ear tuning survives.
void pll_update(InState& s, cpx P, double noise, int m) {
    const double T = (s.settle + s.win) / s.fs;
    const bool anc = s.mode == HK_MODE_ANC;
    const double KP = anc ? PLL_KP_ANC : PLL_KP_LOCK, KI = anc ? PLL_KI_ANC : PLL_KI_LOCK;
    if (std::abs(P) < LOCK_SNR * noise) {
        s.good = 0;
        if (++s.bad > 8) s.locked = false;
        return;
    }
    s.bad = 0;
    const double ph = std::arg(P);
    if (!s.acquired) {
        s.acquired = true;
        s.phi_target = ph;
        s.integ = 0;
        s.good = 0;
        return;
    }
    const double e = wrap_pi(ph - s.phi_target);
    s.integ += e;
    const double scale = 1.0 / (TAU * T * m);
    const double imax = PLL_MAX_DF / (KI * scale);
    s.integ = std::clamp(s.integ, -imax, imax);
    double df = (KP * e + KI * s.integ) * scale;
    df = std::clamp(df, -PLL_MAX_DF, PLL_MAX_DF);
    s.f = s.f_nom + df;
    s.good = std::fabs(e) < 0.35 ? s.good + 1 : 0;
    s.locked = s.good >= 5;
}

double cal_weight(int step, double p) {
    if (step <= 2) return 0;
    return (step % 2) ? p : -p;
}

// Segment schedule during calibration (W in effect during that segment):
//   0: 0 (output fading in, ignored)   1,2: 0 -> hum level   3,5: +p   4,6: -p -> path
void anc_cal(InState& s, const cpx* Z, const double* N) {
    const int st = s.cal_step;
    for (int k = 0; k < K; k++) {
        if (!s.active[k]) continue;
        if (st == 1 || st == 2) s.cal_e0[k] += Z[k] * 0.5;
        if (st >= 3) s.cal_sp[k] += ((st % 2) ? Z[k] : -Z[k]);
    }
    if (st < 6) {
        s.cal_step++;
        for (int k = 0; k < K; k++) s.Wapp[k] = cal_weight(s.cal_step, s.probe);
        publish_w(s);
        return;
    }

    bool weak = false, any = false, any_hum = false;
    for (int k = 0; k < K; k++) {
        if (!s.active[k]) continue;
        const cpx Sk = s.cal_sp[k] / (4.0 * s.probe);
        const double resp = std::abs(Sk) * s.probe;
        const double d0 = std::abs(s.cal_e0[k]);
        if (d0 < 3.0 * N[k]) { s.active[k] = false; continue; }   // nothing to cancel here
        any_hum = true;
        if (resp < 4.0 * N[k]) { weak = true; continue; }
        s.S[k] = Sk;
        s.D0[k] = s.D0_cal[k] = d0;
    }
    if (weak && s.probe < PROBE_MAX) {
        s.probe = std::min(PROBE_MAX, s.probe * 3.0);
        for (int k = 0; k < K; k++) s.cal_sp[k] = 0;
        s.cal_step = 3;
        for (int k = 0; k < K; k++) s.Wapp[k] = s.active[k] ? cpx(s.probe) : cpx(0);
        publish_w(s);
        return;
    }
    for (int k = 0; k < K; k++) {
        if (!s.active[k]) continue;
        if (s.S[k] == cpx(0)) { s.active[k] = false; continue; }   // never heard the probe
        any = true;
        cpx w = -s.cal_e0[k] / s.S[k];
        if (std::abs(w) > W_MAX) w *= W_MAX / std::abs(w);
        s.W[k] = s.Wapp[k] = w;
    }
    if (!any_hum) { anc_fail(s, HK_ANC_ERR_NO_HUM); return; }
    if (!any) { anc_fail(s, HK_ANC_ERR_NO_PATH); return; }
    s.anc_state = HK_ANC_RUNNING;
    s.prev_valid = false;
    s.parity = 0;
    publish_w(s);
}

void anc_run(InState& s, const cpx* Z, const double* N) {
    int pll_k = -1;   // the PLL follows the lowest active harmonic, always the same one
    cpx pll_P;
    for (int k = 0; k < K && pll_k < 0; k++) if (s.active[k]) pll_k = k;
    if (pll_k >= 0 && pll_k != s.pll_k) { s.pll_k = pll_k; s.acquired = false; s.integ = 0; }
    for (int k = 0; k < K; k++) {
        if (!s.active[k]) continue;
        const cpx E = Z[k];
        cpx& S = s.S[k];
        if (s.prev_valid) {
            // Path tracking: any change in what we played (the wobble, or an LMS step) shows up
            // as a change in what the mic hears, S times that change.
            const cpx dW = s.Wapp[k] - s.Wapp_prev[k];
            const cpx dE = E - s.E_prev[k];
            if (std::abs(S * dW) > N[k]) {
                cpx step = S_BETA * (dE - S * dW) * std::conj(dW) / std::norm(dW);
                const double lim = 0.2 * std::abs(S);
                if (std::abs(step) > lim) step *= lim / std::abs(step);
                S += step;
            }
        }
        s.E_prev[k] = E;
        s.Wapp_prev[k] = s.Wapp[k];

        const cpx E0 = E - S * (s.Wapp[k] - s.W[k]);   // residual without the wobble
        const cpx Dhat = E - S * s.Wapp[k];             // the hum as it would be without us
        s.D0[k] = 0.97 * s.D0[k] + 0.03 * std::abs(Dhat);

        // Watchdog against the level measured at calibration: if we're making it louder (the cups
        // moved a lot, the path flipped past 90 degrees), stop and re-measure. A genuinely louder
        // hum trips it too, which is fine - it gets re-measured.
        if (std::abs(E) > WATCHDOG * s.D0_cal[k] && s.D0_cal[k] > 3.0 * N[k]) {
            if (++s.diverge[k] >= 2) { anc_start_cal(s); return; }
        } else {
            s.diverge[k] = 0;
        }

        const double mu = std::abs(E0) > 0.3 * s.D0[k] ? ANC_MU_FAST : ANC_MU_SLOW;
        s.W[k] -= mu * E0 / S;
        if (std::abs(s.W[k]) > W_MAX) s.W[k] *= W_MAX / std::abs(s.W[k]);
        s.reduction[k] = 20.0 * std::log10(std::max(std::abs(E0), 1e-12) / std::max(s.D0[k], 1e-12));

        double d = DITHER_FRAC * s.D0[k] / std::max(std::abs(S), 1e-9);
        d = std::min(d, 0.2 * W_MAX);
        s.Wapp[k] = s.W[k] + (s.parity ? d : -d);

        if (k == pll_k) pll_P = Dhat;
    }
    s.prev_valid = true;
    s.parity ^= 1;
    if (pll_k >= 0) pll_update(s, pll_P, N[pll_k], pll_k + 1);
    publish_w(s);
}

void publish_status(InState& s) {
    std::unique_lock<std::mutex> lk(g.st_mu, std::try_to_lock);
    if (!lk.owns_lock()) return;
    g.st.locked = s.locked;
    g.st.freq = s.f_disp;
    g.st.anc_state = s.anc_state;
    g.st.anc_error = s.anc_err;
    g.st.input_rms_db = to_db(s.rms);
    for (int k = 0; k < K; k++) {
        g.hst[k].mic_db = to_db(s.mic[k]);
        g.hst[k].snr_db = to_db(s.snr[k]);
        g.hst[k].reduction_db = (float)s.reduction[k];
        g.hst[k].anc_active = s.anc_state == HK_ANC_RUNNING && s.active[k];
    }
}

void end_segment(InState& s) {
    const double nrm = 2.0 / s.win;
    cpx Z[K];
    double N[K];
    for (int k = 0; k < K; k++) {
        Z[k] = s.acc[k] * nrm;
        N[k] = std::sqrt(0.5 * (std::norm(s.acc_lo[k]) + std::norm(s.acc_hi[k]))) * nrm;
        s.mic[k] = std::abs(Z[k]);
        s.snr[k] = s.mic[k] / std::max(N[k], 1e-12);
    }
    s.rms = s.nsq ? std::sqrt(s.sumsq / s.nsq) : 0;
    s.f_disp += 0.15 * (s.f - s.f_disp);

    if (s.mode == HK_MODE_LOCK) {
        // Lock on the lowest harmonic you're cancelling: that's the alignment you tuned by ear.
        int m = 0;
        while (m < K - 1 && !s.en_seen[m]) m++;
        if (m != s.pll_k) { s.pll_k = m; s.acquired = false; s.integ = 0; }
        pll_update(s, Z[m], N[m], m + 1);
    } else if (s.mode == HK_MODE_ANC) {
        if (s.anc_state == HK_ANC_CALIBRATING) anc_cal(s, Z, N);
        else if (s.anc_state == HK_ANC_RUNNING) anc_run(s, Z, N);
    }
    publish_status(s);
    sync_controls(s);
    setup_segment(s);
}

void reset_input(InState& s) {
    const int mode = s.mode;
    s = InState{};
    s.mode = mode;
    s.f_gen_seen = 0;   // forces a retune pickup
    s.anc_gen_seen = g.anc_gen.load(std::memory_order_relaxed);
    sync_controls(s);
    setup_segment(s);
}

// ---------------------------------------------------------------------------------------------
// Hum finder

void fft(std::vector<cpx>& a) {
    const size_t n = a.size();
    for (size_t i = 1, j = 0; i < n; i++) {
        size_t bit = n >> 1;
        for (; j & bit; bit >>= 1) j ^= bit;
        j ^= bit;
        if (i < j) std::swap(a[i], a[j]);
    }
    for (size_t len = 2; len <= n; len <<= 1) {
        const cpx wl = std::polar(1.0, -TAU / (double)len);
        for (size_t i = 0; i < n; i += len) {
            cpx w = 1;
            for (size_t j = 0; j < len / 2; j++) {
                cpx u = a[i + j], v = a[i + j + len / 2] * w;
                a[i + j] = u + v;
                a[i + j + len / 2] = u - v;
                w *= wl;
            }
        }
    }
}

}  // namespace

// ---------------------------------------------------------------------------------------------
// C API

extern "C" {

void hk_init(void) {
    for (int k = 0; k < K; k++) {
        g.enabled[k].store(k == 0, std::memory_order_relaxed);
        g.w_user[k].store(std::polar(std::pow(10.0, -50.0 / 20.0), 0.0));
        g.w_anc[k].store(0);
    }
    g.f_user.store(60.0);
    g.f_live.store(60.0);
    g.f_gen.fetch_add(1);
    g.input_reset.store(1);
}

void hk_set_output_rate(double hz) { if (hz > 0) g.fs_out.store(hz); }
void hk_set_input_rate(double hz) { if (hz > 0) g.fs_in.store(hz); }

void hk_set_input_active(int active) {
    if (active) g.input_reset.store(1, std::memory_order_release);
    else for (int k = 0; k < K; k++) g.w_anc[k].store(0);
    g.input_active.store(active ? 1 : 0, std::memory_order_release);
}

void hk_render(float* out, int frames, int channels) {
    OutState& s = out_s;
    const double fs = g.fs_out.load(std::memory_order_relaxed);
    const int mode = g.mode.load(std::memory_order_relaxed);
    const bool live = mode != HK_MODE_MANUAL && g.input_active.load(std::memory_order_relaxed);
    const double f = live ? g.f_live.load(std::memory_order_relaxed) : g.f_user.load(std::memory_order_relaxed);
    const bool armed = g.armed.load(std::memory_order_relaxed) != 0;

    cpx tgt[K];
    for (int k = 0; k < K; k++) {
        const bool en = g.enabled[k].load(std::memory_order_relaxed) != 0;
        tgt[k] = !en ? cpx(0) : (mode == HK_MODE_ANC ? g.w_anc[k].load() : g.w_user[k].load());
    }
    const double gt = armed ? (mode == HK_MODE_ANC ? 1.0 : (double)g.master.load(std::memory_order_relaxed)) : 0.0;
    const double a = 1.0 - std::exp(-1.0 / (SMOOTH_S * fs));
    const double inc = f / fs;

    for (int i = 0; i < frames; i++) {
        s.gain += a * (gt - s.gain);
        double y = 0;
        for (int k = 0; k < K; k++) {
            s.w[k] += a * (tgt[k] - s.w[k]);
            const double th = TAU * frac((k + 1) * s.psi);
            y += s.w[k].real() * std::cos(th) - s.w[k].imag() * std::sin(th);
        }
        y = std::clamp(y * s.gain, -OUT_CLIP, OUT_CLIP);
        for (int c = 0; c < channels; c++) out[i * channels + c] = (float)y;
        s.psi += inc;
        if (s.psi >= 1.0) s.psi -= 1.0;
    }
}

void hk_capture(const float* in, int frames, int channels) {
    InState& s = in_s;
    if (g.input_reset.exchange(0, std::memory_order_acquire)) reset_input(s);
    if (channels < 1) return;

    const bool finding = g.find_state.load(std::memory_order_relaxed) == HK_FIND_CAPTURING;
    if (finding) {
        const uint32_t fg = g.find_gen.load(std::memory_order_relaxed);
        if (fg != s.find_gen_seen) { s.find_gen_seen = fg; s.find_pos = 0; }
    }

    for (int i = 0; i < frames; i++) {
        double x = 0;
        for (int c = 0; c < channels; c++) x += in[i * channels + c];
        x /= channels;

        if (finding && s.find_pos < (size_t)FIND_N) {
            g_find_buf[s.find_pos++] = (float)x;
            if (s.find_pos == (size_t)FIND_N) g.find_state.store(HK_FIND_READY, std::memory_order_release);
        }

        if (s.pos >= s.settle) {
            for (int k = 0; k < K; k++) {
                const double th = TAU * frac((k + 1) * s.psi);
                s.acc[k] += x * cpx(std::cos(th), -std::sin(th));
                const double tl = TAU * s.ph_lo[k], tu = TAU * s.ph_hi[k];
                s.acc_lo[k] += x * cpx(std::cos(tl), -std::sin(tl));
                s.acc_hi[k] += x * cpx(std::cos(tu), -std::sin(tu));
                s.ph_lo[k] = frac(s.ph_lo[k] + s.inc_lo[k]);
                s.ph_hi[k] = frac(s.ph_hi[k] + s.inc_hi[k]);
            }
            s.sumsq += x * x;
            s.nsq++;
        }
        s.psi += s.f / s.fs;   // s.f can change at a segment boundary inside this buffer
        if (s.psi >= 1.0) s.psi -= 1.0;

        if (++s.pos >= s.settle + s.win) end_segment(s);
    }
}

void hk_set_mode(int mode) {
    if (mode < HK_MODE_MANUAL || mode > HK_MODE_ANC) return;
    g.mode.store(mode);
}
void hk_set_armed(int armed) { g.armed.store(armed ? 1 : 0); }

void hk_set_fundamental(double hz) {
    hz = std::clamp(hz, 20.0, 2000.0);
    if (std::fabs(hz - g.f_user.load()) < 1e-9) return;
    g.f_user.store(hz);
    g.f_gen.fetch_add(1, std::memory_order_release);
}

void hk_set_harmonic(int k, int enabled, float level_db, float phase_deg) {
    if (k < 0 || k >= K) return;
    const double amp = std::min(std::pow(10.0, level_db / 20.0), W_MAX);
    g.w_user[k].store(std::polar(amp, phase_deg * PI / 180.0));
    g.enabled[k].store(enabled ? 1 : 0);
}

void hk_set_master(float gain) { g.master.store(std::clamp(gain, 0.0f, 1.0f)); }
void hk_anc_restart(void) { g.anc_gen.fetch_add(1); }

void hk_get_status(hk_status* out) {
    {
        std::lock_guard<std::mutex> lk(g.st_mu);
        *out = g.st;
    }
    out->mode = g.mode.load();
    out->armed = g.armed.load();
    out->input_active = g.input_active.load();
    if (out->mode == HK_MODE_MANUAL || !out->input_active) out->freq = g.f_user.load();
    out->find_state = g.find_state.load();
    out->dither_floor_db = to_db(DITHER_FRAC);
    if (!out->input_active) {
        out->locked = 0;
        out->anc_state = out->mode == HK_MODE_ANC && out->armed ? HK_ANC_FAILED : HK_ANC_IDLE;
        out->anc_error = out->anc_state == HK_ANC_FAILED ? HK_ANC_ERR_NO_INPUT : HK_ANC_ERR_NONE;
    }
}

void hk_get_harmonic(int k, hk_harmonic_status* out) {
    if (k < 0 || k >= K) { *out = hk_harmonic_status{}; return; }
    {
        std::lock_guard<std::mutex> lk(g.st_mu);
        *out = g.hst[k];
    }
    const bool anc = g.mode.load() == HK_MODE_ANC;
    const cpx w = anc ? g.w_anc[k].load() : g.w_user[k].load();
    out->out_db = to_db(std::abs(w));
    out->out_phase_deg = (float)(std::arg(w) * 180.0 / PI);
    if (!g.input_active.load()) { out->anc_active = 0; out->mic_db = -180; out->snr_db = 0; }
}

void hk_find_start(void) {
    g.find_gen.fetch_add(1, std::memory_order_relaxed);
    g.find_state.store(HK_FIND_CAPTURING, std::memory_order_release);
}

void hk_find_compute(hk_find_result* r) {
    *r = hk_find_result{};
    if (g.find_state.load(std::memory_order_acquire) != HK_FIND_READY) return;

    const int N = FIND_N;
    const double fs = g.fs_in.load();
    const double bin = fs / N;
    std::vector<cpx> X(N);
    for (int n = 0; n < N; n++) X[n] = g_find_buf[n] * (0.5 - 0.5 * std::cos(TAU * n / (N - 1)));
    g.find_state.store(HK_FIND_IDLE, std::memory_order_relaxed);
    fft(X);

    const int half = N / 2;
    std::vector<double> db(half);
    for (int i = 0; i < half; i++) db[i] = 10.0 * std::log10(std::norm(X[i]) + 1e-30);

    const int lo = std::max(2, (int)std::floor(30.0 / bin));
    const int hi = std::min(half - 50, (int)std::ceil(1200.0 / bin));
    const int R = 40;
    std::vector<double> prom(half, 0.0);
    std::vector<double> win;
    const int top = std::min(half - R - 1, (int)std::ceil(K * 1200.0 / bin) + 4);   // highest harmonic P() reads
    for (int i = std::max(R, lo - 8); i <= top; i++) {
        win.assign(db.begin() + (i - R), db.begin() + (i + R + 1));
        std::nth_element(win.begin(), win.begin() + R, win.end());
        prom[i] = db[i] - win[R];
    }

    auto near = [&](double f) -> double {   // how far the spectrum near f sticks out of the noise
        const int c = (int)std::lround(f / bin);
        double best = 0;
        for (int i = c - 2; i <= c + 2; i++)
            if (i > 0 && i < half) best = std::max(best, prom[i]);
        return best;
    };
    auto P = [&](double f) -> double { const double p = near(f); return p >= 10.0 ? p : 0.0; };

    std::vector<std::pair<double, int>> peaks;
    for (int i = lo; i <= hi; i++)
        if (db[i] >= db[i - 1] && db[i] > db[i + 1] && prom[i] >= 15.0) peaks.push_back({prom[i], i});
    if (peaks.empty()) return;
    std::sort(peaks.rbegin(), peaks.rend());
    if (peaks.size() > 8) peaks.resize(8);

    double best_f0 = 0, best_score = 0;
    for (auto& pk : peaks) {
        for (int d = 1; d <= 4; d++) {
            const double f0 = pk.second * bin / d;
            if (f0 < 30.0) break;
            // A fundamental below the peak has to be a real peak itself. Otherwise a noise bump
            // halfway down wins on the strength of the peak's own harmonics (an octave error).
            if (d > 1 && near(f0) < 15.0) continue;
            double sc = 0;
            for (int k = 1; k <= K; k++) sc += P(k * f0) * (k == 1 ? 1.2 : 1.0);
            if (sc > best_score + 1e-9) { best_score = sc; best_f0 = f0; }
        }
    }
    if (best_score <= 0) return;

    // Refine on the harmonic that stands out most; dividing a higher harmonic down is also more precise.
    int kbest = 1;
    double pbest = -1;
    for (int k = 1; k <= K; k++) {
        const double p = P(k * best_f0);
        if (p > pbest + 1.0) { pbest = p; kbest = k; }
    }
    const int c = (int)std::lround(kbest * best_f0 / bin);
    int ib = c;
    for (int i = c - 2; i <= c + 2; i++)
        if (i > 0 && i < half - 1 && db[i] > db[ib]) ib = i;
    const double a = db[ib - 1], b = db[ib], cc = db[ib + 1];
    const double den = a - 2 * b + cc;
    const double delta = den != 0 ? std::clamp(0.5 * (a - cc) / den, -0.5, 0.5) : 0.0;
    const double f0 = (ib + delta) * bin / kbest;

    r->ok = 1;
    r->f0 = f0;
    for (int k = 0; k < K; k++) r->prominence_db[k] = (float)P((k + 1) * f0);
}

}  // extern "C"
