// The inference engine: one model, one conversation at a time, everything on the CPU.
//
// What makes it more than a loop around llama_decode is the prompt cache. Every turn the
// whole conversation is rendered through the model's own chat template and tokenized again,
// then compared with the tokens already held in the model's memory, and only the part that
// differs is evaluated. Plain attention models can drop any tail of that memory. Hybrid models
// (Qwen3.5 and everything built on it) carry a recurrent state that cannot be wound back, so
// for those the engine keeps snapshots of the whole state at the start of each reply and
// restores the nearest one instead of reading the conversation from the beginning.
//
// Pictures, audio and video frames go through the model's multimodal projector (mtmd). In the
// cache each one stands for as many positions as it fills, written as negative "virtual
// tokens" derived from the file's hash, so the same comparison finds what is already in memory.
//
// Replies can be written faster by drafting a few tokens ahead and checking them all in one
// step (speculative decoding): with the model's own multi-token-prediction head (Qwen3.5 "MTP"
// files), with a small drafter that shares the model's memory (Gemma 4), or by copying from
// what is already in the conversation (n-gram, attention models only). Every accepted token is
// one the model would have sampled itself, so replies read the same either way.
#pragma once

#include <atomic>
#include <cstdint>
#include <functional>
#include <map>
#include <memory>
#include <mutex>
#include <string>
#include <vector>

#include "pager.h"

struct llama_model;
struct llama_context;
struct llama_vocab;
struct common_chat_templates;
struct common_speculative;
struct mtmd_context;
struct mtmd_input_chunks;

struct ggml_threadpool;  // ggml-cpu.h
struct ggml_context;
struct ggml_backend_buffer;

namespace oa {

using token = int32_t;

struct LoadParams {
    int  n_ctx      = 4096;
    int  n_threads  = 4;
    int  n_batch    = 512;
    int  n_ubatch   = 256;    // tokens evaluated per step while reading a prompt
    bool use_mmap   = true;
    // Leave the weights in the mapped file instead of copying them into RAM in a layout that is
    // faster to compute with. Slower, but the system can page them, so bigger models fit.
    bool low_memory = false;
    // Store the conversation memory (KV cache) at 8 bits instead of 16: half the memory for long
    // contexts, very slightly less exact.
    bool kv_q8      = false;
    bool warmup     = true;   // touch every weight once after loading, so the first reply starts fast
    // Low memory only: keep as many layers in memory as fit and stream the rest from storage in
    // big reads just ahead of the model (see pager.h), instead of leaving it to the kernel.
    bool pager      = true;
    // Memory the model's pages may use, in MB; 0 works it out from what the phone has free.
    int  mem_budget_mb = 0;
    // Keep every position of sliding-window layers (Gemma), so any tail of the memory can be
    // dropped and drafting works. Off saves a lot of memory on big Gemma models; their memory is
    // then handled with snapshots like a hybrid model's, and they do not draft.
    bool swa_full   = true;

    // Speculative decoding. 0 turns it off. Otherwise the most tokens a drafter may propose per
    // step (the model's MTP head, or the drafter file below); 1 to 4 make sense on a phone.
    int  spec_n_max    = 2;
    // Also draft by copying spans that already appear in the conversation (only for models
    // whose memory can be wound back token by token).
    bool spec_ngram    = true;
    std::string drafter_path;  // Gemma 4 "mtp-*.gguf" assistant, or empty
    // An MTP head guesses among this many of the most used tokens only (the first ids of the
    // vocabulary, plus the special ones), instead of reading the output head for all of them: a
    // fraction of the work per guess (Qwen3.5's head has 248k rows). The model still checks each
    // guess against every token, so replies do not change. 0: the whole head.
    int  draft_vocab   = 32768;
    // Spec_n_max is the most per step; how many each step drafts is tuned as it goes (DraftTuner),
    // from what drafting costs and earns with this model on this phone. False: always spec_n_max.
    bool spec_auto     = true;
    // A small model of the same family with its own memory (Qwen3.5 0.8B for a Qwen3.5 9B) that
    // guesses the next few tokens while part of the model streams from storage, or empty. Used
    // only then: checking its guesses costs the model one read of what streams, like one token.
    std::string helper_path;
    int  helper_n_max  = 4;    // most tokens it guesses per step

