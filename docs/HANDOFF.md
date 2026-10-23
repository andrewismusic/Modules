# Handoff: Moment, Prism and Relay product line

This document hands the project from the browser prototype (built in a Claude chat, v30) to a single repository
worked on in Claude Code. Read it first, then `CLAUDE.md` at the repository root, then the spec for the device you
are working on.

## 1. What exists today

**The prototype.** One self-contained page, `prototype/moment-prism-relay-v30.html`. It holds three Eurorack modules,
a desktop version of Relay, and a test bench, all playable in the browser.

| Device | What it is | Key facts |
|---|---|---|
| **Moment** | Freezer, 16HP | Spectral or loop freeze; no added latency |
| **Prism** | Spectral processor, 20HP | Smear, Thin and Ring in any of six orders; latency is the analysis size, from 5 to 85 ms |
| **Relay** | Macro multi-effect, 16HP | Four randomized effect slots across one fader, a deviation dial, and a round screen with a fluid visualizer |
| **Relay desktop** | Concept, a triangular pyramid | Same engine and controls as the Relay module, with 1/4-inch jacks and an expression input |

**How the prototype is built.**
- **DSP:** plain, sample-by-sample JavaScript classes, written to port line by line to C++.
- **Engine:** runs as an AudioWorklet built from those classes' source text, with a ScriptProcessor fallback.
- **UI:** in the same file.
- **Test bench (not hardware):** generated audio sources, a master clock, three LFOs, a gate with sample and hold,
  and click-to-patch cables.

The prototype is the reference for **behaviour and sound**: every behaviour in the spec files is implemented and
playable there. When in doubt about what something should do or sound like, run the prototype and compare by ear.
The new code does **not** need to match it sample for sample; it needs to create the same effects.

## 2. Repository layout (one repository for the whole product line)

```
/
├── README.md                     what this is, how to run the demos
├── CLAUDE.md                     standing instructions for Claude Code (read every session)
├── docs/
│   ├── HANDOFF.md                this file
│   ├── design-language.md        panels, colours, key grammar, Random, CV: shared by every device
│   └── decisions.md              what was tried and removed, and why (do not re-propose these)
├── prototype/
│   ├── moment-prism-relay-v30.html   the behaviour reference prototype (frozen; never edit)
│   └── NOTES.md                  how the prototype is built, its test bench, testing lessons
├── shared/
│   ├── dsp/                      core DSP used by more than one device (FFT, STFT, spectral pitch, smoothing, limiter, effects)
│   ├── control/                  control logic: key grammar, Random / Deviation / Glide, CV assignment, persistence
│   ├── ui-web/                   web components for demo pages: keys, LED-ring encoders, jacks, fader, dial + screen, fluid visualizer
│   └── design/                   design tokens (colours, sizes, label styles) used by web UI and panel artwork
├── devices/
│   ├── relay/                    SPEC.md, CLAUDE.md, web-demo/, later firmware/ and plugin/ (module and desktop share this folder)
│   ├── moment/                   SPEC.md, CLAUDE.md, web-demo/, later firmware/ and plugin/
│   └── prism/                    SPEC.md, CLAUDE.md, web-demo/, later firmware/ and plugin/
└── tools/                        build helpers and checks (clicks, transparency, determinism)
```

**Why one repository rather than two projects.**
- The modules share a DSP core: Prism's Smear, Thin and Ring are also Relay effects, and Moment's freezer uses the
  same STFT and pitch code.
- They share a control grammar: Shift, Random, Bypass, Deviation and Glide.
- They share a visual language.

In two projects those parts would be copied and would drift apart, and the consistency is what makes this a product
line. Claude Code can still work on one device at a time: each device folder has its own `CLAUDE.md`, and a session
can be started inside it.

**Relay module and Relay desktop** live together in `devices/relay/`. They run the same engine and the same control
logic; only the hardware shell and the I/O differ.

## 3. Plan of work

### Phase 1: split the prototype into modules and ship per-device demos
1. Move the JavaScript into ES modules: `shared/dsp`, `shared/control`, `shared/ui-web`, and per-device engine and
   UI code.
2. Keep the behaviour and sound the same as the prototype (checked by ear and by the behaviour checks in §4; no
   sample-for-sample matching).
