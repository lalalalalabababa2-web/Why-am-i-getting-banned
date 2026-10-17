#include "engine.h"

#include "chat.h"
#include "common.h"
#include "sampling.h"
#include "speculative.h"
#include "llama.h"
#include "llama-ext.h"   // memory breakdown (llama's staging API)
#include "ggml-backend.h"
#include "mtmd.h"
#include "mtmd-helper.h"

#include <algorithm>
#include <chrono>
#include <cstring>
#include <memory>
#include <stdexcept>

namespace oa {

size_t utf8_complete_prefix(const std::string & s) {
    // Walk back from the end over at most 3 continuation bytes to the lead byte of the last
    // sequence, and cut there if that sequence is not complete yet.
    const size_t n = s.size();
    if (n == 0) return 0;
    size_t i = n;
    int cont = 0;
    while (i > 0 && cont < 4) {
        const unsigned char c = (unsigned char) s[i - 1];
        if ((c & 0xC0) == 0x80) {
            cont++;
            i--;
            continue;
        }
        int need;
        if ((c & 0x80) == 0x00) need = 1;
        else if ((c & 0xE0) == 0xC0) need = 2;
        else if ((c & 0xF0) == 0xE0) need = 3;
        else if ((c & 0xF8) == 0xF0) need = 4;
        else return n;  // not UTF-8 at all; leave it to the decoder
        return (cont + 1 >= need) ? n : i - 1;
    }
    return n;
}

std::vector<token> virtual_tokens(const std::string & id, size_t n) {
    // FNV-1a over the id, then one value per position. Always negative, so they never collide
    // with a real token, and never handed to the model.
    uint64_t h = 1469598103934665603ULL;
    for (unsigned char c : id) {
        h ^= c;
        h *= 1099511628211ULL;
    }
    std::vector<token> out(n);
    for (size_t k = 0; k < n; k++) {
        const uint64_t x = (h + k * 0x9E3779B97F4A7C15ULL) >> 33;
        out[k] = -1 - (token) (x & 0x3FFFFFFF);
    }
    return out;
}

static size_t common_prefix(const std::vector<token> & a, const std::vector<token> & b) {
    const size_t n = std::min(a.size(), b.size());
    size_t i = 0;
    while (i < n && a[i] == b[i]) i++;
    return i;
}

static bool abort_cb(void * data) {
    return static_cast<std::atomic<bool> *>(data)->load();
}

static double ms_since(std::chrono::steady_clock::time_point t0) {
    return std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - t0).count();
}

void Engine::backend_init(const std::string & lib_dir) {
    static bool done = false;
    if (done) return;
    done = true;
    if (!lib_dir.empty()) {
        ggml_backend_load_all_from_path(lib_dir.c_str());
    }
    llama_backend_init();
}

std::string Engine::system_info() {
    return llama_print_system_info();
}

Engine::Engine() = default;

Engine::~Engine() {
    unload();
}

void Engine::free_spec() {
    if (spec_) {
        common_speculative_free(spec_);
        spec_ = nullptr;
    }
    if (ctx_dft_) {
        llama_free(ctx_dft_);
        ctx_dft_ = nullptr;
    }
    if (model_dft_) {
        llama_model_free(model_dft_);
        model_dft_ = nullptr;
    }
    spec_kind_.clear();
    spec_n_max_ = 0;
    ngram_ = false;
}

void Engine::release_media() {
    if (mtmd_) {
        mtmd_free(mtmd_);
        mtmd_ = nullptr;
    }
}

void Engine::unload() {
    free_spec();
    release_media();
    if (tmpls_) {
        common_chat_templates_free(tmpls_);
        tmpls_ = nullptr;
    }
    if (ctx_) {
        llama_free(ctx_);
        ctx_ = nullptr;
    }
    if (model_) {
        llama_model_free(model_);
        model_ = nullptr;
    }
    vocab_ = nullptr;
    cache_.clear();
    cache_extra_cells_ = 0;
    snapshots_.clear();
    mm_vision_ = mm_audio_ = false;
    compute_bytes_ = 0;
}

struct ProgressBridge {
    const std::function<bool(float)> * fn;
};

static bool load_progress(float p, void * data) {
    auto * b = static_cast<ProgressBridge *>(data);
    return (b->fn && *b->fn) ? (*b->fn)(p) : true;
}

static size_t compute_bytes_of(const llama_context * ctx) {
    if (!ctx) return 0;
    size_t total = 0;
    try {
        for (const auto & [buft, d] : llama_get_memory_breakdown(ctx)) total += d.compute;
    } catch (...) {
    }
    return total;
}