    // The multimodal projector for pictures and audio, or empty. Loaded the first time a
    // message holds a picture or a sound, not before.
    std::string mmproj_path;
    int  image_max_tokens = 0;   // cap on tokens per picture for models that scale with size; 0 = model's own
};

struct SamplingParams {
    float    temp             = 0.7f;
    float    top_p            = 0.95f;
    int      top_k            = 40;
    float    min_p            = 0.05f;
    float    repeat_penalty   = 1.0f;
    float    presence_penalty = 0.0f;
    int      max_tokens       = 2048;
    uint32_t seed             = 0xFFFFFFFFu;  // random
};

// A picture, a sound or one frame of a video attached to a message.
struct Media {
    std::string path;       // a file the app copied into its own storage (jpg/png, wav/mp3/flac)
    std::string label;      // text placed right before it, e.g. a video frame's time "[0m4.0s]"
    bool        frame = false;  // a video frame: consecutive frames may be merged by the model
};

struct Message {
    std::string role;       // system, user or assistant
    std::string content;
    std::string reasoning;  // the assistant's thinking, kept apart from what it said
    std::vector<Media> media;  // shown to the model before the text
};

struct ChatRequest {
    std::vector<Message> messages;
    bool                 enable_thinking = true;
    int64_t              now_ms          = 0;  // fixed per conversation, so dated templates render the same every turn
    SamplingParams       sampling;
    int                  spec_n_max      = -1; // -1: as loaded; 0: no drafting this reply; n: at most n
};

struct ChatStats {
    int         n_prompt       = 0;  // positions in the rendered conversation
    int         n_reused       = 0;  // of those, already in memory
    int         n_evaluated    = 0;  // of those, evaluated this turn
    int         n_generated    = 0;
    double      t_prompt_ms    = 0;
    double      t_gen_ms       = 0;
    int         n_dropped      = 0;  // oldest messages left out to fit the context
    double      t_first_ms     = 0;  // from the request to the first word of the reply
    bool        used_snapshot  = false;
    int         n_drafted      = 0;  // tokens proposed by the drafter
    int         n_accepted     = 0;  // of those, the ones the model agreed with
    int         n_steps        = 0;  // model evaluations while writing
    int         n_media        = 0;  // pictures/sounds encoded this turn
    double      t_media_ms     = 0;
    double      t_draft_ms     = 0;  // writing time spent drafting
    double      t_verify_ms    = 0;  //   ... in the model's steps (one per draft check)
    double      t_sync_ms      = 0;  //   ... keeping the drafter's memory in step with the model
    long        n_majflt       = 0;  // pages read back from storage during the turn (the model does not fit)
    // low memory with the pager: part of the model is read from storage on every step
    bool        streaming      = false;
    double      resident_gb    = 0;  // of the model, kept in memory
    double      streamed_gb    = 0;  // read from storage on every step
    double      read_gb        = 0;  // read from storage during the turn
    double      read_mbps      = 0;  // how fast the storage reads
    double      t_pass_ms      = 0;  // one step through all layers, the last one measured
    std::string stop_reason;         // eos, length, context, stopped, error
};

struct ChatResult {
    bool        ok = false;
    std::string content;
    std::string reasoning;
    std::string error;
    ChatStats   stats;
};

struct ChatCallbacks {
    // Prompt evaluation progress, in positions.
    std::function<void(int done, int total)> on_prompt_progress;
    // The reply so far, split into thinking and answer. Always whole UTF-8.
    std::function<void(const std::string & reasoning, const std::string & content, int n_generated)> on_update;
    // Pictures/sounds: about to encode number `index` of `total` (the slow part on a phone).
    std::function<void(int index, int total)> on_media;
};

// How many tokens to draft at each step, from what drafting has cost and earned so far with this
// model on this phone: the time of a step that checks b tokens (the last one and b-1 drafted),
// the time to draft one token, and how often a drafted token is kept at each place, given the
// ones before it were. It picks the count with the most tokens written per second; now and then
// it tries another again, since speeds drift with heat, threads and what the reply is about.
// A CPU pays for most of every token it checks, and ARM's fast kernels take tokens four at a
// time (checking 2 or 3 can cost more than 4), so a fixed count is often slower than none.
class DraftTuner {
public:
    void reset(int n_max);
    int  n_max() const { return n_max_; }
    // Tokens to draft for the next step, 0 (none) to n_max.
    int  pick();
    // What the step did: `drafted` tokens came from the tuned drafter (0 when it did not draft,
    // or the draft came from elsewhere), `kept` of them were what the model wrote; the step
    // checked `batch` tokens in `t_verify_ms`.
    void record(int drafted, int kept, double t_draft_ms, int batch, double t_verify_ms);
    // Tokens per millisecond expected when drafting d per step; < 0 while not known.
    double rate(int d) const;
    int  steps() const { return steps_; }

private:
    double alpha(int i) const;
    double step_ms(int d) const;

