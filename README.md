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

- **Models screen**: eight hand-picked models that fit 8 GB of memory, downloaded through
  Android's download manager (carries on with the app closed, resumes after a dropped
  connection, checked for size and GGUF format when done). Also takes any `.gguf` file from the
  phone's storage or a pasted link.
- **Chat**: replies stream in as they are written; models that think show their thinking in a
  fold above the answer; code blocks have a copy button; tables line up. Stop, write again, edit
  and resend the last message. Chats are saved on the phone.
- **Settings**: context size, CPU threads, thinking on or off, reply length, system prompt,
  sampling (each model's recommended values by default).

| Model | Maker | Size |
|---|---|---|
| Gemma 4 E4B | Google | 4.98 GB |
| Gemma 4 E2B | Google | 3.11 GB |
| Qwen3.5 4B | Alibaba Qwen | 2.74 GB |
| Qwopus3.5 4B v3 | Jackrong (community) | 2.71 GB |
| Qwopus3.5 4B Coder | Jackrong (community) | 2.78 GB |
| Qwen3.8 4B | Empero (community) | 2.78 GB |
| Qwen3.5 4B Claude Reasoning | TeichAI (community) | 2.71 GB |
| ADI Qwen3.5 4B GLM-5.2 | AdvancedDataIntelligence (community) | 2.71 GB |

All Q4_K_M, from Hugging Face. The community ones are fine-tunes by individuals; their makers'
benchmark claims are their own.

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

## Tests

`tools/host-test/run.sh` builds llama.cpp for the computer it runs on, makes tiny random models
with llama.cpp's own `test-llama-archs` tool (Llama, Qwen3.5 hybrid, Gemma 3 sliding window, a
Mistral MoE), and checks the prompt cache the strict way: after each kind of turn (follow-up, a
reply rewritten by the template, regenerate, an early edit, a stopped prompt) the logits must
match those of a fresh engine that read the whole prompt from the start. It also renders the
real Qwen3.5 and Gemma 4 templates over their real vocabularies and streams replies through the
parser. Runs under AddressSanitizer and UBSan. CI runs it on every push.

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
- No image input (Gemma 4 and Qwen3.5 can see, but that needs their projector files).
- Generation stops if Android kills the app in the background; keep it open while it writes.