3. Apply the key-grammar decisions in §5 (Relay's keys act on release).
4. Build each device's `web-demo/` into a **single self-contained HTML file**, for example with Vite and a
   single-file plugin. Each demo can then be shared as one link.
5. **Relay's demo comes first.** It is the one to show partners: the Relay module, the desktop pyramid, and a small
   test bench (sources, play, clock). No Moment or Prism.
6. The AudioWorklet still has to be built from a self-contained source; see the worklet rule in `CLAUDE.md`.

### Phase 2: port the DSP to C++
1. Port `shared/dsp` and each device engine to C++. Keep the same class structure and per-sample processing.
2. Compile the C++ to WebAssembly and run it inside the web demos, so the demos and the hardware run the same code.
3. Each C++ effect must create the same effect as the JavaScript one: compare by ear in the demos and keep the
   behaviour checks in §4 passing. Exact sample matching is not required. Note any intentional differences in the
   device's spec.

### Phase 3: hardware
Open decisions, for the designer:
- DSP or microcontroller platform. The spectral processing in Prism, and in Relay's Smear and Thin, needs real
  floating-point headroom: several 1–4k FFTs per channel.
- Display and visualizer for Relay. The browser visualizer is a WebGL fluid simulation and will need a cheaper
  version on a microcontroller-driven round display.
- Encoder, key and LED parts as listed in `docs/design-language.md`. CV input ranges.
- Relay desktop: power, 1/4-inch audio I/O levels, expression pedal type.

### Phase 4: plugins
- Plugins (JUCE) are planned from the shared C++ core.
- Each plugin mirrors its own module; plugins do not combine modules.
- A Moment plugin was the first one discussed.

## 4. Engineering lessons from the prototype (do not relearn these)

**AudioWorklet source.**
- The worklet is built from class source text. Anything defined outside a class body is lost: static assignments,
  `Class.prototype.x = …`, free helper functions not listed in `DSP_CLASSES`. Losing one silently breaks all audio;
  this happened twice.
- Keep everything inside class bodies, and use static methods for shared tables (for example `FxShuffle.pats()`).
- Always test the worklet source itself.

**Safety net.** If a non-finite sample reaches the output, the engine rebuilds its state and the UI re-sends all
settings. Keep this.

**Click control.** The designer listens closely for clicks and crackle. These rules exist because each one fixed an
audible problem:
- The Relay fader is smoothed in two stages. Each slot's position on the fader is smoothed over 8 ms. Effects fade
  in over the first 6% of their range, so the fader's dead zone (first 3%) is exactly dry.
- A stepped setting (delay division, filter mode) switches inside a 6 ms duck of its slot. **A stepped setting that
  is re-sent unchanged must never duck.** Re-sending unchanged settings every frame caused the v29 dial crackle.
- Continuous parameter moves (dial, glides) step every 16 samples, never once per block.
- Effect swaps crossfade over 40 ms. Buffer length and chunk changes crossfade over 6 ms. Shuffler slice edges
  crossfade over 4 ms.
- Reverb pre-delay and Buffer grain size glide instead of jumping.
- OTT is a true bypass at 0. A 2 ms look-ahead limiter (ceiling 0.8) protects Relay's output.

**Transparency.** At minimum settings Prism measured bit-transparent apart from its analysis delay (about −148 dB).
Relay in its dead zone is exactly dry. Keep both as simple behaviour checks.

**Determinism.**
- Shuffler's 332 patterns come from a fixed, seeded generator. The same Pattern value must always give the same
  pattern, so freeze the generator and only ever append to it.
- The same applies to any future preset or seed feature.

**State.** The prototype saves to localStorage under a versioned key. Bump the version whenever the state shape
changes.

## 5. Key-grammar decisions (resolved)

**Press vs release.** All keys on every device act on **release**, including Relay's Random 1, Random 2 and Bypass.
(The v30 prototype still acts on press for Relay's keys; change this in the new code.) On Relay, a key released after
being used in a Shift combination does not also do its own action.

**Opening settings.** Different on purpose, and staying that way. On Relay, Shift + Bypass opens the screen menu
immediately. On Moment and Prism, which have no screen, Shift + Bypass must be held for 3 s to enter settings mode.

**Relay CV.** Relay has no Random-membership or CV-assignment gestures; its CV is configured in the screen menu.

## 6. Decisions already made: see `docs/decisions.md`

That file lists ideas that were tried and removed, or considered and rejected, with the reason for each. Do not
re-propose them without new information. The most recent:
- **Rejected:** a latching / momentary Shift. Its confusion and edge cases outweigh the benefit.
- **Shelved:** typed numeric presets.

## 7. Working with the designer

- **What they want.** Builds they can play and hear. Clear, plain explanations. A question when an instruction is
  ambiguous, rather than a guess.
- **Specs stay current.** Every change to behaviour, layout or naming updates the matching spec file in the same
  change.
- **Checking work.** Measure what can be measured (clicks, latency, transparency, layout alignment) before saying
  something is fixed. No sample-for-sample comparison with the prototype is wanted.

## 8. Getting started in Claude Code (first session)

1. The repository already contains everything in the layout above: docs, specs, decisions, and the prototype.
2. First prompt to Claude Code, for example: "Read docs/HANDOFF.md and CLAUDE.md, then plan Phase 1 starting with the
   Relay web demo. Ask me anything that's unclear before building."
3. Claude Code should propose the build setup (for example Vite with a single-file output) and the module split
   before moving code.