    int n_max_ = 0;
    int steps_ = 0;
    std::vector<double> verify_ms_;  // [batch] smoothed time of a step that checks that many
    std::vector<int>    verify_n_;
    double              draft_ms_ = 0;  // per drafted token
    int                 draft_n_  = 0;
    std::vector<double> reached_;    // [place] drafts that got to be checked there (decaying)
    std::vector<double> kept_;       // [place] of those, kept
    std::vector<int>    last_;       // [d] step it was last picked
    bool                retry_ = false;  // the last pick was not the best one, to check it again
};

struct ModelInfo {
    std::string name;
    std::string arch;
    std::string desc;
    uint64_t    size_bytes        = 0;
    uint64_t    n_params          = 0;
    int         n_ctx_train       = 0;
    int         n_ctx             = 0;
    int         n_threads         = 0;
    bool        supports_thinking = false;
    bool        has_template      = false;
    std::string memory;       // "attention" (any tail can be dropped) or "snapshots"
    std::string speculative;  // "", "mtp", "drafter", "ngram", or two of them joined by "+"
    int         spec_n_max        = 0;
    bool        has_mtp           = false;  // the file carries an MTP head (loaded only when drafting with it)
    bool        vision            = false;
    bool        audio             = false;
    bool        helper            = false;  // a helper model drafts while the model streams
    bool        pager             = false;  // low memory, with the pager looking after the model's pages
    bool        streaming         = false;  // part of the model is read from storage on every step
    bool        experts_storage   = false;  // a mixture of experts bigger than memory: picked experts read ahead
    int         draft_vocab       = 0;      // tokens the MTP head guesses among (0: all)
    uint64_t    resident_bytes    = 0;
    uint64_t    streamed_bytes    = 0;
    double      read_mbps         = 0;      // storage speed measured while loading
};

struct BenchResult {
    int    threads = 0;
    double pp_tps  = 0;  // prompt reading, tokens per second
    double tg_tps  = 0;  // writing, tokens per second
};

class Engine {
public:
    // Once per process. lib_dir holds the CPU backend variants when they are built as separate
    // libraries (Android); empty when they are linked in.
    static void backend_init(const std::string & lib_dir);
    static std::string system_info();

    Engine();
    ~Engine();
    Engine(const Engine &) = delete;
    Engine & operator=(const Engine &) = delete;

    bool load(const std::string & path, const LoadParams & params, std::string & err,
              const std::function<bool(float)> & progress = nullptr,
              const std::function<void()> & on_warmup = nullptr);
    void unload();
    bool loaded() const { return ctx_ != nullptr; }
    ModelInfo info() const;

    ChatResult chat(const ChatRequest & req, const ChatCallbacks & cb);

    // Safe to call from any thread: ends prompt evaluation or generation as soon as possible.
    void request_stop() { stop_.store(true); }
    void clear_stop() { stop_.store(false); }

    // Forget everything in memory.
    void reset_cache();

    // Free the multimodal projector (it loads again when the next picture comes).
    void release_media();

    // Threads for the next evaluation step. Safe from any thread; takes effect between tokens,
    // so a reply can slow down (or speed up again) as the phone heats and cools.
    void set_threads(int n) { want_threads_.store(n); }
    // In the background (another app in front): this many threads at a low priority, idle threads
    // asleep instead of spinning, so the phone stays smooth while the reply carries on. Takes
    // effect at the next step.
    void set_background(bool on, int threads) {
        bg_threads_.store(threads);
        background_.store(on);
    }

    // Measures reading and writing speed at each thread count, with this model and context.
    // Clears the model's memory. Can be ended early with request_stop().
    std::vector<BenchResult> bench(const std::vector<int> & threads, int n_prompt, int n_gen, std::string & err);

    // ---- token-level API (used by chat(), exposed for the host tests) ----

