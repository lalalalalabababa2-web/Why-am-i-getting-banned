// Host tests for the engine, run on a desktop against tiny random models (see run.sh).
//
// The prompt cache is checked the strict way: after every kind of turn (plain follow-up,
// a reply rewritten by the template, an early edit, a regenerate) the logits the engine
// produces from its reused memory must match those of a fresh engine that read the whole
// prompt from the beginning.
#include "engine.h"

#include "chat.h"
#include "common.h"
#include "llama.h"
#include "gguf.h"
#include "ggml-backend.h"
#include "llama-ext.h"

#include <chrono>
#include <cmath>
#include <map>
#include <thread>
#include <cstdio>
#include <cstdlib>
#include <fstream>
#include <functional>
#include <cstring>
#include <random>
#include <sstream>
#include <string>
#include <vector>

using oa::token;

static int g_failures = 0;
#define CHECK(cond, ...)                                     \
    do {                                                     \
        if (!(cond)) {                                       \
            std::fprintf(stderr, "  FAIL %s:%d: ", __FILE__, __LINE__); \
            std::fprintf(stderr, __VA_ARGS__);               \
            std::fprintf(stderr, "\n");                      \
            g_failures++;                                    \
        }                                                    \
    } while (0)

static double nmse(const std::vector<float> & a, const std::vector<float> & b) {
    double ab = 0, a0 = 0;
    for (size_t i = 0; i < a.size(); i++) {
        ab += (a[i] - b[i]) * (a[i] - b[i]);
        a0 += a[i] * a[i];
    }
    return a0 > 0 ? ab / a0 : ab;
}

static std::vector<token> random_tokens(std::mt19937 & rng, int n, int n_vocab) {
    std::uniform_int_distribution<int> d(1, n_vocab - 1);
    std::vector<token> v(n);
    for (auto & t : v) t = d(rng);
    return v;
}

struct Ref {
    oa::Engine e;
    std::vector<float> logits_for(const std::vector<token> & prompt) {
        e.reset_cache();
        std::string err;
        bool ok = e.sync_prompt(prompt, 0, err, nullptr, nullptr);
        if (!ok) {
            std::fprintf(stderr, "  ref sync failed: %s\n", err.c_str());
            return {};
        }
        return e.last_logits();
    }
};

static void compare(const char * what, oa::Engine & e, Ref & ref, const std::vector<token> & prompt) {
    auto got = e.last_logits();
    auto want = ref.logits_for(prompt);
    CHECK(got.size() == want.size() && !got.empty(), "%s: logits size", what);
    if (got.size() != want.size() || got.empty()) return;
    const double err = nmse(want, got);
    int am_got = 0, am_want = 0;
    for (size_t i = 1; i < got.size(); i++) {
        if (got[i] > got[am_got]) am_got = (int) i;
        if (want[i] > want[am_want]) am_want = (int) i;
    }
    std::printf("    %-34s nmse=%.2e argmax %d/%d cached=%zu snapshots=%zu\n", what, err, am_got, am_want,
                e.cached().size(), e.n_snapshots());
    CHECK(err < 1e-4, "%s: logits differ from a fresh evaluation (nmse %.3e)", what, err);
    CHECK(am_got == am_want, "%s: greedy pick differs", what);
}

static void generate(oa::Engine & e, int n) {
    std::string err;
    for (int i = 0; i < n; i++) {
        token t = e.argmax();
        if (!e.push_token(t, err)) {
            std::fprintf(stderr, "  push failed: %s\n", err.c_str());
            g_failures++;
            return;
        }
    }
}

// budget_mb > 0: low memory with the pager given that little memory, so every layer is streamed
// from the file and handed back again on every step; the answers must not change.
static void test_cache(const std::string & path, bool kv_q8 = false, bool low_memory = false, int budget_mb = 0) {
    std::printf("== cache: %s%s%s%s\n", path.c_str(), kv_q8 ? " (kv q8)" : "", low_memory ? " (low memory)" : "",
                budget_mb > 0 ? " (streamed by the pager)" : "");
    oa::LoadParams lp;
    lp.n_ctx = 1024;
    lp.n_threads = 2;
    lp.n_batch = 64;  // several batches per prompt, like a long prompt on the phone
    lp.n_ubatch = 32;
    lp.kv_q8 = kv_q8;
    lp.low_memory = low_memory;
    oa::LoadParams lp_ref = lp;
    lp_ref.pager = false;
    lp.mem_budget_mb = budget_mb;

    oa::Engine e;
    Ref ref;
    std::string err;
    if (!e.load(path, lp, err) || !ref.e.load(path, lp_ref, err)) {
        std::fprintf(stderr, "  load failed: %s\n", err.c_str());
        g_failures++;
        return;
    }
    auto info = e.info();
    std::printf("  arch=%s memory=%s pager=%d streaming=%d resident=%llu streamed=%llu\n", info.arch.c_str(),
                info.memory.c_str(), info.pager, info.streaming, (unsigned long long) info.resident_bytes,
                (unsigned long long) info.streamed_bytes);
    if (budget_mb > 0) {
        CHECK(info.pager && info.streaming, "the pager should stream this model with %d MB", budget_mb);
    }

    std::mt19937 rng(1234);
    const int V = 100;  // the test models have tiny vocabularies; stay inside them
    oa::ChatStats st;

    // Turn 1: a fresh prompt, a snapshot a few tokens before its end (where the reply starts).
    auto p1 = random_tokens(rng, 150, V);
    CHECK(e.sync_prompt(p1, 140, err, nullptr, &st), "turn1 sync: %s", err.c_str());
    compare("turn 1 (fresh)", e, ref, p1);
    generate(e, 12);

    // Turn 2: the conversation continues; everything in memory is reused.
    // a thread change between turns (what the heat guard does) must not change the result
    e.set_threads(1);
    auto p2 = e.cached();
    auto more = random_tokens(rng, 40, V);
    const size_t a2 = p2.size() + 30;
    p2.insert(p2.end(), more.begin(), more.end());
    CHECK(e.sync_prompt(p2, a2, err, nullptr, &st), "turn2 sync: %s", err.c_str());
    CHECK(st.n_reused == (int) p2.size() - 40, "turn2 should reuse all of memory (reused %d)", st.n_reused);
    compare("turn 2 (append)", e, ref, p2);
    generate(e, 10);
    // memory got tight in the middle of a conversation: the pager plans again, answers stay the same
    e.trim_memory();

    // Turn 3: the template rewrote the last reply (e.g. dropped its thinking), so the prompt
    // diverges a few tokens after where that reply started.
    std::vector<token> p3(p2.begin(), p2.begin() + a2 + 3);
    auto rewritten = random_tokens(rng, 25, V);
    p3.insert(p3.end(), rewritten.begin(), rewritten.end());
    const size_t a3 = p3.size() - 4;
    CHECK(e.sync_prompt(p3, a3, err, nullptr, &st), "turn3 sync: %s", err.c_str());
    std::printf("    turn 3 reused=%d evaluated=%d snapshot=%d\n", st.n_reused, st.n_evaluated, st.used_snapshot ? 1 : 0);
    if (!e.rollback_supported()) {
        CHECK(st.used_snapshot, "turn3 should have restored a snapshot");
        CHECK(st.n_reused == (int) a2, "turn3 should resume at the snapshot (%d vs %zu)", st.n_reused, a2);
    } else {
        CHECK(st.n_reused == (int) a2 + 3, "turn3 should keep the shared prefix (%d)", st.n_reused);
    }
    compare("turn 3 (rewritten reply)", e, ref, p3);
    generate(e, 8);

    // Regenerate: the same prompt again; only the last token (or back to the snapshot) is redone.
    CHECK(e.sync_prompt(p3, a3, err, nullptr, &st), "regen sync: %s", err.c_str());
    std::printf("    regenerate reused=%d evaluated=%d snapshot=%d\n", st.n_reused, st.n_evaluated, st.used_snapshot ? 1 : 0);
    CHECK(st.n_evaluated <= (int) (p3.size() - a2), "regenerate re-read too much (%d)", st.n_evaluated);
    compare("regenerate", e, ref, p3);

    // An early edit: the prompt diverges before any snapshot.
    auto p4 = p3;
    p4[20] = (p4[20] % (V - 2)) + 1;
    CHECK(e.sync_prompt(p4, p4.size() - 3, err, nullptr, &st), "edit sync: %s", err.c_str());
    std::printf("    early edit reused=%d evaluated=%d\n", st.n_reused, st.n_evaluated);
    CHECK(st.n_reused <= 20, "early edit cannot reuse past the edit");
    compare("early edit", e, ref, p4);

    // The longest case: reuse after an edit, then append again.
    generate(e, 5);
    auto p5 = e.cached();
    auto tail = random_tokens(rng, 30, V);
    p5.insert(p5.end(), tail.begin(), tail.end());
    CHECK(e.sync_prompt(p5, p5.size() - 10, err, nullptr, &st), "append2 sync: %s", err.c_str());
    compare("append after edit", e, ref, p5);

    // A stop request during prompt evaluation leaves memory consistent with the token list.
    auto p6 = random_tokens(rng, 400, V);
    std::thread stopper([&] {
        std::this_thread::sleep_for(std::chrono::milliseconds(1));
        e.request_stop();
    });
    bool ok6 = e.sync_prompt(p6, 0, err, nullptr, &st);
    stopper.join();
    std::printf("    stop during prompt: ok=%d err=%s cached=%zu\n", ok6 ? 1 : 0, err.c_str(), e.cached().size());
    // whatever happened, the next sync of the same prompt must be correct
    e.clear_stop();
    CHECK(e.sync_prompt(p6, 0, err, nullptr, &st), "after-stop sync: %s", err.c_str());
    std::printf("    after stop reused=%d evaluated=%d\n", st.n_reused, st.n_evaluated);
    compare("after a stopped prompt", e, ref, p6);
    if (budget_mb > 0) {
        const auto ps = e.pager_stats();
        std::printf("    pager: read %.1f MB, %d replans, resident present %.0f%%, a step through the model %.1f ms\n",
                    ps.bytes_read / 1e6, ps.n_replans, ps.resident_present * 100, ps.pass_ms);
        CHECK(ps.bytes_read >= info.streamed_bytes, "the pager should have read the streamed layers (%llu bytes)",
              (unsigned long long) ps.bytes_read);
        // with layers enough to hand some back, they are read again step after step
        if (path.find("deep") != std::string::npos) {
            CHECK(ps.bytes_read > 3 * info.streamed_bytes, "the pager should read streamed layers again on every step "
                  "(%llu bytes for %llu streamed)", (unsigned long long) ps.bytes_read, (unsigned long long) info.streamed_bytes);
        }
    }
}

