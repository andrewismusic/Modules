# Decisions: tried and removed, or considered and rejected

Do not re-propose these without new information. Add to this list whenever something is removed or rejected.

## Rejected or shelved (not built)
- **Latching / momentary Shift.** A tap would latch Shift, or use it once with a double-tap to lock; holding it would
  be momentary. Rejected: it causes confusion and edge cases with combos (Shift + double-tap Random or Bypass,
  Shift + Freeze, Relay menu "back") that aren't worth it. Shift stays a plain held modifier.
- **Typed numeric presets.** A chain index (61,650 Relay chains with current rules) plus a seed for settings and
  dial map. Shelved. Known problems if revived:
  - Partial re-rolls (Deviation below 100%) have no single number.
  - Numbers would be tied to the exact effect list and generator, which would then need to be frozen and versioned.

## Tried and removed
- **Prism B.** An experimental Prism whose Smear and Ring were combined into one Sustain stage with Thresh, Swell,
  Tone · drift. Removed; the three-stage Prism (Smear, Thin, Ring, one resolution) was kept.
- **Ring Voices · glide.** A limit on the number of ringing tones, with gliding voice stealing. Removed from the
  panel; it silenced audio in some settings. The engine still contains it, fixed at All.
- **Per-section resolution in Prism.** Removed; one resolution for all of Prism. The engine can still split sections
  into separate analysis stages if ever needed.
- **Trigger / sample-and-hold input on Prism.** Removed.
- **Smear shimmer.** It sounded bad; Blur was kept. Thin got its own shimmer, with an interval, instead.
- **Stereo spread controls.** Removed from the panels.
- **Breathing LEDs to show Random membership.** Hard to read values. Replaced by showing membership only while
  Random is held for 0.25 s.
- **Amber "anchor" LED on encoders.** Dropped.
- **Momentary Relay bypass on hold.** Removed; Bypass is a toggle.
- **Moment Swell / Sustain shapes.** Removed.
- **A generated "song with vocals" demo source.** Removed.
- **Relay save/load buttons, extra jacks (rnd1, rnd2, bypass, ott, mix, tempo), Random-amount and Glide knobs, OTT
  switches.** Replaced by the screen menu and the Shift + key combinations.
- **"Drawn to scale" captions, panel section titles, key underlines.** Removed for a cleaner panel.
- **The Relay desktop's printed name, and the page title and caption above it.** Removed.