    // Makes the model's memory hold exactly `prompt` and leaves the logits of its last token
    // ready for sampling. `snapshot_at` is a token count at which a snapshot is worth keeping
    // (the start of the reply); 0 for none. Returns false on error or when stopped.
    bool sync_prompt(const std::vector<token> & prompt, size_t snapshot_at, std::string & err,
                     const std::function<void(int, int)> & progress, ChatStats * stats);
    // Evaluates one sampled token after the current memory.
    bool push_token(token t, std::string & err);
    // Greedy pick from the current logits (tests only).
    token argmax() const;
    const std::vector<token> & cached() const { return cache_; }
    size_t n_snapshots() const { return snapshots_.size(); }
    bool rollback_supported() const { return can_rm_part_; }
    std::vector<float> last_logits() const;

    // Tokens of `text` with the model's vocabulary (tests).
    std::vector<token> tokenize(const std::string & text, bool add_special) const;

    // Bytes of compute memory the last load reserved (llama's own report; tests and the app's log).
    size_t compute_bytes() const { return compute_bytes_; }

    // The pager (low memory), or an empty report without one. Any thread.
    PagerStats pager_stats() const {
        auto p = shared_pager();
        return p ? p->stats() : PagerStats();
    }
    // Bytes of picked experts read ahead (a mixture of experts in low memory). Engine thread.
    uint64_t prefetched_bytes() const { return experts_ ? experts_->asked_bytes() : 0; }
    // Android asked the app for memory back: keep fewer layers of a paged model. Any thread.
    void trim_memory() {
        if (auto p = shared_pager()) p->trim();
    }
    // Memory there is now, after other apps were closed or opened: the pager plans again. Any thread.
    void memory_changed() {
        if (auto p = shared_pager()) p->set_budget(budget_now());
    }

private:
    // The whole state of the model's memory after `tokens`. Checked against the prompt by its
    // tokens, so it stays usable even after the memory itself was cleared.
    struct Snapshot {
        std::vector<token>   tokens;
        std::vector<uint8_t> data;
        std::vector<uint8_t> data_dft;   // the drafter's own memory, when it has one
        std::vector<uint8_t> data_spec;  // the drafter's carried-over state
        int                  extra_cells = 0;
    };

    // A rendered conversation: its units (tokens, and virtual tokens for media) and where each
    // stretch of text or media lies among them.
    struct Segment {
        bool   media    = false;
        size_t start    = 0;   // first unit
        size_t len      = 0;   // units (positions)
        int    n_tokens = 0;   // memory cells it fills (more than len for some picture models)
        size_t chunk    = 0;   // index into the mtmd chunks
    };
    struct Prompt {
        std::vector<token>   units;
        std::vector<Segment> segs;
        std::vector<Media>   media;   // in order of appearance
        std::string          text;    // with media markers
        int                  extra_cells = 0;
        bool has_media() const { return !media.empty(); }
    };

    bool build_prompt(const std::string & text, const std::vector<Media> & media, Prompt & out, std::string & err);
    bool sync(const Prompt & prompt, size_t snapshot_at, std::string & err,
              const std::function<void(int, int)> & progress, const std::function<void(int, int)> & on_media,
              ChatStats * stats);
    bool decode_text(const std::vector<token> & tokens, size_t from, size_t to, bool logits_last,
                     std::string & err, const std::function<void(int, int)> & progress, int total, size_t reused);
    bool decode_media(const Prompt & prompt, const Segment & seg, mtmd_input_chunks * chunks, std::string & err);
    bool ensure_mtmd(std::string & err);
    void save_snapshot();
    const Snapshot * best_snapshot(const std::vector<token> & prompt, size_t max_tokens) const;
    bool restore_snapshot(const Snapshot & s);
    void clear_memory();
    void trim_draft(size_t n_tokens);
    void apply_threads();
    void make_fg_pool(int n);
    void free_pools();
    void attach_pool(::ggml_threadpool * pool);
    bool memory_truncate(size_t n_tokens);
    int  cells_used() const { return (int) cache_.size() + cache_extra_cells_; }
    uint64_t budget_now() const;
    bool streaming() const { return pager_ && pager_->active(); }
    // Part of the model comes from storage on every step: streamed layers, or experts read as picked.
    bool from_storage() const { return streaming() || moe_storage_; }
    // The pager for the calls other threads make (the status line asks while a model may be
    // loading, which replaces it): a copy taken under the lock stays valid however long it is used.
    std::shared_ptr<Pager> shared_pager() const {
        std::lock_guard<std::mutex> lk(pager_mu_);
        return pager_;
    }
    void set_pager(std::shared_ptr<Pager> p);
    void free_spec();