bool Engine::load(const std::string & path, const LoadParams & params, std::string & err,
                  const std::function<bool(float)> & progress, const std::function<void()> & on_warmup) {
    unload();
    params_ = params;
    stop_.store(false);

    // What kind of drafting this file allows: its own MTP head (Qwen3.5 "-MTP" files), or a
    // separate drafter file next to it (Gemma 4).
    const int n_draft = params.spec_n_max > 0 ? std::min(4, params.spec_n_max) : 0;
    bool file_mtp = false;
    if (n_draft > 0) {
        try {
            for (auto t : common_speculative_types_from_gguf(path)) {
                if (t == COMMON_SPECULATIVE_TYPE_DRAFT_MTP) file_mtp = true;
            }
        } catch (...) {
        }
    }
    const bool use_drafter = n_draft > 0 && !file_mtp && !params.drafter_path.empty();

    auto mp = llama_model_default_params();
    mp.n_gpu_layers = 0;
    mp.load_mode = params.use_mmap ? LLAMA_LOAD_MODE_MMAP : LLAMA_LOAD_MODE_NONE;
    mp.use_extra_bufts = !params.low_memory;
    mp.load_mtp = file_mtp;
    ProgressBridge bridge{&progress};
    mp.progress_callback = load_progress;
    mp.progress_callback_user_data = &bridge;

    model_ = llama_model_load_from_file(path.c_str(), mp);
    if (!model_) {
        err = "The model could not be loaded. The file may be incomplete or damaged, or it is a kind of "
              "model this version of the app cannot run.";
        return false;
    }
    vocab_ = llama_model_get_vocab(model_);
    is_swa_ = llama_model_n_swa(model_) > 0;
    const bool recurrent = llama_model_is_recurrent(model_) || llama_model_is_hybrid(model_);

    // n-gram drafts can be long; only models whose memory can be wound back any distance use them
    const bool want_ngram = n_draft > 0 && params.spec_ngram && !recurrent;
    const int  ngram_n_max = 32;
    const bool want_head = file_mtp || use_drafter;
    // Room for the logits of one token plus a draft. llama would otherwise reserve logits for
    // every token of a prompt step, hundreds of MB for vocabularies of 250k words, never used.
    spec_n_out_ = 1 + std::max(want_head ? n_draft : 0, want_ngram ? ngram_n_max : 0);

    auto cp = llama_context_default_params();
    cp.n_ctx = (uint32_t) std::max(512, params.n_ctx);
    cp.n_batch = (uint32_t) std::max(32, params.n_batch);
    cp.n_ubatch = std::min<uint32_t>(cp.n_batch, (uint32_t) std::max(16, params.n_ubatch));
    cp.n_seq_max = 1;
    cp.n_threads = std::max(1, params.n_threads);
    cp.n_threads_batch = std::max(1, params.n_threads);
    cp.n_outputs_max = (uint32_t) spec_n_out_;
    cp.n_outputs_max_per_seq = (uint32_t) spec_n_out_;
    // a recurrent state can be wound back only as far as it keeps copies: one per draft token
    cp.n_rs_seq = (recurrent && want_head) ? (uint32_t) n_draft : 0;
    // Sliding-window models keep every position, so any tail of the memory can be dropped and the
    // conversation never has to be read again from the start. Costs memory only for those models.
    cp.swa_full = params.swa_full;
    cp.abort_callback = abort_cb;
    cp.abort_callback_data = &stop_;
    cp.no_perf = true;
    if (params.kv_q8) {
        // A quantized V cache needs flash attention, which the CPU backend has.
        cp.type_k = GGML_TYPE_Q8_0;
        cp.type_v = GGML_TYPE_Q8_0;
        cp.flash_attn_type = LLAMA_FLASH_ATTN_TYPE_ENABLED;
    }

    ctx_ = llama_init_from_model(model_, cp);
    if (!ctx_ && cp.n_rs_seq > 0) {
        // the copies of the recurrent state did not fit: go on without drafting
        cp.n_rs_seq = 0;
        ctx_ = llama_init_from_model(model_, cp);
    }
    if (!ctx_) {
        llama_model_free(model_);
        model_ = nullptr;
        vocab_ = nullptr;
        err = "There is not enough memory for this model at this context size. Try a smaller context "
              "size or low-memory mode in Settings, close other apps, or pick a smaller model.";
        return false;
    }
    cur_threads_ = cp.n_threads;
    want_threads_.store(cp.n_threads);

    if (params.warmup) {
        // One evaluation step reads every weight, so it is paid for here, while the progress bar
        // is showing, instead of on the first message.
        if (on_warmup) on_warmup();
        std::vector<token> tmp;
        const token bos = llama_vocab_bos(vocab_);
        const token eos = llama_vocab_eos(vocab_);
        if (bos != LLAMA_TOKEN_NULL) tmp.push_back(bos);
        if (eos != LLAMA_TOKEN_NULL) tmp.push_back(eos);
        if (tmp.empty()) tmp.push_back(0);
        llama_decode(ctx_, llama_batch_get_one(tmp.data(), (int32_t) tmp.size()));
        llama_memory_clear(llama_get_memory(ctx_), true);
        llama_synchronize(ctx_);
    }

    const auto rm_type = common_context_can_seq_rm(ctx_);
    can_rm_part_ = rm_type == COMMON_CONTEXT_SEQ_RM_TYPE_PART;
    const bool can_draft = rm_type == COMMON_CONTEXT_SEQ_RM_TYPE_PART ||
                           (rm_type == COMMON_CONTEXT_SEQ_RM_TYPE_RS && llama_n_rs_seq(ctx_) > 0);

    // ---- speculative decoding ----
    if (n_draft > 0 && can_draft) {
        auto dcp = cp;
        dcp.ctx_type = LLAMA_CONTEXT_TYPE_MTP;
        dcp.n_rs_seq = 0;
        dcp.ctx_other = ctx_;
        dcp.n_ctx = llama_n_ctx(ctx_);
        if (file_mtp) {
            ctx_dft_ = llama_init_from_model(model_, dcp);
        } else if (use_drafter) {
            auto mpd = llama_model_default_params();
            mpd.n_gpu_layers = 0;
            mpd.load_mode = mp.load_mode;
            mpd.use_extra_bufts = mp.use_extra_bufts;
            model_dft_ = llama_model_load_from_file(params.drafter_path.c_str(), mpd);
            if (model_dft_ && common_speculative_are_compatible(model_, model_dft_)) {
                try {
                    ctx_dft_ = llama_init_from_model(model_dft_, dcp);
                } catch (...) {
                    ctx_dft_ = nullptr;
                }
            }
            if (!ctx_dft_ && model_dft_) {
                llama_model_free(model_dft_);
                model_dft_ = nullptr;
            }
        }
        if (ctx_dft_) llama_set_abort_callback(ctx_dft_, abort_cb, &stop_);

        const bool head = ctx_dft_ != nullptr;
        if (head || want_ngram) {
            common_params_speculative sp;
            sp.types.clear();
            if (want_ngram) sp.types.push_back(COMMON_SPECULATIVE_TYPE_NGRAM_MOD);
            if (head) sp.types.push_back(COMMON_SPECULATIVE_TYPE_DRAFT_MTP);
            sp.draft.n_max = n_draft;
            sp.draft.n_min = 0;
            sp.draft.ctx_tgt = ctx_;
            sp.draft.ctx_dft = ctx_dft_;
            sp.ngram_mod.n_match = 24;
            sp.ngram_mod.n_max = ngram_n_max;
            sp.ngram_mod.n_min = 16;
            try {
                spec_ = common_speculative_init(sp, 1);
            } catch (const std::exception &) {
                spec_ = nullptr;
            }
            if (spec_) {
                spec_n_max_ = n_draft;
                ngram_ = want_ngram;
                if (head) spec_kind_ = file_mtp ? "mtp" : "drafter";
                if (want_ngram) spec_kind_ += spec_kind_.empty() ? "ngram" : "+ngram";
            } else {
                if (ctx_dft_) { llama_free(ctx_dft_); ctx_dft_ = nullptr; }
                if (model_dft_) { llama_model_free(model_dft_); model_dft_ = nullptr; }
            }
        }
    }

    // ---- pictures and sound: only look at what the projector can do; it loads on first use ----
    if (!params.mmproj_path.empty()) {
        try {
            const auto caps = mtmd_get_cap_from_file(params.mmproj_path.c_str());
            mm_vision_ = caps.inp_vision;
            mm_audio_ = caps.inp_audio;
        } catch (...) {
            mm_vision_ = mm_audio_ = false;
        }
    }

    try {
        tmpls_ = common_chat_templates_init(model_, "").release();
    } catch (const std::exception & e) {
        tmpls_ = nullptr;
    }
    if (!tmpls_) {
        // Fall back to the generic ChatML layout rather than refusing the model.
        try {
            tmpls_ = common_chat_templates_init(model_, "chatml").release();
        } catch (const std::exception & e) {
            err = std::string("The model's chat template could not be read: ") + e.what();
            unload();
            return false;
        }
    }
    compute_bytes_ = compute_bytes_of(ctx_) + compute_bytes_of(ctx_dft_);
    cache_.clear();
    cache_extra_cells_ = 0;
    snapshots_.clear();
    return true;
}