static void test_bench(const std::string & path) {
    std::printf("== bench: %s\n", path.c_str());
    oa::LoadParams lp;
    lp.n_ctx = 1024;
    lp.n_threads = 2;
    oa::Engine e;
    std::string err;
    if (!e.load(path, lp, err)) {
        g_failures++;
        return;
    }
    auto r = e.bench({1, 2}, 64, 16, err);
    for (const auto & x : r) std::printf("    threads %d: read %.0f tok/s, write %.0f tok/s\n", x.threads, x.pp_tps, x.tg_tps);
    CHECK(r.size() == 2 && err.empty(), "bench returned %zu results (%s)", r.size(), err.c_str());
    CHECK(e.cached().empty(), "bench must leave the memory empty");
    // and the engine still works afterwards
    std::vector<token> p = {5, 6, 7, 8, 9};
    CHECK(e.sync_prompt(p, 0, err, nullptr, nullptr), "sync after bench: %s", err.c_str());
}

// Templates: render with the real Qwen3.5 and Gemma 4 templates over their real vocabularies,
// then stream a made-up reply through the parser the way the engine does.
static std::string read_file(const std::string & p) {
    std::ifstream f(p);
    std::stringstream ss;
    ss << f.rdbuf();
    return ss.str();
}

static void test_template(const std::string & vocab_path, const std::string & tmpl_path, const std::string & reply,
                          bool thinking) {
    std::printf("== template: %s (thinking %s)\n", tmpl_path.c_str(), thinking ? "on" : "off");
    auto mp = llama_model_default_params();
    mp.vocab_only = true;
    llama_model * model = llama_model_load_from_file(vocab_path.c_str(), mp);
    if (!model) {
        std::fprintf(stderr, "  vocab load failed\n");
        g_failures++;
        return;
    }
    const llama_vocab * vocab = llama_model_get_vocab(model);
    auto tmpls = common_chat_templates_init(model, read_file(tmpl_path));
    std::printf("  supports thinking: %d\n", common_chat_templates_support_enable_thinking(tmpls.get()) ? 1 : 0);

    auto msg = [](const char * role, const char * content, const char * reasoning = "") {
        common_chat_msg m;
        m.role = role;
        m.content = content;
        m.reasoning_content = reasoning;
        return m;
    };
    auto inputs_for = [&](std::vector<common_chat_msg> msgs, bool gen) {
        common_chat_templates_inputs in;
        in.messages = std::move(msgs);
        in.add_generation_prompt = gen;
        in.use_jinja = true;
        in.enable_thinking = thinking;
        in.reasoning_format = COMMON_REASONING_FORMAT_DEEPSEEK;
        in.now = std::chrono::system_clock::time_point(std::chrono::milliseconds(1760000000000LL));
        return in;
    };

    std::vector<common_chat_msg> turn1 = {msg("system", "You are helpful."), msg("user", "Hi there")};
    common_chat_session s1(tmpls.get(), vocab, inputs_for(turn1, true));
    const std::string prompt1 = s1.prompt().str();
    std::printf("  --- prompt 1 ---\n%s\n  ---\n", prompt1.c_str());

    common_params_sampling sp;
    s1.apply_sampling(sp);

    // stream the reply token by token
    auto toks = common_tokenize(vocab, reply, false, true);
    std::string shown_r, shown_c;
    for (auto t : toks) {
        std::string piece = common_token_to_piece(vocab, t, sp.preserved_tokens.count(t) > 0);
        common_chat_input c;
        c.append(piece, t);
        const auto & m = s1.feed(c);
        // streamed text only ever grows
        CHECK(m.content.compare(0, shown_c.size(), shown_c) == 0, "streamed content went backwards");
        CHECK(m.reasoning_content.compare(0, shown_r.size(), shown_r) == 0, "streamed reasoning went backwards");
        shown_r = m.reasoning_content;
        shown_c = m.content;
    }
    const auto & fin = s1.finish();
    std::printf("  reasoning: [%s]\n  content:   [%s]\n", fin.reasoning_content.c_str(), fin.content.c_str());
    CHECK(fin.content.find("Hello") != std::string::npos, "content lost");
    if (thinking) CHECK(fin.reasoning_content.find("plan") != std::string::npos, "reasoning not separated");
    CHECK(fin.content.find("plan") == std::string::npos, "reasoning leaked into content");
    CHECK(fin.reasoning_content.find("think>") == std::string::npos, "thinking tags left in the reasoning");
    CHECK(fin.content.find("<") == std::string::npos, "markup left in the content: %s", fin.content.c_str());

    // The next turn must share the first turn's prompt up to where the reply began.
    auto nogen = common_chat_templates_apply(tmpls.get(), inputs_for(turn1, false)).prompt.str();
    std::vector<common_chat_msg> turn2 = turn1;
    turn2.push_back(msg("assistant", fin.content.c_str(), fin.reasoning_content.c_str()));
    turn2.push_back(msg("user", "And again"));
    auto prompt2 = common_chat_templates_apply(tmpls.get(), inputs_for(turn2, true)).prompt.str();
    std::printf("  --- prompt 2 ---\n%s\n  ---\n", prompt2.c_str());
    auto t_nogen = common_tokenize(vocab, nogen, true, true);
    auto t_p1 = common_tokenize(vocab, prompt1, true, true);
    auto t_p2 = common_tokenize(vocab, prompt2, true, true);
    size_t shared = 0;
    while (shared < t_nogen.size() && shared < t_p2.size() && t_nogen[shared] == t_p2[shared]) shared++;
    size_t a = 0;
    while (a < t_nogen.size() && a < t_p1.size() && t_nogen[a] == t_p1[a]) a++;
    std::printf("  snapshot point %zu of prompt 1 (%zu tokens); prompt 2 shares %zu\n", a, t_p1.size(), shared);
    CHECK(shared >= a, "the next turn does not reach the snapshot point (%zu < %zu)", shared, a);
    CHECK(a < t_p1.size(), "snapshot point must come before the end of the prompt");

    // the UTF-8 guard
    std::string e = "ok \xF0\x9F\x98";  // an emoji cut short
    CHECK(oa::utf8_complete_prefix(e) == 3, "utf8 prefix for a cut emoji: %zu", oa::utf8_complete_prefix(e));
    std::string whole = "ok \xF0\x9F\x98\x80";
    CHECK(oa::utf8_complete_prefix(whole) == whole.size(), "utf8 prefix for a whole emoji");

    llama_model_free(model);
}

