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
| Lua | [Luau](https://github.com/luau-lang/luau) 0.742 (Roblox's Lua), as a submodule in `third_party/luau` |
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
- **In the background**: a reply keeps going when you switch apps or turn the screen off (a
  foreground service with a wake lock), with a notification showing how far it has got and
  another when it is ready. In *gentle* mode (the default) it drops to a few threads at a low
  priority while another app is in front, so the phone stays smooth. A reply is saved every few
  seconds while it is written, so if Android closes the app anyway, what was written is kept.
- **Settings**: context size, CPU threads, thinking on or off, reply length, system prompt,
  sampling (each model's recommended values by default), drafting, picture detail.
- **Lua, game mods and Roblox**: see below.

## Making Lua, mods and Roblox games

- **Coding chats**: a new chat can be a *Roblox game*, *Lua mod* or *Lua script* chat (the
  buttons on an empty chat, or a long press on +). Each tells the model how to write for that
  platform: for Roblox, Luau with services from `GetService`, the `task` library, one block per
  script with where it goes in its first line, logic and data on the server, checked
  RemoteEvents, saved DataStores; for mods, the game's own API and Lua version and every file
  the mod needs; for Lua, complete code that runs here.
- **Run** on any Lua code block in a reply runs it on the phone. Plain Lua runs in a sandbox
  (print and io.write work; no files, network or require). Roblox code runs in the *Roblox test
  place*: every Lua block of the reply together, each placed where its first comment says
  (`-- LocalScript in StarterPlayerScripts`, `-- ModuleScript in ReplicatedStorage/Config`), so a
  LocalScript finds the RemoteEvents its Script makes and `require` finds the modules. The test
  player, Player1, joins, spawns and then tries what the scripts set up: touches the parts with
  Touched handlers, clicks ClickDetectors, buttons and prompts, equips and uses tools, presses
  the keys the scripts mention, says the chat commands they look for, buys what they prompt for,
  and leaves at the end (so saving on leaving runs too). The output shows prints, warnings,
  errors with their lines, the leaderboard as it changes and data store writes, each with its
  game time. Game time passes instantly: a round loop with `task.wait(20)` takes milliseconds.
- **Check** finds problems without running anything: syntax and type errors and the lints
  Roblox Studio shows, from Luau's own analysis. For mods, the globals that come from the game
  are listed instead of reported.
- **Ask AI to fix** puts the output (and the code, if it is not in the last reply) in the
  message box, asking for a corrected version.
- **Lua editor** (on an empty chat, or Settings): scripts kept on the phone, line numbers,
  colours, a row of the keys code needs, Run and Check with the failing line marked, save to and
  open from a file, and *Ask the AI* to take a script back to the chat.

The test place is a stand-in written in Luau (`app/src/main/assets/lua/roblox.luau`), not
Roblox: there is no physics (nothing falls or collides; Touched fires only when the test
player touches something), nothing is drawn, sounds last two seconds, data stores start empty
and last one run, and there is one player and no internet. It has the parts of the API games
use most: the instance tree with its events, attributes and tags, over 200 classes with their
properties, the datatypes (Vector3, CFrame with its full math, Color3, UDim2, TweenInfo, Enum,
Random, raycasts against parts' boxes), signals, `task`, RemoteEvents and RemoteFunctions
(calls from the wrong side fail as in Roblox), DataStores, TweenService, RunService frames,
HttpService JSON, MarketplaceService, CollectionService, Debris, input. Mistakes are reported
the way Roblox words them (`Velocityy is not a valid member of Part "Workspace.Part"`,
`Unable to assign property CFrame. CFrame expected, got Vector3`, `Infinite yield possible`,
`FireServer can only be called from the client`, LocalPlayer being nil on the server); when a
member or class is missing, the output says it may be the test place that lacks it.

Mods run as plain Lua: the Lua itself is checked and run, but the game's functions (`hook.Add`,
`love.graphics`, `script.on_event`) are not there, so code that calls them stops at the first
call. Luau runs Lua 5.1 code, LuaJIT's `bit` library is provided, and `goto` and Lua 5.3's
bitwise operators are not supported.

| Group | Models |
|---|---|
| Best for this phone | Gemma 4 E4B, Qwen3.5 4B, Ternary Bonsai 2 9B, Gemma 4 E2B |
| Small and fast | Qwen3.5 2B and 0.8B, LFM2.5-VL 1.6B, LFM2.5 1.2B, Llama 3.2 1B, Gemma 3 270M |
| More 3-4B models | Llama 3.2 3B, Ministral 3 3B, Granite 4.1 3B, Phi-4-mini |
| Community fine-tunes | Qwopus3.5 4B v3 and Coder, Qwen3.8 4B, Qwen3.5 4B Claude Reasoning, ADI Qwen3.5 4B GLM-5.2 |
| Uncensored (abliterated) | Gemma 4 E4B and E2B, Qwen3.5 4B, 2B and 9B Opus, Llama 3.2 3B, LFM2.5 1.2B: community copies by huihui-ai with refusals removed |
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

## How the Lua tools work

`app/src/main/cpp/lua_tools.cpp` runs code in a fresh Luau state for every run, in its own
library (`libluatools.so`, so it works even when the AI engine cannot start): the standard
libraries are read-only, each script has its own globals, and there are limits on real time
(5 s by default; an interrupt stops loops that never yield, and keeps stopping them through
pcall), memory (64 MB, through the allocator), output (2000 lines) and a Stop button. A
prelude runs first: `base.luau` for plain Lua (Lua 5.1 names Luau dropped, LuaJIT's `bit`,
quiet answers for files) or `roblox.luau`, which builds the place and returns two hooks: one
places each script and gives it `script`, the other is a scheduler that runs everything in game
time (a heap of timers, coroutines for every script thread and handler, 60 frames per game
second while something listens for them). `lua_check.cpp` uses Luau's Frontend with Roblox's
globals known.

## Changes to llama.cpp

`third_party/patches/` holds the app's own changes, applied to the submodule at build time by
`apply.sh` (the Android build and the test scripts run it): faster ARM NEON dot products for the
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

It also checks drafting: with n-gram drafts and with an MTP head (a random model with one added
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

`tools/host-test/lua.sh` builds Luau for the computer and runs `test_lua.cpp` under
AddressSanitizer and UBSan: plain Lua (output, loadstring, error lines, each limit, Stop from
another thread), the test place with scripts as models write them (leaderstats in game time,
datatypes and CFrame math, tweens and frames, a Script, LocalScript and ModuleScript trading a
RemoteEvent and saving to a DataStore when the player leaves, a kill brick, a GUI button, a
prompt that gives a tool) and the mistakes it must report as Roblox does, and the checker. Five
game minutes of Heartbeat take about 0.3 s there. `LuaToolsTest` runs the native library on the
emulator and taps Run on a Lua block in the chat.

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
- If Android closes the app anyway (it can, under memory pressure), the reply stops where it was;
  what was written is kept and marked as cut short.
- The Lua tools have been tested on desktop (and the on-device test is in CI), not on a phone
  yet; the test place covers much of Roblox's API but not all of it.