ModelInfo Engine::info() const {
    ModelInfo mi;
    if (!model_) return mi;
    char buf[512];
    if (llama_model_meta_val_str(model_, "general.name", buf, sizeof(buf)) > 0) mi.name = buf;
    if (llama_model_meta_val_str(model_, "general.architecture", buf, sizeof(buf)) > 0) mi.arch = buf;
    if (llama_model_desc(model_, buf, sizeof(buf)) > 0) mi.desc = buf;
    mi.size_bytes = llama_model_size(model_);
    mi.n_params = llama_model_n_params(model_);
    mi.n_ctx_train = llama_model_n_ctx_train(model_);
    mi.n_ctx = ctx_ ? (int) llama_n_ctx(ctx_) : 0;
    mi.n_threads = params_.n_threads;
    if (tmpls_) {
        mi.supports_thinking = common_chat_templates_support_enable_thinking(tmpls_);
        mi.has_template = common_chat_templates_was_explicit(tmpls_);
    }
    mi.memory = can_rm_part_ ? "attention" : "snapshots";
    mi.speculative = spec_kind_;
    mi.spec_n_max = spec_n_max_;
    mi.vision = mm_vision_;
    mi.audio = mm_audio_;
    return mi;
}

std::vector<token> Engine::tokenize(const std::string & text, bool add_special) const {
    if (!vocab_) return {};
    return common_tokenize(vocab_, text, add_special, true);
}

void Engine::reset_cache() {
    if (!ctx_) return;
    clear_memory();
    snapshots_.clear();
}

void Engine::trim_draft(size_t n_tokens) {
    if (!ctx_dft_) return;
    if (auto * mem = llama_get_memory(ctx_dft_)) llama_memory_seq_rm(mem, 0, (llama_pos) n_tokens, -1);
}

bool Engine::memory_truncate(size_t n_tokens) {
    if (n_tokens >= cache_.size()) return true;
    if (!can_rm_part_) return false;
    if (!llama_memory_seq_rm(llama_get_memory(ctx_), 0, (llama_pos) n_tokens, -1)) return false;
    trim_draft(n_tokens);
    cache_.resize(n_tokens);
    return true;
}

void Engine::clear_memory() {
    llama_memory_clear(llama_get_memory(ctx_), true);
    if (ctx_dft_) {
        if (auto * mem = llama_get_memory(ctx_dft_)) llama_memory_clear(mem, true);
    }
    cache_.clear();
    cache_extra_cells_ = 0;
}

void Engine::apply_threads() {
    const int want = want_threads_.load();
    if (want > 0 && want != cur_threads_) {
        llama_set_n_threads(ctx_, want, want);
        if (ctx_dft_) llama_set_n_threads(ctx_dft_, want, want);
        cur_threads_ = want;
    }
}

void Engine::save_snapshot() {
    const size_t n = cache_.size();
    if (n == 0) return;
    snapshots_.erase(std::remove_if(snapshots_.begin(), snapshots_.end(),
                                    [&](const Snapshot & s) { return s.tokens == cache_; }),
                     snapshots_.end());
    const size_t size = llama_state_seq_get_size(ctx_, 0);
    if (size == 0) return;
    Snapshot s;
    try {
        s.tokens = cache_;
        s.data.resize(size);
    } catch (const std::bad_alloc &) {
        return;  // no room for a snapshot; the next turn reads the conversation again instead
    }
    const size_t written = llama_state_seq_get_data(ctx_, s.data.data(), s.data.size(), 0);
    if (written == 0) return;
    s.data.resize(written);
    s.extra_cells = cache_extra_cells_;
    if (ctx_dft_ && llama_get_ctx_other(ctx_dft_) != ctx_) {
        try {
            const size_t dsize = llama_state_seq_get_size(ctx_dft_, 0);
            if (dsize > 0) {
                s.data_dft.resize(dsize);
                const size_t dw = llama_state_seq_get_data(ctx_dft_, s.data_dft.data(), dsize, 0);
                s.data_dft.resize(dw);
            }
        } catch (const std::bad_alloc &) {
            s.data_dft.clear();
        }
    }
    if (spec_) common_speculative_get_state(spec_, 0, s.data_spec);
    while (snapshots_.size() >= kMaxSnapshots) snapshots_.erase(snapshots_.begin());
    snapshots_.push_back(std::move(s));
}

const Engine::Snapshot * Engine::best_snapshot(const std::vector<token> & prompt, size_t max_tokens) const {
    const Snapshot * best = nullptr;
    for (const auto & s : snapshots_) {
        const size_t n = s.tokens.size();
        if (n == 0 || n > max_tokens || n > prompt.size() || (best && n <= best->tokens.size())) continue;
        if (std::equal(s.tokens.begin(), s.tokens.end(), prompt.begin())) best = &s;
    }
    return best;
}

bool Engine::restore_snapshot(const Snapshot & s) {
    auto * mem = llama_get_memory(ctx_);
    llama_memory_seq_rm(mem, 0, -1, -1);
    const size_t read = llama_state_seq_set_data(ctx_, s.data.data(), s.data.size(), 0);
    if (read == 0) {
        clear_memory();
        return false;
    }
    if (ctx_dft_) {
        if (auto * dmem = llama_get_memory(ctx_dft_)) {
            if (llama_get_ctx_other(ctx_dft_) != ctx_) {
                llama_memory_seq_rm(dmem, 0, -1, -1);
                if (!s.data_dft.empty()) llama_state_seq_set_data(ctx_dft_, s.data_dft.data(), s.data_dft.size(), 0);
            }
        }
    }
    if (spec_ && !s.data_spec.empty()) common_speculative_set_state(spec_, 0, s.data_spec);
    cache_ = s.tokens;
    cache_extra_cells_ = s.extra_cells;
    return true;
}

bool Engine::decode_text(const std::vector<token> & tokens, size_t from, size_t to, bool logits_last,
                         std::string & err, const std::function<void(int, int)> & progress, int total, size_t reused) {
    if (from >= to) return true;
    apply_threads();
    const int n_batch = (int) llama_n_batch(ctx_);
    common_batch batch(ctx_);
    for (size_t i = from; i < to; i += n_batch) {
        const size_t n = std::min<size_t>(n_batch, to - i);
        batch.clear();
        for (size_t j = 0; j < n; j++) {
            batch.add(tokens[i + j], (llama_pos) (i + j), 0, logits_last && i + j == to - 1);
        }
        const int ret = llama_process(ctx_, LLAMA_PROCESS_TYPE_DECODE, batch.get());
        if (ret != 0) {
            if (can_rm_part_) {
                const llama_pos pos_max = llama_memory_seq_pos_max(llama_get_memory(ctx_), 0);
                const size_t have = pos_max < 0 ? 0 : (size_t) pos_max + 1;
                if (have >= i && have <= i + n) {
                    cache_.assign(tokens.begin(), tokens.begin() + have);
                    trim_draft(have);
                } else {
                    clear_memory();
                }
            } else {
                clear_memory();
            }
            if (ret == 2 || stop_.load()) err = "stopped";
            else if (ret == 1) err = "The conversation no longer fits in the context. Start a new chat or raise the context size.";
            else err = "The model failed while reading the conversation (error " + std::to_string(ret) + ").";
            return false;
        }
        if (spec_ && !common_speculative_process(spec_, batch)) {
            // the drafter fell out of step; drafting gets worse but the reply stays right
            trim_draft(i);
        }
        cache_.insert(cache_.end(), tokens.begin() + i, tokens.begin() + i + n);
        if (progress) progress((int) (cache_.size() - reused), total);
        if (stop_.load() && cache_.size() < to) {
            err = "stopped";
            return false;
        }
    }
    return true;
}

