Build helpers and simple behaviour checks: a click detector on dial and fader sweeps, Prism transparency at minimum
settings, Relay exactly dry in its dead zone, Shuffler determinism, and a test that runs the web AudioWorklet source
with stubbed worklet globals (so a broken worklet build is caught). No sample-for-sample comparison with the prototype.

Run all checks with `npm test`. They live in `tools/checks/`:
- `relay-engine.test.js`: the bundled worklet runs every effect, recovers from non-finite output, is bit-exact in the
  dead zone, and Shuffler's patterns match the prototype.
- `relay-clicks.test.js`: the click detector (`click-metric.js`) on fader sweeps, dial sweeps and stepped settings.
- `relay-control.test.js`: Relay's key grammar and randomize rules.
- `moment-engine.test.js`: the bundled Moment worklet runs every feature, recovers, adds no delay (bit-exact until
  something is frozen), holds the sound when frozen, locks clocked loops to the note length, plays Direction 0
  backwards, only re-captures in Rolling while frozen (seamlessly), reads earlier audio with Position, and repitches.
- `moment-clicks.test.js`: the click detector on Moment's encoder sweeps, CV-style steps and key actions while frozen.
- `panel-control.test.js`: the Moment / Prism key grammar, Random's rule, and Moment's Freeze key.
- `modulation.test.js`: the bench's Euclidean rhythms, rhythm triggers, LFO and clocked S&H.
`worklet-build.js` bundles a device's worklet entry into one string (and is the Vite plugin the demos use).