// chat() end to end on the random models: the text is nonsense (their tokenizer is a dummy),
// but every path runs: template, session, sampling, streaming, stop, the cache across turns.
// Background mode (fewer threads at a low priority, a pool of its own) writes the same words, and
// switching back and forth between replies leaves the engine working.
static void test_background(const std::string & path) {
    std::printf("== background: %s\n", path.c_str());
    oa::LoadParams lp;
    lp.n_ctx = 1024;
    lp.n_threads = 4;
    lp.spec_n_max = 0;
    lp.spec_ngram = false;
    oa::Engine e;
    std::string err;
    if (!e.load(path, lp, err)) {
        std::fprintf(stderr, "  load failed: %s\n", err.c_str());
        g_failures++;
        return;
    }
    oa::ChatRequest req;
    req.now_ms = 1760000000000LL;
    req.sampling.temp = 0.0f;
    req.sampling.top_k = 1;
    req.sampling.max_tokens = 48;
    req.messages.push_back({"user", "Tell me about the sea.", ""});
    oa::ChatCallbacks cb;
    std::vector<std::string> out;
    for (int round = 0; round < 4; round++) {
        e.set_background(round % 2 == 1, round == 3 ? 1 : 2);
        e.reset_cache();
        auto r = e.chat(req, cb);
        CHECK(r.ok, "background round %d failed: %s", round, r.error.c_str());
        out.push_back(r.reasoning + "|" + r.content);
    }
    for (int round = 1; round < 4; round++) {
        CHECK(out[round] == out[0], "round %d (%s) wrote something else", round, round % 2 ? "background" : "front");
    }
    e.set_background(false, 2);
}

static void test_chat_smoke(const std::string & path) {
    std::printf("== chat smoke: %s\n", path.c_str());
    oa::LoadParams lp;
    lp.n_ctx = 768;
    lp.n_threads = 2;
    lp.n_batch = 64;
    oa::Engine e;
    std::string err;
    if (!e.load(path, lp, err)) {
        std::fprintf(stderr, "  load failed: %s\n", err.c_str());
        g_failures++;
        return;
    }
    oa::ChatRequest req;
    req.now_ms = 1760000000000LL;
    req.sampling.max_tokens = 24;
    req.sampling.seed = 7;
    req.messages.push_back({"system", "Be brief.", ""});
    req.messages.push_back({"user", "Hello there, how are you today?", ""});
    int updates = 0;
    oa::ChatCallbacks cb;
    cb.on_update = [&](const std::string &, const std::string &, int) { updates++; };
    int last_done = -1, last_total = -1;
    cb.on_prompt_progress = [&](int d, int t) { last_done = d; last_total = t; };
    for (int turn = 0; turn < 4; turn++) {
        auto r = e.chat(req, cb);
        std::printf("    turn %d ok=%d reason=%s prompt=%d reused=%d eval=%d gen=%d snapshot=%d dropped=%d progress=%d/%d err=%s\n",
                    turn, r.ok, r.stats.stop_reason.c_str(), r.stats.n_prompt, r.stats.n_reused, r.stats.n_evaluated,
                    r.stats.n_generated, r.stats.used_snapshot, r.stats.n_dropped, last_done, last_total, r.error.c_str());
        CHECK(r.ok, "turn %d failed: %s", turn, r.error.c_str());
        if (turn > 0) CHECK(r.stats.n_reused > 0, "turn %d reused nothing", turn);
        req.messages.push_back({"assistant", r.content, r.reasoning});
        req.messages.push_back({"user", "Tell me more about that, in a few more words than before please.", ""});
    }
    CHECK(updates > 0, "no streaming updates");

    // stop while generating
    req.sampling.max_tokens = 400;
    std::thread stopper([&] {
        std::this_thread::sleep_for(std::chrono::milliseconds(30));
        e.request_stop();
    });
    auto r = e.chat(req, cb);
    stopper.join();
    std::printf("    stopped turn ok=%d reason=%s gen=%d\n", r.ok, r.stats.stop_reason.c_str(), r.stats.n_generated);
    CHECK(r.ok, "a stopped turn should still be ok");

    // a conversation far longer than the context: oldest messages are left out
    for (int i = 0; i < 30; i++) {
        req.messages.push_back({"assistant", std::string(120, 'x'), ""});
        req.messages.push_back({"user", std::string(120, 'y'), ""});
    }
    req.sampling.max_tokens = 8;
    r = e.chat(req, cb);
    std::printf("    long chat ok=%d prompt=%d dropped=%d err=%s\n", r.ok, r.stats.n_prompt, r.stats.n_dropped, r.error.c_str());
    CHECK(r.ok && r.stats.n_dropped > 0, "long chat should drop old messages and still answer");

    // a single message bigger than the context
    oa::ChatRequest big;
    big.messages.push_back({"user", std::string(20000, 'z'), ""});
    r = e.chat(big, cb);
    std::printf("    huge message ok=%d err=%s\n", r.ok, r.error.c_str());
    CHECK(!r.ok && !r.error.empty(), "a huge message should fail with a message");
}


// ---------------------------------------------------------------- speculative decoding

// Adds a multi-token-prediction layer to a random test model, the way the official "-MTP"
// files carry one, with random weights like the rest (so its drafts are poor, but every
// path of drafting, checking and winding back runs).
static void fill_random(struct ggml_tensor * t, void * ud) {
    std::hash<std::string> hasher;
    std::mt19937 gen((size_t) (uintptr_t) ud ^ hasher(t->name));
    std::normal_distribution<float> dis(0.0f, 0.1f);
    const bool is_ssm_a = std::strstr(t->name, "ssm_a") != nullptr;
    const int64_t ne = ggml_nelements(t);
    if (t->type == GGML_TYPE_F32) {
        std::vector<float> v(ne);
        for (auto & x : v) { float y = dis(gen); x = is_ssm_a ? -std::fabs(y) : y; }
        ggml_backend_tensor_set(t, v.data(), 0, ggml_nbytes(t));
    } else if (t->type == GGML_TYPE_F16) {
        std::vector<ggml_fp16_t> v(ne);
        for (auto & x : v) { float y = dis(gen); x = ggml_fp32_to_fp16(is_ssm_a ? -std::fabs(y) : y); }
        ggml_backend_tensor_set(t, v.data(), 0, ggml_nbytes(t));
    }
}

// per-layer arrays of length n get one more (zero) entry: the MTP layer is a plain attention layer
static void extend_layer_arrays(gguf_context * g, uint32_t n) {
    std::vector<std::string> keys;
    for (int64_t i = 0; i < gguf_get_n_kv(g); i++) {
        if (gguf_get_kv_type(g, i) == GGUF_TYPE_ARRAY && gguf_get_arr_n(g, i) == n) keys.push_back(gguf_get_key(g, i));
    }
    for (const auto & key : keys) {
        const int64_t id = gguf_find_key(g, key.c_str());
        const auto t = gguf_get_arr_type(g, id);
        size_t esz = 0;
        switch (t) {
            case GGUF_TYPE_UINT8: case GGUF_TYPE_INT8: case GGUF_TYPE_BOOL: esz = 1; break;
            case GGUF_TYPE_UINT16: case GGUF_TYPE_INT16: esz = 2; break;
            case GGUF_TYPE_UINT32: case GGUF_TYPE_INT32: case GGUF_TYPE_FLOAT32: esz = 4; break;
            case GGUF_TYPE_UINT64: case GGUF_TYPE_INT64: case GGUF_TYPE_FLOAT64: esz = 8; break;
            default: break;
        }
        if (esz == 0) continue;  // strings
        std::vector<uint8_t> v(esz * (n + 1), 0);
        std::memcpy(v.data(), gguf_get_arr_data(g, id), esz * n);
        gguf_set_arr_data(g, key.c_str(), t, v.data(), n + 1);
    }
}

