#include "engine.h"

#include "chat.h"
#include "common.h"
#include "sampling.h"
#include "llama.h"
#include "ggml-backend.h"

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

static size_t common_prefix(const std::vector<token> & a, const std::vector<token> & b) {
    const size_t n = std::min(a.size(), b.size());
    size_t i = 0;
    while (i < n && a[i] == b[i]) i++;
    return i;
}

static bool abort_cb(void * data) {
    return static_cast<std::atomic<bool> *>(data)->load();
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

void Engine::unload() {
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
    snapshots_.clear();
}

struct ProgressBridge {
    const std::function<bool(float)> * fn;
};

static bool load_progress(float p, void * data) {
    auto * b = static_cast<ProgressBridge *>(data);
    return (b->fn && *b->fn) ? (*b->fn)(p) : true;
}

bool Engine::load(const std::string & path, const LoadParams & params, std::string & err,
                  const std::function<bool(float)> & progress, const std::function<void()> & on_warmup) {
    unload();
    params_ = params;
    stop_.store(false);

    auto mp = llama_model_default_params();
    mp.n_gpu_layers = 0;
    mp.load_mode = params.use_mmap ? LLAMA_LOAD_MODE_MMAP : LLAMA_LOAD_MODE_NONE;
    mp.use_extra_bufts = !params.low_memory;
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

    auto cp = llama_context_default_params();
    cp.n_ctx = (uint32_t) std::max(512, params.n_ctx);
    cp.n_batch = (uint32_t) std::max(32, params.n_batch);
    cp.n_ubatch = std::min<uint32_t>(cp.n_batch, (uint32_t) std::max(16, params.n_ubatch));
    cp.n_seq_max = 1;
    cp.n_threads = std::max(1, params.n_threads);
    cp.n_threads_batch = std::max(1, params.n_threads);
    // Sliding-window models keep every position, so any tail of the memory can be dropped and the
    // conversation never has to be read again from the start. Costs memory only for those models.
    cp.swa_full = true;
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

    can_rm_part_ = common_context_can_seq_rm(ctx_) == COMMON_CONTEXT_SEQ_RM_TYPE_PART;

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
    cache_.clear();
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
    return mi;
}

void Engine::reset_cache() {
    if (!ctx_) return;
    clear_memory();
    snapshots_.clear();
}

bool Engine::memory_truncate(size_t n_tokens) {
    if (n_tokens >= cache_.size()) return true;
    if (!can_rm_part_) return false;
    if (!llama_memory_seq_rm(llama_get_memory(ctx_), 0, (llama_pos) n_tokens, -1)) return false;
    cache_.resize(n_tokens);
    return true;
}

void Engine::clear_memory() {
    llama_memory_clear(llama_get_memory(ctx_), true);
    cache_.clear();
}

void Engine::apply_threads() {
    const int want = want_threads_.load();
    if (want > 0 && want != cur_threads_) {
        llama_set_n_threads(ctx_, want, want);
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
    while (snapshots_.size() >= kMaxSnapshots) snapshots_.erase(snapshots_.begin());
    snapshots_.push_back(std::move(s));
}

const Engine::Snapshot * Engine::best_snapshot(const std::vector<token> & prompt, size_t max_tokens) const {
    const Snapshot * best = nullptr;
    for (const auto & s : snapshots_) {
        const size_t n = s.tokens.size();
        if (n == 0 || n > max_tokens || (best && n <= best->tokens.size())) continue;
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
    cache_ = s.tokens;
    return true;
}

bool Engine::decode_range(const std::vector<token> & tokens, size_t from, size_t to, bool logits_last,
                          std::string & err, const std::function<void(int, int)> & progress, int total) {
    if (from >= to) return true;
    apply_threads();
    const int n_batch = (int) llama_n_batch(ctx_);
    llama_batch batch = llama_batch_init(n_batch, 0, 1);
    bool ok = true;
    for (size_t i = from; i < to; i += n_batch) {
        const size_t n = std::min<size_t>(n_batch, to - i);
        batch.n_tokens = 0;
        for (size_t j = 0; j < n; j++) {
            const size_t k = batch.n_tokens++;
            batch.token[k] = tokens[i + j];
            batch.pos[k] = (llama_pos) (i + j);
            batch.n_seq_id[k] = 1;
            batch.seq_id[k][0] = 0;
            batch.logits[k] = (logits_last && i + j == to - 1) ? 1 : 0;
        }
        const int ret = llama_decode(ctx_, batch);
        if (ret != 0) {
            if (can_rm_part_) {
                // Whatever was evaluated before the failure stays in memory; keep the token list in step.
                const llama_pos pos_max = llama_memory_seq_pos_max(llama_get_memory(ctx_), 0);
                const size_t have = pos_max < 0 ? 0 : (size_t) pos_max + 1;
                if (have >= i && have <= i + n) {
                    cache_.assign(tokens.begin(), tokens.begin() + have);
                } else {
                    clear_memory();
                }
            } else {
                // A recurrent state interrupted part way through a batch cannot be trusted.
                clear_memory();
            }
            if (ret == 2 || stop_.load()) err = "stopped";
            else if (ret == 1) err = "The conversation no longer fits in the context. Start a new chat or raise the context size.";
            else err = "The model failed while reading the conversation (error " + std::to_string(ret) + ").";
            ok = false;
            break;
        }
        cache_.insert(cache_.end(), tokens.begin() + i, tokens.begin() + i + n);
        if (progress) progress((int) cache_.size(), total);
        if (stop_.load() && cache_.size() < to) {
            err = "stopped";
            ok = false;
            break;
        }
    }
    llama_batch_free(batch);
    return ok;
}

bool Engine::sync_prompt(const std::vector<token> & prompt, size_t snapshot_at, std::string & err,
                         const std::function<void(int, int)> & progress, ChatStats * stats) {
    if (!ctx_) {
        err = "No model is loaded.";
        return false;
    }
    if (prompt.empty()) {
        err = "Nothing to send.";
        return false;
    }
    if (prompt.size() >= llama_n_ctx(ctx_)) {
        err = "The conversation is longer than the context size.";
        return false;
    }

    size_t keep = common_prefix(cache_, prompt);
    // The last token is always evaluated again, so its logits are fresh for sampling.
    if (keep >= prompt.size()) keep = prompt.size() - 1;

    bool kept = true;
    if (keep < cache_.size()) kept = memory_truncate(keep);
    const size_t usable = kept ? keep : 0;

    bool used_snapshot = false;
    const Snapshot * snap = best_snapshot(prompt, prompt.size() - 1);
    if (snap && snap->tokens.size() > usable) {
        used_snapshot = restore_snapshot(*snap);
        if (!used_snapshot) clear_memory();
    } else if (!kept) {
        clear_memory();
    }

    const size_t reused = cache_.size();
    const int total = (int) (prompt.size() - reused);
    std::function<void(int, int)> report;
    if (progress) {
        report = [&](int, int) { progress((int) (cache_.size() - reused), total); };
        progress(0, total);
    }

    if (!can_rm_part_ && snapshot_at > cache_.size() && snapshot_at < prompt.size()) {
        if (!decode_range(prompt, cache_.size(), snapshot_at, false, err, report, total)) return false;
        save_snapshot();
    }
    if (!decode_range(prompt, cache_.size(), prompt.size(), true, err, report, total)) return false;

    if (stats) {
        stats->n_prompt = (int) prompt.size();
        stats->n_reused = (int) reused;
        stats->n_evaluated = total;
        stats->used_snapshot = used_snapshot;
    }
    return true;
}

bool Engine::push_token(token t, std::string & err) {
    apply_threads();
    llama_batch batch = llama_batch_init(1, 0, 1);
    batch.n_tokens = 1;
    batch.token[0] = t;
    batch.pos[0] = (llama_pos) cache_.size();
    batch.n_seq_id[0] = 1;
    batch.seq_id[0][0] = 0;
    batch.logits[0] = 1;
    const int ret = llama_decode(ctx_, batch);
    llama_batch_free(batch);
    if (ret != 0) {
        if (!can_rm_part_) {
            clear_memory();
        } else {
            const llama_pos pos_max = llama_memory_seq_pos_max(llama_get_memory(ctx_), 0);
            if (pos_max >= 0 && (size_t) pos_max == cache_.size()) cache_.push_back(t);
        }
        if (ret == 2 || stop_.load()) err = "stopped";
        else if (ret == 1) err = "The conversation no longer fits in the context.";
        else err = "The model failed while writing (error " + std::to_string(ret) + ").";
        return false;
    }
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

static double ms_since(std::chrono::steady_clock::time_point t0) {
    return std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - t0).count();
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
        cur_threads_ = t;
        want_threads_.store(t);
        // the first count also warms the caches; measure it after one unmeasured step
        if (first) {
            std::string e;
            decode_range(prompt, 0, std::min<size_t>(8, prompt.size()), true, e, nullptr, 0);
            clear_memory();
            first = false;
        }
        BenchResult r;
        r.threads = t;
        std::string e;
        auto t0 = std::chrono::steady_clock::now();
        if (!decode_range(prompt, 0, prompt.size(), true, e, nullptr, 0)) {
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

ChatResult Engine::chat(const ChatRequest & req, const ChatCallbacks & cb) {
    ChatResult res;
    stop_.store(false);
    const auto t_start = std::chrono::steady_clock::now();
    if (!ctx_ || !tmpls_) {
        res.error = "No model is loaded.";
        res.stats.stop_reason = "error";
        return res;
    }

    std::vector<common_chat_msg> all;
    all.reserve(req.messages.size());
    for (const auto & m : req.messages) {
        common_chat_msg cm;
        cm.role = m.role;
        cm.content = m.content;
        cm.reasoning_content = m.reasoning;
        all.push_back(std::move(cm));
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

    size_t drop = 0;
    std::unique_ptr<common_chat_session> session;
    std::vector<token> prompt;
    while (true) {
        try {
            session = std::make_unique<common_chat_session>(tmpls_, vocab_, make_inputs(drop, true));
        } catch (const std::exception & e) {
            res.error = std::string("The model's chat template failed: ") + e.what();
            res.stats.stop_reason = "error";
            return res;
        }
        prompt = common_tokenize(vocab_, session->prompt().str(), true, true);
        const size_t remaining = all.size() - first - drop;
        if ((int) prompt.size() + reserve <= n_ctx || remaining <= 1) break;
        // Leave out the oldest exchange: everything up to the next message of yours.
        size_t next = first + drop + 1;
        while (next < all.size() && all[next].role != "user") next++;
        if (next >= all.size()) break;
        drop = next - first;
    }
    res.stats.n_dropped = (int) drop;
    if ((int) prompt.size() + 16 > n_ctx) {
        res.error = "This message is too long for the context size (" + std::to_string(prompt.size()) +
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
            auto toks = common_tokenize(vocab_, plain.prompt.str(), true, true);
            snapshot_at = common_prefix(toks, prompt);
        } catch (const std::exception &) {
            snapshot_at = 0;
        }
    }

    const auto t_prompt0 = std::chrono::steady_clock::now();
    std::string err;
    if (!sync_prompt(prompt, snapshot_at, err, cb.on_prompt_progress, &res.stats)) {
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
    while (n_gen < max_tokens) {
        if (stop_.load()) { reason = "stopped"; break; }
        if ((int) cache_.size() >= n_ctx) { reason = "context"; break; }

        const token id = common_sampler_sample(smpl, ctx_, -1);
        common_sampler_accept(smpl, id, true);
        if (llama_vocab_is_eog(vocab_, id)) { reason = "eos"; break; }

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
        emit(n_gen);

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
        if (hit) { reason = "eos"; break; }

        if ((int) cache_.size() + 1 >= n_ctx) { reason = "context"; break; }
        if (!push_token(id, err)) {
            if (err == "stopped") reason = "stopped";
            else { reason = "error"; res.error = err; }
            break;
        }
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
