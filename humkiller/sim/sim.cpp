// Offline test bench for the HumKiller core: a simulated room, headphones and mics, driven through
// the same hk_render / hk_capture calls the real audio callbacks make, with mismatched buffer sizes,
// output and input latency, broadband noise, a wandering mains hum and optional clock drift.
//
// Build & run:  ./build.sh sim   (or: c++ -std=c++17 -O2 sim/sim.cpp core/hk_core.cpp -o build/sim && ./build/sim)
#include "../core/hk_core.h"

#include <cmath>
#include <complex>
#include <cstdio>
#include <cstdlib>
#include <deque>
#include <functional>
#include <random>
#include <string>
#include <sys/wait.h>
#include <unistd.h>
#include <vector>

using cpx = std::complex<double>;
constexpr int K = HK_MAX_HARMONICS;
constexpr double TAU = 6.283185307179586;

struct Biquad {
    double b0 = 1, b1 = 0, b2 = 0, a1 = 0, a2 = 0, z1 = 0, z2 = 0;
    static Biquad hpf(double fc, double fs) {
        double w = TAU * fc / fs, c = std::cos(w), al = std::sin(w) / (2 * 0.7071);
        Biquad q;
        double a0 = 1 + al;
        q.b0 = (1 + c) / 2 / a0; q.b1 = -(1 + c) / a0; q.b2 = (1 + c) / 2 / a0;
        q.a1 = -2 * c / a0; q.a2 = (1 - al) / a0;
        return q;
    }
    static Biquad lpf(double fc, double fs) {
        double w = TAU * fc / fs, c = std::cos(w), al = std::sin(w) / (2 * 0.7071);
        Biquad q;
        double a0 = 1 + al;
        q.b0 = (1 - c) / 2 / a0; q.b1 = (1 - c) / a0; q.b2 = (1 - c) / 2 / a0;
        q.a1 = -2 * c / a0; q.a2 = (1 - al) / a0;
        return q;
    }
    double run(double x) {
        double y = b0 * x + z1;
        z1 = b1 * x - a1 * y + z2;
        z2 = b2 * x - a2 * y;
        return y;
    }
};

struct Config {
    double fs = 48000;
    double f_hum = 60.013, wander = 0.01, wander_period = 40;   // mains wanders +-0.01 Hz
    double hum_amp[K] = {0.02, 0.012, 0.006, 0.0};
    double hum_ph[K] = {0.3, 1.1, -0.7, 0.0};
    double isolation = 0.4;          // passive earcup attenuation of the hum at low frequencies
    double sec_gain = 0.5;           // headphone driver -> in-cup mic
    double sec_delay = 0.012;        // output latency + acoustics, seconds
    double drift_ppm = 0;            // output clock vs input clock
    double in_latency = 0.005;
    int render_block = 480, capture_block = 512;
    bool mic_in_cup = true;
    double room_noise = 0.005, ear_noise_frac = 0.3, self_noise = 3e-4;
    unsigned seed = 1;
};

struct World {
    Config c;
    long n = 0;
    double hum_phase = 0;   // cycles of the fundamental
    std::vector<float> rblock;
    int rpos = 0;
    std::vector<double> out_hist;
    std::deque<double> in_delay;
    std::vector<float> cbuf;
    Biquad hp, lp;
    double extra_delay = 0;  // seconds, for "the cups moved"
    std::mt19937 rng;
    std::normal_distribution<double> gauss{0.0, 1.0};
    double room_lp = 0, ear_lp = 0;

    // measurement
    bool measuring = false;
    cpx acc_tonal[K], acc_hum[K];

    explicit World(const Config& cfg) : c(cfg), rblock(cfg.render_block * 2), out_hist(1 << 16, 0.0), rng(cfg.seed) {
        hp = Biquad::hpf(35, c.fs);
        lp = Biquad::lpf(3000, c.fs);
        rpos = c.render_block;
        for (int i = 0; i < (int)std::lround(c.in_latency * c.fs); i++) in_delay.push_back(0);
    }
    double t() const { return n / c.fs; }
    double f_now() const { return c.f_hum + c.wander * std::sin(TAU * t() / c.wander_period); }

