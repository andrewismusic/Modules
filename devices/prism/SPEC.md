<!-- Carried over from the prototype's embedded summary (v30). This file is now the source of truth; keep it current. -->

# Prism: spec

## PRISM (spectral processor, 20HP) — latency = analysis size (dry path is never delayed, so in parallel it acts
## as pre-delay). At minimum settings it is bit-transparent apart from that delay (measured about −148 dB).
- Jacks: In L/R, Out L/R; CV 1–4, Random. Keys: Shift, Order (Shift: Res), Random, Bypass. (A trigger /
  sample-and-hold input was tried and removed.)
- Defaults: Time 0, Thin 0, Ring 0, Dry/wet 100%, Glide 0, Deviation 80%. Included in Random by default: Time, Drift,
  Thin, Keep, Stability, Threshold, Order, Res (nothing else).
- Layout (5 columns; each effect's encoders in its row, the three Pitch encoders aligned; section titles with their
  three order lights over the effects): Smear Time · tilt, Drift · blur, Pitch · quant, Scale · root, Glide /
  Thin · tilt, Keep · stability, Pitch · quant, Shimmer · interval, Deviation / Ring · tilt, Thresh, Pitch · quant,
  blank, Dry/wet. (A Voices · glide control for Ring was tried and removed; the engine keeps it at All.)
- Quantize (Scale · root; Scale Off, Chromatic, Major, Minor, Major pentatonic, Minor pentatonic, Whole tone, Root and
  fifth; root C–B): every frequency that Smear, Thin and Ring generate is moved to the nearest note of the scale (each
  spectral peak moved as a whole, after Pitch; partials landing on the same note merge at reduced level). It only
  acts where a section is active, so at minimum settings Prism stays dry.
- Order key: six orders of Smear, Thin and Ring (S→T→R, S→R→T, T→S→R, T→R→S, R→S→T, R→T→S). The three lights beside
  each section title show its position (1, 2 or 3 lit) in the resolution color; the Order key's light shows the
  resolution.
- Resolution (Shift + Order; one setting for all of Prism; changes crossfade): 256 (red, ~5 ms), 512 (orange, ~11 ms),
  1024 (yellow, ~21 ms, default), 2048 (mint, ~43 ms), 4096 (blue, ~85 ms). (Per-section resolution was tried and
  removed; the engine can still split sections into separate analysis stages if ever needed.)
- Smear: Time · tilt (0 = off; "swell" power averaging, keeps input phase → diffuse wash; Tilt makes highs or lows
  smear longer), Drift · blur (Drift: every smeared frequency gets its own slowly wandering detune, a chorused wash;
  Blur: smooths the smeared spectrum across neighbouring frequencies so tones melt toward noise), Pitch · quant (±12 st;
  shifts the spectrum Smear generates). Near Time 0 Smear fades quickly to a fully dry pass. (Smear shimmer was tried
  and removed.)
- Thin: Thin · tilt (Tilt biases which frequencies survive, toward highs or lows), Shimmer · interval (experimental:
  the thinned partials feed a decaying echo that is shifted by the interval, ±12 st in semitones, on every pass, so
  they climb or fall; fades in with Thin), Keep · stability (Keep ranks bins within 50 dB of the frame peak; makeup ~86%; stability = mask
  smoothing 5 ms – 2 s), Pitch · quant (±12 st; shifts the thinned spectrum Thin generates, so a following Ring
  follows it; near Thin 0 it fades quickly to a fully dry pass).
- Ring: Ring · tilt (0–10 s sustain; Tilt makes highs or lows ring longer, steepening at the ends; past 50% it adds
  2x/3x/4x harmonics or an octave-down subharmonic), Thresh (reversed: clockwise lowers 0 → −90 dB, more ringing),
  Pitch · quant (shifts the whole set of rings, ±12 st). (A Voices · glide limit was tried and removed; the engine
  still contains it, fixed at All.)
  Ring is its own stage (FxRing) and seeds from whatever reaches it. Ring DSP: bins crossing the threshold are captured with their measured frequency; each keeps the
  decay it was born with (turning Ring/Tilt down never cuts tails); phases are unwrapped and every bin advances at the
  frequency of the peak it belongs to (identity phase locking → coherent, smooth tones). Shifts and harmonics move
  whole peaks (shape + phase offsets) with their own accumulators. Spectral pitch shifting uses the same peak-locked
  method (SpecPitch), level-matched per frame, right channel phase-linked to the left to keep the image.

## (Prism B, an experimental second Prism whose Smear and Ring were combined into one Sustain stage with Thresh, Swell,
## Tone · drift, was tried and removed.)
