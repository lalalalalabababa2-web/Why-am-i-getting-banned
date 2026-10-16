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

#include <chrono>
#include <cmath>
#include <thread>
#include <cstdio>
#include <cstdlib>
#include <fstream>
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

static void test_cache(const std::string & path) {
    std::printf("== cache: %s\n", path.c_str());
    oa::LoadParams lp;
    lp.n_ctx = 1024;
    lp.n_threads = 2;
    lp.n_batch = 64;  // several batches per prompt, like a long prompt on the phone

    oa::Engine e;
    Ref ref;
    std::string err;
    if (!e.load(path, lp, err) || !ref.e.load(path, lp, err)) {
        std::fprintf(stderr, "  load failed: %s\n", err.c_str());
        g_failures++;
        return;
    }
    auto info = e.info();
    std::printf("  arch=%s memory=%s\n", info.arch.c_str(), info.memory.c_str());

    std::mt19937 rng(1234);
    const int V = 100;  // the test models have tiny vocabularies; stay inside them
    oa::ChatStats st;

    // Turn 1: a fresh prompt, a snapshot a few tokens before its end (where the reply starts).
    auto p1 = random_tokens(rng, 150, V);
    CHECK(e.sync_prompt(p1, 140, err, nullptr, &st), "turn1 sync: %s", err.c_str());
    compare("turn 1 (fresh)", e, ref, p1);
    generate(e, 12);

    // Turn 2: the conversation continues; everything in memory is reused.
    auto p2 = e.cached();
    auto more = random_tokens(rng, 40, V);
    const size_t a2 = p2.size() + 30;
    p2.insert(p2.end(), more.begin(), more.end());
    CHECK(e.sync_prompt(p2, a2, err, nullptr, &st), "turn2 sync: %s", err.c_str());
    CHECK(st.n_reused == (int) p2.size() - 40, "turn2 should reuse all of memory (reused %d)", st.n_reused);
    compare("turn 2 (append)", e, ref, p2);
    generate(e, 10);

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

    for (const char * m : {"llama-dense.gguf", "qwen35-dense.gguf", "gemma3-dense.gguf", "mistral3-moe.gguf"}) {
        test_cache(dir + "/" + m);
    }

    test_chat_smoke(dir + "/qwen35-dense.gguf");
    test_chat_smoke(dir + "/llama-dense.gguf");
    test_chat_smoke(dir + "/gemma3-dense.gguf");

    const std::string qwen_reply = "I should plan a short greeting.\n</think>\n\nHello! \xF0\x9F\x98\x80 How can I help?";
    test_template(src + "/models/ggml-vocab-qwen35.gguf", src + "/models/templates/Qwen3.5-4B.jinja", qwen_reply, true);
    test_template(src + "/models/ggml-vocab-qwen35.gguf", src + "/models/templates/Qwen3.5-4B.jinja",
                  "Hello! How can I help?", false);

    const std::string gemma_reply = "<|channel>thought\nI should plan a short greeting.\n<channel|>Hello! \xF0\x9F\x98\x80 How can I help?<turn|>";
    test_template(src + "/models/ggml-vocab-gemma-4.gguf", src + "/models/templates/google-gemma-4-31B-it.jinja", gemma_reply, true);
    test_template(src + "/models/ggml-vocab-gemma-4.gguf", src + "/models/templates/google-gemma-4-31B-it.jinja",
                  "Hello! How can I help?<turn|>", false);

    std::printf("\n%s (%d failures)\n", g_failures ? "FAILED" : "ALL PASSED", g_failures);
    return g_failures ? 1 : 0;
}
