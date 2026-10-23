# Relay: device notes

Relay exists as a 16HP Eurorack module and as a desktop pyramid. They share one engine and one control layer; only the
shell, display mounting and I/O differ. The spec is `SPEC.md` here; the shared grammar is `docs/design-language.md`.

**Priority: the standalone web demo** in `web-demo/`, to share with partners. It contains:
- the Relay module;
- the desktop pyramid;
- a small test bench: sources, play / stop, volume, master clock.

It builds to one self-contained HTML file.

**Watch for:**
- Keys act on release (the prototype acts on press; this is a decided change).
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
