# Nyx (Offline AI)

An Android app that runs AI models on the phone itself. Pick a model, it downloads once, and
from then on every chat happens on the phone's CPU with no internet and nothing sent anywhere.
Built for a Galaxy S24 FE (8 GB), and fine on any 64-bit Android 11+ phone with similar memory.

**Download:** [OfflineAI.apk](https://github.com/lalalalalabababa2-web/why-am-i-getting-banned/releases/download/offline-ai-latest/OfflineAI.apk)
(the newest build; the link stays the same). Open it on the phone and allow installs from your
browser when Android asks. New builds install over old ones and keep models and chats.

| | |
|---|---|
| Engine | [llama.cpp](https://github.com/ggml-org/llama.cpp) release b12670, as a submodule in `third_party/llama.cpp` |
| Pictures | [stable-diffusion.cpp](https://github.com/leejet/stable-diffusion.cpp) (pinned, `third_party/stable-diffusion.cpp`) on llama.cpp's ggml |
| Model format | GGUF, any architecture llama.cpp supports (Gemma 4, Qwen3.5 and its fine-tunes, Qwen3-VL, Spark-X2.6, Llama, Mistral, …) |
| Platform | Android 11+ (API 30), arm64-v8a |
| Language | Kotlin (UI) and C++ (engine) |
| Toolchain | Gradle 9.7.1, AGP 9.4.0, Kotlin 2.4.20, NDK r29, CMake 3.31.6 |

## What it does

- **Pictures**: words in, a picture out, on the phone. Nine picture models, each tried on real
  prompts first. Best: FLUX.2 klein 4B (Black Forest Labs, Apache 2.0, 4 steps) and Z-Image Turbo
  (Alibaba, 8 steps), the newer kind of model that reads the prompt with a real language model
  (Qwen3 4B, one 2.5 GB file both share), so they follow long prompts and can write words into
  the picture. On CI's four ARM cores FLUX.2 klein makes a 512 px picture in 4 minutes (it was 9
  before `sd/0002`, below) at a 4.7 GB peak, 768 px in 13 minutes; Z-Image (Q4_0) 512 px in 10
  minutes at 5.8 GB. They come in three files (diffusion model, text encoder, decoder), which the
  app downloads and loads together. When memory is still short after the chat model is put away,
  the picture is decoded in tiles (3.4 GB instead of 4.7 at 512 px, a minute or two slower).
  A model that will not fit the phone's memory even then is marked "too big for this phone" and
  asks before downloading; one that only fits in tiles says so.
  Then DreamShaper XL Turbo (SDXL, 2.8 GB, 768 px, 6 steps, 117 s on four x86 cores at a 3.3 GB
  peak, so the chat model can usually stay loaded), RealVisXL 5 Lightning (SDXL, 768 px, 5 steps) and Realistic Vision 6 Hyper (1.6 GB,
  512 px, 6 steps). Quick ones, timed at 512 px on four ARM cores in CI: SDXS 512 (683 MB, 1
  step, 7.4 s), SD-Turbo (2 steps, 29.5 s), DreamShaper DMD2 (56 s) and DreamShaper 8 LCM (60 s).
  Decoding uses TAESD / TAESDXL, which halves the time with no visible change. Pictures are made
  by an app-wide queue behind a foreground service, so they carry on in the background, with the
  step in a notification and the finished picture in another. Steps from 1 to 30 per model,
  styles, shapes, share, save to photos, make again with the same or a new seed. No content
  filter, with one line held: nothing sexual with children.
- **Phones together**: a model too big for one phone runs across two (or more) phones on the same
  Wi-Fi, or with one phone on the other's hotspot. On the second phone: Settings, Phones together,
  *Let another phone use this one*; it shows a 6-digit code. On this phone the other one shows up
  by itself (mDNS), or is added by its address; type its code once. From then on a model that does
  not fit here takes the other phone's free memory too (or every model, if you choose *Always*).
  How it works: llama.cpp's RPC backend. The last layers of the model, and their part of the
  conversation memory, go to the other phone; the embeddings, the first layers and the output stay
  here, so what crosses the Wi-Fi for each word is one row of numbers each way, never the words.
  The lending side runs in a process of its own behind a gate that checks the code (a challenge
  and an HMAC: the code itself never crosses the Wi-Fi); its RPC server listens on the loopback
  only. It keeps the weights it was sent, so loading the same model again does not send them again.
  If the other phone leaves, the reply stops with a message and the model loads again without it,
  instead of the app closing (llama.cpp's RPC client ends the program when a server goes away;
  `third_party/patches/0002-rpc-survives-lost-phone.patch` makes it fail the step instead).
  Bluetooth is too slow for this (about 2 Mbit/s and 30 ms or more a round trip, with a few round
  trips per word). It makes bigger models possible, not faster ones: a model that fits on one
  phone is faster there, since each word waits for the Wi-Fi.
- **Hide as a game** (Settings, Privacy): the launcher shows "Ping Pong", a real game; a secret
  code typed as the player name in its settings opens the app. It locks again a minute after
  leaving or when the screen goes off; notifications and recent apps say Ping Pong.
- **Steady speed**: replies ask Android (performance hints, Android 13+) to keep the CPU clocks
  up for the whole reply, instead of running fast only while the screen is touched.

- **First start**: the empty chat suggests one model for the phone's memory (Gemma 4 E4B on an
  8 GB phone, smaller ones on phones with less), downloads it in one tap with its progress shown,
  and loads it the moment it is on the phone.
- **Tools**: Translate (37 languages), Humanize, Summarize, Fix grammar, Rewrite, Shorten, More
  formal, More casual, Bullet points, Explain simply, Write a reply, Notes to email. Paste text, get
  the result to copy or share; nothing is saved to the chats. Translate and Humanize use a model
  made for the job when it is on the phone (Index-Translate 2B with the prompt it was trained on,
  Humanizer 12B through its own template), and any chat model otherwise; a model loaded for a tool
  is swapped back for the chat's model on the way out. From the empty chat, the model menu, or a
  message's long-press menu.
- **Memory, measured**: `data/GgufScan.kt` reads each model file's tensor table and counts what has
  to stay in memory while it writes: everything but Gemma's per-layer embeddings (and the token
  embeddings when there is a separate output layer), which are only looked up a row at a time.
  Fast or low-memory mode, and the 8-bit conversation memory when free memory is tight, are
  decided from that. Before, Gemma's "E" models were counted at half their file size and always
  loaded in fast mode: Gemma 4 E4B Q4_K_M keeps 3.0 GB busy, not 2.5, and NVIDIA's 5.06 GB Bolt
  file 3.5 GB, which on an 8 GB phone with other apps open is more than there is.
