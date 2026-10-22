# Offline AI

An Android app that runs AI models on the phone itself. Pick a model, it downloads once, and
from then on every chat happens on the phone's CPU with no internet and nothing sent anywhere.
Built for a Galaxy S24 FE (8 GB), and fine on any 64-bit Android 11+ phone with similar memory.

**Download:** [OfflineAI.apk](https://github.com/lalalalalabababa2-web/why-am-i-getting-banned/releases/download/offline-ai-latest/OfflineAI.apk)
(the newest build; the link stays the same). Open it on the phone and allow installs from your
browser when Android asks. New builds install over old ones and keep models and chats.

| | |
|---|---|
| Engine | [llama.cpp](https://github.com/ggml-org/llama.cpp) release b11700, as a submodule in `third_party/llama.cpp` |
| Model format | GGUF, any architecture llama.cpp supports (Gemma 4, Qwen3.5 and its fine-tunes, Llama, Mistral, …) |
| Platform | Android 11+ (API 30), arm64-v8a |
| Language | Kotlin (UI) and C++ (engine) |
| Toolchain | Gradle 9.7.1, AGP 9.4.0, Kotlin 2.4.20, NDK r29, CMake 3.31.6 |

## What it does

- **Models screen**: 39 models from 270M to 35B, grouped by what they
  are good for, downloaded through Android's download manager (carries on with the app closed,
  resumes after a dropped connection, checked for size and GGUF format when done). Models that
  can see get an "Add picture support" button for their projector file. Also takes any `.gguf`
  file from the phone's storage or a pasted link.
- **Chat**: replies stream in as they are written; models that think show their thinking in a
  fold above the answer; code blocks have a copy button; tables line up. Stop, write again, edit
  and resend the last message. Chats are saved on the phone.
- **Pictures, video and sound**: attach photos (up to four), a video (sent as a few frames with
  their times) or a sound file or recording (decoded to 16 kHz mono) to models that can take them.
- **Writing faster**: drafting ahead (speculative decoding), where the model checks several
  guessed words in one step and keeps the ones it would have written anyway, so replies read the
  same. *Copying from the conversation* (n-gram drafts) is on by default: it costs nothing until a
  reply repeats text from the chat, then checks the repeated part many words at a time (3 at a
  time for Qwen3.5-style hybrid models under 10B). *Drafting with a helper* (Qwen3.5's MTP head,
  Gemma 4's drafter) is on and tuned as it writes: a CPU pays for most of each extra word it
  checks, so the engine measures what checking 1, 2, 3 or 4 words costs on this phone, what a
  guess costs and how often guesses are kept, and drafts as many per step as are worth it (none
  when it does not pay). Qwen3.5's MTP head guesses among the 32k most used words only, about a
  seventh of the work per guess (see *Drafting* below).
- **Thinking that ends**: in Automatic, a model that thinks does so for about a minute's worth of
  words at its own speed, then says it will answer and does (llama.cpp's reasoning budget). On
  lets it think as long as it likes; a model read from storage does not think in Automatic.
- **Models bigger than the free memory**: a 9B model (4.7 GB) on an 8 GB phone with other apps
  open used to read nearly all of itself from storage for every word (0.1 words a second). Now
  it keeps as many of its layers in memory as fit and streams the rest from storage in big
  reads just before they are needed, a few times faster (see *The pager* below). Qwen3.5 0.8B,
  if it is on the phone, guesses a few words ahead for the bigger Qwen3.5 models while they
  stream, and the big model checks all of them in the one read of itself it makes anyway.
- **How long it will take**: while a message is read, the time left; while a reply is written,
  the speed over the last ten seconds, the tokens so far and about how long the reply still
  takes (from how much longer this model's earlier replies went on). The stats under a reply
  give the speed with the digits that matter (0.43 tok/s), the total time, and for a streamed
  model how much of it stayed in memory and how much was read per step.
- **In the background**: a reply keeps going when you switch apps or turn the screen off (a
  foreground service with a wake lock), with a notification showing how far it has got and
  another when it is ready. In *gentle* mode (the default) it drops to a few threads at a low
  priority while another app is in front, so the phone stays smooth. A reply is saved every few
  seconds while it is written, so if Android closes the app anyway, what was written is kept.
- **Settings**: context size, CPU threads, thinking (automatic: off for a model streaming from
  storage, where it could take minutes before the answer starts), reply length, system prompt,
  sampling (each model's recommended values by default), drafting, picture detail.

| Group | Models |
|---|---|
| Best for this phone | Gemma 4 E4B, Qwen3.5 4B, Ternary Bonsai 2 9B, Gemma 4 E2B |
| Small and fast | Qwen3.5 2B and 0.8B, LFM2.5-VL 1.6B, LFM2.5 1.2B, Llama 3.2 1B, Gemma 3 270M |
| More 3-4B models | Llama 3.2 3B, Ministral 3 3B, Granite 4.1 3B, Phi-4-mini |
| Community fine-tunes | Qwopus3.5 4B v3 and Coder, Qwen3.8 4B, Qwen3.5 4B Claude Reasoning, ADI Qwen3.5 4B GLM-5.2 |
| Uncensored (abliterated) | Gemma 4 E4B and E2B, Qwen3.5 4B, 2B and 9B Opus, Llama 3.2 3B, LFM2.5 1.2B: community copies by huihui-ai with refusals removed |
| Bigger | LFM2.5 8B-A1B, Ling 3.0 tiny, Qwen3.5 9B (two sizes), Gemma 4 12B, Bonsai 27B (1-bit) |
| Big, from storage | Qwen3.6 35B-A3B, MiniCPM-V 4.7 35B-A3B (two sizes), LFM2.5 24B-A2B, Gemma 4 26B-A4B, GLM-4.7 Flash, Qwen3.6 35B-A3B abliterated: mixtures of experts of 8-11 GB that use 2-4B parameters per word and run from storage |

From Hugging Face, mostly Q4_K_M; the bigger ones are squeezed to about 3 bits (or 1-2 bits for
Bonsai) to fit. The community ones are fine-tunes by individuals; their makers' benchmark claims
are their own. Speeds depend on the phone and are not listed here because they have not been
measured on one.

## How the engine works

`app/src/main/cpp/engine.cpp` is a small layer over llama.cpp.

- Every turn, the whole conversation is rendered through the model's own chat template
  (llama.cpp's Jinja engine, so each model gets exactly the format it was trained on), tokenized,
  and compared with what is already in the model's memory. Only the part that differs is read.
- Plain attention models can drop any tail of that memory. Sliding-window models (Gemma) keep
  every position (`swa_full`) so they can too.
- Hybrid models (Qwen3.5 and everything built on it) carry a recurrent state that cannot be
  wound back, and their template removes old thinking from the history, so the conversation
  never matches the memory exactly. For those the engine keeps a snapshot of the whole state at
  the point where each reply starts, and restores it the next turn instead of re-reading the
  whole conversation.
- Thinking and answer are separated by llama.cpp's own parser for each model's format.
- When a conversation outgrows the context, the oldest exchanges are left out.

ggml is built with every ARM CPU variant as a separate library (armv8.0 to armv9.2); at start
the best one this phone supports is picked (on an S24 FE, one with dot products and int8 matrix
multiply). Inference uses the fast cores only (six on an S24 FE): the engine keeps its own
threads between steps (llama.cpp would start and stop them for every step) and keeps them, and
the thread that drives them, off the little cores, since a step is only as fast as its slowest
thread.

- Drafting: `common_speculative` from llama.cpp, with the draft context sharing the target's
  memory; drafts are checked in one batch and rejected tokens removed again (for hybrid models,
  through llama.cpp's recurrent-state rollback). llama's default reserves logits for a whole
  prompt step (hundreds of MB with a 250k vocabulary); the engine asks for only the outputs a
  draft can use.
- Pictures and sound: llama.cpp's `mtmd`, loaded the first time a chat has an attachment.
  Encoded pictures stay in the prompt cache like text, so a follow-up does not encode them again.

### The pager

`app/src/main/cpp/pager.cpp`, for low-memory mode. The weights stay in the model file, mapped
into memory, and when the model does not fit, the kernel's least-recently-used rule throws out
exactly the layers needed next: every step reads almost the whole file again, a page fault at a
time. The pager takes that decision away from the kernel:

- It reads the file's tensor layout, groups the weights by layer, and keeps as many layers as fit
  in the memory there is (what Android reports available, less some room for everything else),
  spread evenly through the model so reading never stops for long. The output layer is kept
  first: with Qwen3.5's 248k-word vocabulary it is 0.83 GB, eight times a layer, read on every
  step (and several times a step by an MTP head). The room for streaming is two layers read
  ahead and the one being computed.
- Six reader threads read each streamed layer in 8 MB pieces just before the model reaches it
  (`MADV_POPULATE_READ` straight into the model's mapping, or ordinary reads on older kernels;
  asking the kernel to read ahead is not enough, it reads only a little of what it is asked
  for), two layers ahead, on the cores the model does not compute on. Each has one read in
  flight at a time, so more readers keep the storage busier: six were about 15% faster than three
  (more than six gained nothing). It follows the model through llama's graph callback, which
  tells it when each layer starts.
- Once the model is past a streamed layer its pages are handed back (`MADV_DONTNEED` and
  `POSIX_FADV_DONTNEED`), so streamed layers never push out the ones that stay.
- Every few seconds it checks (`mincore`) that the kept layers are still all in memory and how
  much memory there is: other apps taking memory make it keep fewer, apps closing more. Android's
  trim-memory calls reach it too.
- llama.cpp does not read the whole file while loading (patch 0002); the pager reads the kept
  layers with four threads instead, which is also faster than the warm-up step it replaces.
- A mixture of experts is not streamed by layers: a token reads only the experts it picks, so
  streaming whole layers would read many times what the model uses. Instead
  (`ExpertPrefetch` in pager.cpp) the graph stops right after each layer's router has picked
  and every picked expert of that layer is asked of the storage at once, instead of the page
  faults reading them one small piece at a time. Reading a prompt, every step picks nearly
  every expert of every layer however many tokens it has, so such a model reads prompts in
  steps of 1024 tokens from the start (small steps used to read the whole model again for every
  8 to 32 tokens), and while one layer computes, the next layer's experts are read whole.

Everything it does is advice to the kernel, so whatever it gets wrong costs speed, never a wrong
answer. While a model streams, the read of the model costs the same for a step of one token or
five, so drafting gets much cheaper: copying from the conversation is on for hybrid models too,
a model with an MTP head drafts 3 tokens at a time, prompt steps are as big as they go, and a
helper model (below) can guess ahead.

On this repository's test machine (4 cores, storage around 3 GB/s), a random 1.8 GB model with
only 1.2 GB of memory (tools/host-test/make_big_model.py, bench_stream.cpp):

| | Without the pager | With it |
|---|---|---|
| Writing, tokens/s | 0.55 | 2.3-2.5 (2-3 compute threads) |
| Writing with drafts the model agrees with | 1.5 | 5.6 |
| Loading | 4.3 s | 1.4 s |

CI's *Models bigger than memory* job runs Qwen3.5 9B the same way in a 3 GB memory cgroup, from
storage that reads about 430 MB/s:

| Qwen3.5 9B, 3 GB of memory | Kept / read per step | Writing, tokens/s |
|---|---|---|
| Q3_K_M (4.66 GB), no pager | - | 0.14 |
| Q3_K_M, pager | 2.21 / 2.02 GB | 0.20 |
| UD-IQ3_XXS (4.28 GB), pager | 2.23 / 1.49 GB | 0.28 |
| UD-IQ3_XXS, pager, MTP drafting 3 | 2.07 / 1.65 GB | 0.48 |
| Q3_K_M, pager, Qwen3.5 0.8B helper | 1.46 / 2.76 GB | 0.30 |

A step there is the read of what is streamed, at the storage's speed (2.02 GB in 4.9 s). A
phone's UFS storage reads 1.5-4 GB/s, so the same steps take a third to a tenth of that.

### The helper

For a streamed Qwen3.5 model, Qwen3.5 0.8B (same vocabulary, its own memory, in fast mode) guesses
up to 4 tokens per step, stopping at the first one it is unsure of. A hybrid model's memory cannot
be wound back token by token, so it guesses on a copy of its conversation and afterwards reads what
the big model kept in one batch; like the big model it keeps a snapshot where each reply starts.
Every kept token is one the big model would have written itself, so replies read the same.

Fast mode reads the file with four threads before llama copies the weights out of it, and hands
the file's pages back afterwards: about twice as fast to load.

## Changes to llama.cpp

`third_party/patches/` holds the app's own changes, applied to the submodule at build time by
`apply.sh` (the Android build and the test scripts run it): a model parameter that maps the
file without reading all of it while loading (`no_populate`, for the pager); a smaller output
head for an MTP head to draft with (`llama_model_set_draft_head`: the rows of the most used
tokens, every other token -inf, used by Qwen3.5 and Qwen3.5 MoE MTP heads), an MTP head that
stops at each step's own draft cap, and the drafter that made a draft named to the caller (patch
0003); and faster ARM NEON dot products for the
Q1_0 and Q2_0 weights of PrismML's Bonsai models, plus 2x2 and (with int8 matrix multiply, as on
the S24 FE's cores) 4x4 versions for reading prompts, and the small change to ggml's mul_mat that
lets it call a 4x4 one. They matter most in low-memory mode, where the weights stay in the file
and ggml's own repacked kernels (which need a copy of the weights in memory) are not used. `tools/host-test/test_kernels.c` checks them against plain C (on ARM in CI; on
other computers through [SIMDe](https://github.com/simd-everywhere/simde)).

## Tests

`tools/host-test/run.sh` builds llama.cpp for the computer it runs on, makes tiny random models
with llama.cpp's own `test-llama-archs` tool (Llama, Qwen3.5 hybrid, Gemma 3 sliding window, a
Mistral MoE), and checks the prompt cache the strict way: after each kind of turn (follow-up, a
reply rewritten by the template, regenerate, an early edit, a stopped prompt) the logits must
match those of a fresh engine that read the whole prompt from the start. It also renders the
real Qwen3.5 and Gemma 4 templates over their real vocabularies and streams replies through the
parser. Runs under AddressSanitizer and UBSan. CI runs it on every push.

The pager is checked the same way: five test models, one of them with ten layers so layers are
handed back and read again on every step, are streamed whole (a 1 MB budget) and their logits
must match an engine without the pager, also when the pager has to learn where the model is
mapped from the first step.

It also checks drafting: with a helper model (the model as its own helper, so the tokens must be
the same as without drafting), with n-gram drafts and with an MTP head (a random model with one added
by the test), greedy replies must be the same tokens as without drafting.

`tools/host-test/real.sh` runs real models, built without sanitizers, on an x86 and an ARM CI
runner: Qwen3.5 0.8B with its MTP head at 0-3 drafted tokens (same words, and how fast),
pictures and video frames through its projector, and both Bonsai models answering a question.
The speeds it prints are for those runners, not for a phone. From GitHub's ARM runner (4 server-class ARM
cores; tokens per second while writing, greedy, the same words in every column):

| Model | Plain | Copying, reply repeats a note | MTP / drafter, 1-3 words |
|---|---|---|---|
| Qwen3.5 0.8B Q4_K_M | 40 | 75 | 20-26 |
| Qwen3.5 4B Q4_K_M | 10.3 | 19.7 | 6.2-10.1 |
| Gemma 4 E2B Q4_K_M | 19.6 | 31.5 | 12.9-15.4 |
| Llama 3.2 1B Q4_K_M | 37 | 58 | - |
| Ternary Bonsai 2 9B Q2_0 | 6.0 (was 4.7 before this repository's kernels) | | |
| Bonsai 27B Q1_0, fast mode | 3.0 | | |
| Bonsai 27B Q1_0, low memory | 2.4 | | |
| Bonsai 27B Q1_0, low memory, only 3 GB of memory | 0.2 | | |

Reading a 425-token message on the same runner: Ternary Bonsai 2 9B 17.7 tokens/s (was 11.0),
Bonsai 27B 8.3 in fast mode, 4.9 in low memory (was 3.4), 2.2 with only 3 GB. The last row is
what a phone without enough free memory sees: the model is read from storage again and again.

A phone's CPU has more and differently sized cores and less memory bandwidth, so expect other
numbers there; Settings has a drafting test that measures the phone itself.

## Building

CI (`.github/workflows/build.yml`) builds and publishes the APK on every push to this branch.
Locally, with the Android SDK, NDK 29.0.13113456 and CMake 3.31.6:

```
git submodule update --init
./gradlew :app:assembleRelease
```

`ci/README.md` explains the signing key.

## Not done yet

- Built and tested on desktop and in CI. On the phone, Qwen3.5 9B Q3_K_M wrote 0.1 tokens/s
  before the pager (reading itself from storage for every word); the pager's numbers above are
  from the test machine and CI, not yet from the phone.
- Sound input has not been tried with a real model yet (pictures and video frames have, in CI).
- If Android closes the app anyway (it can, under memory pressure), the reply stops where it was;
  what was written is kept and marked as cut short.