// ---------------------------------------------------------------- pictures and sound

bool Engine::ensure_mtmd(std::string & err) {
    if (mtmd_) return true;
    if (params_.mmproj_path.empty()) {
        err = "This model cannot read pictures or sound.";
        return false;
    }
    auto mparams = mtmd_context_params_default();
    mparams.use_gpu = false;
    mparams.print_timings = false;
    mparams.n_threads = std::max(1, cur_threads_);
    mparams.warmup = false;
    mparams.media_marker = mtmd_default_marker();
    if (params_.image_max_tokens > 0) mparams.image_max_tokens = params_.image_max_tokens;
    try {
        // a picture a model reads in one piece (non-causal attention) must fit one prompt step
        const auto usage = mtmd_get_memory_usage(params_.mmproj_path.c_str(), mparams);
        const int n_ubatch = (int) llama_n_ubatch(ctx_);
        if (usage.use_non_causal && usage.image_max_tokens > n_ubatch) {
            mparams.image_max_tokens = n_ubatch;
            mparams.image_min_tokens = std::min(mparams.image_min_tokens, n_ubatch);
        }
    } catch (...) {
    }
    mtmd_ = mtmd_init_from_file(params_.mmproj_path.c_str(), model_, mparams);
    if (!mtmd_) {
        err = "The picture and sound part of this model could not be loaded. The file may be damaged or "
              "there is not enough memory; close other apps and try again.";
        return false;
    }
    mm_vision_ = mtmd_support_vision(mtmd_);
    mm_audio_ = mtmd_support_audio(mtmd_);
    return true;
}

namespace {
struct MediaFile {
    std::string id;
    bool        audio = false;
    uint32_t    nx = 0, ny = 0;
    size_t      n_samples = 0;
};
}  // namespace

static std::map<std::string, MediaFile> & media_files() {
    static std::map<std::string, MediaFile> m;
    return m;
}

// The bitmap for one attachment: its pixels/samples, or (`placeholder`) only its size, which is
// all tokenizing needs. The first sight of a file decodes it once to learn size and hash.
static mtmd_bitmap * media_bitmap(mtmd_context * ctx, const Media & m, bool placeholder, std::string & err) {
    auto & cache = media_files();
    auto it = cache.find(m.path);
    if (placeholder && it != cache.end()) {
        const MediaFile & f = it->second;
        mtmd_bitmap * b = f.audio ? mtmd_bitmap_init_from_audio(f.n_samples, nullptr)
                                  : mtmd_bitmap_init(f.nx, f.ny, nullptr);
        if (b) mtmd_bitmap_set_id(b, f.id.c_str());
        return b;
    }
    auto w = mtmd_helper_bitmap_init_from_file(ctx, m.path.c_str(), false, mtmd_helper_init_opt_default());
    if (!w.bitmap) {
        err = "An attachment could not be read (" + m.path.substr(m.path.find_last_of('/') + 1) +
              "). It may be damaged or in a format this model cannot take.";
        return nullptr;
    }
    if (w.video_ctx) mtmd_helper_video_free(w.video_ctx);
    MediaFile f;
    const char * id = mtmd_bitmap_get_id(w.bitmap);
    f.id = id ? id : m.path;
    f.audio = mtmd_bitmap_is_audio(w.bitmap);
    f.nx = mtmd_bitmap_get_nx(w.bitmap);
    f.ny = mtmd_bitmap_get_ny(w.bitmap);
    f.n_samples = f.audio ? mtmd_bitmap_get_n_bytes(w.bitmap) / sizeof(float) : 0;
    if (cache.size() > 512) cache.clear();
    cache[m.path] = f;
    if (placeholder) {
        mtmd_bitmap_free(w.bitmap);
        mtmd_bitmap * b = f.audio ? mtmd_bitmap_init_from_audio(f.n_samples, nullptr) : mtmd_bitmap_init(f.nx, f.ny, nullptr);
        if (b) mtmd_bitmap_set_id(b, f.id.c_str());
        return b;
    }
    return w.bitmap;
}

// Tokenizes `text` (with media markers) and its media; `real_from` is the index of the first
// attachment whose pixels are needed, earlier ones are placeholders.
static mtmd_input_chunks * tokenize_with_media(mtmd_context * ctx, const std::string & text, const std::vector<Media> & media,
                                               size_t real_from, std::string & err) {
    std::vector<mtmd_bitmap *> bms;
    auto free_all = [&]() {
        for (auto * b : bms) mtmd_bitmap_free(b);
        bms.clear();
    };
    for (size_t i = 0; i < media.size(); i++) {
        mtmd_bitmap * b = media_bitmap(ctx, media[i], i < real_from, err);
        if (!b) {
            free_all();
            return nullptr;
        }
        bms.push_back(b);
    }
    mtmd_input_chunks * chunks = mtmd_input_chunks_init();
    mtmd_input_text in;
    in.text = text.c_str();
    in.text_len = text.size();
    in.add_special = true;
    in.parse_special = true;
    std::vector<const mtmd_bitmap *> cbms(bms.begin(), bms.end());
    const int32_t r = mtmd_tokenize(ctx, chunks, &in, cbms.data(), cbms.size());
    free_all();
    if (r != 0) {
        mtmd_input_chunks_free(chunks);
        err = r == 1 ? "The attachments did not line up with the message (internal error)."
                     : "An attachment could not be prepared for this model.";
        return nullptr;
    }
    return chunks;
}

