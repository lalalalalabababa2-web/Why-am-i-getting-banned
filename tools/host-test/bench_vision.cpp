// How fast a model's projector reads one large picture, with its weights in the plain layout and
// in the CPU's repacked one (mtmd-repack.inc), and how close the two readings are.
//
//   bench_vision <model.gguf> <mmproj.gguf> <label> [side=1024] [max_tokens=1024] [threads=4]
//
// Each mode loads the projector afresh (plain; repacked; repacked with 8-bit attention scores),
// reads the same picture twice and prints the second time, the memory the process holds afterwards, and the
// readings' agreement with the plain layout's (cosine similarity and relative error).
#include "llama.h"
#include "mtmd.h"

#include <chrono>
#include <map>
#include <algorithm>
#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <string>
#include <vector>

static long rss_mb() {
    FILE * f = std::fopen("/proc/self/status", "r");
    if (!f) return -1;
    char line[256];
    long kb = -1;
    while (std::fgets(line, sizeof line, f)) {
        if (std::strncmp(line, "VmRSS:", 6) == 0) kb = std::atol(line + 6);
    }
    std::fclose(f);
    return kb / 1024;
}

static double now_ms() {
    using namespace std::chrono;
    return duration<double, std::milli>(steady_clock::now().time_since_epoch()).count();
}

// BENCH_VISION_PROFILE=1: where the time of a reading goes, by kind of operation (each node then
// runs on its own, so the total is a little higher than without)
struct Profile {
    std::map<std::string, double> ms;
    double last = 0;
};
static bool profile_cb(ggml_tensor * t, bool ask, void * ud) {
    auto * p = (Profile *) ud;
    if (ask) return true;
    const double now = now_ms();
    std::string key = ggml_op_desc(t);
    if (t->op == GGML_OP_MUL_MAT && t->src[0]) key += std::string(" ") + ggml_type_name(t->src[0]->type);
    p->ms[key] += now - p->last;
    p->last = now;
    return true;
}