    void step() {
        if (rpos >= c.render_block) { hk_render(rblock.data(), c.render_block, 2); rpos = 0; }
        const double y = rblock[2 * rpos++];
        out_hist[n & 0xFFFF] = y;

        // secondary path: fractional delay (drifts with the clock mismatch) + driver response
        const double D = (c.sec_delay + extra_delay) * c.fs + c.drift_ppm * 1e-6 * n;
        const double pos = n - D;
        double sec = 0;
        if (pos >= 0) {
            const long i0 = (long)std::floor(pos);
            const double fr = pos - i0;
            sec = out_hist[i0 & 0xFFFF] * (1 - fr) + out_hist[(i0 + 1) & 0xFFFF] * fr;
        }
        sec = c.sec_gain * lp.run(hp.run(sec));

        const double f = f_now();
        double hum_room = 0, hum_ear = 0;
        for (int k = 0; k < K; k++) {
            hum_room += c.hum_amp[k] * std::cos(TAU * (k + 1) * hum_phase + c.hum_ph[k]);
            hum_ear += c.isolation * c.hum_amp[k] * std::cos(TAU * (k + 1) * (hum_phase - f * 0.0004) + c.hum_ph[k]);
        }
        room_lp += 0.06 * (gauss(rng) - room_lp);
        ear_lp += 0.06 * (gauss(rng) - ear_lp);
        const double room_noise = c.room_noise * 4.0 * room_lp;
        const double ear_noise = c.ear_noise_frac * room_noise + 0.3 * c.room_noise * 4.0 * ear_lp;

        const double ear_tonal = hum_ear + sec;
        const double mic = c.mic_in_cup ? ear_tonal + ear_noise + c.self_noise * gauss(rng)
                                        : hum_room + room_noise + 0.01 * sec + c.self_noise * gauss(rng);

        if (measuring) {
            for (int k = 0; k < K; k++) {
                const cpx e = std::polar(1.0, -TAU * (k + 1) * hum_phase);
                acc_tonal[k] += ear_tonal * e;
                acc_hum[k] += hum_ear * e;
            }
        }

        in_delay.push_back(mic);
        cbuf.push_back((float)in_delay.front());
        in_delay.pop_front();
        if ((int)cbuf.size() == c.capture_block) { hk_capture(cbuf.data(), c.capture_block, 1); cbuf.clear(); }

        hum_phase += f / c.fs;
        if (hum_phase >= 1) hum_phase -= 1;
        n++;
    }
    void run(double seconds) { const long end = n + (long)(seconds * c.fs); while (n < end) step(); }

    // tonal phasors at the ear over a window, referenced to the true hum phase
    void measure(double seconds, cpx* tonal, cpx* hum) {
        for (int k = 0; k < K; k++) acc_tonal[k] = acc_hum[k] = 0;
        measuring = true;
        const long m = (long)(seconds * c.fs);
        run(seconds);
        measuring = false;
        for (int k = 0; k < K; k++) { tonal[k] = acc_tonal[k] * (2.0 / m); hum[k] = acc_hum[k] * (2.0 / m); }
    }
    // dB of the hum left at the ear vs. no cancellation, per harmonic
    void reduction(double seconds, double* db) {
        cpx tn[K], hm[K];
        measure(seconds, tn, hm);
        for (int k = 0; k < K; k++) db[k] = std::abs(hm[k]) > 1e-9 ? 20 * std::log10(std::abs(tn[k]) / std::abs(hm[k])) : 0;
    }
};

static void setup(World& w, int mode, double f, int nharm) {
    hk_init();
    hk_set_output_rate(w.c.fs);
    hk_set_input_rate(w.c.fs);
    hk_set_input_active(1);
    hk_set_mode(mode);
    hk_set_fundamental(f);
    for (int k = 0; k < K; k++) hk_set_harmonic(k, k < nharm, -80, 0);
    hk_set_master(1);
}

static void print_line(World& w, const char* tag, int nharm) {
    double db[K];
    w.reduction(1.0, db);
    hk_status st;
    hk_get_status(&st);
    std::printf("  t=%5.1fs %-10s f=%.4f (hum %.4f) locked=%d anc=%d err=%d |", w.t(), tag, st.freq, w.f_now(), st.locked,
                st.anc_state, st.anc_error);
    for (int k = 0; k < nharm; k++) std::printf(" %6.1f", db[k]);
    std::printf(" dB\n");
}

static double worst(World& w, int nharm, double seconds) {
    double db[K];
    w.reduction(seconds, db);
    double m = -1e9;
    for (int k = 0; k < nharm; k++) m = std::max(m, db[k]);
    return m;
}