bool Engine::build_prompt(const std::string & text, const std::vector<Media> & media, Prompt & out, std::string & err) {
    out = Prompt();
    out.text = text;
    out.media = media;
    if (media.empty()) {
        out.units = common_tokenize(vocab_, text, true, true);
        Segment s;
        s.start = 0;
        s.len = out.units.size();
        s.n_tokens = (int) s.len;
        out.segs.push_back(s);
        return true;
    }
    if (!ensure_mtmd(err)) return false;
    mtmd_input_chunks * chunks = tokenize_with_media(mtmd_, text, media, media.size(), err);
    if (!chunks) return false;
    const size_t n = mtmd_input_chunks_size(chunks);
    for (size_t i = 0; i < n; i++) {
        const mtmd_input_chunk * c = mtmd_input_chunks_get(chunks, i);
        Segment s;
        s.start = out.units.size();
        s.chunk = i;
        if (mtmd_input_chunk_get_type(c) == MTMD_INPUT_CHUNK_TYPE_TEXT) {
            size_t nt = 0;
            const llama_token * t = mtmd_input_chunk_get_tokens_text(c, &nt);
            out.units.insert(out.units.end(), t, t + nt);
            s.len = nt;
            s.n_tokens = (int) nt;
        } else {
            const char * id = mtmd_input_chunk_get_id(c);
            const size_t npos = (size_t) mtmd_input_chunk_get_n_pos(c);
            const auto v = virtual_tokens(id ? id : std::to_string(i), npos);
            out.units.insert(out.units.end(), v.begin(), v.end());
            s.media = true;
            s.len = npos;
            s.n_tokens = (int) mtmd_input_chunk_get_n_tokens(c);
            out.extra_cells += s.n_tokens - (int) npos;
        }
        if (s.len > 0) out.segs.push_back(s);
    }
    mtmd_input_chunks_free(chunks);
    return true;
}

namespace {
struct MediaCbData {
    common_speculative * spec;
    llama_context *      ctx;
};
}  // namespace

static int32_t media_post_decode(const mtmd_helper_embd_batch * b, void * user_data) {
    // feeds the drafter the same rows the model just read, so its memory stays in step
    auto * d = static_cast<MediaCbData *>(user_data);
    if (!d->spec) return 0;
    common_batch batch(d->ctx);
    for (int32_t i = 0; i < b->n_tokens; ++i) {
        llama_pos pos[GGML_MROPE_SECTIONS] = {0, 0, 0, 0};
        for (int32_t j = 0; j < b->n_pos && j < GGML_MROPE_SECTIONS; ++j) pos[j] = b->pos[j * b->n_tokens + i];
        batch.add_embd({b->embd + (size_t) i * b->n_embd, 1, (size_t) b->n_embd}, pos, b->seq_id, false);
    }
    common_speculative_process(d->spec, batch);
    return 0;
}

bool Engine::decode_media(const Prompt & prompt, const Segment & seg, mtmd_input_chunks * chunks, std::string & err) {
    const mtmd_input_chunk * c = mtmd_input_chunks_get(chunks, seg.chunk);
    if (!c || mtmd_input_chunk_get_type(c) == MTMD_INPUT_CHUNK_TYPE_TEXT) {
        err = "The attachments did not line up with the message (internal error).";
        return false;
    }
    apply_threads();
    if (mtmd_encode_chunk(mtmd_, c) != 0) {
        err = "A picture or sound could not be read by this model.";
        return false;
    }
    if (stop_.load()) {
        err = "stopped";
        return false;
    }
    float * embd = mtmd_get_output_embd(mtmd_);
    llama_pos new_n_past = (llama_pos) seg.start;
    MediaCbData cbd{spec_, ctx_};
    const int32_t r = mtmd_helper_decode_image_chunk(mtmd_, ctx_, c, embd, (llama_pos) seg.start, 0,
                                                     (int32_t) llama_n_batch(ctx_), &new_n_past,
                                                     spec_ ? media_post_decode : nullptr, spec_ ? &cbd : nullptr);
    if (r != 0) {
        clear_memory();  // a picture read part way leaves no clean point to continue from
        if (stop_.load()) err = "stopped";
        else err = "The model failed while reading a picture or sound (error " + std::to_string(r) + ").";
        return false;
    }
    cache_.insert(cache_.end(), prompt.units.begin() + seg.start, prompt.units.begin() + seg.start + seg.len);
    cache_extra_cells_ += seg.n_tokens - (int) seg.len;
    return true;
}

bool Engine::sync_prompt(const std::vector<token> & prompt, size_t snapshot_at, std::string & err,
                         const std::function<void(int, int)> & progress, ChatStats * stats) {
    Prompt p;
    p.units = prompt;
    Segment s;
    s.start = 0;
    s.len = prompt.size();
    s.n_tokens = (int) s.len;
    p.segs.push_back(s);
    return sync(p, snapshot_at, err, progress, nullptr, stats);
}

bool Engine::sync(const Prompt & prompt, size_t snapshot_at, std::string & err,
                  const std::function<void(int, int)> & progress, const std::function<void(int, int)> & on_media,
                  ChatStats * stats) {
    if (!ctx_) {
        err = "No model is loaded.";
        return false;
    }
    const auto & units = prompt.units;
    if (units.empty()) {
        err = "Nothing to send.";
        return false;
    }
    if ((int) units.size() + prompt.extra_cells >= (int) llama_n_ctx(ctx_)) {
        err = "The conversation is longer than the context size.";
        return false;
    }
    if (prompt.segs.empty() || prompt.segs.back().media) {
        err = "The conversation has to end with text.";
        return false;
    }

    // where a segment starts, for keeping cut points out of the middle of a picture
    auto floor_boundary = [&](size_t at) {
        for (const auto & s : prompt.segs) {
            if (s.media && at > s.start && at < s.start + s.len) return s.start;
        }
        return at;
    };

    size_t keep = common_prefix(cache_, units);
    // The last token is always evaluated again, so its logits are fresh for sampling.
    if (keep >= units.size()) keep = units.size() - 1;
    keep = floor_boundary(keep);

    bool kept = true;
    if (keep < cache_.size()) kept = memory_truncate(keep);
    if (kept && keep <= cache_.size()) {
        // pictures in the part dropped no longer fill memory
        int extra = 0;
        for (const auto & s : prompt.segs) {
            if (s.media && s.start + s.len <= cache_.size()) extra += s.n_tokens - (int) s.len;
        }
        cache_extra_cells_ = extra;
    }
    const size_t usable = kept ? keep : 0;

    bool used_snapshot = false;
    const Snapshot * snap = best_snapshot(units, units.size() - 1);
    if (snap && snap->tokens.size() > usable) {
        used_snapshot = restore_snapshot(*snap);
        if (!used_snapshot) clear_memory();
    } else if (!kept) {
        clear_memory();
    }

    const size_t reused = cache_.size();
    const int total = (int) (units.size() - reused);
    std::function<void(int, int)> report;
    if (progress) {
        report = [&](int done, int) { progress(done, total); };
        progress(0, total);
    }

    snapshot_at = floor_boundary(snapshot_at);
    const bool want_snapshot = !can_rm_part_ && snapshot_at > cache_.size() && snapshot_at < units.size();

    // media whose pixels are needed: those at or after the first segment still to evaluate
    mtmd_input_chunks * real = nullptr;
    int n_media = 0, media_total = 0, media_done = 0;
    for (const auto & s : prompt.segs) {
        if (s.media && s.start >= cache_.size()) media_total++;
    }
    double t_media = 0;
    struct ChunksGuard {
        mtmd_input_chunks *& c;
        ~ChunksGuard() { if (c) mtmd_input_chunks_free(c); }
    } guard{real};

    for (size_t si = 0; si < prompt.segs.size(); si++) {
        const auto & s = prompt.segs[si];
        const size_t end = s.start + s.len;
        if (end <= cache_.size()) continue;
        const bool last = si + 1 == prompt.segs.size();
        if (s.media) {
            if (cache_.size() != s.start) {
                err = "Internal error: memory out of step with the conversation.";
                clear_memory();
                return false;
            }
            if (!real) {
                // count the attachments before this segment: one bitmap per media segment
                size_t idx = 0;
                for (size_t k = 0; k < si; k++) if (prompt.segs[k].media) idx++;
                if (!ensure_mtmd(err)) return false;
                real = tokenize_with_media(mtmd_, prompt.text, prompt.media, idx, err);
                if (!real) return false;
                if (mtmd_input_chunks_size(real) <= prompt.segs.back().chunk) {
                    err = "The attachments did not line up with the message (internal error).";
                    return false;
                }
            }
            if (on_media) on_media(media_done, media_total);
            const auto t0 = std::chrono::steady_clock::now();
            if (!decode_media(prompt, s, real, err)) return false;
            t_media += ms_since(t0);
            media_done++;
            n_media++;
            if (report) report((int) (cache_.size() - reused), total);
        } else {
            const size_t from = cache_.size();
            if (want_snapshot && snapshot_at > from && snapshot_at < end) {
                if (!decode_text(units, from, snapshot_at, false, err, report, total, reused)) return false;
                save_snapshot();
                if (!decode_text(units, snapshot_at, end, last, err, report, total, reused)) return false;
            } else {
                if (!decode_text(units, from, end, last, err, report, total, reused)) return false;
            }
        }
        if (want_snapshot && cache_.size() == snapshot_at && !last) save_snapshot();
    }

    if (stats) {
        stats->n_prompt = (int) units.size();
        stats->n_reused = (int) reused;
        stats->n_evaluated = total;
        stats->used_snapshot = used_snapshot;
        stats->n_media = n_media;
        stats->t_media_ms = t_media;
    }
    return true;
}