int main(int argc, char ** argv) {
    if (argc < 4) {
        std::fprintf(stderr, "usage: %s model.gguf mmproj.gguf label [side] [max_tokens] [threads]\n", argv[0]);
        return 2;
    }
    const std::string model_path = argv[1], mmproj = argv[2], label = argv[3];
    const int side    = argc > 4 ? std::atoi(argv[4]) : 1024;
    const int max_tok = argc > 5 ? std::atoi(argv[5]) : 1024;
    const int threads = argc > 6 ? std::atoi(argv[6]) : 4;

    llama_backend_init();
    llama_log_set([](ggml_log_level level, const char * text, void *) {
        if (level >= GGML_LOG_LEVEL_WARN || std::strstr(text, "repacked layout")) std::fputs(text, stderr);
    }, nullptr);
    auto mp = llama_model_default_params();
    mp.n_gpu_layers = 0;
    llama_model * model = llama_model_load_from_file(model_path.c_str(), mp);
    if (!model) {
        std::fprintf(stderr, "could not load %s\n", model_path.c_str());
        return 1;
    }
    const int n_embd = llama_model_n_embd_inp(model);

    // a picture with detail everywhere: gradients, stripes and blocks
    std::vector<unsigned char> rgb((size_t) side * side * 3);
    for (int y = 0; y < side; y++) {
        for (int x = 0; x < side; x++) {
            unsigned char * p = &rgb[((size_t) y * side + x) * 3];
            p[0] = (unsigned char) (x * 255 / side);
            p[1] = (unsigned char) (((x / 16 + y / 16) & 1) ? 220 : 30);
            p[2] = (unsigned char) ((int) (127 + 120 * std::sin(x * 0.05) * std::cos(y * 0.03)));
        }
    }

    // BENCH_VISION_DUMP=file keeps the plain layout's reading; BENCH_VISION_REF=file compares
    // every mode with one kept before (another projector file of the same model, say)
    std::vector<float> ref;
    if (const char * rf = std::getenv("BENCH_VISION_REF")) {
        if (FILE * f = std::fopen(rf, "rb")) {
            float v;
            while (std::fread(&v, sizeof v, 1, f) == 1) ref.push_back(v);
            std::fclose(f);
        }
    }
    // the plain layout and ggml's attention (the reference), the repacked weights, then the
    // repacked weights with 8-bit attention scores (fa-prefill.inc)
    // (BENCH_VISION_MORE=1: also without its channel balance, and with 32-bit V sums)
    struct Mode { const char * repack, * fa8, * smooth, * v32, * name; };
    std::vector<Mode> modes = {
        { "0", "0", "1", "0", "plain" },
        { "1", "0", "1", "0", "repacked" },
        { "1", "1", "1", "0", "repacked + 8-bit attention" },
    };
    if (const char * more = std::getenv("BENCH_VISION_MORE"); more && *more && std::strcmp(more, "0") != 0) {
        modes.push_back({ "1", "1", "0", "0", "repacked + 8-bit attention without channel balance" });
        modes.push_back({ "1", "1", "1", "1", "repacked + 8-bit attention with 32-bit V sums" });
    }
    for (const Mode & md : modes) {
        const char * mode = md.repack;
        setenv("MTMD_CPU_REPACK", md.repack, 1);
        setenv("OA_FA8", md.fa8, 1);
        setenv("OA_FA8_SMOOTH", md.smooth, 1);
        setenv("OA_FA8_V32", md.v32, 1);
        auto cp = mtmd_context_params_default();
        cp.use_gpu = false;
        cp.print_timings = false;
        cp.n_threads = threads;
        cp.warmup = false;
        cp.image_max_tokens = max_tok;
        Profile prof;
        const bool profiling = std::getenv("BENCH_VISION_PROFILE") != nullptr && std::strcmp(md.fa8, "0") != 0 &&
                               std::strcmp(md.smooth, "1") == 0 && std::strcmp(md.v32, "0") == 0;
        if (profiling) {
            cp.cb_eval = profile_cb;
            cp.cb_eval_user_data = &prof;
        }
        const double t_load = now_ms();
        mtmd_context * ctx = mtmd_init_from_file(mmproj.c_str(), model, cp);
        if (!ctx) {
            std::fprintf(stderr, "could not load %s\n", mmproj.c_str());
            return 1;
        }
        const double load_ms = now_ms() - t_load;
        mtmd_bitmap * bmp = mtmd_bitmap_init(side, side, rgb.data());
        mtmd_input_chunks * chunks = mtmd_input_chunks_init();
        mtmd_input_text text = { mtmd_default_marker(), std::strlen(mtmd_default_marker()), false, false };
        const mtmd_bitmap * bmps[] = { bmp };
        if (mtmd_tokenize(ctx, chunks, &text, bmps, 1) != 0) {
            std::fprintf(stderr, "tokenize failed\n");
            return 1;
        }
        const mtmd_input_chunk * img = nullptr;
        for (size_t i = 0; i < mtmd_input_chunks_size(chunks); i++) {
            const mtmd_input_chunk * c = mtmd_input_chunks_get(chunks, i);
            if (mtmd_input_chunk_get_type(c) != MTMD_INPUT_CHUNK_TYPE_TEXT) img = c;
        }
        if (!img) {
            std::fprintf(stderr, "no picture chunk\n");
            return 1;
        }
        const size_t n_tok = mtmd_input_chunk_get_n_tokens(img);
        double first = 0, second = 0;
        for (int run = 0; run < 2; run++) {
            const double t0 = now_ms();
            prof.ms.clear();
            prof.last = t0;
            if (mtmd_encode_chunk(ctx, img) != 0) {
                std::fprintf(stderr, "encode failed\n");
                return 1;
            }
            (run == 0 ? first : second) = now_ms() - t0;
        }
        const float * e = mtmd_get_output_embd(ctx);
        std::vector<float> out(e, e + n_tok * n_embd);
        double cos = 1, rel = 0;
        if (const char * df = std::getenv("BENCH_VISION_DUMP"); df && std::strcmp(md.fa8, "0") == 0 && std::strcmp(mode, "0") == 0) {
            if (FILE * f = std::fopen(df, "wb")) {
                std::fwrite(out.data(), sizeof(float), out.size(), f);
                std::fclose(f);
            }
        }
        if (ref.empty()) {
            ref = out;
        } else if (ref.size() != out.size()) {
            cos = rel = NAN;
        } else {
            double dot = 0, na = 0, nb = 0, se = 0;
            for (size_t i = 0; i < out.size(); i++) {
                dot += (double) out[i] * ref[i];
                na += (double) out[i] * out[i];
                nb += (double) ref[i] * ref[i];
                se += ((double) out[i] - ref[i]) * ((double) out[i] - ref[i]);
            }
            cos = dot / std::sqrt(na * nb + 1e-30);
            rel = std::sqrt(se / (nb + 1e-30));
        }
        const char * name = md.name;
        std::printf("SPEED: %s, a %dx%d picture (%zu tokens) on %d threads, %s: %.0f ms (first %.0f ms, load %.0f ms), "
                    "memory %ld MB, cosine %.6f, relative error %.4f\n",
                    label.c_str(), side, side, n_tok, threads, name, second, first, load_ms, rss_mb(), cos, rel);
        if (profiling) {
            std::vector<std::pair<double, std::string>> by;
            for (auto & kv : prof.ms) by.push_back({ kv.second, kv.first });
            std::sort(by.rbegin(), by.rend());
            for (size_t i = 0; i < by.size() && i < 8; i++) {
                std::printf("  %-28s %7.0f ms  %4.1f%%\n", by[i].second.c_str(), by[i].first, 100.0 * by[i].first / second);
            }
        }
        std::fflush(stdout);
        mtmd_input_chunks_free(chunks);
        mtmd_bitmap_free(bmp);
        mtmd_free(ctx);
    }
    llama_model_free(model);
    return 0;
}