// The same kind of random model with more layers, so the pager has layers to hand back and read
// again on every step (the tiny models have two, which its read-ahead covers whole).
static bool make_deep_model(const std::string & src, const std::string & dst, uint32_t layers) {
    gguf_init_params gp = {true, nullptr};
    gguf_context * g = gguf_init_from_file(src.c_str(), gp);
    if (!g) return false;
    const std::string arch = gguf_get_val_str(g, gguf_find_key(g, "general.architecture"));
    const std::string kb = arch + ".block_count";
    for (uint32_t n = gguf_get_val_u32(g, gguf_find_key(g, kb.c_str())); n < layers; n++) extend_layer_arrays(g, n);
    gguf_set_val_u32(g, kb.c_str(), layers);
    auto mp = llama_model_default_params();
    llama_model * m = llama_model_init_from_user(g, fill_random, (void *) (uintptr_t) 7, mp);
    if (m) {
        llama_model_save_to_file(m, dst.c_str());
        llama_model_free(m);
    }
    gguf_free(g);
    return m != nullptr;
}

static bool make_mtp_model(const std::string & src, const std::string & dst) {
    gguf_init_params gp = {true, nullptr};
    gguf_context * g = gguf_init_from_file(src.c_str(), gp);
    if (!g) return false;
    const std::string arch = gguf_get_val_str(g, gguf_find_key(g, "general.architecture"));
    const std::string kb = arch + ".block_count";
    const uint32_t n = gguf_get_val_u32(g, gguf_find_key(g, kb.c_str()));
    extend_layer_arrays(g, n);
    gguf_set_val_u32(g, kb.c_str(), n + 1);
    gguf_set_val_u32(g, (arch + ".nextn_predict_layers").c_str(), 1);
    auto mp = llama_model_default_params();
    mp.load_mtp = true;
    llama_model * m = llama_model_init_from_user(g, fill_random, (void *) (uintptr_t) 42, mp);
    if (!m) {
        gguf_free(g);
        return false;
    }
    llama_model_save_to_file(m, dst.c_str());
    llama_model_free(m);
    gguf_free(g);
    // The saver writes per-layer arrays for the main layers only, and quantization scales for
    // the MTP layer that the loader never asks for: write the file again without both problems.
    ggml_context * data = nullptr;
    gguf_init_params gp2 = {false, &data};
    gguf_context * saved = gguf_init_from_file(dst.c_str(), gp2);
    if (!saved) return false;
    gguf_context * out = gguf_init_empty();
    gguf_set_kv(out, saved);
    extend_layer_arrays(out, n);
    const std::string mtp_prefix = "blk." + std::to_string(n) + ".";
    for (int64_t i = 0; i < gguf_get_n_tensors(saved); i++) {
        const std::string name = gguf_get_tensor_name(saved, i);
        if (name.rfind(mtp_prefix, 0) == 0 && name.find("scale") != std::string::npos) continue;
        gguf_add_tensor(out, ggml_get_tensor(data, name.c_str()));
    }
    const std::string tmp = dst + ".tmp";
    const bool ok = gguf_write_to_file(out, tmp.c_str(), false);
    gguf_free(out);
    gguf_free(saved);
    ggml_free(data);
    return ok && std::rename(tmp.c_str(), dst.c_str()) == 0;
}

// Every token written must be the one the model itself picks (greedy) after the ones before
// it; a near tie may go either way, since a step that reads several tokens rounds differently.
// Teacher-forced: every written token must be the one the reference (no drafting, one token per
// step) picks there. A gap under the tolerance is a near tie that a step of another size can flip
// (the default is for exact float models; quantized real models get a looser one).
static int check_greedy(oa::Engine & ref, const std::vector<token> & seq, size_t from, int * ties, float tol_abs = -1.0f,
                        float * max_gap = nullptr) {
    std::string err;
    ref.reset_cache();
    std::vector<token> head(seq.begin(), seq.begin() + from);
    if (!ref.sync_prompt(head, 0, err, nullptr, nullptr)) return 1000;
    int bad = 0;
    *ties = 0;
    for (size_t i = from; i < seq.size(); i++) {
        auto l = ref.last_logits();
        int best = 0;
        for (size_t k = 1; k < l.size(); k++) if (l[k] > l[best]) best = (int) k;
        if (best != seq[i]) {
            const float gap = l[best] - l[seq[i]];
            if (max_gap) *max_gap = std::max(*max_gap, gap);
            const float tol = tol_abs >= 0 ? tol_abs : 1e-3f * std::max(1.0f, std::fabs(l[best]));
            if (gap > tol) {
                if (bad < 3) std::printf("    token %zu: wrote %d, the model picks %d (gap %.4f)\n", i, seq[i], best, gap);
                bad++;
            } else {
                (*ties)++;
            }
        }
        if (!ref.push_token(seq[i], err)) return bad + 1000;
    }
    return bad;
}

static void test_spec(const std::string & path, const char * label, int n_max, bool ngram, double temp = 0.0) {
    std::printf("== speculative: %s (%s, n_max %d, ngram %d, temp %.1f)\n", path.c_str(), label, n_max, ngram ? 1 : 0, temp);
    oa::LoadParams lp;
    lp.n_ctx = 1024;
    lp.n_threads = 2;
    lp.n_batch = 64;
    lp.n_ubatch = 32;
    lp.spec_n_max = n_max;
    lp.spec_ngram = ngram;
    oa::Engine e, ref;
    oa::LoadParams lr = lp;
    lr.spec_n_max = 0;
    lr.spec_ngram = false;
    std::string err;
    if (!e.load(path, lp, err) || !ref.load(path, lr, err)) {
        std::fprintf(stderr, "  load failed: %s\n", err.c_str());
        g_failures++;
        return;
    }
    const auto info = e.info();
    std::printf("  speculative=%s n_max=%d memory=%s compute=%.1f MB\n", info.speculative.c_str(), info.spec_n_max,
                info.memory.c_str(), e.compute_bytes() / 1e6);
    CHECK(!info.speculative.empty(), "%s: drafting was not set up", label);
    CHECK(ref.info().speculative.empty(), "%s: the reference must not draft", label);

    oa::ChatRequest req;
    req.now_ms = 1760000000000LL;
    req.sampling.temp = (float) temp;
    req.sampling.top_k = temp > 0 ? 40 : 1;
    req.sampling.min_p = 0.0f;
    req.sampling.max_tokens = 200;
    req.sampling.seed = 3;
    req.messages.push_back({"system", "Be brief.", ""});
    req.messages.push_back({"user", "Count with me: one two three four five six seven eight nine ten, and again.", ""});
    oa::ChatCallbacks cb;
    for (int turn = 0; turn < 3; turn++) {
        auto r = e.chat(req, cb);
        std::printf("    turn %d ok=%d reason=%s gen=%d steps=%d drafted=%d accepted=%d reused=%d snapshot=%d err=%s\n",
                    turn, r.ok, r.stats.stop_reason.c_str(), r.stats.n_generated, r.stats.n_steps, r.stats.n_drafted,
                    r.stats.n_accepted, r.stats.n_reused, r.stats.used_snapshot, r.error.c_str());
        CHECK(r.ok, "%s turn %d failed: %s", label, turn, r.error.c_str());
        CHECK(r.stats.n_steps + r.stats.n_accepted + 1 >= r.stats.n_generated, "%s: tokens written without a step", label);
        if (n_max > 0 && !ngram) CHECK(r.stats.n_drafted > 0, "%s turn %d: nothing was drafted", label, turn);
        if (temp == 0.0) {
            int ties = 0;
            const int bad = check_greedy(ref, e.cached(), (size_t) r.stats.n_prompt, &ties);
            std::printf("    checked %zu written tokens: %d differ, %d near ties\n", e.cached().size() - r.stats.n_prompt, bad, ties);
            CHECK(bad == 0, "%s turn %d: %d written tokens are not what the model picks", label, turn, bad);
        }
        if (turn > 0) CHECK(r.stats.n_reused > 0, "%s turn %d reused nothing", label, turn);
        req.messages.push_back({"assistant", r.content, r.reasoning});
        req.messages.push_back({"user", "And once more, the same way please.", ""});
    }
    // drafting can be capped per reply (the speed test) and turned off for one
    req.spec_n_max = 0;
    auto r0 = e.chat(req, cb);
    CHECK(r0.ok && r0.stats.n_drafted == 0, "%s: a reply with drafting off still drafted (%d)", label, r0.stats.n_drafted);
    // stopping while drafting leaves a usable engine
    req.spec_n_max = -1;
    req.sampling.max_tokens = 400;
    std::thread stopper([&] {
        std::this_thread::sleep_for(std::chrono::milliseconds(20));
        e.request_stop();
    });
    auto rs = e.chat(req, cb);
    stopper.join();
    CHECK(rs.ok, "%s: a stopped reply should be ok (%s)", label, rs.error.c_str());
    req.sampling.max_tokens = 16;
    auto ra = e.chat(req, cb);
    CHECK(ra.ok, "%s: the reply after a stop failed: %s", label, ra.error.c_str());
}