- **Models screen**: 46 models from 270M to 27B that fit 8 GB of memory, and 5 more (Ternary Bonsai 2
  27B, Qwen3.5 27B and 35B-A3B, Gemma 4 31B and 26B-A4B) for two or three phones together, grouped by what they
  are good for, downloaded through Android's download manager (carries on with the app closed,
  resumes after a dropped connection, checked for size and GGUF format when done). Models that
  can see get an "Add picture support" button for their projector file. Also takes any `.gguf`
  file from the phone's storage or a pasted link.
- **Characters**: chats with someone, each with a name, a personality and an optional opening line
  (three to start from: a storyteller, a study buddy, a debate partner; change or delete them, or
  make your own). A chat keeps its character as its system prompt, in place of the one in Settings;
  Memory still applies. The opening line is shown but not sent as a message (some templates, like
  Gemma's, want the person to speak first): the character's prompt says it was said. Hold the New
  chat button, or tap the model's name, then Characters.
- **Encrypted, and its code scrambled**: chats, Memory, characters and the paired phones' codes
  are encrypted on the phone with AES-256-GCM (`data/DataCrypto.kt`). The key is random, kept
  wrapped by a key that lives in Android's Keystore and never leaves it; files saved before this
  still open and are encrypted on startup. Pictures and sounds attached to chats stay as files the
  engine reads, protected by Android's own storage encryption. The release APK is shrunk and its
  code renamed by R8 (`app/proguard-rules.pro`): only what the native engine calls by name keeps
  its name, which CI checks in the built APK; R8's mapping is kept with each build to read crash
  reports.
- **Reply versions**: *Write again* keeps the earlier versions of the last reply (up to 10); ‹ 2/3 ›
  in its footer flips between them, and the conversation goes on from the one shown.
- **Continue**: a reply cut off by its length limit (or stopped) has a *Continue* button: the
  model carries on writing the same message from where it stopped (llama.cpp renders the reply
  unfinished and the model writes on; checked with the real Qwen3.5 and Gemma 4 templates).
- **Memory**: notes Nyx keeps in mind in every chat, with any model (long-press a message, *Remember
  this*, shortened to what matters; or Settings, Memory, where each can be forgotten). They go into
  the system prompt, so they stay on the phone like everything else; at most 40, since every note
  is read with every message.
- **Chat**: replies stream in as they are written; models that think show their thinking in a
  fold above the answer; code blocks have a copy button; tables line up. Stop, write again, edit
  and resend the last message. Maths that models write as LaTeX ($\frac{3}{4}$, x^2, \boxed{51})
  shows as readable text (3/4, x², 51), while a price like $5 stays a price. A reply can be read aloud by the phone's own text-to-speech
  (offline once its voice is installed) or shared to another app. An empty chat offers a few
  things to try. Chats are saved on the phone.
- **Speaking a message**: with the message box empty, the send button is a microphone. What you
  say appears in the box as you say it, written by the phone's own on-device speech recognition
  (Android 12 and later), and waits there to be checked and sent. Only an on-device recognizer is
  used, never one that sends the sound online; phones without one keep the plain send button.
- **Talking**: hold the microphone (or tap *Talk instead of typing* in a new chat, or long-press
  the app's icon and pick *Talk*) for a spoken conversation. What you say is sent when you stop, the reply is read aloud, and then it listens
  again; tap the microphone while it reads to answer at once, or *End* to stop. It ends by itself
  after two silent turns in a row or when you leave the app, and keeps the screen on meanwhile.
  Speech recognition and the voice are the phone's own, so this works with no connection too.
  The icon's other shortcut opens a new chat.
- **Working together**: tap the model's name, then *Work together*, to have each message answered
  two or three times separately and then settled by a review pass that checks the answers against
  each other, looks for mistakes and writes the reply. The separate answers and the review's
  checking are in the reply's fold. Every second answer can come from another model on the phone,
  loaded next to the first (for example Qwen3.5 0.8B with LFM2.5 1.2B). It takes about as long as
  one reply per answer, plus the review. With Qwen3.5 0.8B on twelve short word problems (thinking
  off): 10 of 12 right as a team of two, against 8 of 12 answering alone,
  at 30.8 s a reply against 13.4 s on 4 x86 threads. The review caught, for example, an answer that
  left out a step. Its reply sometimes mentions the separate answers; asking it to write its
  checking first and the reply after a "Reply:" line was tried, and the 0.8B model then often left
  the line out and got no more right than alone (8 of 12), so the review writes its reply directly.
  A model that thinks does its checking in its thinking, which goes in the fold. On GitHub's ARM
  runner (closer to a phone), on the first six of those problems: 6 of 6 right as a team of two
  against 4 of 6 alone (20.5 s a reply against 5.6 s), and also 6 of 6 with LFM2.5 1.2B writing
  the second answer, in 15.6 s a reply since it writes faster.
- **Pictures, video and sound**: attach photos (up to four), a video (sent as a few frames with
  their times) or a sound file or recording (decoded to 16 kHz mono) to models that can take them.
- **Writing faster**: drafting ahead (speculative decoding), where the model checks several
  guessed words in one step and keeps the ones it would have written anyway, so replies read the
  same. *Copying from the conversation* (n-gram drafts) is on by default: it costs nothing until a
  reply repeats text from the chat, then checks the repeated part many words at a time (3 at a
  time for Qwen3.5-style hybrid models under 10B). *Drafting with a helper* (Qwen3.5's MTP head,
  Gemma 4's drafter, LFM2.5-VL 3B's DSpark block drafter) is off until the drafting test in
  Settings finds it faster on the phone: on the CI machines it was slower or no faster (see
  Tests), because a CPU pays for most of each extra word it checks. A DSpark drafter guesses a
  whole block of up to 7 words in one pass, so the test tries 1, 3 and 7 for it.
- **Thinking budget**: a model that thinks is stopped after 1024 tokens of thinking by default
  (Settings: 256 to 4096, or no limit), handed a line saying it is time to answer, and answers.
  On a phone, thinking with no limit can take minutes before the first word of the answer. This
  is llama.cpp's reasoning-budget sampler, as its server uses it; if a model cut off like this
  goes on thinking in its answer and closes its thinking again, that part moves back into the
  thinking.
- **In the background**: a reply keeps going when you switch apps or turn the screen off (a
  foreground service with a wake lock), with a notification showing how far it has got and
  another when it is ready. In *gentle* mode (the default) it drops to a few threads at a low
  priority while another app is in front, so the phone stays smooth. A reply is saved every few
  seconds while it is written, so if Android closes the app anyway, what was written is kept.
- **Reading ahead**: after a reply, and again when you start typing, the model reads the part of
  the chat your next message will need, so the next reply starts sooner. Models that think drop
  their old thinking from the chat, so their last reply has to be read again before the next one
  can start; that now happens while you read and type instead of after you press send. Opening an
  old chat and typing gets the whole chat read while you type. Sending takes over at once (within
  one step of about a second), and the reply is the same either way.
- **Settings**: context size, CPU threads, thinking on or off, reply length, system prompt (or a
  ready-made style: brief, friendly, coder, writer, tutor, translator),
  sampling (each model's recommended values by default), drafting, reading ahead, picture detail.
- **About**: what the app promises (runs on the phone, no account, online only to download a
  model), the phone's cores, memory and engine build, credits for the engine, the model makers
  and everyone whose files it downloads (taken from the catalog), and the full license text of
  every library in the app (assets/licenses: the MIT and BSD notices have to go with the APK).

| Group | Models |
|---|---|
| Best for this phone | Gemma 4 E4B and E2B (Google's 4-bit trained QAT weights, all Q4_0: 4.2 and 2.6 GB, 2.6 and 1.3 GB in memory), Nemotron 3.5 Bolt E4B (NVIDIA, on Gemma 4 E4B; UD-Q3_K_XL, 2.6 GB in memory), Qwen3.5 4B, Ternary Bonsai 2 9B |
| New: Spark-X2.6 | Spark-X2.6 4B and 1.7B: iFlytek's on-device models from October 2026, for agent-style work (plans, tools, code); they think before answering |
| Pictures and video | LFM3-VL 2B, Qwen3-VL 2B, 4B and 8B, LFM2.5-VL 3B (with a DSpark drafter); photos, screenshots, documents, and videos as frames with their times |
| Translate and rewrite | Index-Translate 2B (bilibili, on Qwen3.5 2B: 150 languages, text in photos too), Humanizer 12B (on Gemma 4 12B, 2-bit QAT, 3.9 GB) |
| Small and fast | LFM3 1.7B (Liquid's October 2026 model, QAD Q4_0), Qwen3.5 2B and 0.8B, LFM2.5-VL 1.6B, LFM2.5 1.2B, Llama 3.2 1B, Gemma 3 270M |
| More 3-4B models | Llama 3.2 3B, Ministral 3 3B, Granite 4.1 3B, Phi-4-mini |
| Community fine-tunes | Qwopus3.5 4B v3 and Coder, Qwen3.8 4B, Qwen3.5 4B Claude Reasoning, ADI Qwen3.5 4B GLM-5.2 |
| Uncensored (abliterated) | Gemma 4 E4B (SC117's Heretic copy of the QAT weights, 4.2 GB), Gemma 4 E2B, Qwen3.5 4B, 2B and 9B Opus, Qwen3-VL 8B, Llama 3.2 3B, LFM2.5 1.2B: community copies by huihui-ai with refusals removed; Spark-X2.6 4B by FrostWolfAI; LFM3 1.7B by AtomicChat |
| Bigger | Ornith 1.5 9B (Qwen3.5 9B trained further for code and agents), LFM2.5 8B-A1B, Qwen3.5 9B (two sizes), Gemma 4 12B, Bonsai 27B (1-bit) |
| For two or more phones | Ternary Bonsai 2 27B (Qwen3.8 27B with weights of -1, 0, +1, 7.6 GB, this app's Q2_0 kernels), Qwen3.5 27B and Gemma 4 31B (about 2.5 bits, 8.5 GB: two 8 GB phones), Gemma 4 26B-A4B and Qwen3.5 35B-A3B (mixtures of experts, 10-11 GB: three 8 GB phones or two with 12 GB) |

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
- When a conversation outgrows the context, the oldest exchanges are left out. Where it is cut
  matters as much as how much: everything after the system message changes when the cut moves,
  and the whole conversation is read again (a minute or more on a phone for a full context). So
  the cut stays where it was while the conversation still fits, and when it has to move it frees
  another quarter of the context, so the next few turns fit without moving it again. In the
  tests, a chat that keeps growing past a 1024-token context moved its cut on 9 turns out of 10
  before this, and on 2 out of 10 now.

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
  draft can use. The kind of drafter comes from its file: an MTP head (Gemma 4's assistant), or a
  DSpark/DFlash block drafter, a small model of its own with its own memory, fed the model's
  hidden states as it reads and asked for a block of up to 7 tokens per step. It always writes
  the block it was made for, so a reply that asks for fewer (the drafting test) gets one made
  for that many.
- Pictures and sound: llama.cpp's `mtmd`, loaded the first time a chat has an attachment, and let
  go three minutes after the last one. Encoded pictures stay in the prompt cache like text, so a
  follow-up does not encode them again.
- Context that fits: before a model loads, the engine makes two small contexts (1024 and 2048
  positions) and reads llama.cpp's own memory accounting for them. The difference is what one
  position of conversation memory costs for that model in that layout (sliding windows, recurrent
  layers and 8-bit memory included), the rest is fixed. The context is then the setting, or as
  much as the free memory holds once the weights are in, whichever is less, and never under 2048
  (`fit_context`). A fixed 40 kB per position was off four times either way between models, and a
  32768-token setting on an 8 GB phone either crawled (the model's pages read back from storage
  for every word) or had Android close the app.
- Away from the app: two minutes after its last screen closes (the game counts as away), the
  model leaves memory and loads again on return, unless a reply or a picture is still being made.

## Changes to llama.cpp and stable-diffusion.cpp

`third_party/patches/` holds the app's own changes, applied to the submodules at build time by
`apply.sh` (the Android build and the test scripts run it). For b12670 they were moved onto
ggml's new mul_mat, which runs a multi-row kernel's rows as separate streams of the chunk: the
4x4 kernels write four streams by four columns, and a fourth case in its de-interleave puts them
back (`tools/host-test/test_q1q2_mulmat.c` checks 324 shapes against a plain reference, with and
without int8 matrix multiply, on ARM or under qemu-aarch64; a deliberately broken de-interleave
fails 70 of them). stable-diffusion.cpp (pinned at its Nov 13 commit; master has a new API) uses
one op that ggml dropped, `ggml_diag_mask_inf`, in an audio decoder the app never loads;
`sd/0001` builds the same causal mask with `ggml_tri` over `ggml_fill(-inf)`. `sd/0002` makes
the newer picture models practical on a phone: stable-diffusion.cpp kept every weight in ggml's
plain layout, so the diffusion model ran on the slow matmul path; now its quantized matmul weights
go into llama.cpp's repacked CPU layout, as the chat models' do (a 256 px FLUX.2 klein picture in
62 s instead of 185 s on four x86 cores, the same picture; 512 px on the ARM runner in 243 s
instead of 531). The file's pages are let go once a
weight is copied, and the text encoder's once the prompt is read (a 512 px picture peaks at 4.6 GB
instead of 6.3), and klein's prompt is no longer padded to 512 tokens (107 s instead of 148 at
512 px; side by side over six prompts and seeds, no loss). Then: the RPC client failing a step instead
of ending the app when another phone goes away (0002), and faster ARM NEON dot products for the
Q1_0 and Q2_0 weights of PrismML's Bonsai models, plus 2x2 and (with int8 matrix multiply, as on
the S24 FE's cores) 4x4 versions for reading prompts, and the small change to ggml's mul_mat that
lets it call a 4x4 one. They matter most in low-memory mode, where the weights stay in the file
and ggml's own repacked kernels (which need a copy of the weights in memory) are not used. `tools/host-test/test_kernels.c` checks them against plain C (on ARM in CI; on
other computers through [SIMDe](https://github.com/simd-everywhere/simde)).

`0003` with `fa-decode.inc` is attention for writing a token (one query). b12670's flash attention
sums V in 32 bits (16-bit sums could overflow on long contexts), which costs about twice the
instructions on ARM, and for one query it walks a thread's stretch of the conversation memory once
per query head; with grouped-query attention, where 4 to 8 query heads share a K/V head, every K
and V row came in from memory 4 to 8 times per token, and long chats wrote about 30% slower on the
ARM runner than with b11700. Checking a draft (2 to 31 tokens at once) was worse: every query of
every head walked the whole memory on its own. Now each row is read once for all the rows (query
and head) that share it, eight at a time: up to four of them scored per K row load, one softmax
rescale per block of 16 positions, and the block's V sums kept in registers. `tools/host-test/test_fa_decode.cpp` holds it to ggml's reference over head
sizes 64 to 512, 1 to 8 heads per K/V head, 1 to 31 queries with causal masks and holes,
soft-capping, ALiBi and sinks (x86, and ARM with and without 16-bit arithmetic under qemu). One attention step at 8192 positions on
four x86 cores: 2.2 ms instead of 3.4 (Llama 3.2 1B's shape), 0.9 instead of 2.3 (Gemma 4 E2B),
3.6 instead of 8.1 (Qwen3.5 4B). `OA_FA_PLAIN=1` turns it off.

## Tests

`tools/host-test/run.sh` builds llama.cpp for the computer it runs on, makes tiny random models
with llama.cpp's own `test-llama-archs` tool (Llama, Qwen3.5 hybrid, Gemma 3 sliding window, a
Mistral MoE), and checks the prompt cache the strict way: after each kind of turn (follow-up, a
reply rewritten by the template, regenerate, an early edit, a stopped prompt) the logits must
match those of a fresh engine that read the whole prompt from the start. It also renders the
real Qwen3.5 and Gemma 4 templates over their real vocabularies and streams replies through the
parser. Runs under AddressSanitizer and UBSan. CI runs it on every push.

It also splits the tiny models with a helper in a second process (the way the lending phone runs
it), over the loopback: the logits must be the same as on one machine, the words written the same,
and when the helper is killed mid-reply the next step must fail with the lost-phone message, not
end the program, and the model must load again on its own. `real.sh` does the same with real
models and prints how fast they write split and whole, and how long loading takes the first time
and with the helper's kept copy. On one desktop machine the split path itself cost about 0.1 ms a
word with a tiny model; between phones each word also waits for a few Wi-Fi round trips.

Measured in CI with half the layers on a helper over the loopback (both halves sharing one
machine's 4 cores, so this is the split's cost on a busy CPU, not two phones, where each half has
a phone to itself and the Wi-Fi adds a few milliseconds a round trip):

| Model, runner | Layers on the helper | Writing, alone / split | Reading, alone / split | Loading split, first / with the helper's copy |
|---|---|---|---|---|
| Qwen3.5 4B Q4_K_M, x86 | 17 of 33 | 8.6 / 8.0 tok/s | 24.2 / 25.2 tok/s | 6.8 s / 4.9 s |
| Qwen3.5 4B Q4_K_M, ARM | 17 of 33 | 8.9 / 5.8 tok/s | 38.3 / 16.8 tok/s | 5.5 s / 4.3 s |
| Gemma 4 E2B Q4_K_M, ARM | 18 of 35 | 15.3 / 9.1 tok/s | 47.0 / 23.6 tok/s | 3.6 s / 2.8 s |

Gemma wrote the same 48 words split as alone. Qwen3.5 parted ways after 26 (ARM) and 6 (x86): the
helper computes its layers with ggml's plain CPU kernels and this side with its repacked ones, the
same sums in another order, so a 4-bit model's numbers differ in the last bits and greedy writing
can take the other side of a near tie. The check is on the numbers, with the tolerance the other
real-model checks use.

It also checks drafting: with n-gram drafts and with an MTP head (a random model with one added
by the test), greedy replies must be the same tokens as without drafting. And exactly the same
again when the reply is replayed on the same engine without the drafter: the engine records each
writing step (how many tokens it read, how many stayed), and the replay starts from a snapshot of
the memory taken when the reply started and reads the same steps with the same kernels, so every
pick has to come out bit for bit the same. Anything a drafter leaves behind in the model's memory
shows up there, however small; differences between the kernels for steps of different sizes,
which make near ties flip against a baseline that reads one token at a time, cannot. And cutting a long
conversation: the cut stays put while the rest fits (the memory of the last turn is used again),
moves only every few turns, and lands where trying every place in turn would put it
(`test_engine <models> <llama.cpp> --cut <model.gguf>` runs just that). And reading ahead: on
the hybrid, sliding-window and plain models, the replies after reading ahead are the same tokens
as without it, the memory still matches a fresh read of the whole conversation, reading ahead
twice reads nothing new, writing the last reply again afterwards still works, and reading ahead
stopped part way leaves a working engine.

With real models (`real.sh`), the wait from pressing send to the first word of a follow-up, with
thinking on and a previous answer of about 150 tokens: Qwen3.5 0.8B 0.11 s with reading ahead
against 0.95 s without on GitHub's ARM runner; Qwen3.5 4B 0.49 s against 2.26 s and Gemma 4 E2B
0.14 s against 0.71 s on 4 x86 threads. The time saved grows with the length of the last answer,
and a phone reads more slowly than these machines, so there it is seconds per message. Models
that do not think (Llama 3.2 1B) save little: their last reply is already in memory as written.

`real.sh` also measures writing speed as a chat grows (`by tokens of conversation in memory`). On
the ARM runner: Llama 3.2 1B 40 tokens/s with 64 tokens in memory, 30 at 2048, 25 at 4096, 19 at
8192; Gemma 4 E2B 21, 17, 14, 12. Every written token reads the whole conversation memory, so this
is mostly memory bandwidth. An attention kernel that ran the look-back in vectorized passes
instead of one position at a time was tried: 4.6 times faster at 8192 tokens on x86, where ggml has
no native half-float arithmetic, but no faster on ARM, where it does (2.15 ms against ggml's 2.01
for one layer at 8192 tokens), so it is not in the app.

`tools/host-test/real.sh` runs real models, built without sanitizers, on an x86 and an ARM CI
runner: Qwen3.5 0.8B with its MTP head at 0-3 drafted tokens (same words, and how fast),
pictures and video frames through its projector, and both Bonsai models answering a question.
Also Spark-X2.6 1.7B answering, reading a long message and thinking (the thinking and the answer
must come apart; with a thinking budget of 8 tokens the thinking stops after 8 tokens, the line
that ends it follows, and the answer still comes, with no tags left in it), pictures and video
frames with Qwen3-VL 2B and LFM2.5-VL 3B, and LFM2.5-VL 3B with its DSpark drafter at 1, 3 and 7
drafted tokens (every word must be the model's own pick). DSpark wrote the same words but more
slowly: on the ARM runner 20.0 tokens/s without it, 13.2 with 1 drafted, 9.4 with 7; on this
repository's x86 test machine 12.2, 9.7 and 6.7. Fewer than half its guesses were kept, and for
this model a step that checks 2 tokens costs nearly twice one that writes 1. `test_engine` also
runs one model at a time: `--answer <model> <label>`, `--think <model> <label>`,
`--vision <model> <mmproj> <label>`, `--speed <model> <drafter or -> <label>`.
Every model added to the catalog was run that way on its real file before it went in; for the
latest, Nemotron 3.5 Bolt E4B (answers, reads a long message, thinks when a question needs it and
stops at its budget, pictures and video frames, its DFlash drafter writing the same words) and
Ornith 1.5 9B (the same, without a drafter). `OA_THINK_PROMPT` gives `--think` a harder question
for models that answer an easy one without thinking.
`--team <model> <partner or -> <label> [questions]` measures working together: short word
problems with one right number each, answered alone and by a team (the same model twice, or with
the partner), counting right final answers; every team reply must come back with a reply, its
separate answers in the fold, and stop cleanly part way. CI runs it for Qwen3.5 0.8B alone and
with LFM2.5 1.2B as its partner.
The speeds it prints are for those runners, not for a phone. From GitHub's ARM runner (4 server-class ARM
cores; tokens per second while writing, greedy, the same words in every column):

| Model | Plain | Copying, reply repeats a note | MTP / drafter, 1-3 words |
|---|---|---|---|
| Qwen3.5 0.8B Q4_K_M | 40 | 75 | 20-26 |
| Qwen3.5 4B Q4_K_M | 10.3 | 19.7 | 6.2-10.1 |
| Gemma 4 E2B Q4_K_M | 19.6 | 31.5 | 12.9-15.4 |
| Gemma 4 E2B QAT (the app's file) | 25.9 | | |
| Gemma 4 E4B QAT (the app's file) | 13.6 | | |
| LFM3 1.7B Q4_0 | 32.6 | | |
| Llama 3.2 1B Q4_K_M | 37 | 58 | - |
| Ternary Bonsai 2 9B Q2_0 | 6.0 (was 4.7 before this repository's kernels) | | |
| Bonsai 27B Q1_0, fast mode | 3.0 | | |
| Bonsai 27B Q1_0, low memory | 2.4 | | |
| Bonsai 27B Q1_0, low memory, only 3 GB of memory | 0.2 | | |

Google's QAT files are faster as well as smaller: Gemma 4 E2B reads a prompt at 160 tokens/s
against 80 for the Q4_K_M it replaced, because nearly all of it is Q4_0, which ggml repacks for the
CPU's int8 matrix instructions (E4B QAT 70, LFM3 1.7B 154). Arm's KleidiAI kernels were timed
against ggml's own on the same runner (`tools/host-test/bench_kleidiai.sh`): LFM3 wrote faster
with them (38.9 tokens/s against 32.6) but read slower (141 against 154), and the QAT Gemma files
were the same or slower, so they stay off.

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

- Never run on a real phone by its author: built and tested on desktop and in CI only.
- Sound input has not been tried with a real model yet (pictures and video frames have, in CI).
- Spark-X2.6's own DSpark drafters are not offered yet (llama.cpp b12670 can now run LFM3-VL, which
  the app offers).
- FLUX.2 klein and Z-Image have run on desktop and ARM server cores only, not on a phone.
- If Android closes the app anyway (it can, under memory pressure), the reply stops where it was;
  what was written is kept and marked as cut short.
- Making pictures has run on desktop and ARM CPUs (tools/image-test, the "images" CI run), not
  yet inside the app on a phone: memory use next to a loaded chat model is untested.
- Dictation and talking have only run where the emulator has no on-device speech recognizer, so
  the listening itself is untested; the order of a spoken conversation is tested on its own.
