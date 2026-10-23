# Relay: device notes

Relay exists as a 16HP Eurorack module and as a desktop pyramid. They share one engine and one control layer; only the
shell, display mounting and I/O differ. The spec is `SPEC.md` here; the shared grammar is `docs/design-language.md`.

**Priority: the standalone web demo** in `web-demo/`, to share with partners. It contains:
- the Relay module;
- the desktop pyramid;
- a small test bench: generated sources, play / stop, volume, master clock, and the list of Relay's current effects.
  No mic or file input, no LFOs or cables (decided 2026-10-23).

It builds to one self-contained HTML file.

**Watch for:**
- Keys act on release (the prototype acts on press; this is a decided change), except Shift + Bypass, which opens the
  menu on press. The grammar is in `control/keys.js` and checked in `tools/checks/relay-control.test.js`.
- Dial and fader sweeps must stay click-free. See the click-control rules in `docs/HANDOFF.md` §4.
- Randomization rules:
  - at least three effects remain;
  - Buffer is never last;
  - Shuffler is always first or second in the chain;
  - Drive comes up half as often;
  - range rules hold.
- Shuffler's pattern table is frozen: only ever append to it.
- The visualizer is a WebGL2 fluid simulation with a 2D fallback. The hardware version will need a cheaper rendition
  (an open question for Phase 3).
