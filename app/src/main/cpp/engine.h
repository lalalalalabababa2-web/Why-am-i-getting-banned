// The inference engine: one model, one conversation at a time, everything on the CPU.
//
// What makes it more than a loop around llama_decode is the prompt cache. Every turn the
// whole conversation is rendered through the model's own chat template and tokenized again,
// then compared with the tokens already held in the model's memory, and only the part that
// differs is evaluated. Plain attention models can drop any tail of that memory. Hybrid models
// (Qwen3.5 and everything built on it) carry a recurrent state that cannot be wound back, so
// for those the engine keeps snapshots of the whole state at the start of each reply and
// restores the nearest one instead of reading the conversation from the beginning.
#pragma once

#include <atomic>
#include <cstdint>
#include <functional>
#include <string>
#include <vector>

struct llama_model;
struct llama_context;
struct llama_vocab;
struct common_chat_templates;

namespace oa {

using token = int32_t;

struct LoadParams {
    int  n_ctx     = 4096;
    int  n_threads = 4;
    int  n_batch   = 512;
    bool use_mmap  = true;
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

struct Message {
    std::string role;       // system, user or assistant
    std::string content;
    std::string reasoning;  // the assistant's thinking, kept apart from what it said
};

struct ChatRequest {
    std::vector<Message> messages;
    bool                 enable_thinking = true;
    int64_t              now_ms          = 0;  // fixed per conversation, so dated templates render the same every turn
    SamplingParams       sampling;
};

struct ChatStats {
    int         n_prompt       = 0;  // tokens in the rendered conversation
    int         n_reused       = 0;  // of those, already in memory
    int         n_evaluated    = 0;  // of those, evaluated this turn
    int         n_generated    = 0;
    double      t_prompt_ms    = 0;
    double      t_gen_ms       = 0;
    int         n_dropped      = 0;  // oldest messages left out to fit the context
    bool        used_snapshot  = false;
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
    // Prompt evaluation progress, in tokens.
    std::function<void(int done, int total)> on_prompt_progress;
    // The reply so far, split into thinking and answer. Always whole UTF-8.
    std::function<void(const std::string & reasoning, const std::string & content, int n_generated)> on_update;
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
    std::string memory;  // "attention" (any tail can be dropped) or "snapshots"
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
              const std::function<bool(float)> & progress = nullptr);
    void unload();
    bool loaded() const { return ctx_ != nullptr; }
    ModelInfo info() const;

    ChatResult chat(const ChatRequest & req, const ChatCallbacks & cb);

    // Safe to call from any thread: ends prompt evaluation or generation as soon as possible.
    void request_stop() { stop_.store(true); }
    void clear_stop() { stop_.store(false); }

    // Forget everything in memory.
    void reset_cache();

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

private:
    // The whole state of the model's memory after `tokens`. Checked against the prompt by its
    // tokens, so it stays usable even after the memory itself was cleared.
    struct Snapshot {
        std::vector<token>   tokens;
        std::vector<uint8_t> data;
    };

    bool decode_range(const std::vector<token> & tokens, size_t from, size_t to, bool logits_last,
                      std::string & err, const std::function<void(int, int)> & progress, int total);
    void save_snapshot();
    const Snapshot * best_snapshot(const std::vector<token> & prompt, size_t max_tokens) const;
    bool restore_snapshot(const Snapshot & s);
    void clear_memory();
    bool memory_truncate(size_t n_tokens);

    llama_model *          model_ = nullptr;
    llama_context *        ctx_   = nullptr;
    const llama_vocab *    vocab_ = nullptr;
    common_chat_templates *tmpls_ = nullptr;

    LoadParams            params_;
    std::vector<token>    cache_;
    std::vector<Snapshot> snapshots_;
    bool                  can_rm_part_ = true;
    bool                  is_swa_      = false;
    std::atomic<bool>     stop_{false};

    static constexpr size_t kMaxSnapshots = 2;
};

// Length of the longest prefix of `s` made of complete UTF-8 sequences.
size_t utf8_complete_prefix(const std::string & s);

}  // namespace oa
