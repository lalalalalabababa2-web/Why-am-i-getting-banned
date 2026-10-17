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

- **Models screen**: 24 models from 270M to 27B that fit 8 GB of memory, grouped by what they
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
  Gemma 4's drafter) is off until the drafting test in Settings finds it faster on the phone: on
  the CI machines it was slower or no faster (see Tests), because a CPU pays for most of each
  extra word it checks.
- **Settings**: context size, CPU threads, thinking on or off, reply length, system prompt,
  sampling (each model's recommended values by default), drafting, picture detail.

| Group | Models |
|---|---|
| Best for this phone | Gemma 4 E4B, Qwen3.5 4B, Ternary Bonsai 2 9B, Gemma 4 E2B |
| Small and fast | Qwen3.5 2B and 0.8B, LFM2.5-VL 1.6B, LFM2.5 1.2B, Llama 3.2 1B, Gemma 3 270M |
| More 3-4B models | Llama 3.2 3B, Ministral 3 3B, Granite 4.1 3B, Phi-4-mini |
| Community fine-tunes | Qwopus3.5 4B v3 and Coder, Qwen3.8 4B, Qwen3.5 4B Claude Reasoning, ADI Qwen3.5 4B GLM-5.2 |
| Bigger | LFM2.5 8B-A1B, Qwen3.5 9B (two sizes), Gemma 4 12B, Bonsai 27B (1-bit) |

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
multiply). Inference uses the fast cores only (six on an S24 FE).

- Drafting: `common_speculative` from llama.cpp, with the draft context sharing the target's
  memory; drafts are checked in one batch and rejected tokens removed again (for hybrid models,
  through llama.cpp's recurrent-state rollback). llama's default reserves logits for a whole
  prompt step (hundreds of MB with a 250k vocabulary); the engine asks for only the outputs a
  draft can use.
- Pictures and sound: llama.cpp's `mtmd`, loaded the first time a chat has an attachment.
  Encoded pictures stay in the prompt cache like text, so a follow-up does not encode them again.

## Tests

`tools/host-test/run.sh` builds llama.cpp for the computer it runs on, makes tiny random models
with llama.cpp's own `test-llama-archs` tool (Llama, Qwen3.5 hybrid, Gemma 3 sliding window, a
Mistral MoE), and checks the prompt cache the strict way: after each kind of turn (follow-up, a
reply rewritten by the template, regenerate, an early edit, a stopped prompt) the logits must
match those of a fresh engine that read the whole prompt from the start. It also renders the
real Qwen3.5 and Gemma 4 templates over their real vocabularies and streams replies through the
parser. Runs under AddressSanitizer and UBSan. CI runs it on every push.

It also checks drafting: with n-gram drafts and with an MTP head (a random model with one added
by the test), greedy replies must be the same tokens as without drafting.

`tools/host-test/real.sh` runs real models, built without sanitizers, on an x86 and an ARM CI
runner: Qwen3.5 0.8B with its MTP head at 0-3 drafted tokens (same words, and how fast),
pictures and video frames through its projector, and both Bonsai models answering a question.
The speeds it prints are for those runners, not for a phone.

## Building

CI (`.github/workflows/build.yml`) builds and publishes the APK on every push to this branch.
Locally, with the Android SDK, NDK 29.0.13113456 and CMake 3.31.6:

```
git submodule update --init
./gradlew :app:assembleRelease
```

`ci/README.md` explains the signing key.

## Not done yet

- Never run on a real phone by its author: built and tested on desktop and in CI only.
- Sound input has not been tried with a real model yet (pictures and video frames have, in CI).
- Generation stops if Android kills the app in the background; keep it open while it writes.
