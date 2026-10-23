Core DSP shared by the devices: FFT, STFT framework, peak-locked spectral pitch (SpecPitch), quantize snap, Smear,
Thin, Ring, Relay effects, OTT, limiter, smoothing helpers. JavaScript first (moved out of the prototype), then C++
compiled both for hardware and to WebAssembly for the web demos. See docs/HANDOFF.md §3–4.