bool Engine::push_token(token t, std::string & err) {
    apply_threads();
    common_batch batch(ctx_);
    batch.add(t, (llama_pos) cache_.size(), 0, true);
    const int ret = llama_process(ctx_, LLAMA_PROCESS_TYPE_DECODE, batch.get());
    if (ret != 0) {
        if (!can_rm_part_) {
            clear_memory();
        } else {
            const llama_pos pos_max = llama_memory_seq_pos_max(llama_get_memory(ctx_), 0);
            if (pos_max >= 0 && (size_t) pos_max == cache_.size()) cache_.push_back(t);
            trim_draft(cache_.size());
        }
        if (ret == 2 || stop_.load()) err = "stopped";
        else if (ret == 1) err = "The conversation no longer fits in the context.";
        else err = "The model failed while writing (error " + std::to_string(ret) + ").";
        return false;
    }
    if (spec_) common_speculative_process(spec_, batch);
    cache_.push_back(t);
    return true;
}

token Engine::argmax() const {
    const float * logits = llama_get_logits_ith(ctx_, -1);
    const int n_vocab = llama_vocab_n_tokens(vocab_);
    int best = 0;
    for (int i = 1; i < n_vocab; i++) {
        if (logits[i] > logits[best]) best = i;
    }
    return best;
}

std::vector<float> Engine::last_logits() const {
    const float * logits = llama_get_logits_ith(ctx_, -1);
    const int n_vocab = llama_vocab_n_tokens(vocab_);
    return std::vector<float>(logits, logits + n_vocab);
}

std::vector<BenchResult> Engine::bench(const std::vector<int> & threads, int n_prompt, int n_gen, std::string & err) {
    std::vector<BenchResult> out;
    stop_.store(false);
    if (!ctx_) {
        err = "No model is loaded.";
        return out;
    }
    const int n_ctx = (int) llama_n_ctx(ctx_);
    n_prompt = std::max(8, std::min(n_prompt, std::min((int) llama_n_batch(ctx_), n_ctx / 2)));
    n_gen = std::max(4, std::min(n_gen, n_ctx / 4));
    const int n_vocab = llama_vocab_n_tokens(vocab_);
    std::vector<token> prompt(n_prompt);
    for (int i = 0; i < n_prompt; i++) prompt[i] = (token) ((1009 + i * 7919) % n_vocab);

    clear_memory();
    snapshots_.clear();
    const int restore = want_threads_.load();
    bool first = true;
    for (int t : threads) {
        if (stop_.load()) break;
        if (t < 1) continue;
        llama_set_n_threads(ctx_, t, t);
        if (ctx_dft_) llama_set_n_threads(ctx_dft_, t, t);
        cur_threads_ = t;
        want_threads_.store(t);
        // the first count also warms the caches; measure it after one unmeasured step
        if (first) {
            std::string e;
            decode_text(prompt, 0, std::min<size_t>(8, prompt.size()), true, e, nullptr, 0, 0);
            clear_memory();
            first = false;
        }
        BenchResult r;
        r.threads = t;
        std::string e;
        auto t0 = std::chrono::steady_clock::now();
        if (!decode_text(prompt, 0, prompt.size(), true, e, nullptr, 0, 0)) {
            if (e != "stopped") err = e;
            clear_memory();
            break;
        }
        r.pp_tps = n_prompt * 1000.0 / std::max(1.0, ms_since(t0));
        t0 = std::chrono::steady_clock::now();
        int done = 0;
        for (; done < n_gen && !stop_.load(); done++) {
            if (!push_token(prompt[done % n_prompt], e)) break;
        }
        r.tg_tps = done * 1000.0 / std::max(1.0, ms_since(t0));
        clear_memory();
        if (done < n_gen) break;
        out.push_back(r);
    }
    want_threads_.store(restore > 0 ? restore : params_.n_threads);
    clear_memory();
    return out;
}

// The text tokens of the memory, for the n-gram drafter (pictures are left out).
static void text_only(const std::vector<token> & units, std::vector<token> & out) {
    out.clear();
    out.reserve(units.size());
    for (token t : units) {
        if (t >= 0) out.push_back(t);
    }
}

