// sdtest <model> <prompt> <out.ppm> [width height steps cfg seed threads sampler taesd]
#include "stable-diffusion.h"
#include <chrono>
#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <string>

static void log_cb(enum sd_log_level_t level, const char * text, void *) {
    if (level >= SD_LOG_WARN) std::fprintf(stderr, "%s", text);
}
static void progress_cb(int step, int steps, float t, void *) {
    std::fprintf(stderr, "  step %d/%d %.2fs\n", step, steps, t);
}

int main(int argc, char ** argv) {
    if (argc < 4) return 2;
    const int w = argc > 4 ? std::atoi(argv[4]) : 512, h = argc > 5 ? std::atoi(argv[5]) : 512;
    const int steps = argc > 6 ? std::atoi(argv[6]) : 1;
    const float cfg = argc > 7 ? (float) std::atof(argv[7]) : 1.0f;
    const long seed = argc > 8 ? std::atol(argv[8]) : 42;
    const int threads = argc > 9 ? std::atoi(argv[9]) : 4;
    sd_set_log_callback(log_cb, nullptr);
    sd_set_progress_callback(progress_cb, nullptr);
    sd_ctx_params_t cp;
    sd_ctx_params_init(&cp);
    cp.model_path = argv[1];
    cp.n_threads = threads;
    cp.enable_mmap = true;
    if (argc > 11 && argv[11][0]) cp.taesd_path = argv[11];
    auto t0 = std::chrono::steady_clock::now();
    sd_ctx_t * ctx = new_sd_ctx(&cp);
    if (!ctx) { std::fprintf(stderr, "load failed\n"); return 1; }
    const double t_load = std::chrono::duration<double>(std::chrono::steady_clock::now() - t0).count();
    std::printf("loaded %s in %.1fs (%s)\n", argv[1], t_load, sd_get_model_version_name(ctx));
    sd_img_gen_params_t gp;
    sd_img_gen_params_init(&gp);
    gp.prompt = argv[2];
    gp.negative_prompt = "";
    gp.width = w;
    gp.height = h;
    gp.seed = seed;
    gp.batch_count = 1;
    gp.sample_params.sample_steps = steps;
    gp.sample_params.guidance.txt_cfg = cfg;
    if (argc > 10 && argv[10][0]) gp.sample_params.sample_method = str_to_sample_method(argv[10]);
    t0 = std::chrono::steady_clock::now();
    sd_image_generation_result_t * res = nullptr;
    const bool ok = generate_image(ctx, &gp, &res);
    const double t_gen = std::chrono::duration<double>(std::chrono::steady_clock::now() - t0).count();
    if (!ok || !res || res->count < 1) { std::fprintf(stderr, "generate failed\n"); return 1; }
    const sd_image_t & im = res->items[0].image;
    std::printf("generated %ux%u (%u channels) in %.1fs\n", im.width, im.height, im.channel, t_gen);
    FILE * f = std::fopen(argv[3], "wb");
    std::fprintf(f, "P6\n%u %u\n255\n", im.width, im.height);
    for (uint32_t i = 0; i < im.width * im.height; i++) std::fwrite(im.data + i * im.channel, 1, 3, f);
    std::fclose(f);
    double mean = 0, var = 0;
    const size_t n = (size_t) im.width * im.height * im.channel;
    for (size_t i = 0; i < n; i++) mean += im.data[i];
    mean /= n;
    for (size_t i = 0; i < n; i++) var += (im.data[i] - mean) * (im.data[i] - mean);
    std::printf("pixels: mean %.1f, std %.1f\n", mean, std::sqrt(var / n));
    free_sd_image_generation_result(res);
    free_sd_ctx(ctx);
    return 0;
}