    // the helper drafter (LoadParams::helper_path)
    bool helper_load(const LoadParams & params, uint32_t n_ctx, int n_threads);
    void helper_free();
    bool helper_feed(const token * toks, size_t n);
    bool helper_sync(const std::vector<token> & want, size_t snap_at);
    void helper_draft(token last, int n_max, std::vector<token> & out);

    llama_model *          model_ = nullptr;
    llama_context *        ctx_   = nullptr;
    const llama_vocab *    vocab_ = nullptr;
    common_chat_templates *tmpls_ = nullptr;

    // speculative decoding
    llama_model *          model_dft_ = nullptr;   // a separate drafter file (Gemma 4)
    llama_context *        ctx_dft_   = nullptr;   // the drafter's context (MTP head or drafter file)
    common_speculative *   spec_      = nullptr;
    std::string            spec_kind_;
    bool                   has_mtp_ = false;
    int                    spec_n_max_ = 0;        // drafter tokens per step
    int                    spec_n_out_ = 1;        // outputs per step the context was made for
    bool                   ngram_      = false;

    // the helper drafter: its memory holds the conversation's text (seq 0); it guesses on a
    // copy of that (seq 1), since a hybrid model's memory cannot be wound back token by token
    llama_model *          helper_model_ = nullptr;
    llama_context *        helper_ctx_   = nullptr;
    std::vector<token>     helper_cache_;          // what seq 0 holds
    bool                   helper_rm_    = false;  // its memory can drop any tail (attention only)
    int                    helper_n_max_ = 0;
    struct HelperSnap {
        std::vector<token>   tokens;
        std::vector<uint8_t> data;
    };
    std::vector<HelperSnap> helper_snaps_;

    // pictures and sound
    mtmd_context *         mtmd_ = nullptr;
    bool                   mm_vision_ = false;
    bool                   mm_audio_  = false;

    LoadParams            params_;
    std::vector<token>    cache_;
    int                   cache_extra_cells_ = 0;   // cells beyond one per position (pictures)
    std::vector<Snapshot> snapshots_;
    bool                  can_rm_part_ = true;
    bool                  is_swa_      = false;
    bool                  prefer_even_ = false;  // 1-/2-bit weights: prompt steps of a multiple of 4 tokens
    std::atomic<bool>     stop_{false};
    std::atomic<int>      want_threads_{0};
    int                   cur_threads_ = 0;
    // Threads that stay between steps (llama would start and stop them for every step), on the
    // phone's fastest cores; a second, gentler set for the background.
    std::atomic<bool>     background_{false};
    std::atomic<int>      bg_threads_{2};
    ::ggml_threadpool *   pool_fg_  = nullptr;
    ::ggml_threadpool *   pool_bg_  = nullptr;
    ::ggml_threadpool *   pool_cur_ = nullptr;
    int                   pool_fg_n_ = 0;
    int                   pool_bg_n_ = 0;
    bool                  self_bg_   = false;
    std::vector<int>      fast_cpus_;
    size_t                compute_bytes_ = 0;
    std::unique_ptr<ExpertPrefetch> experts_;  // a mixture of experts in low memory (instead of the pager)
    bool                  moe_storage_ = false;    // ... bigger than the memory there is
    DraftTuner            tuner_;
    // the MTP head's smaller output head (LoadParams::draft_vocab)
    bool make_draft_head(const std::string & path, int n_rows);
    void free_draft_head();
    ::ggml_context *             dft_head_ctx_ = nullptr;
    ::ggml_backend_buffer *      dft_head_buf_ = nullptr;
    int                          dft_head_rows_ = 0;
    std::shared_ptr<Pager> pager_;   // written on the engine thread only, under pager_mu_
    mutable std::mutex     pager_mu_;

    static constexpr size_t kMaxSnapshots = 2;
};

// Length of the longest prefix of `s` made of complete UTF-8 sequences.
size_t utf8_complete_prefix(const std::string & s);

// Units that stand for a picture or sound in the prompt cache: `n` negative values derived from
// its id, so equal media compare equal and different media differ at their first unit.
std::vector<token> virtual_tokens(const std::string & id, size_t n);

}  // namespace oa
