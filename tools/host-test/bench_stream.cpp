// Writing speed of one model in low-memory mode, for runs under a memory limit smaller than the
// model (what a phone without enough free memory sees). Token-level, so any model works,
// including the random ones from make_big_model.py.
//
//   bench_stream <model.gguf> [--tokens N] [--prompt N] [--threads N] [--no-pager] [--budget MB] [--fast]
#include "engine.h"
#include "llama.h"

#include <chrono>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <string>
#include <thread>
#include <vector>

static long majflt() {
    FILE * f = std::fopen("/proc/self/stat", "r");
    if (!f) return 0;
    char buf[1024];
    const size_t n = std::fread(buf, 1, sizeof buf - 1, f);
    std::fclose(f);
    buf[n] = 0;
    const char * p = std::strrchr(buf, ')');
    long v[10] = {0};
    char st;
    std::sscanf(p + 1, " %c %ld %ld %ld %ld %ld %ld %ld %ld %ld", &st, &v[0], &v[1], &v[2], &v[3], &v[4], &v[5], &v[6], &v[7], &v[8]);
    return v[8];
}

int main(int argc, char ** argv) {
    if (argc < 2) {
        std::fprintf(stderr, "usage: %s model.gguf [--tokens N] [--prompt N] [--threads N] [--no-pager] [--budget MB] [--fast]\n", argv[0]);
        return 2;
    }
    oa::LoadParams lp;
    lp.n_ctx = 2048;
    lp.n_threads = std::max(1, (int) std::thread::hardware_concurrency());
    lp.low_memory = true;
    lp.spec_n_max = 0;
    lp.spec_ngram = false;
    lp.warmup = true;
    int n_gen = 32, n_prompt = 16;
    for (int i = 2; i < argc; i++) {
        const std::string a = argv[i];
        auto next = [&]() { return i + 1 < argc ? std::atoi(argv[++i]) : 0; };
        if (a == "--tokens") n_gen = next();
        else if (a == "--prompt") n_prompt = next();
        else if (a == "--threads") lp.n_threads = next();
        else if (a == "--no-pager") lp.pager = false;
        else if (a == "--budget") lp.mem_budget_mb = next();
        else if (a == "--fast") lp.low_memory = false;
    }
    llama_log_set([](ggml_log_level level, const char * text, void *) {
        if (level >= GGML_LOG_LEVEL_WARN) std::fputs(text, stderr);
    }, nullptr);
    oa::Engine::backend_init("");
    oa::Engine e;
    std::string err;
    const auto t0 = std::chrono::steady_clock::now();
    if (!e.load(argv[1], lp, err)) {
        std::fprintf(stderr, "load failed: %s\n", err.c_str());
        return 1;
    }
    const double load_s = std::chrono::duration<double>(std::chrono::steady_clock::now() - t0).count();
    const auto info = e.info();
    std::printf("loaded %s (%.2f GB) in %.1fs, %d threads, pager %s: %.2f GB in memory, %.2f GB read per token\n",
                info.desc.c_str(), info.size_bytes / 1e9, load_s, lp.n_threads, info.pager ? "on" : "off",
                info.resident_bytes / 1e9, info.streamed_bytes / 1e9);

    const int n_vocab = 100;
    std::vector<oa::token> prompt(n_prompt);
    for (int i = 0; i < n_prompt; i++) prompt[i] = (oa::token) ((7 + i * 13) % n_vocab);
    long f0 = majflt();
    auto tp = std::chrono::steady_clock::now();
    oa::ChatStats st;
    if (!e.sync_prompt(prompt, 0, err, nullptr, &st)) {
        std::fprintf(stderr, "prompt failed: %s\n", err.c_str());
        return 1;
    }
    const double prompt_s = std::chrono::duration<double>(std::chrono::steady_clock::now() - tp).count();
    std::printf("prompt: %d tokens in %.2fs, %ld storage page reads\n", n_prompt, prompt_s, majflt() - f0);

    f0 = majflt();
    std::vector<double> step_ms;
    const auto tg = std::chrono::steady_clock::now();
    for (int i = 0; i < n_gen; i++) {
        const auto ts = std::chrono::steady_clock::now();
        const oa::token t = (oa::token) ((e.argmax() % n_vocab + n_vocab) % n_vocab);
        if (!e.push_token(t, err)) {
            std::fprintf(stderr, "token %d failed: %s\n", i, err.c_str());
            return 1;
        }
        step_ms.push_back(std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - ts).count());
    }
    const double gen_s = std::chrono::duration<double>(std::chrono::steady_clock::now() - tg).count();
    // the first few tokens settle the memory; the rest is the steady speed
    double steady = 0;
    int ns = 0;
    for (size_t i = step_ms.size() / 4; i < step_ms.size(); i++) { steady += step_ms[i]; ns++; }
    std::printf("RESULT: %.2f tokens/s overall, %.2f tokens/s steady (%d tokens, %ld storage page reads, %.0f per token)\n",
                n_gen / gen_s, ns ? ns * 1000.0 / steady : 0.0, n_gen, majflt() - f0, (majflt() - f0) / (double) n_gen);
    const auto ps = e.pager_stats();
    if (ps.planned) {
        std::printf("pager: %.2f GB resident (%.0f%% present), %.2f GB streamed per pass, window %.0f MB, read %.2f GB, "
                    "storage %.0f MB/s, %d replans\n",
                    ps.resident_bytes / 1e9, ps.resident_present * 100.0, ps.streamed_bytes / 1e9, ps.window_bytes / 1e6,
                    ps.bytes_read / 1e9, ps.read_mbps, ps.n_replans);
    }
    return 0;
}
