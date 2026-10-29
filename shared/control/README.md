Control logic shared by the devices: key grammar (Shift / Random / Bypass, combos, act-on-release rules), encoder layers,
Random membership, ranges around the hand-set value and Random glide, CV assignment mode, settings, persistence.
Spec: docs/design-language.md.

Contents: `params.js` (knob position ↔ value mapping, formatters), `tweens.js` (UI glides), `persist.js` (guarded
localStorage), `panel-keys.js` (Moment / Prism key grammar), `random-pick.js` (Random's ranges around the hand-set value),
`panel-descs.js` (encoder and button descriptors, Glide lists), `modulation.js` (test bench LFO, clocked S&H, rhythm
generator). Relay's own key grammar and randomize rules are in `devices/relay/control/`.
