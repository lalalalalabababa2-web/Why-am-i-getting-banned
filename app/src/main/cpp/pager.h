// Running a model bigger than the memory the phone can give it.
//
// In low-memory mode the weights stay in the model file, mapped into memory, and the kernel keeps
// in RAM whatever pages it has room for. A model is read front to back on every step, and when it
// does not fit, the kernel's "least recently used" rule throws out exactly the pages that are
// needed next: every step reads nearly the whole file from storage again, one page fault at a
// time (0.1 tokens/s for a 4.7 GB model on an 8 GB phone).
//
// The pager takes that decision away from the kernel. It splits the weights by layer and picks
// as many layers as fit in the memory there is to keep for good ("resident"); the rest are
// "streamed": a reader thread reads each one from storage in big sequential pieces just before
// the model gets to it (it follows the model through llama's graph callback) and hands the
// memory back as soon as the model is past it, so the streamed layers never push the resident
// ones out. A step then costs one read of only the streamed part, at the storage's full speed,
// while the CPU computes the layers already in memory.
//
// It keeps watching: when other apps take memory (the resident layers start going missing) it
// keeps fewer layers, and when memory frees up it keeps more. All of it is advice to the kernel:
// whatever it gets wrong costs speed, never a wrong answer.
#pragma once

#include <atomic>
#include <chrono>
#include <condition_variable>
#include <cstdint>
#include <deque>
#include <functional>
#include <map>
#include <mutex>
#include <string>
#include <thread>
#include <vector>

struct ggml_tensor;

namespace oa {

struct PagerStats {
    bool     planned          = false;  // the pager looks after this model
    bool     active           = false;  // part of the model is read from storage on every step
    uint64_t pass_bytes       = 0;      // weights one step through the model reads
    uint64_t resident_bytes   = 0;      // of those, kept in memory
    uint64_t streamed_bytes   = 0;      // of those, read from storage again on every step
    uint64_t window_bytes     = 0;      // room for streamed layers read ahead of the model
    uint64_t budget_bytes     = 0;      // memory the model's pages may use
    uint64_t bytes_read       = 0;      // read from storage since loading, counting the warm-up
    double   read_mbps        = 0;      // storage speed, measured while warming up
    double   resident_present = 1;      // part of the resident layers last found in memory
    double   pass_ms          = 0;      // the last step through all layers, measured
    int      n_replans        = 0;      // times the split was changed after loading
};

class Pager {
public:
    Pager() = default;
    ~Pager();
    Pager(const Pager &) = delete;
    Pager & operator=(const Pager &) = delete;

    // Reads the file's tensor layout. False when this file cannot be paged (split into parts,
    // unreadable). `mtp_used`: the model's MTP head drafts, so its layer is used on every step.
    bool open(const std::string & path, bool mtp_used);
    // Once llama has mapped the file: finds that mapping. False when it is not there.
    bool attach();
    // Decides which layers stay in memory, given `budget` bytes for the model's pages.
    void plan(uint64_t budget);
    // Reads the resident layers (several threads, big pieces). `progress` gets 0..1 and returns
    // false to cancel; then this returns false.
    bool warm(const std::function<bool(float)> & progress, int n_threads);
    // The cores the model computes on; reading happens on the others, if there are any.
    void set_io_cpus(const std::vector<int> & compute_cpus);
    // The reader thread.
    void start();
    void stop();

    // Plan again with a new budget (memory got tight or roomier). Safe from any thread.
    void set_budget(uint64_t budget);
    // Android asked the app to give back memory: keep fewer layers now. Safe from any thread.
    void trim();
    PagerStats stats() const;
    bool active() const { return track_.load(); }

    // llama's graph callback (cb_eval): follows the model from layer to layer.
    static bool eval_cb(ggml_tensor * t, bool ask, void * user_data);

    // Bytes the model's pages may use now: what the system says is available (or a memory
    // cgroup's limit, whichever is less), less some room for everything else.
    static uint64_t memory_for_model();

    // ---- for tests
    struct Range {
        uint64_t off = 0, len = 0;  // in the file
    };
    enum class Kind : uint8_t { EMBD, LAYER, OUT, MTP, OTHER };
    enum State : uint8_t { OUT_OF_MEMORY, LOADING, IN_MEMORY };
    struct Group {
        Kind               kind  = Kind::OTHER;
        int                order = -1;  // place in one step: layers 0..n-1, then the output
        std::vector<Range> ranges;
        uint64_t           bytes    = 0;
        bool               resident = false;
        State              state    = OUT_OF_MEMORY;  // as far as the pager knows
        int                pending  = 0;              // pieces still being read
        uint32_t           gen      = 0;              // bumped when handed back: late reads are ignored
    };
    const std::vector<Group> & groups() const { return groups_; }

private:
    int  group_at(uintptr_t addr) const;
    void reached(int group);
    void loop();
    void step(int pos);
    void plan_locked(uint64_t budget);
    void enqueue(int group);
    void drop(Group & g);
    void load_range(uint64_t off, uint64_t len, std::vector<uint8_t> & buf);
    void worker();
    void place_io_thread() const;
    double check_resident();
    uint64_t fixed_bytes() const;

    std::string          path_;
    int                  fd_ = -1;
    bool                 mtp_used_ = false;
    std::vector<Group>   groups_;
    std::map<std::string, uint64_t> offsets_;  // tensor name -> place in the file
    std::vector<int>     pass_;        // groups in the order one step reads them
    struct Span {
        uintptr_t lo, hi;
        int       group;
    };
    std::vector<Span>    spans_;       // mapped address ranges by group, sorted
    const uint8_t *      base_ = nullptr;
    uint64_t             file_size_ = 0;
    size_t               page_ = 4096;

    // the model's progress, from the graph callback (compute thread)
    std::atomic<bool>    track_{false};   // something is streamed: follow the model
    std::atomic<bool>    broken_{false};  // the mapping was not the model's after all: hands off
    bool                 verified_ = false;  // compute thread only
    int                  seen_ = -1;         // compute thread only
    int                  flagged_ = -1;      // compute thread only
    std::atomic<int>     pos_{-1};           // place in the step of the group being computed
    std::atomic<uint64_t> epoch_{0};
    std::atomic<int64_t> pass_us_{0};
    std::chrono::steady_clock::time_point pass_t0_{};  // compute thread only

    // waking the reader: never held for long, since the compute thread takes it at every layer
    std::mutex               wake_mu_;
    std::condition_variable  wake_;
    bool                     quit_ = false;
    uint64_t                 want_budget_ = 0;   // a new budget to plan with, 0 for none
    bool                     want_trim_ = false;

    // the reader's state (plan, what is read ahead), held while it works
    mutable std::mutex       mu_;
    std::thread              thread_;
    PagerStats               st_;
    uint64_t                 window_ = 0;
    bool                     warmed_ = false;
    int                      low_checks_ = 0;

    // reading: a few threads take 8 MB pieces of the layers wanted next, nearest first, and read
    // them for real (asking the kernel to read ahead is not enough: it reads only a little of
    // what it is asked for)
    struct Piece {
        int      group;
        uint32_t gen;
        uint64_t off, len;
    };
    std::deque<Piece>        queue_;      // under mu_
    std::condition_variable  work_;       // with mu_
    std::vector<std::thread> workers_;
    bool                     quit_workers_ = false;  // under mu_
    std::atomic<bool>        populate_ok_{true};     // MADV_POPULATE_READ works on this kernel
    std::vector<int>         io_cpus_;
};

}  // namespace oa
