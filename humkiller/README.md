# HumKiller

A macOS app that cancels steady hum (fridge, AC, fan whine, mains buzz) in headphones that don't
have ANC, such as the Skullcandy Hesh Evo and Crusher Evo. It plays phase-inverted tones at the
hum's frequency and its overtones, and keeps them lined up with the hum.

| | |
|---|---|
| Platform | macOS 13+, Apple Silicon or Intel (built for an M3 MacBook Air) |
| Languages | Swift 5 / SwiftUI (UI), C++17 (DSP and audio) |
| Audio | [miniaudio](https://miniaud.io) 0.11.22 on CoreAudio, vendored in `core/miniaudio` |
| Needs | Xcode Command Line Tools (`xcode-select --install`); Xcode itself isn't needed |

## What it can and can't do

It works on **steady tones**: hum, drone, whine, anything you could hum along to. Tones repeat,
so they can be predicted, and the few milliseconds of delay through macOS only shift a phase
that the app corrects for.

It **can't** do broadband ANC (voices, traffic, keyboards). For that, the anti-noise has to reach
your ear within about 50 µs of the noise, which is why real ANC runs on a chip inside the earcup.
A Mac adds 3–5 ms over a wired connection and 150–300 ms over Bluetooth.

## Headphone setup (Hesh Evo / Crusher Evo)

1. **Use the aux cable** in the Mac's headphone jack. The app warns you if the output is
   Bluetooth, because Bluetooth delay drifts too much for the tones to stay lined up.
2. Crusher Evo: put the **Sensory Bass slider all the way down**. The haptic driver adds its own
   low end, and the cancelling ends up fighting it.
3. Set the Mac's volume where you'd normally listen, before tuning.

## Build and run

```sh
cd humkiller
./build.sh run
```

This builds `build/HumKiller.app` and opens it. The first build compiles miniaudio (~20 s).
macOS asks for microphone access the first time. Without it, only Manual mode works.

## Modes

**Lock** (default, no extra hardware). The Mac's mic listens to the room, and a phase-locked loop
keeps the tones locked to the hum as the mains frequency wanders.
1. Pick *External Headphones* and the MacBook mic, then press **Find hum**. It listens for about
   a second, sets the frequency and turns on the overtones it heard.
2. Press **Start**. Raise tone 1's level until it changes how the hum sounds.
3. Sweep **Phase** until the hum dips, then fine-tune level and phase in turn with the steppers.
   Do the same for each overtone.
4. The tuning holds while you and the laptop stay put. If you move the laptop or turn your head
   a lot, nudge the phase again.

**Auto ANC** (needs a mic inside one earcup). Fully automatic adaptive cancelling.
- Mic: a cheap 3.5 mm lavalier through a TRRS headset splitter in the jack (the splitter takes the
  headphones too), or a USB-C lav mic. Tuck it inside the earcup pad, near your ear canal.
- Find the hum in Lock mode first, switch to Auto ANC, then press **Start**. You'll hear a short
  tone while it measures the path from the headphones to the mic. After that it adapts on its own
  and shows how many dB each tone is reduced at your ear.
- It keeps re-measuring that path, so it copes with volume changes, the cups shifting and a USB
  mic running on its own clock. If something changes a lot it re-measures automatically, and
  **Re-measure** forces it.

**Manual** (no mic). Free-running tones at the frequency you type in. Mains hum drifts by a few
hundredths of a hertz, so a perfect tuning slides out of line within seconds. Manual exists so you
can hear the tones without the mic.

## How it works

- **Output**: four harmonics of the fundamental, each with a complex weight (level and phase),
  smoothed per sample so changes never click. The output is capped at −20 dBFS per tone.
- **Input**: for each harmonic, a lock-in detector over a whole number of cycles (≥ 80 ms). Two
  more detectors, three DFT bins either side, measure the noise floor next to each tone.
- **Lock**: a type-2 PLL on the lowest enabled harmonic. Its target phase is kept across
  dropouts, so the alignment you tuned comes back when the hum does.
- **Auto ANC**: per-harmonic narrowband LMS in the phasor domain, `W ← W − μ·E/Ŝ`.
  - Ŝ (headphone → mic) is first measured with ± probe tones, which step up automatically until
    the mic hears them.
  - After that, Ŝ is tracked from every change in what's played. A ±5 % wobble guarantees there's
    always a change to learn from, at the cost of a −26 dB floor.
  - A watchdog re-measures if the residual ever gets louder than the uncancelled hum.
- **Hum finder**: a 65,536-point Hann-windowed FFT and a harmonic-sum search over 30–1200 Hz,
  refined with parabolic interpolation on the strongest harmonic.

## Test bench

`sim/sim.cpp` runs the real DSP core against a simulated room, headphones and mics: mismatched
callback sizes, 12 ms output and 5 ms input latency, broadband noise, and mains hum wandering
±0.01 Hz.

```sh
./build.sh sim
```

Current results:

| Scenario | Result |
|---|---|
| Auto ANC, same clock | mean −23.5 dB over 60/120/180 Hz |
| Auto ANC with 50 ppm clock drift, volume halved, cups shifted | recovers, mean −24.6 dB |
| Lock, tuned once, held 60 s | −23 to −47 dB throughout |
| Manual, same tuning | +6 dB (louder) within 10 s, which is why Lock exists |
| Hum finder | 60 Hz mains, 120 Hz transformer hum, 237 Hz fan whine all found; pure noise reports nothing |
| Mic outside the cup | fails with "the mic can't hear the headphones" and goes silent |

## Files

```
app/HumKiller.swift   SwiftUI app
app/Info.plist        bundle info, mic usage text
core/hk_core.h        C API shared by everything
core/hk_core.cpp      DSP: tones, lock-in, PLL, ANC, hum finder
core/hk_audio.cpp     miniaudio devices, CoreAudio transport/clock lookups
core/ma_config.h      miniaudio options
core/miniaudio/       miniaudio 0.11.22 (public domain / MIT-0)
sim/sim.cpp           offline test bench
build.sh              build script
```