// Stand-in for someone tuning by ear: measures the ear directly, sets the level/phase that cancel.
static void oracle_tune(World& w, int nharm) {
    cpx tn[K], hm[K], D[K], E[K];
    hk_set_armed(0);
    w.run(0.3);
    w.measure(1.0, D, hm);
    const double p = 0.01;
    for (int k = 0; k < nharm; k++) hk_set_harmonic(k, 1, -40, 0);
    hk_set_armed(1);
    w.run(0.3);
    w.measure(1.0, E, tn);
    for (int k = 0; k < nharm; k++) {
        const cpx S = (E[k] - D[k]) / p;
        const cpx W = -D[k] / S;
        hk_set_harmonic(k, 1, (float)(20 * std::log10(std::abs(W))), (float)(std::arg(W) * 180 / M_PI));
    }
}

static int fails = 0;
static void check(bool ok, const char* what) {
    std::printf("  [%s] %s\n", ok ? "PASS" : "FAIL", what);
    if (!ok) fails++;
}

// ---------------------------------------------------------------------------------------------

static void scenario_anc(const char* title, Config c, double settle_s, double run_s,
                         std::function<void(World&, double)> events, double need_db) {
    std::printf("\n== %s\n", title);
    World w(c);
    const int nh = 3;
    setup(w, HK_MODE_ANC, 60.0, nh);   // tuned 0.013 Hz off on purpose; the PLL has to find it
    hk_set_armed(1);
    double tt = 0;
    while (tt < run_s) {
        if (events) events(w, tt);
        print_line(w, "anc", nh);
        tt = w.t();
    }
    (void)settle_s;
    // steady state: 10 one-second windows. Mean is what you hear; worst catches blips.
    double pw = 0, worst_after = -1e9;
    for (int i = 0; i < 10; i++) {
        double db[K];
        w.reduction(1.0, db);
        for (int k = 0; k < nh; k++) { pw += std::pow(10.0, db[k] / 10) / (10.0 * nh); worst_after = std::max(worst_after, db[k]); }
    }
    const double mean_db = 10 * std::log10(pw);
    char msg[200];
    std::snprintf(msg, sizeof msg, "last 10 s: mean %.1f dB (need -%.0f), worst 1-s window %.1f dB (need -%.0f)", mean_db, need_db,
                  worst_after, need_db - 8);
    check(mean_db <= -need_db && worst_after <= -(need_db - 8), msg);
}

static void scenario_lock(const char* title, Config c, int mode, double hold_s, double need_db, bool expect_pass) {
    std::printf("\n== %s\n", title);
    World w(c);
    const int nh = 3;
    setup(w, mode, 60.0, nh);
    hk_set_armed(1);
    w.run(4.0);   // let the PLL grab the hum
    oracle_tune(w, nh);
    double first = worst(w, nh, 1.0), last = 0;
    std::printf("  right after tuning: worst harmonic %.1f dB\n", first);
    for (double t = 0; t < hold_s; t += 10) {
        w.run(9.0);
        last = worst(w, nh, 1.0);
        hk_status st;
        hk_get_status(&st);
        std::printf("  +%3.0fs: worst harmonic %6.1f dB  f=%.4f hum=%.4f locked=%d\n", t + 10, last, st.freq, w.f_now(), st.locked);
    }
    char msg[200];
    std::snprintf(msg, sizeof msg, "%s %.0f dB after %.0f s (got %.1f dB)", expect_pass ? "still at least" : "expected to lose",
                  need_db, hold_s, last);
    check(expect_pass ? last <= -need_db : last > -need_db, msg);
}