ChatResult Engine::chat(const ChatRequest & req, const ChatCallbacks & cb) {
    ChatResult res;
    stop_.store(false);
    const auto t_start = std::chrono::steady_clock::now();
    if (!ctx_ || !tmpls_) {
        res.error = "No model is loaded.";
        res.stats.stop_reason = "error";
        return res;
    }

    const bool can_see = !params_.mmproj_path.empty() && mm_vision_;
    const bool can_hear = !params_.mmproj_path.empty() && mm_audio_;
    const std::string marker = mtmd_default_marker();

    // Messages as the template sees them, with a marker where each attachment goes, and the
    // attachments of each message in order.
    std::vector<common_chat_msg> all;
    std::vector<std::vector<Media>> all_media;
    all.reserve(req.messages.size());
    for (const auto & m : req.messages) {
        common_chat_msg cm;
        cm.role = m.role;
        cm.reasoning_content = m.reasoning;
        std::vector<Media> kept;
        std::string prefix;
        for (const auto & md : m.media) {
            const std::string lower = [&]() {
                std::string s = md.path.substr(md.path.find_last_of('.') + 1);
                for (auto & ch : s) ch = (char) std::tolower((unsigned char) ch);
                return s;
            }();
            const bool is_audio = lower == "wav" || lower == "mp3" || lower == "flac";
            if ((is_audio && can_hear) || (!is_audio && can_see)) {
                prefix += md.label;
                prefix += marker;
                if (!md.frame) prefix += "\n";
                kept.push_back(md);
            } else {
                prefix += is_audio ? "(a sound recording was attached here; this model cannot hear it)\n"
                                   : "(a picture was attached here; this model cannot see it)\n";
            }
        }
        if (!kept.empty() && kept.back().frame) prefix += "\n";
        // a marker inside the user's own words is just text
        std::string body = m.content;
        for (size_t at = body.find(marker); at != std::string::npos; at = body.find(marker, at + 1)) {
            body.replace(at, marker.size(), "<media>");
        }
        cm.content = prefix + body;
        all.push_back(std::move(cm));
        all_media.push_back(std::move(kept));
    }
    if (all.empty() || all.back().role != "user") {
        res.error = "The last message has to be yours.";
        res.stats.stop_reason = "error";
        return res;
    }

    const size_t first = all[0].role == "system" ? 1 : 0;
    const int n_ctx = (int) llama_n_ctx(ctx_);
    const int reserve = std::min(1024, n_ctx / 4);

    auto make_inputs = [&](size_t drop, bool add_gen) {
        common_chat_templates_inputs in;
        if (first) in.messages.push_back(all[0]);
        for (size_t i = first + drop; i < all.size(); i++) in.messages.push_back(all[i]);
        in.add_generation_prompt = add_gen;
        in.use_jinja = true;
        in.enable_thinking = req.enable_thinking;
        in.reasoning_format = COMMON_REASONING_FORMAT_DEEPSEEK;
        if (req.now_ms > 0) {
            in.now = std::chrono::system_clock::time_point(std::chrono::milliseconds(req.now_ms));
        }
        return in;
    };
    auto media_of = [&](size_t drop) {
        std::vector<Media> out;
        if (first) out.insert(out.end(), all_media[0].begin(), all_media[0].end());
        for (size_t i = first + drop; i < all.size(); i++) out.insert(out.end(), all_media[i].begin(), all_media[i].end());
        return out;
    };

    size_t drop = 0;
    std::unique_ptr<common_chat_session> session;
    Prompt prompt;
    std::string err;
    bool any_media = false;
    for (const auto & v : all_media) any_media = any_media || !v.empty();
    if (any_media && !mtmd_) {
        // the picture part loads on first use; say so, it takes a few seconds
        if (cb.on_media) cb.on_media(-1, 0);
        if (!ensure_mtmd(err)) {
            res.error = err;
            res.stats.stop_reason = "error";
            return res;
        }
    }
    while (true) {
        try {
            session = std::make_unique<common_chat_session>(tmpls_, vocab_, make_inputs(drop, true));
        } catch (const std::exception & e) {
            res.error = std::string("The model's chat template failed: ") + e.what();
            res.stats.stop_reason = "error";
            return res;
        }
        if (!build_prompt(session->prompt().str(), media_of(drop), prompt, err)) {
            res.error = err;
            res.stats.stop_reason = "error";
            return res;
        }
        const size_t remaining = all.size() - first - drop;
        const int cells = (int) prompt.units.size() + prompt.extra_cells;
        if (cells + reserve <= n_ctx || remaining <= 1) break;
        // Leave out the oldest exchange: everything up to the next message of yours.
        size_t next = first + drop + 1;
        while (next < all.size() && all[next].role != "user") next++;
        if (next >= all.size()) break;
        drop = next - first;
    }
    res.stats.n_dropped = (int) drop;
    const int prompt_cells = (int) prompt.units.size() + prompt.extra_cells;
    if (prompt_cells + 16 > n_ctx) {
        res.error = "This message is too long for the context size (" + std::to_string(prompt_cells) +
                    " tokens, the limit is " + std::to_string(n_ctx) + "). Raise the context size in Settings or shorten it.";
        res.stats.stop_reason = "error";
        return res;
    }

    // Where the reply starts: the conversation rendered without the generation prompt. A snapshot
    // there lets the next turn skip straight to the new part even when the template rewrites
    // this reply (most thinking models drop old thinking from the history).
    size_t snapshot_at = 0;
    if (!can_rm_part_) {
        try {
            auto plain = common_chat_templates_apply(tmpls_, make_inputs(drop, false));
            Prompt pp;
            std::string e2;
            if (build_prompt(plain.prompt.str(), media_of(drop), pp, e2)) {
                snapshot_at = common_prefix(pp.units, prompt.units);
            }
        } catch (const std::exception &) {
            snapshot_at = 0;
        }
    }

    const auto t_prompt0 = std::chrono::steady_clock::now();
    if (!sync(prompt, snapshot_at, err, cb.on_prompt_progress, cb.on_media, &res.stats)) {
        res.stats.t_prompt_ms = ms_since(t_prompt0);
        if (err == "stopped") {
            res.ok = true;
            res.stats.stop_reason = "stopped";
        } else {
            res.error = err;
            res.stats.stop_reason = "error";
        }
        return res;
    }
    res.stats.t_prompt_ms = ms_since(t_prompt0);

    common_params_sampling sp;
    sp.temp = req.sampling.temp;
    sp.top_p = req.sampling.top_p;
    sp.top_k = req.sampling.top_k;
    sp.min_p = req.sampling.min_p;
    sp.penalty_repeat = req.sampling.repeat_penalty;
    sp.penalty_present = req.sampling.presence_penalty;
    sp.seed = req.sampling.seed;
    session->apply_sampling(sp);
    common_sampler * smpl = common_sampler_init(model_, sp);
    if (!smpl) {
        res.error = "Could not set up sampling.";
        res.stats.stop_reason = "error";
        return res;
    }
    const auto & preserved = sp.preserved_tokens;
    const auto & stops = session->additional_stops();

    // drafting for this reply: as loaded, or capped for this request (the speed test)
    const bool spec_on = spec_ && req.spec_n_max != 0;
    const int spec_cap = req.spec_n_max > 0 ? std::min(req.spec_n_max, spec_n_out_ - 1)
                                            : std::max(spec_n_max_, ngram_ ? 32 : 0);
    const bool rs_limited = !can_rm_part_;
    std::vector<token> spec_prompt;
    if (spec_on) {
        text_only(cache_, spec_prompt);
        common_speculative_begin(spec_, 0, spec_prompt);
    }

    std::string raw;
    std::string reasoning, content;
    bool parser_ok = true;
    auto emit = [&](int n) {
        if (!cb.on_update) return;
        const std::string & r = parser_ok ? reasoning : std::string();
        const std::string & c = parser_ok ? content : raw;
        cb.on_update(r.substr(0, utf8_complete_prefix(r)), c.substr(0, utf8_complete_prefix(c)), n);
    };

    const auto t_gen0 = std::chrono::steady_clock::now();
    std::string reason = "length";
    int n_gen = 0;
    const int max_tokens = req.sampling.max_tokens > 0 ? req.sampling.max_tokens : n_ctx;
    const int n_vocab = llama_vocab_n_tokens(vocab_);

    // the first token, from the prompt's last logits
    std::vector<token> pending;
    {
        const token id = common_sampler_sample(smpl, ctx_, -1);
        common_sampler_accept(smpl, id, true);
        pending.push_back(id);
    }

    std::vector<token> draft;
    std::vector<std::vector<llama_token_data>> draft_q;
    std::vector<int> idxs;
    common_batch batch(ctx_);
    bool done = false;
    while (!done) {
        // write out what was sampled; everything but the last of these is already in memory
        for (token id : pending) {
            if (llama_vocab_is_eog(vocab_, id)) { reason = "eos"; done = true; break; }
            const std::string piece = common_token_to_piece(ctx_, id, preserved.count(id) > 0);
            n_gen++;
            if (n_gen == 1) res.stats.t_first_ms = ms_since(t_start);
            raw += piece;
            if (parser_ok) {
                try {
                    common_chat_input chunk;
                    chunk.append(piece, id);
                    const auto & msg = session->feed(chunk);
                    reasoning = msg.reasoning_content;
                    content = msg.content;
                } catch (const std::exception &) {
                    parser_ok = false;
                }
            }
            bool hit = false;
            for (const auto & s : stops) {
                if (s.empty()) continue;
                // Only the end of the text can hold a stop string that this token completed.
                const size_t window = s.size() + piece.size();
                const size_t from = raw.size() > window ? raw.size() - window : 0;
                if (raw.find(s, from) != std::string::npos) {
                    hit = true;
                    break;
                }
            }
            if (hit) { reason = "eos"; done = true; break; }
            if (n_gen >= max_tokens) { reason = "length"; done = true; break; }
        }
        emit(n_gen);
        if (done) break;
        if (stop_.load()) { reason = "stopped"; break; }
        if (cells_used() + 2 >= n_ctx) { reason = "context"; break; }

        const token last = pending.back();
        const llama_pos pos = (llama_pos) cache_.size();

        // propose the next few tokens
        draft.clear();
        draft_q.clear();
        if (spec_on) {
            int cap = spec_cap;
            cap = std::min(cap, n_ctx - cells_used() - 3);
            cap = std::min(cap, max_tokens - n_gen - 1);
            cap = std::min(cap, spec_n_out_ - 1);
            if (rs_limited) cap = std::min(cap, (int) llama_n_rs_seq(ctx_));
            if (cap > 0) {
                auto & dp = common_speculative_get_draft_params(spec_, 0);
                dp.drafting = true;
                dp.n_max = cap;
                dp.pos0 = pos;
                dp.id_last = last;
                dp.prompt = &spec_prompt;
                dp.result = &draft;
                dp.result_q = sp.temp > 0.0f ? &draft_q : nullptr;
                dp.temp = sp.temp;
                dp.seed = sp.seed;
                common_speculative_draft(spec_);
                // a draft never holds anything the model could not read
                size_t okn = 0;
                while (okn < draft.size() && draft[okn] >= 0 && draft[okn] < n_vocab) okn++;
                if (okn < draft.size()) draft.resize(okn);
                if ((int) draft.size() > cap) draft.resize(cap);
                if (draft_q.size() > draft.size()) draft_q.resize(draft.size());
                // the drafter wrote its guesses into its own memory; the check below starts clean
                trim_draft((size_t) pos);
            }
        }

        // the model reads the last token and the draft in one step
        apply_threads();
        batch.clear();
        batch.add(last, pos, 0, true);
        for (size_t i = 0; i < draft.size(); i++) batch.add(draft[i], pos + 1 + (llama_pos) i, 0, true);
        const int ret = llama_process(ctx_, LLAMA_PROCESS_TYPE_DECODE, batch.get());
        if (ret != 0) {
            const size_t before = cache_.size();
            if (!can_rm_part_) {
                clear_memory();
            } else {
                llama_memory_seq_rm(llama_get_memory(ctx_), 0, (llama_pos) before, -1);
                trim_draft(before);
            }
            if (ret == 2 || stop_.load()) reason = "stopped";
            else if (ret == 1) reason = "context";
            else {
                reason = "error";
                res.error = "The model failed while writing (error " + std::to_string(ret) + ").";
            }
            break;
        }
        if (spec_) common_speculative_process(spec_, batch);

        std::vector<token> ids;
        if (draft.empty()) {
            const token id = common_sampler_sample(smpl, ctx_, 0);
            common_sampler_accept(smpl, id, true);
            ids.push_back(id);
        } else {
            idxs.resize(draft.size() + 1);
            for (size_t i = 0; i < idxs.size(); i++) idxs[i] = (int) i;
            if (sp.temp > 0.0f && draft_q.size() == draft.size()) {
                ids = common_sampler_sample_and_accept_n_rejection(smpl, ctx_, idxs, draft, draft_q);
            } else {
                ids = common_sampler_sample_and_accept_n(smpl, ctx_, idxs, draft);
            }
        }
        const size_t accepted = ids.size() - 1;  // drafts the model agreed with
        if (accepted < draft.size()) {
            llama_memory_seq_rm(llama_get_memory(ctx_), 0, pos + 1 + (llama_pos) accepted, -1);
        }
        trim_draft((size_t) pos + 1 + accepted);
        cache_.push_back(last);
        cache_.insert(cache_.end(), draft.begin(), draft.begin() + accepted);
        if (spec_on) {
            spec_prompt.push_back(last);
            spec_prompt.insert(spec_prompt.end(), draft.begin(), draft.begin() + accepted);
            common_speculative_accept(spec_, 0, (uint16_t) accepted);
        }
        res.stats.n_drafted += (int) draft.size();
        res.stats.n_accepted += (int) accepted;
        res.stats.n_steps++;
        pending = std::move(ids);
    }
    res.stats.t_gen_ms = ms_since(t_gen0);
    res.stats.n_generated = n_gen;
    common_sampler_free(smpl);

    if (parser_ok) {
        try {
            const auto & msg = session->finish();
            reasoning = msg.reasoning_content;
            content = msg.content;
        } catch (const std::exception &) {
            // A reply cut short (stop, length) may not parse as complete; keep the partial reading.
        }
    } else {
        content = raw;
        reasoning.clear();
    }
    res.reasoning = reasoning.substr(0, utf8_complete_prefix(reasoning));
    res.content = content.substr(0, utf8_complete_prefix(content));
    res.stats.stop_reason = reason;
    res.ok = reason != "error";
    if (cb.on_update) cb.on_update(res.reasoning, res.content, n_gen);
    return res;
}

}  // namespace oa