// ---------------------------------------------------------------- real models (CI downloads them)

static bool exists(const std::string & p) {
    std::ifstream f(p);
    return f.good();
}

static std::string write_ppm(const std::string & path, int w, int h, unsigned char r, unsigned char g, unsigned char b) {
    std::ofstream f(path, std::ios::binary);
    f << "P6\n" << w << " " << h << "\n255\n";
    for (int i = 0; i < w * h; i++) {
        f.put((char) r);
        f.put((char) g);
        f.put((char) b);
    }
    return path;
}

static std::string lower(std::string s) {
    for (auto & c : s) c = (char) std::tolower((unsigned char) c);
    return s;
}

static const char * kStoryPrompt = "Write a short story about a lighthouse keeper who finds a message in a bottle.";
static const char * kCopyPrompt =
    "Here is a note:\n\n"
    "Dear Sam, the boat leaves the north harbour at seven on Saturday morning. Bring your warm coat, the blue "
    "rope from the shed, two bottles of water and the map with the red marks on it. We will sail past the old "
    "lighthouse, stop for lunch on the small island with the white rocks, and come back before the tide turns "
    "at four. If the wind is too strong we will stay in the harbour and fix the engine instead. Call me on "
    "Friday night if you cannot come. See you soon, Alex.\n\n"
    "Write the note out again exactly as it is, but with the name Sam changed to Robin.";

// Writing speed with each drafting setting, against a baseline loaded with drafting off (no drafter
// memory at all). Greedy, so every setting must write the same words as the baseline.
static void test_speed(const std::string & model, const char * label, const std::string & drafter,
                       std::vector<int> drafts, bool ngram, const char * prompt) {
    if (!exists(model)) {
        std::printf("== speed %s: %s not there, skipped\n", label, model.c_str());
        return;
    }
    std::printf("== speed %s\n", label);
    oa::ChatRequest req;
    req.now_ms = 1760000000000LL;
    req.enable_thinking = false;
    req.sampling.temp = 0.0f;
    req.sampling.top_k = 1;
    req.sampling.max_tokens = 160;
    req.messages.push_back({"user", prompt, ""});
    oa::ChatCallbacks cb;
    const int threads = std::max(1, (int) std::thread::hardware_concurrency());
    auto run = [&](oa::Engine & e, int n, const char * what) {
        req.spec_n_max = n;
        oa::ChatRequest warm = req;
        warm.sampling.max_tokens = 4;
        e.chat(warm, cb);  // the file's pages read in, threads up
        auto r = e.chat(req, cb);
        const double tps = r.stats.n_generated * 1000.0 / std::max(1.0, r.stats.t_gen_ms);
        const double steps = std::max(1, r.stats.n_steps);
        std::printf("SPEED: %s, %s: %.1f tokens/s (%d tokens in %d steps; %d of %d drafts kept; per step: model %.1f ms, "
                    "drafting %.1f ms, drafter memory %.1f ms)\n",
                    label, what, tps, r.stats.n_generated, r.stats.n_steps, r.stats.n_accepted, r.stats.n_drafted,
                    r.stats.t_verify_ms / steps, r.stats.t_draft_ms / steps, r.stats.t_sync_ms / steps);
        CHECK(r.ok, "%s, %s: reply failed: %s", label, what, r.error.c_str());
        return r;
    };
    oa::Engine ref;
    {
        oa::LoadParams lp;
        lp.n_ctx = 4096;
        lp.n_threads = threads;
        lp.spec_n_max = 0;
        lp.spec_ngram = false;
        std::string err;
        if (!ref.load(model, lp, err)) {
            std::fprintf(stderr, "  FAIL %s: load: %s\n", label, err.c_str());
            g_failures++;
            return;
        }
        CHECK(ref.info().speculative.empty(), "%s: drafting should be off (%s)", label, ref.info().speculative.c_str());
        run(ref, 0, "drafting off");
    }
    oa::LoadParams lp;
    lp.n_ctx = 4096;
    lp.n_threads = threads;
    lp.spec_n_max = 0;
    for (int n : drafts) lp.spec_n_max = std::max(lp.spec_n_max, n);
    lp.spec_ngram = ngram;
    lp.drafter_path = drafter;
    oa::Engine e;
    std::string err;
    if (!e.load(model, lp, err)) {
        std::fprintf(stderr, "  FAIL %s: load with drafting: %s\n", label, err.c_str());
        g_failures++;
        return;
    }
    std::printf("  drafting with: %s\n", e.info().speculative.c_str());
    CHECK(!e.info().speculative.empty(), "%s: no drafting", label);
    for (int n : drafts) {
        char what[64];
        if (n < 0) std::snprintf(what, sizeof what, "%s", "copying on");
        else std::snprintf(what, sizeof what, "%d drafted", n);
        auto r = run(e, n, what);
        if (n == 0) continue;
        // Every word written while drafting must be the reference's pick at that point. Steps of
        // different sizes take different kernels, so near ties can flip and the reply then goes
        // its own way (seen up to about 1.1 logits with Gemma 4 between ARM's 4-token and 1-token
        // kernels); a mistake in the drafting itself would be wrong by far more, and often.
        int ties = 0;
        float max_gap = 0.0f;
        const int bad = check_greedy(ref, e.cached(), (size_t) r.stats.n_prompt, &ties, 1.5f, &max_gap);
        std::printf("    %s: %zu written tokens checked, %d wrong, %d near ties (largest gap %.3f)\n", what,
                    e.cached().size() - (size_t) r.stats.n_prompt, bad, ties, max_gap);
        CHECK(bad == 0, "%s, %s: %d written tokens are not what the model picks", label, what, bad);
    }
}