static void scenario_find(const char* title, std::vector<std::pair<double, double>> tones, double noise, double expect_f0,
                          double tol) {
    std::printf("\n== %s\n", title);
    Config c;
    c.mic_in_cup = false;
    c.room_noise = noise;
    c.wander = 0;
    for (int k = 0; k < K; k++) c.hum_amp[k] = 0;
    World w(c);
    setup(w, HK_MODE_LOCK, 60, 1);
    // drive the mic with arbitrary tones instead of the hum model
    std::mt19937 rng(7);
    std::normal_distribution<double> g(0, 1);
    hk_find_start();
    std::vector<float> buf(512);
    double lp = 0;
    long n = 0;
    hk_status st;
    do {
        for (auto& x : buf) {
            double v = 0;
            for (auto& t : tones) v += t.second * std::cos(TAU * t.first * n / c.fs + 0.4 * t.first);
            lp += 0.06 * (g(rng) - lp);
            x = (float)(v + noise * 4 * lp + 3e-4 * g(rng));
            n++;
        }
        hk_capture(buf.data(), 512, 1);
        hk_get_status(&st);
    } while (st.find_state != HK_FIND_READY && n < 48000 * 5);
    hk_find_result r;
    hk_find_compute(&r);
    std::printf("  ok=%d f0=%.4f  prominence:", r.ok, r.f0);
    for (int k = 0; k < K; k++) std::printf(" %.1f", r.prominence_db[k]);
    std::printf(" dB\n");
    char msg[200];
    if (expect_f0 > 0) {
        std::snprintf(msg, sizeof msg, "found %.3f Hz, want %.3f +- %.3f", r.f0, expect_f0, tol);
        check(r.ok && std::fabs(r.f0 - expect_f0) <= tol, msg);
    } else {
        check(!r.ok, "reports nothing found");
    }
}

static void scenario_no_path() {
    std::printf("\n== ANC with the mic outside the cup (can't hear the headphones)\n");
    Config c;
    c.sec_gain = 0.0;
    World w(c);
    setup(w, HK_MODE_ANC, 60.0, 3);
    hk_set_armed(1);
    w.run(6.0);
    hk_status st;
    hk_get_status(&st);
    std::printf("  anc_state=%d error=%d\n", st.anc_state, st.anc_error);
    check(st.anc_state == HK_ANC_FAILED && st.anc_error == HK_ANC_ERR_NO_PATH, "fails with 'mic can't hear the headphones'");
    double db[K];
    w.reduction(1.0, db);
    check(std::fabs(db[0]) < 1.0, "and plays nothing afterwards");
}

static void run_isolated(std::function<void()> fn) {
    std::fflush(stdout);
    pid_t pid = fork();
    if (pid == 0) { fails = 0; fn(); std::fflush(stdout); _exit(fails); }
    int status = 0;
    waitpid(pid, &status, 0);
    fails += WIFEXITED(status) ? WEXITSTATUS(status) : 1;
}

int main() {
    run_isolated([] {
        Config c;
        scenario_anc("ANC: in-cup mic, same clock, mains wandering +-0.01 Hz", c, 8, 20, nullptr, 18);
    });
    run_isolated([] {
        Config c;
        c.drift_ppm = 50;
        c.seed = 2;
        scenario_anc("ANC: 50 ppm clock drift (USB mic), volume halved at 20 s, cups shift at 35 s", c, 8, 50,
                     [](World& w, double t) {
                         if (t >= 20 && t < 21.5) { w.c.sec_gain = 0.25; }
                         if (t >= 35 && t < 36.5) { w.extra_delay = 0.0015; w.c.sec_gain = 0.35; }
                     },
                     15);
    });
    run_isolated([] {
        Config c;
        c.mic_in_cup = false;
        scenario_lock("LOCK: room mic, tuned once by ear, held 60 s while the mains wanders", c, HK_MODE_LOCK, 60, 15, true);
    });
    run_isolated([] {
        Config c;
        c.mic_in_cup = false;
        scenario_lock("MANUAL: same tuning, no lock (shows why Lock exists)", c, HK_MODE_MANUAL, 60, 15, false);
    });
    run_isolated([] { scenario_find("Finder: 60 Hz mains hum + harmonics", {{60.013, 0.02}, {120.026, 0.012}, {180.039, 0.006}}, 0.005, 60.013, 0.06); });
    run_isolated([] { scenario_find("Finder: 120 Hz transformer hum, weak 60", {{60.0, 0.002}, {120.0, 0.02}, {240.0, 0.008}}, 0.005, 60.0, 0.06); });
    run_isolated([] { scenario_find("Finder: fan whine 237.4 Hz + 2nd harmonic", {{237.4, 0.01}, {474.8, 0.004}}, 0.005, 237.4, 0.08); });
    run_isolated([] { scenario_find("Finder: just noise", {}, 0.005, -1, 0); });
    run_isolated([] { scenario_no_path(); });

    std::printf("\n%s (%d failed)\n", fails ? "SOME CHECKS FAILED" : "ALL CHECKS PASSED", fails);
    return fails ? 1 : 0;
}
