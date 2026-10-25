Control logic shared by the devices: key grammar (Shift / Random / Bypass, combos, act-on-release rules), encoder layers,
Random membership, ranges, Deviation (Window / Distinct) and Glide, CV assignment mode, settings mode, persistence.
Spec: docs/design-language.md.

Contents: `params.js` (knob position ↔ value mapping, formatters), `tweens.js` (UI glides), `persist.js` (guarded
localStorage), `panel-keys.js` (Moment / Prism key grammar), `random-pick.js` (Random's Deviation window rule),
`panel-descs.js` (encoder and button descriptors, Glide lists), `modulation.js` (test bench LFO, clocked S&H, rhythm
generator). Relay's own key grammar and randomize rules are in `devices/relay/control/`.