static void test_real(const std::string & dir, const std::string & tmp) {
    const std::string model = dir + "/Qwen3.5-0.8B-Q4_K_M.gguf";
    const std::string mmproj = dir + "/mmproj-F16.gguf";
    if (!exists(model)) {
        std::printf("== real model: %s not there, skipped\n", model.c_str());
        return;
    }
    std::printf("== real model: %s\n", model.c_str());

    // 1. memory: llama's default reserves logits for every token of a prompt step
    {
        auto mp = llama_model_default_params();
        mp.n_gpu_layers = 0;
        llama_model * m = llama_model_load_from_file(model.c_str(), mp);
        auto cp = llama_context_default_params();
        cp.n_ctx = 4096;
        cp.n_batch = 512;
        cp.n_ubatch = 256;
        llama_context * c = llama_init_from_model(m, cp);
        size_t def = 0;
        for (const auto & [b, d] : llama_get_memory_breakdown(c)) def += d.compute;
        llama_free(c);
        llama_model_free(m);
        oa::LoadParams lp;
        lp.n_ctx = 4096;
        lp.n_batch = 512;
        lp.n_ubatch = 256;
        lp.spec_n_max = 0;
        oa::Engine e;
        std::string err;
        CHECK(e.load(model, lp, err), "load: %s", err.c_str());
        std::printf("SPEED: compute memory, llama default %.0f MB, this engine %.0f MB (context 4096, prompt step 256)\n",
                    def / 1e6, e.compute_bytes() / 1e6);
        CHECK(e.compute_bytes() < def, "the engine should reserve less compute memory than llama's default");
    }

    // 2. drafting with the model's MTP head, and copying from the conversation: same words, how fast
    test_speed(model, "Qwen3.5 0.8B Q4_K_M", "", {0, 1, 2, 3}, false, kStoryPrompt);
    test_speed(model, "Qwen3.5 0.8B Q4_K_M, copying", "", {0, -1}, true, kCopyPrompt);

    // pictures: drafting off, as the app has it until the drafting test says otherwise
    oa::LoadParams lp;
    lp.n_ctx = 4096;
    lp.n_threads = std::max(1, (int) std::thread::hardware_concurrency());
    lp.spec_n_max = 0;
    lp.mmproj_path = mmproj;
    oa::Engine e;
    std::string err;
    if (!e.load(model, lp, err)) {
        std::fprintf(stderr, "  FAIL load with the projector: %s\n", err.c_str());
        g_failures++;
        return;
    }
    CHECK(e.info().vision, "the projector should read pictures");

    // writing with the app in front, then in the background (gentle: 2 threads, low priority)
    {
        oa::ChatRequest sr;
        sr.now_ms = 1760000000000LL;
        sr.enable_thinking = false;
        sr.sampling.temp = 0.0f;
        sr.sampling.top_k = 1;
        sr.sampling.max_tokens = 96;
        sr.messages.push_back({"user", kStoryPrompt, ""});
        oa::ChatCallbacks scb;
        std::string front_text;
        for (int bg = 0; bg < 2; bg++) {
            e.set_background(bg == 1, 2);
            e.reset_cache();
            auto r = e.chat(sr, scb);
            const double tps = r.stats.n_generated * 1000.0 / std::max(1.0, r.stats.t_gen_ms);
            std::printf("SPEED: Qwen3.5 0.8B Q4_K_M, %s: %.1f tokens/s writing, %.1f tokens/s reading\n",
                        bg ? "in the background (2 threads, low priority)" : "in front", tps,
                        r.stats.n_evaluated * 1000.0 / std::max(1.0, r.stats.t_prompt_ms));
            CHECK(r.ok, "background %d: %s", bg, r.error.c_str());
            // With fewer threads some operations add up in another order (attention split across
            // threads), so a near tie can go the other way and the reply wander off: not compared
            // here (the tiny models' test_background checks the switching itself).
            if (bg == 0) front_text = r.content;
            else std::printf("    same reply as in front: %s\n", r.content == front_text ? "yes" : "no (a near tie went the other way)");
        }
        e.set_background(false, 2);
    }

    // 3. a picture: the colour must be seen, and the next turn must not read it again
    const std::string red = write_ppm(tmp + "/red.ppm", 128, 96, 220, 20, 20);
    oa::ChatRequest pic;
    pic.now_ms = 1760000000000LL;
    pic.enable_thinking = false;
    pic.sampling.temp = 0.0f;
    pic.sampling.top_k = 1;
    pic.sampling.max_tokens = 24;
    oa::Message m{"user", "What colour fills this picture? Answer with one word.", ""};
    m.media.push_back({red, "", false});
    pic.messages.push_back(m);
    int media_calls = 0;
    oa::ChatCallbacks pcb;
    pcb.on_media = [&](int, int) { media_calls++; };
    auto r1 = e.chat(pic, pcb);
    std::printf("  picture: ok=%d media=%d media_ms=%.0f prompt=%d reply=[%s] err=%s\n", r1.ok, r1.stats.n_media,
                r1.stats.t_media_ms, r1.stats.n_prompt, r1.content.c_str(), r1.error.c_str());
    std::printf("SPEED: one 128x96 picture read in %.0f ms on %d threads\n", r1.stats.t_media_ms, lp.n_threads);
    CHECK(r1.ok && r1.stats.n_media == 1, "the picture was not read");
    CHECK(lower(r1.content).find("red") != std::string::npos, "the model did not see red: %s", r1.content.c_str());
    pic.messages.push_back({"assistant", r1.content, r1.reasoning});
    pic.messages.push_back({"user", "Is it a photo of a person? Answer yes or no.", ""});
    auto r2 = e.chat(pic, pcb);
    std::printf("  follow-up: ok=%d media=%d reused=%d of %d reply=[%s]\n", r2.ok, r2.stats.n_media, r2.stats.n_reused,
                r2.stats.n_prompt, r2.content.c_str());
    CHECK(r2.ok && r2.stats.n_media == 0, "the follow-up read the picture again");
    CHECK(r2.stats.n_reused > r1.stats.n_prompt / 2, "the follow-up did not reuse the picture in memory");

    // 4. video: frames with their times
    const std::string f1 = write_ppm(tmp + "/f1.ppm", 96, 96, 20, 20, 220);
    const std::string f2 = write_ppm(tmp + "/f2.ppm", 96, 96, 20, 200, 20);
    oa::ChatRequest vid = pic;
    vid.messages.clear();
    oa::Message vm{"user", "These are two frames of a video. What colour is the first frame, and the second?", ""};
    vm.media.push_back({f1, "[0m0.0s]", true});
    vm.media.push_back({f2, "[0m2.0s]", true});
    vid.messages.push_back(vm);
    vid.sampling.max_tokens = 40;
    auto r3 = e.chat(vid, pcb);
    std::printf("  video frames: ok=%d media=%d reply=[%s] err=%s\n", r3.ok, r3.stats.n_media, r3.content.c_str(), r3.error.c_str());
    CHECK(r3.ok && r3.stats.n_media == 2, "the frames were not read");
    const std::string lr3 = lower(r3.content);
    CHECK(lr3.find("blue") != std::string::npos || lr3.find("green") != std::string::npos,
          "the model saw neither frame's colour: %s", r3.content.c_str());

    // a damaged attachment fails with a message instead of crashing
    {
        std::ofstream bad(tmp + "/bad.jpg");
        bad << "not a picture";
    }
    oa::ChatRequest broken = pic;
    broken.messages.clear();
    oa::Message bm{"user", "What is this?", ""};
    bm.media.push_back({tmp + "/bad.jpg", "", false});
    broken.messages.push_back(bm);
    auto r4 = e.chat(broken, pcb);
    std::printf("  damaged picture: ok=%d err=%s\n", r4.ok, r4.error.c_str());
    CHECK(!r4.ok && !r4.error.empty(), "a damaged picture should fail with a message");
    auto r5 = e.chat(pic, pcb);
    CHECK(r5.ok, "the engine should work again after a damaged picture: %s", r5.error.c_str());
}

// Bonsai: Qwen models with weights of -1/0/+1 (Q2_0, with PrismML's Hadamard rotation) or 1 bit
// (Q1_0). They must load and answer sensibly, not just run.
static void test_bonsai(const std::string & path, const char * label, int ctx, bool low_memory = false) {
    if (!exists(path)) {
        std::printf("== %s: %s not there, skipped\n", label, path.c_str());
        return;
    }
    std::printf("== %s: %s\n", label, path.c_str());
    oa::LoadParams lp;
    lp.n_ctx = ctx;
    lp.n_threads = std::max(1, (int) std::thread::hardware_concurrency());
    lp.spec_n_max = 0;
    // low memory: weights stay in the file's pages (the plain dot products, this repository's
    // ARM kernels for Bonsai) instead of being copied into ggml's repacked layout
    lp.low_memory = low_memory;
    lp.kv_q8 = low_memory;
    lp.swa_full = !low_memory;
    oa::Engine e;
    std::string err;
    const auto t0 = std::chrono::steady_clock::now();
    if (!e.load(path, lp, err)) {
        std::fprintf(stderr, "  load failed: %s\n", err.c_str());
        g_failures++;
        return;
    }
    const double load_s = std::chrono::duration<double>(std::chrono::steady_clock::now() - t0).count();
    const auto info = e.info();
    std::printf("  %s, %.2f GB, loaded in %.1fs, memory=%s\n", info.desc.c_str(), info.size_bytes / 1e9, load_s, info.memory.c_str());
    oa::ChatRequest req;
    req.now_ms = 1760000000000LL;
    req.enable_thinking = false;
    req.sampling.temp = 0.0f;
    req.sampling.top_k = 1;
    req.sampling.max_tokens = 48;
    req.messages.push_back({"user", "What is the capital of France? Answer with one word.", ""});
    oa::ChatCallbacks cb;
    auto r = e.chat(req, cb);
    const double tps = r.stats.n_generated * 1000.0 / std::max(1.0, r.stats.t_gen_ms);
    std::printf("  reply ok=%d [%s] err=%s\n", r.ok, r.content.c_str(), r.error.c_str());
    std::printf("SPEED: %s on %d threads: %.1f tokens/s writing, prompt %d tokens in %.1fs\n", label, lp.n_threads, tps,
                r.stats.n_prompt, r.stats.t_prompt_ms / 1000.0);
    CHECK(r.ok, "%s: reply failed: %s", label, r.error.c_str());
    CHECK(lower(r.content).find("paris") != std::string::npos, "%s: not a sensible answer: %s", label, r.content.c_str());

    // reading a longer message (a new chat, so nothing is in memory yet)
    oa::ChatRequest longer = req;
    longer.messages.clear();
    std::string text;
    for (int k = 0; k < 3; k++) text += std::string(kCopyPrompt) + "\n\n";
    text += "Which harbour does the boat leave from? Answer in a few words.";
    longer.messages.push_back({"user", text, ""});
    longer.sampling.max_tokens = 16;
    int reports = 0;
    oa::ChatCallbacks lcb;
    lcb.on_prompt_progress = [&](int, int) { reports++; };
    e.reset_cache();
    auto rl = e.chat(longer, lcb);
    std::printf("  long message: ok=%d reply=[%s] progress reports=%d storage page reads=%ld\n", rl.ok, rl.content.c_str(),
                reports, rl.stats.n_majflt);
    std::printf("SPEED: %s on %d threads: reads %d tokens in %.1fs (%.1f tokens/s), then writes %.1f tokens/s\n", label,
                lp.n_threads, rl.stats.n_evaluated, rl.stats.t_prompt_ms / 1000.0,
                rl.stats.n_evaluated * 1000.0 / std::max(1.0, rl.stats.t_prompt_ms),
                rl.stats.n_generated * 1000.0 / std::max(1.0, rl.stats.t_gen_ms));
    CHECK(rl.ok, "%s: the long message failed: %s", label, rl.error.c_str());
    CHECK(lower(rl.content).find("north") != std::string::npos, "%s: did not read the message: %s", label, rl.content.c_str());
    // steps of about a second: a slow read reports progress about once a second
    if (rl.stats.t_prompt_ms > 6000)
        CHECK(reports >= (int) (rl.stats.t_prompt_ms / 5000), "%s: progress should move while a long message is read "
              "(%d reports in %.1fs)", label, reports, rl.stats.t_prompt_ms / 1000.0);
}

