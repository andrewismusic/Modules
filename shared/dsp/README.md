Core DSP shared by the devices: FFT, STFT framework, peak-locked spectral pitch (SpecPitch), quantize snap, Smear,
Thin, Ring, Relay effects, OTT, limiter, smoothing helpers. JavaScript first (moved out of the prototype), then C++
compiled both for hardware and to WebAssembly for the web demos. See docs/HANDOFF.md §3–4.

Contents (JavaScript, moved verbatim from the v30 prototype): `fft.js`, `biquad.js`, `stft.js`, `spec-pitch.js`,
`ott.js`, `freezer.js` (Moment's spectral / loop freezer), `spread.js` (stereo spread helpers), and `effects/` (the 17 Relay effects, including Smear, Thin and Ring, which Prism will also use).
Everything stays inside class bodies; device worklets are bundled from these modules by `tools/worklet-build.js`.
