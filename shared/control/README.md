Control logic shared by the devices: key grammar (Shift / Random / Bypass, combos, act-on-release rules), encoder layers,
Random membership, ranges, Deviation (Window / Distinct) and Glide, CV assignment mode, settings mode, persistence.
Spec: docs/design-language.md.

Contents: `params.js` (knob position ↔ value mapping, formatters), `tweens.js` (UI glides), `persist.js` (guarded
localStorage). Relay's own key grammar and randomize rules are in `devices/relay/control/`.