// Where the time goes while writing: each graph node is computed on its own (slower overall, but
// the shares are what matter) and its time is added up by operation and weight type.
struct OpProfile {
    std::map<std::string, double> ms;
    std::chrono::steady_clock::time_point last;
    bool on = false;
};
static bool profile_cb(struct ggml_tensor * t, bool ask, void * ud) {
    auto * p = (OpProfile *) ud;
    if (ask) return true;
    const auto now = std::chrono::steady_clock::now();
    if (p->on) {
        std::string key = ggml_op_desc(t);
        if (t->op == GGML_OP_MUL_MAT && t->src[0]) key += std::string(" ") + ggml_type_name(t->src[0]->type);
        p->ms[key] += std::chrono::duration<double, std::milli>(now - p->last).count();
    }
    p->last = now;
    return true;
}
static void profile_writing(const std::string & path, const char * label, bool low_memory) {
    if (!exists(path)) return;
    auto mp = llama_model_default_params();
    mp.n_gpu_layers = 0;
    mp.use_extra_bufts = !low_memory;
    llama_model * m = llama_model_load_from_file(path.c_str(), mp);
    if (!m) return;
    OpProfile prof;
    auto cp = llama_context_default_params();
    cp.n_ctx = 1024;
    cp.n_batch = 64;
    cp.n_ubatch = 64;
    cp.n_threads = cp.n_threads_batch = std::max(1, (int) std::thread::hardware_concurrency());
    cp.cb_eval = profile_cb;
    cp.cb_eval_user_data = &prof;
    llama_context * c = llama_init_from_model(m, cp);
    std::vector<llama_token> toks(32);
    for (size_t i = 0; i < toks.size(); i++) toks[i] = (llama_token) (100 + 7 * i);
    llama_decode(c, llama_batch_get_one(toks.data(), (int32_t) toks.size()));
    const int n = 16;
    prof.on = true;
    prof.last = std::chrono::steady_clock::now();
    const auto t0 = prof.last;
    for (int i = 0; i < n; i++) {
        llama_token tk = (llama_token) (200 + i);
        llama_decode(c, llama_batch_get_one(&tk, 1));
    }
    const double total = std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - t0).count() / n;
    std::vector<std::pair<double, std::string>> v;
    double sum = 0;
    for (auto & [k, ms] : prof.ms) { v.push_back({ms / n, k}); sum += ms / n; }
    std::sort(v.rbegin(), v.rend());
    std::string line;
    for (size_t i = 0; i < v.size() && i < 8; i++) {
        char b[96];
        std::snprintf(b, sizeof b, "%s%s %.0f ms (%.0f%%)", i ? ", " : "", v[i].second.c_str(), v[i].first, 100.0 * v[i].first / sum);
        line += b;
    }
    std::printf("SPEED: %s%s, per written token, node by node (%.0f ms in all): %s\n", label,
                low_memory ? " (low memory)" : "", total, line.c_str());
    llama_free(c);
    llama_model_free(m);
}

// A model bigger than the memory it is given (CI runs this in a 3 GB memory cgroup with Qwen3.5
// 9B, the way an 8 GB phone with other apps open has it): with the pager or without, with or
// without drafting. It must answer right either way; the speeds say what the pager is worth.
static void test_streaming(const std::string & path, const char * label, bool pager, int drafts) {
    if (!exists(path)) {
        std::printf("== %s: %s not there, skipped\n", label, path.c_str());
        return;
    }
    std::printf("== %s: %s\n", label, path.c_str());
    oa::LoadParams lp;
    lp.n_ctx = 2048;
    lp.n_threads = std::max(1, (int) std::thread::hardware_concurrency());
    lp.low_memory = true;
    lp.kv_q8 = true;
    lp.swa_full = false;
    lp.pager = pager;
    lp.spec_n_max = drafts;
    lp.spec_ngram = true;
    oa::Engine e;
    std::string err;
    const auto t0 = std::chrono::steady_clock::now();
    float last_progress = 0;
    if (!e.load(path, lp, err, [&](float p) { last_progress = p; return true; })) {
        std::fprintf(stderr, "  load failed: %s\n", err.c_str());
        g_failures++;
        return;
    }
    const double load_s = std::chrono::duration<double>(std::chrono::steady_clock::now() - t0).count();
    const auto info = e.info();
    std::printf("  %s, %.2f GB, loaded in %.1fs, pager=%d streaming=%d: %.2f GB kept, %.2f GB streamed per step, "
                "storage %.0f MB/s, drafting=%s\n", info.desc.c_str(), info.size_bytes / 1e9, load_s, info.pager,
                info.streaming, info.resident_bytes / 1e9, info.streamed_bytes / 1e9, info.read_mbps,
                info.speculative.c_str());
    oa::ChatRequest req;
    req.now_ms = 1760000000000LL;
    req.enable_thinking = false;
    req.sampling.temp = 0.0f;
    req.sampling.top_k = 1;
    req.sampling.max_tokens = 24;
    req.messages.push_back({"user", "What is the capital of France? Answer with one word.", ""});
    oa::ChatCallbacks cb;
    auto r = e.chat(req, cb);
    std::printf("  reply ok=%d [%s] err=%s first word %.1fs\n", r.ok, r.content.c_str(), r.error.c_str(), r.stats.t_first_ms / 1000.0);
    CHECK(r.ok, "%s: reply failed: %s", label, r.error.c_str());
    CHECK(lower(r.content).find("paris") != std::string::npos, "%s: not a sensible answer: %s", label, r.content.c_str());

    oa::ChatRequest story = req;
    story.messages.clear();
    story.messages.push_back({"user", kStoryPrompt, ""});
    story.sampling.max_tokens = 64;
    e.reset_cache();
    auto rs = e.chat(story, cb);
    const double tps = rs.stats.n_generated > 1 ? (rs.stats.n_generated - 1) * 1000.0 / std::max(1.0, rs.stats.t_gen_ms) : 0.0;
    std::printf("  story ok=%d: %d tokens in %d steps (%d of %d drafts kept), first word %.1fs, %.2f GB read from storage, "
                "a step through the model %.0f ms, storage page reads %ld\n", rs.ok, rs.stats.n_generated, rs.stats.n_steps,
                rs.stats.n_accepted, rs.stats.n_drafted, rs.stats.t_first_ms / 1000.0, rs.stats.read_gb, rs.stats.t_pass_ms,
                rs.stats.n_majflt);
    std::printf("SPEED: %s on %d threads: %.2f tokens/s writing, first word after %.1fs, loaded in %.1fs\n", label,
                lp.n_threads, tps, rs.stats.t_first_ms / 1000.0, load_s);
    CHECK(rs.ok && rs.stats.n_generated > 8, "%s: the story failed: %s", label, rs.error.c_str());
}

