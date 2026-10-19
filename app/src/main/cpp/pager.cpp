#include "pager.h"

#include "ggml.h"
#include "gguf.h"

#include <algorithm>
#include <cerrno>
#include <climits>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <fcntl.h>
#include <map>
#include <sched.h>
#include <sys/mman.h>
#include <sys/stat.h>
#include <sys/sysmacros.h>
#include <unistd.h>

#ifndef MADV_POPULATE_READ
#define MADV_POPULATE_READ 22  // Linux 5.14
#endif

namespace oa {

namespace {

constexpr uint64_t kMB = 1024ull * 1024;

double ms_between(std::chrono::steady_clock::time_point a, std::chrono::steady_clock::time_point b) {
    return std::chrono::duration<double, std::milli>(b - a).count();
}

// A value from /proc/meminfo, in bytes; 0 when it is not there.
uint64_t meminfo(const char * key) {
    FILE * f = std::fopen("/proc/meminfo", "r");
    if (!f) return 0;
    char line[256];
    const size_t n = std::strlen(key);
    uint64_t v = 0;
    while (std::fgets(line, sizeof line, f)) {
        if (std::strncmp(line, key, n) == 0 && line[n] == ':') {
            v = std::strtoull(line + n + 1, nullptr, 10) * 1024;
            break;
        }
    }
    std::fclose(f);
    return v;
}

std::string read_line(const std::string & path) {
    FILE * f = std::fopen(path.c_str(), "r");
    if (!f) return {};
    char buf[256] = {0};
    if (!std::fgets(buf, sizeof buf, f)) buf[0] = 0;
    std::fclose(f);
    std::string s = buf;
    while (!s.empty() && (s.back() == '\n' || s.back() == ' ')) s.pop_back();
    return s;
}

uint64_t stat_value(const std::string & path, const char * key) {
    FILE * f = std::fopen(path.c_str(), "r");
    if (!f) return 0;
    char line[256];
    const size_t n = std::strlen(key);
    uint64_t v = 0;
    while (std::fgets(line, sizeof line, f)) {
        if (std::strncmp(line, key, n) == 0 && line[n] == ' ') {
            v = std::strtoull(line + n + 1, nullptr, 10);
            break;
        }
    }
    std::fclose(f);
    return v;
}

// A memory cgroup's limit and what its processes hold apart from file pages, when this process
// is in one with a limit (the CI's memory-limited runs; Android sets none for apps).
bool cgroup_memory(uint64_t & limit, uint64_t & anon) {
    FILE * f = std::fopen("/proc/self/cgroup", "r");
    if (!f) return false;
    char line[512];
    bool found = false;
    while (!found && std::fgets(line, sizeof line, f)) {
        std::string s = line;
        while (!s.empty() && s.back() == '\n') s.pop_back();
        const size_t a = s.find(':'), b = s.find(':', a + 1);
        if (a == std::string::npos || b == std::string::npos) continue;
        const std::string ctrl = s.substr(a + 1, b - a - 1), path = s.substr(b + 1);
        if (ctrl.empty() && s.compare(0, a, "0") == 0) {  // cgroup v2
            const std::string dir = "/sys/fs/cgroup" + path;
            const std::string m = read_line(dir + "/memory.max");
            if (!m.empty() && m != "max") {
                limit = std::strtoull(m.c_str(), nullptr, 10);
                anon = stat_value(dir + "/memory.stat", "anon");
                found = limit > 0;
            }
        } else if (("," + ctrl + ",").find(",memory,") != std::string::npos) {  // cgroup v1
            const std::string dir = "/sys/fs/cgroup/memory" + path;
            const std::string m = read_line(dir + "/memory.limit_in_bytes");
            const uint64_t l = m.empty() ? 0 : std::strtoull(m.c_str(), nullptr, 10);
            if (l > 0 && l < (1ull << 60)) {
                limit = l;
                anon = stat_value(dir + "/memory.stat", "rss");
                found = true;
            }
        }
    }
    std::fclose(f);
    return found;
}

}  // namespace

uint64_t Pager::memory_for_model() {
    uint64_t total = meminfo("MemTotal");
    uint64_t avail = meminfo("MemAvailable");
    if (avail == 0) avail = meminfo("MemFree") + meminfo("Cached");
    uint64_t limit = 0, anon = 0;
    if (cgroup_memory(limit, anon)) {
        avail = std::min(avail ? avail : limit, limit > anon ? limit - anon : 0);
        total = std::min(total ? total : limit, limit);
    }
    // the rest of the phone keeps some room: everything else's working memory, and the pages of
    // the apps and services in use (Android's own code lives in file pages just like the model)
    const uint64_t room = std::clamp<uint64_t>(total / 16, 64 * kMB, 512 * kMB);
    return avail > room ? avail - room : 0;
}

bool Pager::preread(const std::string & path, const std::function<bool(float)> & progress, int n_threads) {
    const int fd = ::open(path.c_str(), O_RDONLY | O_CLOEXEC);
    if (fd < 0) return true;
    struct stat sb;
    if (fstat(fd, &sb) != 0 || sb.st_size <= 0) {
        ::close(fd);
        return true;
    }
    const uint64_t size = (uint64_t) sb.st_size;
    // already cached (loaded a moment ago, or reloaded with other settings): nothing to gain
    {
        void * m = mmap(nullptr, size, PROT_READ, MAP_SHARED, fd, 0);
        if (m != MAP_FAILED) {
            const size_t page = (size_t) std::max(4096L, sysconf(_SC_PAGESIZE));
            std::vector<unsigned char> vec((size + page - 1) / page);
            uint64_t in = 0;
            if (mincore(m, size, vec.data()) == 0) {
                for (unsigned char c : vec) in += c & 1;
            }
            munmap(m, size);
            if (in * 10 >= vec.size() * 9) {
                ::close(fd);
                return true;
            }
        }
    }
    constexpr uint64_t kChunk = 8 * kMB;
    const size_t n_pieces = (size_t) ((size + kChunk - 1) / kChunk);
    std::atomic<size_t> next{0};
    std::atomic<uint64_t> done{0};
    std::atomic<bool> cancel{false};
    std::vector<std::thread> threads;
    for (int t = 0; t < std::clamp(n_threads, 1, 4); t++) {
        threads.emplace_back([&]() {
            std::vector<uint8_t> buf(kChunk);
            while (!cancel.load()) {
                const size_t i = next.fetch_add(1);
                if (i >= n_pieces) break;
                const uint64_t off = i * kChunk, len = std::min(kChunk, size - off);
                for (uint64_t got = 0; got < len;) {
                    const ssize_t r = pread(fd, buf.data(), (size_t) (len - got), (off_t) (off + got));
                    if (r <= 0) {
                        if (r < 0 && errno == EINTR) continue;
                        break;
                    }
                    got += (uint64_t) r;
                }
                done.fetch_add(len);
            }
        });
    }
    bool ok = true;
    while (done.load() < size) {
        if (progress && !progress((float) ((double) done.load() / (double) size))) {
            cancel.store(true);
            ok = false;
            break;
        }
        std::this_thread::sleep_for(std::chrono::milliseconds(50));
    }
    for (auto & th : threads) th.join();
    ::close(fd);
    return ok;
}

void Pager::release_unmapped(const std::string & path) {
    const int fd = ::open(path.c_str(), O_RDONLY | O_CLOEXEC);
    if (fd < 0) return;
    // pages still mapped (weights used straight from the file) are left alone by the kernel
    posix_fadvise(fd, 0, 0, POSIX_FADV_DONTNEED);
    ::close(fd);
}

Pager::~Pager() {
    stop();
    if (fd_ >= 0) ::close(fd_);
}

bool Pager::open(const std::string & path, bool mtp_used) {
    path_ = path;
    mtp_used_ = mtp_used;
    page_ = (size_t) std::max(4096L, sysconf(_SC_PAGESIZE));
    gguf_init_params gp;
    gp.no_alloc = true;
    gp.ctx = nullptr;
    gguf_context * g = gguf_init_from_file(path.c_str(), gp);
    if (!g) return false;
    struct Free {
        gguf_context * g;
        ~Free() { gguf_free(g); }
    } free_g{g};

    auto u32 = [&](const std::string & key, uint32_t def) -> uint32_t {
        const int64_t k = gguf_find_key(g, key.c_str());
        if (k < 0) return def;
        switch (gguf_get_kv_type(g, k)) {
            case GGUF_TYPE_UINT32: return gguf_get_val_u32(g, k);
            case GGUF_TYPE_INT32:  return (uint32_t) std::max(0, gguf_get_val_i32(g, k));
            case GGUF_TYPE_UINT16: return gguf_get_val_u16(g, k);
            default:               return def;
        }
    };
    if (u32("split.count", 1) > 1) return false;  // a model in several files
    std::string arch;
    {
        const int64_t k = gguf_find_key(g, "general.architecture");
        if (k >= 0 && gguf_get_kv_type(g, k) == GGUF_TYPE_STRING) arch = gguf_get_val_str(g, k);
    }
    const uint32_t n_block = u32(arch + ".block_count", 0);
    const uint32_t n_nextn = u32(arch + ".nextn_predict_layers", 0);
    const uint32_t n_main = n_block > n_nextn ? n_block - n_nextn : n_block;

    const uint64_t data = gguf_get_data_offset(g);
    std::map<int, int> layer_group;
    int embd = -1, out = -1, other = -1, mtp = -1;
    bool has_output = false;
    auto group_of = [&](int & idx, Kind kind, int order) {
        if (idx < 0) {
            idx = (int) groups_.size();
            groups_.emplace_back();
            groups_.back().kind = kind;
            groups_.back().order = order;
        }
        return idx;
    };
    const int64_t n = gguf_get_n_tensors(g);
    for (int64_t i = 0; i < n; i++) {
        const std::string name = gguf_get_tensor_name(g, i);
        const uint64_t off = data + gguf_get_tensor_offset(g, i);
        const uint64_t len = gguf_get_tensor_size(g, i);
        int gi;
        if (name.compare(0, 4, "blk.") == 0) {
            const int il = std::atoi(name.c_str() + 4);
            if (n_nextn > 0 && (uint32_t) il >= n_main) {
                gi = group_of(mtp, Kind::MTP, -1);
            } else {
                auto it = layer_group.find(il);
                if (it == layer_group.end()) {
                    int idx = -1;
                    gi = group_of(idx, Kind::LAYER, il);
                    layer_group[il] = gi;
                } else {
                    gi = it->second;
                }
            }
        } else if (name.find("token_embd") != std::string::npos) {
            // only the rows of the tokens read are touched, so it is never streamed
            gi = group_of(embd, Kind::EMBD, -1);
        } else if (name.compare(0, 6, "output") == 0) {
            has_output = has_output || name == "output.weight";
            gi = group_of(out, Kind::OUT, (int) n_main);
        } else {
            gi = group_of(other, Kind::OTHER, -1);
        }
        groups_[gi].ranges.push_back({off, len});
        offsets_[name] = off;
    }
    // a model that writes with its input embeddings reads all of them at the end of every step
    if (!has_output && embd >= 0) {
        const int o = group_of(out, Kind::OUT, (int) n_main);
        auto & e = groups_[embd];
        groups_[o].ranges.insert(groups_[o].ranges.end(), e.ranges.begin(), e.ranges.end());
        e.ranges.clear();
    }
    for (auto & gr : groups_) {
        std::sort(gr.ranges.begin(), gr.ranges.end(), [](const Range & a, const Range & b) { return a.off < b.off; });
        std::vector<Range> merged;
        for (const auto & r : gr.ranges) {
            // tensors of one layer sit next to each other in the file, with a little padding between
            if (!merged.empty() && r.off <= merged.back().off + merged.back().len + 256) {
                merged.back().len = std::max(merged.back().len, r.off + r.len - merged.back().off);
            } else {
                merged.push_back(r);
            }
        }
        gr.ranges = std::move(merged);
        gr.bytes = 0;
        for (const auto & r : gr.ranges) gr.bytes += r.len;
    }
    for (size_t i = 0; i < groups_.size(); i++) {
        if (groups_[i].kind == Kind::LAYER || groups_[i].kind == Kind::OUT) pass_.push_back((int) i);
    }
    std::sort(pass_.begin(), pass_.end(), [&](int a, int b) { return groups_[a].order < groups_[b].order; });
    if (pass_.size() < 2) return false;

    fd_ = ::open(path.c_str(), O_RDONLY | O_CLOEXEC);
    if (fd_ < 0) return false;
    struct stat sb;
    if (fstat(fd_, &sb) != 0) return false;
    file_size_ = (uint64_t) sb.st_size;
    return true;
}

bool Pager::attach() {
    // llama maps the file once (read-only, shared), from the page where the tensor data starts:
    // find that mapping, by its path or by the file's identity (storage can show up under
    // another path than the one the app opened)
    uint64_t need_lo = UINT64_MAX, need_hi = 0;
    for (const auto & g : groups_) {
        for (const auto & r : g.ranges) {
            need_lo = std::min(need_lo, r.off);
            need_hi = std::max(need_hi, r.off + r.len);
        }
    }
    if (skip_maps_) return false;
    struct stat sb;
    const bool have_stat = fstat(fd_, &sb) == 0;
    char real[PATH_MAX];
    const std::string want = realpath(path_.c_str(), real) ? std::string(real) : path_;
    FILE * f = std::fopen("/proc/self/maps", "r");
    if (!f) return false;
    char line[PATH_MAX + 256];
    uintptr_t found = 0;
    while (std::fgets(line, sizeof line, f)) {
        unsigned long lo = 0, hi = 0, off = 0, ino = 0;
        unsigned int dmaj = 0, dmin = 0;
        char perms[8] = {0};
        int path_at = 0;
        if (std::sscanf(line, "%lx-%lx %7s %lx %x:%x %lu %n", &lo, &hi, perms, &off, &dmaj, &dmin, &ino, &path_at) < 7 ||
            path_at <= 0) {
            continue;
        }
        std::string p = line + path_at;
        while (!p.empty() && (p.back() == '\n' || p.back() == ' ')) p.pop_back();
        const bool same_file = p == want || p == path_ ||
                               (have_stat && ino == (unsigned long) sb.st_ino && dmaj == major(sb.st_dev) && dmin == minor(sb.st_dev));
        if (!same_file) continue;
        if (off > need_lo || off + (uint64_t) (hi - lo) < need_hi) continue;
        found = (uintptr_t) lo - (uintptr_t) off;  // where offset 0 of the file would be; the newest wins
    }
    std::fclose(f);
    if (!found) return false;
    set_base(found);
    return true;
}

void Pager::set_base(uintptr_t base) {
    spans_.clear();
    for (size_t gi = 0; gi < groups_.size(); gi++) {
        for (const auto & r : groups_[gi].ranges) spans_.push_back({base + r.off, base + r.off + r.len, (int) gi});
    }
    std::sort(spans_.begin(), spans_.end(), [](const Span & a, const Span & b) { return a.lo < b.lo; });
    base_ready_ = true;
    base_.store(base, std::memory_order_release);
}

int Pager::group_at(uintptr_t addr) const {
    auto it = std::upper_bound(spans_.begin(), spans_.end(), addr, [](uintptr_t a, const Span & s) { return a < s.lo; });
    if (it == spans_.begin()) return -1;
    --it;
    return addr < it->hi ? it->group : -1;
}

uint64_t Pager::fixed_bytes() const {
    uint64_t b = 0;
    for (const auto & g : groups_) {
        if (g.kind == Kind::OTHER || (g.kind == Kind::MTP && mtp_used_)) b += g.bytes;
    }
    return b;
}

void Pager::plan_locked(uint64_t budget) {
    const uint64_t fixed = fixed_bytes();
    uint64_t pass = 0, biggest = 0;
    for (int gi : pass_) {
        pass += groups_[gi].bytes;
        biggest = std::max(biggest, groups_[gi].bytes);
    }
    std::vector<bool> was(groups_.size());
    for (size_t i = 0; i < groups_.size(); i++) was[i] = groups_[i].resident;
    for (int gi : pass_) groups_[gi].resident = false;

    uint64_t window = 0;
    if (budget >= pass + fixed) {
        for (int gi : pass_) groups_[gi].resident = true;
    } else {
        // room to read ahead: two of the biggest layers, so the next one is already coming in
        // while the model computes this one
        window = std::min<uint64_t>(2 * biggest, std::max<uint64_t>(512 * kMB, biggest));
        uint64_t room = budget > fixed + window ? budget - fixed - window : 0;
        // the MTP head writes its guesses with the output layer, several times a step
        const int out = pass_.back();
        if (mtp_used_ && groups_[out].bytes <= room) {
            groups_[out].resident = true;
            room -= groups_[out].bytes;
        }
        // the rest spread evenly, so reading never stops for long: while the CPU computes a few
        // layers already in memory, the next streamed one comes in
        uint64_t rest = 0;
        for (int gi : pass_) if (!groups_[gi].resident) rest += groups_[gi].bytes;
        const double share = rest > 0 ? std::min(1.0, (double) room / (double) rest) : 0.0;
        double owed = 0;
        for (int gi : pass_) {
            auto & g = groups_[gi];
            if (g.resident) continue;
            owed += share * (double) g.bytes;
            if (owed >= (double) g.bytes && room >= g.bytes) {
                g.resident = true;
                owed -= (double) g.bytes;
                room -= g.bytes;
            }
        }
    }
    window_ = window;
    for (auto & g : groups_) {
        if (g.kind == Kind::OTHER || (g.kind == Kind::MTP && mtp_used_)) g.resident = true;
    }
    uint64_t res = 0, str = 0;
    for (int gi : pass_) (groups_[gi].resident ? res : str) += groups_[gi].bytes;
    for (size_t i = 0; i < groups_.size(); i++) {
        auto & g = groups_[i];
        // layers that now stay are read in (layers that now stream are handed back when passed)
        if (g.resident && !was[i] && warmed_ && g.state == OUT_OF_MEMORY) enqueue((int) i);
    }
    st_.planned = true;
    st_.active = str > 0;
    st_.pass_bytes = pass;
    st_.resident_bytes = res;
    st_.streamed_bytes = str;
    st_.window_bytes = window;
    st_.budget_bytes = budget;
    track_.store(str > 0);
}

void Pager::plan(uint64_t budget) {
    std::lock_guard<std::mutex> lk(mu_);
    plan_locked(budget);
}

bool Pager::warm(const std::function<bool(float)> & progress, int n_threads) {
    std::vector<Range> runs;
    uint64_t total = 0;
    {
        std::lock_guard<std::mutex> lk(mu_);
        for (const auto & g : groups_) {
            if (!g.resident || g.kind == Kind::EMBD) continue;
            for (const auto & r : g.ranges) {
                runs.push_back(r);
                total += r.len;
            }
        }
    }
    // pieces of 8 MB, read by a few threads at once: storage is fastest with several reads queued
    constexpr uint64_t kChunk = 8 * kMB;
    std::vector<Range> pieces;
    for (const auto & r : runs) {
        for (uint64_t o = 0; o < r.len; o += kChunk) pieces.push_back({r.off + o, std::min(kChunk, r.len - o)});
    }
    std::atomic<size_t> next{0};
    std::atomic<uint64_t> done{0};
    std::atomic<bool> cancel{false};
    const int nt = std::clamp(n_threads, 1, 4);
    const auto t0 = std::chrono::steady_clock::now();
    std::vector<std::thread> threads;
    for (int t = 0; t < nt; t++) {
        threads.emplace_back([&]() {
            place_io_thread();
            std::vector<uint8_t> buf;
            while (!cancel.load()) {
                const size_t i = next.fetch_add(1);
                if (i >= pieces.size()) break;
                load_range(pieces[i].off, pieces[i].len, buf);
                done.fetch_add(pieces[i].len);
            }
        });
    }
    bool ok = true;
    // every piece counts as done once tried, even if its read failed, so this ends
    while (done.load() < total) {
        if (progress && !progress((float) ((double) done.load() / (double) total))) {
            cancel.store(true);
            ok = false;
            break;
        }
        std::this_thread::sleep_for(std::chrono::milliseconds(50));
    }
    for (auto & th : threads) th.join();
    const double s = ms_between(t0, std::chrono::steady_clock::now()) / 1000.0;
    std::lock_guard<std::mutex> lk(mu_);
    st_.bytes_read += done.load();
    if (total >= 64 * kMB && s > 0) st_.read_mbps = (double) done.load() / 1e6 / s;
    for (auto & g : groups_) {
        if (g.resident && g.kind != Kind::EMBD) g.state = IN_MEMORY;
    }
    warmed_ = true;
    if (progress && ok) progress(1.0f);
    return ok;
}

void Pager::load_range(uint64_t off, uint64_t len, std::vector<uint8_t> & buf) {
    const uint64_t lo = off / page_ * page_;
    const uint64_t hi = std::min<uint64_t>((off + len + page_ - 1) / page_ * page_, file_size_);
    if (hi <= lo) return;
    // straight into the model's own mapping: read and mapped, so the model does not even take a
    // page fault on it
    const uint8_t * base = this->base();
    if (base && populate_ok_.load()) {
        for (int tries = 0; tries < 3; tries++) {
            if (madvise((void *) (base + lo), hi - lo, MADV_POPULATE_READ) == 0) return;
            if (errno != EINTR && errno != EAGAIN) break;
        }
        if (errno == EINVAL || errno == ENOSYS || errno == EPERM) populate_ok_.store(false);  // older kernel
        else return;
    }
    // older kernels: an ordinary read puts the pages in the cache the mapping reads from
    buf.resize((size_t) std::min<uint64_t>(hi - lo, 8 * kMB));
    for (uint64_t o = lo; o < hi;) {
        const ssize_t r = pread(fd_, buf.data(), (size_t) std::min<uint64_t>(buf.size(), hi - o), (off_t) o);
        if (r <= 0) {
            if (r < 0 && errno == EINTR) continue;
            break;
        }
        o += (uint64_t) r;
    }
}

void Pager::set_io_cpus(const std::vector<int> & compute_cpus) {
    // reading is mostly waiting for storage, but putting pages in place takes CPU too: off the
    // cores the model computes on, so neither slows the other (a phone's little cores)
    io_cpus_.clear();
    if (compute_cpus.empty()) return;
    const long n = sysconf(_SC_NPROCESSORS_CONF);
    for (int c = 0; c < n && c < CPU_SETSIZE; c++) {
        if (std::find(compute_cpus.begin(), compute_cpus.end(), c) == compute_cpus.end()) io_cpus_.push_back(c);
    }
}

void Pager::place_io_thread() const {
    if (io_cpus_.empty()) return;
    cpu_set_t set;
    CPU_ZERO(&set);
    for (int c : io_cpus_) CPU_SET(c, &set);
    sched_setaffinity(0, sizeof set, &set);  // refused: stays where it is
}

void Pager::enqueue(int gi) {
    constexpr uint64_t kChunk = 8 * kMB;
    Group & g = groups_[gi];
    g.state = LOADING;
    g.gen++;
    g.pending = 0;
    for (const auto & r : g.ranges) {
        for (uint64_t o = 0; o < r.len; o += kChunk) {
            queue_.push_back({gi, g.gen, r.off + o, std::min(kChunk, r.len - o)});
            g.pending++;
        }
    }
    if (g.pending == 0) g.state = IN_MEMORY;
    work_.notify_all();
}

void Pager::worker() {
    std::vector<uint8_t> buf;
    std::unique_lock<std::mutex> lk(mu_);
    while (true) {
        work_.wait(lk, [&]() { return quit_workers_ || !queue_.empty(); });
        if (quit_workers_) return;
        const Piece p = queue_.front();
        queue_.pop_front();
        lk.unlock();
        load_range(p.off, p.len, buf);
        lk.lock();
        st_.bytes_read += p.len;
        Group & g = groups_[p.group];
        if (g.gen == p.gen && g.state == LOADING && --g.pending <= 0) g.state = IN_MEMORY;
    }
}

void Pager::drop(Group & g) {
    // only whole pages inside the layer: a page it shares with its neighbour stays
    for (const auto & r : g.ranges) {
        const uint64_t lo = (r.off + page_ - 1) / page_ * page_;
        const uint64_t hi = (r.off + r.len) / page_ * page_;
        if (hi <= lo) continue;
        // out of this process's page tables first (the cache keeps mapped pages), then out of the cache
        if (const uint8_t * base = this->base()) madvise((void *) (base + lo), hi - lo, MADV_DONTNEED);
        posix_fadvise(fd_, (off_t) lo, (off_t) (hi - lo), POSIX_FADV_DONTNEED);
    }
    g.state = OUT_OF_MEMORY;
    g.gen++;  // pieces of it still being read are ignored when they finish
    g.pending = 0;
}

double Pager::check_resident() {
    const uint8_t * base = this->base();
    if (!base) return 1.0;
    uint64_t pages = 0, present = 0;
    std::vector<unsigned char> vec;
    for (const auto & g : groups_) {
        if (!g.resident || g.kind == Kind::EMBD) continue;
        for (const auto & r : g.ranges) {
            const uint64_t lo = r.off / page_ * page_;
            const uint64_t hi = std::min<uint64_t>((r.off + r.len + page_ - 1) / page_ * page_, file_size_);
            if (hi <= lo) continue;
            const size_t np = (size_t) ((hi - lo) / page_);
            vec.resize(np);
            if (mincore((void *) (base + lo), hi - lo, vec.data()) != 0) return 1.0;
            pages += np;
            for (size_t i = 0; i < np; i++) present += vec[i] & 1;
        }
    }
    return pages ? (double) present / (double) pages : 1.0;
}

void Pager::step(int pos) {
    const int n = (int) pass_.size();
    int cur = -1;
    for (int i = 0; i < n; i++) {
        if (groups_[pass_[i]].order == pos) {
            cur = i;
            break;
        }
    }
    std::vector<char> want(groups_.size(), 0);
    if (cur >= 0) {
        // the layer being computed, and the one before it (its last results may still be in use)
        want[pass_[cur]] = 1;
        want[pass_[(cur + n - 1) % n]] = 1;
    }
    std::vector<int> order;
    uint64_t ahead = 0;
    for (int s = 1; s <= n; s++) {
        const int gi = pass_[(cur + s + n) % n];
        const Group & g = groups_[gi];
        if (g.resident || want[gi]) continue;
        if (!order.empty() && ahead + g.bytes > window_) break;
        want[gi] = 1;
        order.push_back(gi);
        ahead += g.bytes;
    }
    for (int gi : pass_) {
        Group & g = groups_[gi];
        if (!g.resident && g.state != OUT_OF_MEMORY && !want[gi]) drop(g);
    }
    // pieces of layers no longer wanted leave the queue; the wanted ones go in nearest first
    std::deque<Piece> kept;
    for (const auto & p : queue_) {
        const Group & g = groups_[p.group];
        if (g.gen == p.gen && g.state == LOADING) kept.push_back(p);
    }
    queue_.swap(kept);
    for (int gi : order) {
        if (groups_[gi].state == OUT_OF_MEMORY) enqueue(gi);
    }
}

void Pager::reached(int group) {
    const auto now = std::chrono::steady_clock::now();
    if (group == pass_.front()) {
        pass_t0_ = now;
    } else if (group == pass_.back() && pass_t0_.time_since_epoch().count() != 0) {
        pass_us_.store((int64_t) (ms_between(pass_t0_, now) * 1000.0));
    }
    pos_.store(groups_[group].order);
    epoch_.fetch_add(1);
    {
        std::lock_guard<std::mutex> lk(wake_mu_);
    }
    wake_.notify_one();
}

bool Pager::eval_cb(ggml_tensor * t, bool ask, void * user_data) {
    auto * p = static_cast<Pager *>(user_data);
    if (!ask) {
        if (p->flagged_ >= 0) p->reached(p->flagged_);
        p->flagged_ = -1;
        return true;
    }
    if (!p->base_ready_) {
        // the mapping was not found by name: the first weight the model reads says where it is
        if (p->broken_.load()) return false;
        for (int k = 0; k < GGML_MAX_SRC; k++) {
            const ggml_tensor * s = t->src[k];
            if (!s || !s->data || s->op != GGML_OP_NONE) continue;
            auto it = p->offsets_.find(s->name);
            if (it == p->offsets_.end()) continue;
            p->set_base((uintptr_t) s->data - (uintptr_t) it->second);
            p->verified_ = true;
            break;
        }
        if (!p->base_ready_) return false;
    }
    if (!p->track_.load(std::memory_order_relaxed)) return false;
    const uintptr_t lo = p->base_.load(std::memory_order_relaxed), hi = lo + (uintptr_t) p->file_size_;
    for (int k = 0; k < GGML_MAX_SRC; k++) {
        const ggml_tensor * s = t->src[k];
        if (!s || !s->data) continue;
        const uintptr_t a = (uintptr_t) s->data;
        if (a < lo || a >= hi) continue;
        const int g = p->group_at(a);
        if (g < 0 || g == p->seen_ || p->groups_[g].order < 0) continue;
        if (!p->verified_) {
            // the mapping found in /proc/self/maps must be the one the model reads from
            auto it = p->offsets_.find(s->name);
            if (it == p->offsets_.end() || lo + it->second != a) {
                p->track_.store(false);
                p->broken_.store(true);
                return false;
            }
            p->verified_ = true;
        }
        p->seen_ = g;
        p->flagged_ = g;
        // computed up to here, the graph stops and asks again: the model has reached this layer
        return true;
    }
    return false;
}

void Pager::start() {
    std::lock_guard<std::mutex> lk(mu_);
    if (thread_.joinable()) return;
    quit_ = false;
    quit_workers_ = false;
    thread_ = std::thread([this]() {
        place_io_thread();
        loop();
    });
    for (int i = 0; i < 3; i++) {
        workers_.emplace_back([this]() {
            place_io_thread();
            worker();
        });
    }
}

void Pager::stop() {
    {
        std::lock_guard<std::mutex> lk(wake_mu_);
        quit_ = true;
    }
    wake_.notify_one();
    if (thread_.joinable()) thread_.join();
    {
        std::lock_guard<std::mutex> lk(mu_);
        quit_workers_ = true;
        queue_.clear();
    }
    work_.notify_all();
    for (auto & w : workers_) w.join();
    workers_.clear();
}

void Pager::set_budget(uint64_t budget) {
    {
        std::lock_guard<std::mutex> lk(wake_mu_);
        want_budget_ = std::max<uint64_t>(budget, 1);
    }
    wake_.notify_one();
}

void Pager::trim() {
    {
        std::lock_guard<std::mutex> lk(wake_mu_);
        want_trim_ = true;
    }
    wake_.notify_one();
}

PagerStats Pager::stats() const {
    std::lock_guard<std::mutex> lk(mu_);
    PagerStats s = st_;
    s.pass_ms = pass_us_.load() / 1000.0;
    if (broken_.load()) s.active = false;
    return s;
}

void Pager::loop() {
    uint64_t seen_epoch = ~0ull;
    auto last_check = std::chrono::steady_clock::now();
    auto last_avail = last_check;
    while (true) {
        uint64_t new_budget = 0;
        bool trim = false;
        {
            std::unique_lock<std::mutex> lk(wake_mu_);
            wake_.wait_for(lk, std::chrono::milliseconds(500), [&]() {
                return quit_ || epoch_.load() != seen_epoch || want_budget_ != 0 || want_trim_;
            });
            if (quit_) break;
            new_budget = want_budget_;
            want_budget_ = 0;
            trim = want_trim_;
            want_trim_ = false;
        }
        std::lock_guard<std::mutex> lk(mu_);
        if (broken_.load()) continue;
        if (trim) {
            plan_locked(st_.budget_bytes / 4 * 3);
            st_.n_replans++;
        }
        if (new_budget) {
            plan_locked(new_budget);
            st_.n_replans++;
        }
        seen_epoch = epoch_.load();
        if (track_.load()) step(pos_.load());

        // every few seconds: are the resident layers still all there, and is there more room?
        const auto now = std::chrono::steady_clock::now();
        if (ms_between(last_check, now) < 2000 || !warmed_) continue;
        last_check = now;
        const double present = check_resident();
        st_.resident_present = present;
        const uint64_t full = st_.pass_bytes + fixed_bytes();
        if (present < 0.85) {
            // other apps took memory and the kernel took it from the model: keep less, so the
            // layers still kept stay whole instead of all of them going missing a little
            if (++low_checks_ >= 2) {
                low_checks_ = 0;
                const uint64_t res = st_.resident_bytes + fixed_bytes();
                plan_locked((uint64_t) ((double) res * present * 0.95) + st_.window_bytes);
                st_.n_replans++;
            }
            continue;
        }
        low_checks_ = 0;
        if (ms_between(last_avail, now) < 10000) continue;
        last_avail = now;
        const uint64_t avail = memory_for_model();
        const uint64_t budget = st_.budget_bytes;
        if (avail > budget + std::max<uint64_t>(256 * kMB, budget / 16) && budget < full && present > 0.97) {
            plan_locked(std::min(avail, full));  // other apps closed: keep more
            st_.n_replans++;
        } else if (avail + std::max<uint64_t>(128 * kMB, budget / 8) < budget) {
            plan_locked(avail);  // memory is getting short: keep less before the kernel takes it
            st_.n_replans++;
        }
    }
}

}  // namespace oa
