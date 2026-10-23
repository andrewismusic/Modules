# Prism: device notes

20HP spectral processor. The spec is `SPEC.md` here; the shared grammar is `docs/design-language.md`.

**Shared code:**
- Smear, Thin and Ring use the same DSP classes as Relay's Spectral smear and Spectral thin effects.
- Keep them in `shared/dsp`.

**Watch for:**
- At minimum settings Prism must stay transparent apart from its analysis delay (measured about −148 dB). Keep a
  simple check for it.
- The dry path is never delayed.
- Changes of resolution or order crossfade.
- Ring keeps each partial's birth decay (unless the "follow knobs live" setting is on), with identity phase locking.
- Quantize moves whole spectral peaks after Pitch.