int main(int argc, char ** argv) {
    if (argc < 3) {
        std::fprintf(stderr, "usage: %s <models dir> <llama.cpp dir>\n", argv[0]);
        return 2;
    }
    const std::string dir = argv[1];
    const std::string src = argv[2];
    llama_log_set([](ggml_log_level level, const char * text, void *) {
        if (level >= GGML_LOG_LEVEL_ERROR) std::fputs(text, stderr);
    }, nullptr);
    oa::Engine::backend_init("");

    // test_engine <tiny models dir> <llama.cpp dir> [real models dir] [--real-only]
    // one model on its own (CI runs Bonsai 27B again under a memory limit, the way a phone has it)
    if (argc >= 6 && std::string(argv[4]) == "--one") {
        test_bonsai(argv[5], "Bonsai 27B Q1_0, low memory", 2048, true);
        std::printf("\n%s (%d failures)\n", g_failures ? "FAILED" : "ALL PASSED", g_failures);
        return g_failures ? 1 : 0;
    }
    // test_engine <tiny dir> <llama.cpp dir> <real dir> --stream <model> <label> <pager 0/1> <drafts>
    if (argc >= 9 && std::string(argv[4]) == "--stream") {
        test_streaming(argv[5], argv[6], std::atoi(argv[7]) != 0, std::atoi(argv[8]));
        std::printf("\n%s (%d failures)\n", g_failures ? "FAILED" : "ALL PASSED", g_failures);
        return g_failures ? 1 : 0;
    }
    const bool real_only = argc >= 5 && std::string(argv[4]) == "--real-only";
    if (real_only) {
        const std::string rd = argv[3];
        test_real(rd, rd);
        test_speed(rd + "/Qwen3.5-4B-Q4_K_M.gguf", "Qwen3.5 4B Q4_K_M", "", {0, 1, 2, 3}, false, kStoryPrompt);
        test_speed(rd + "/Qwen3.5-4B-Q4_K_M.gguf", "Qwen3.5 4B Q4_K_M, copying", "", {0, -1}, true, kCopyPrompt);
        test_speed(rd + "/gemma-4-E2B-it-Q4_K_M.gguf", "Gemma 4 E2B Q4_K_M", rd + "/mtp-gemma-4-E2B-it.gguf", {0, 1, 2, 3},
                   false, kStoryPrompt);
        // copying from the conversation (attention-only models; hybrids cannot wind back that far)
        test_speed(rd + "/gemma-4-E2B-it-Q4_K_M.gguf", "Gemma 4 E2B Q4_K_M, copying", "", {0, -1}, true, kCopyPrompt);
        test_speed(rd + "/Llama-3.2-1B-Instruct-Q4_K_M.gguf", "Llama 3.2 1B Q4_K_M, copying", "", {0, -1}, true, kCopyPrompt);
        test_bonsai(std::string(argv[3]) + "/Ternary-Bonsai-2-9B-Q2_0.gguf", "Ternary Bonsai 2 9B Q2_0", 2048);
        test_bonsai(std::string(argv[3]) + "/Bonsai-27B-Q1_0.gguf", "Bonsai 27B Q1_0", 2048);
        test_bonsai(std::string(argv[3]) + "/Bonsai-27B-Q1_0.gguf", "Bonsai 27B Q1_0, low memory", 2048, true);
        profile_writing(std::string(argv[3]) + "/Bonsai-27B-Q1_0.gguf", "Bonsai 27B Q1_0", false);
        profile_writing(std::string(argv[3]) + "/Bonsai-27B-Q1_0.gguf", "Bonsai 27B Q1_0", true);
        profile_writing(std::string(argv[3]) + "/Ternary-Bonsai-2-9B-Q2_0.gguf", "Ternary Bonsai 2 9B Q2_0", true);
        test_bonsai(std::string(argv[3]) + "/Ternary-Bonsai-2-9B-Q2_0.gguf", "Ternary Bonsai 2 9B Q2_0, low memory", 2048, true);
        // abliterated copies load and answer like their originals
        test_bonsai(std::string(argv[3]) + "/Huihui-Qwen3.5-2B-abliterated.Q4_K_M.gguf", "Qwen3.5 2B abliterated", 2048);
        test_bonsai(std::string(argv[3]) + "/Huihui-LFM2.5-1.2B-Instruct-abliterated.Q4_K_M.gguf", "LFM2.5 1.2B abliterated", 2048);
        std::printf("\n%s (%d failures)\n", g_failures ? "FAILED" : "ALL PASSED", g_failures);
        return g_failures ? 1 : 0;
    }

    for (const char * m : {"llama-dense.gguf", "qwen35-dense.gguf", "gemma3-dense.gguf", "mistral3-moe.gguf"}) {
        test_cache(dir + "/" + m);
    }

    test_cache(dir + "/qwen35-dense.gguf", true, false);
    test_cache(dir + "/llama-dense.gguf", true, true);
    // the pager streaming every layer: plain attention (with enough layers that some are handed
    // back and read again on every step), a hybrid, sliding window, experts
    const std::string deep = dir + "/llama-deep.gguf";
    if (!exists(deep)) CHECK(make_deep_model(dir + "/llama-dense.gguf", deep, 10), "could not make the deep test model");
    if (exists(deep)) {
        test_cache(deep, false, true, 1);
        // the same with the mapping not found by name: the pager learns it from the first step
        oa::Pager::skip_maps_for_tests(true);
        test_cache(deep, false, true, 1);
        oa::Pager::skip_maps_for_tests(false);
    }
    test_cache(dir + "/qwen35-dense.gguf", false, true, 1);
    test_cache(dir + "/gemma3-dense.gguf", false, true, 1);
    test_cache(dir + "/mistral3-moe.gguf", false, true, 1);
    test_bench(dir + "/qwen35-dense.gguf");
    test_chat_smoke(dir + "/qwen35-dense.gguf");
    test_chat_smoke(dir + "/llama-dense.gguf");
    test_background(dir + "/llama-dense.gguf");
    test_background(dir + "/qwen35-dense.gguf");
    test_chat_smoke(dir + "/gemma3-dense.gguf");

    const std::string qwen_reply = "I should plan a short greeting.\n</think>\n\nHello! \xF0\x9F\x98\x80 How can I help?";
    test_template(src + "/models/ggml-vocab-qwen35.gguf", src + "/models/templates/Qwen3.5-4B.jinja", qwen_reply, true);
    test_template(src + "/models/ggml-vocab-qwen35.gguf", src + "/models/templates/Qwen3.5-4B.jinja",
                  "Hello! How can I help?", false);

    const std::string gemma_reply = "<|channel>thought\nI should plan a short greeting.\n<channel|>Hello! \xF0\x9F\x98\x80 How can I help?<turn|>";
    test_template(src + "/models/ggml-vocab-gemma-4.gguf", src + "/models/templates/google-gemma-4-31B-it.jinja", gemma_reply, true);
    test_template(src + "/models/ggml-vocab-gemma-4.gguf", src + "/models/templates/google-gemma-4-31B-it.jinja",
                  "Hello! How can I help?<turn|>", false);

    // drafting: copying from the conversation (attention models), the model's own MTP head
    // (a Qwen3.5-style hybrid with an MTP layer added), greedy and sampled
    test_spec(dir + "/llama-dense.gguf", "ngram", 2, true);
    test_spec(dir + "/gemma3-dense.gguf", "ngram", 2, true);
    test_spec(dir + "/qwen35-dense.gguf", "ngram on a hybrid, 3 at a time", 0, true);
    test_spec(dir + "/llama-dense.gguf", "ngram only", 0, true);
    const std::string mtp = dir + "/qwen35-mtp.gguf";
    if (!exists(mtp)) CHECK(make_mtp_model(dir + "/qwen35-dense.gguf", mtp), "could not make the MTP test model");
    if (exists(mtp)) {
        test_spec(mtp, "mtp", 2, false);
        test_spec(mtp, "mtp", 3, false, 0.8);
        test_cache(mtp);
        test_chat_smoke(mtp);
    }

    if (argc >= 4) test_real(argv[3], dir);

    std::printf("\n%s (%d failures)\n", g_failures ? "FAILED" : "ALL PASSED", g_failures);
    return g_failures ? 1 : 0;
}
