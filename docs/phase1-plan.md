# Phase 1 plan: split the prototype, Relay web demo first

Working plan for Phase 1 (see `HANDOFF.md` §3). Update it as steps land.

## Decisions taken with the designer (2026-10-23)
- **Relay menu timing.** Shift + Bypass opens the menu when Bypass goes **down** (an intended exception to
  act-on-release); the Bypass release that follows does nothing. Every other Relay key acts on release, and a key
  released after a Shift combination does not also do its own action.
- **Relay demo test bench.** Sources (generated Drums, Ambient bells, Acid bass, Synth pad), play / stop, volume,
  master clock (with "patched to Relay"), and the Relay effects list readout. No mic, no file input, no LFOs, gate or
  cables, no fader spring-back. Relay's CV jacks have nothing to receive in this demo.
- **Font.** Barlow Semi Condensed is embedded in the built file (Latin subset, weights in use; SIL Open Font
  Licence), with a system condensed fallback.
- **Checkpoint.** Stop after the Relay demo for a listening review before Moment and Prism.

## Build setup
- One root `package.json`. Vite with `vite-plugin-singlefile` builds each `devices/<device>/web-demo/` into one HTML
  file. Vitest runs the behaviour checks in `tools/`.
- Plain JavaScript ES modules, no UI framework (the prototype's UI is direct DOM code).
- **Worklet.** A worklet entry per device imports its engine and the shared DSP; it is bundled into one string and
  embedded in the page, then loaded through a Blob URL. The ScriptProcessor fallback imports the same classes
  directly. DSP code still keeps everything inside class bodies (portability to C++), and tests run the built worklet
  string with the worklet globals stubbed.

## Module split
| Folder | Contents |
|---|---|
| `shared/dsp/` | FFT, Stft, SpecPitch, quantize snap, Biquad, the Relay effects (incl. Smear, Thin, Ring, Shuffler), OTT |
| `shared/control/` | Key handling, persistence, tweens and glide |
| `shared/ui-web/` | Knob with LED ring, keys, fader, dial with round screen, fluid visualizer (WebGL2 + 2D fallback), pyramid renderer, bench pieces, generated sources |
| `shared/design/` | Colour, size and label tokens as CSS variables; embedded font |
| `devices/relay/` | Relay engine (slots, mix, OTT, bypass, limiter, safety net) and worklet entry, Relay control (randomize and range rules, dial, screen menu, save/load, CV menu), `web-demo/` |
| `tools/` | Behaviour checks |

## Behaviour checks
1. Worklet: run the built worklet string with stubbed globals and every effect engaged; output finite and not silent.
2. Relay dead zone: fader in the first 3% gives the input exactly, delayed only by the limiter.
3. Shuffler determinism: `pats()` equals the frozen prototype's `pats()` (read from the prototype file).
4. Click detector: fast fader and dial sweeps, stepped changes, unchanged stepped re-sends (must not duck).
5. Randomize rules over many rolls: at least three effects, Buffer never last, Shuffler first or second, Drive about
   half as often, range rules.

## Steps
1. Build setup and tests (worklet, dead zone, Shuffler) against the extracted code.
2. Extract the DSP and the Relay engine; checks pass.
3. Extract control and UI; build the Relay page (module, pyramid, bench).
4. Keys act on release (menu on Bypass down); update the spec and the combinations card.
5. Click detector, measurements, single-file build, hand to the designer.
6. Moment and Prism, after the review.
