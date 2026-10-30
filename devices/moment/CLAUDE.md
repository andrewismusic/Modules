# Moment: device notes

16HP freezer. The spec is `SPEC.md` here; the shared grammar is `docs/design-language.md`.

**Shared with Prism:**
- the panel frame and jack grid;
- the encoder and key scheme;
- Random (on or off per parameter, full throw) and Random glide;
- CV assignment and settings mode.

In the prototype these come from one implementation, `makePanelModule`. Keep them in `shared/control` and
`shared/ui-web`.

**Code:**
- Engine: `engine/moment-engine.js` (the shared `shared/dsp/freezer.js`, bypass, soft clip, safety net) and
  `engine/worklet.js`.
- Controls: `control/moment-defs.js` (descriptors, layout, Random defaults, settings) and `control/freeze-key.js`.
- Panel: `shared/ui-web/panel-module.js`, with the key grammar in `shared/control/panel-keys.js` and Random's choice
  rule in `shared/control/random-pick.js`. Prism will use the same.
- Demo: `web-demo/` (bench modulation from `shared/control/modulation.js` and `shared/ui-web/mod-bench.js`).
- Checks: `tools/checks/moment-engine.test.js`, `moment-clicks.test.js`, `panel-control.test.js`, `modulation.test.js`.
- No Deviation, ranges or settings page; `shared/control/panel-descs.js` keeps the Glide list.

**Watch for:**
- No spectral analysis in the main path: Moment adds essentially zero latency, and must keep that.
- Direction and Stretch / Repitch apply only in Loop mode.
- Rolling is a property of the freeze: it never starts or stops one. Its handover must stay seamless (checked).
- Position re-reads each capture live; keep its moves crossfaded (loops) or frame-aligned (spectral).
- A Moment plugin is the first plugin candidate. It mirrors the module only.
