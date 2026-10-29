<!-- Carried over from the prototype's embedded summary (v30). This file is now the source of truth; keep it current. -->

# Moment: spec

## MOMENT (freezer, 16HP) — essentially zero added latency (no spectral analysis in the path)
Reworked with the designer on 2026-10-28 (fewer combinations, Position, Tone, freeze switches).
- Jacks: row 1 In L, In R, Clock, Freeze, Out L, Out R; row 2 CV 1, CV 2, CV 3, Latch / Mom switch (under the Freeze
  jack), Man / Roll switch (under Out L), Random (trigger). (CV 4 was removed to make room.)
- Layout (no section titles):
  - Top row: Spec · Loop lit button, Direction / Thin (follows the mode; a printed line joins it to the button),
    Tone, Pitch · quant.
  - Bottom row: Length · fade, Position, Random glide (printed in amber; a printed line joins it to the Random key),
    Dry/wet.
  - Keys: Shift, Freeze, Random, Bypass. Shift legends under the keys: Shift, Recapture, (none), Setup.
- Freeze key (acts on press): what it does depends on the Latch / Mom switch.
  - Latch: tap = freeze on / off. Shift + Freeze = fresh capture (a new freeze, staying frozen).
  - Mom: frozen while held; every press is a fresh capture. Shift + Freeze does the same. Flipping the switch to
    Latch while holding keeps the freeze on.
  - Random + Freeze = let Random also freeze, re-capture or release (Latch only; 90% chance per press; off by
    default); while Random is held the Freeze light shows amber if that is on, and while frozen it breathes toward amber.
  - Freeze light: steady blue when frozen in Manual, pulsing when frozen in Rolling, off when not frozen.
  - The Freeze jack follows the switch: in Latch a trigger toggles the freeze; in Mom it is a gate (frozen while high).
    A CV jack assigned to the Freeze key does the same.
- Man / Roll switch: never starts or stops a freeze. While frozen in Rolling the freeze re-captures every loop length;
  switching an active freeze to Rolling starts that, switching back to Manual holds the last capture.
- Spec · Loop (lit button, violet / teal): the freeze type; switching crossfades. Assignable to Random.
- Direction / Thin follows Spec · Loop (printed Direction in teal over Thin in violet; its ring takes the mode color):
  - Loop: Direction = chance a loop pass plays forward. Each pass's direction is chosen just before it starts, so
    turning Direction never flips a pass already playing; a pass into a forward pass joins it seamlessly, and a pass
    into a reverse pass fades out while the reverse pass fades in.
  - Spectral: Thin = spectral thinning: keeps only the loudest bins, from Off to a few sharp partials, level-matched.
- Tone (both modes): a tilt EQ on the frozen sound pivoting near 700 Hz, up to ±9 dB at each end; smoothed.
- Pitch · quant: ±24 st.
- Length · fade: Length changes playback in real time with a crossfade; Fade (second layer) is read when a capture
  starts, so CV on Fade affects new captures.
- Position: how far back in the captured audio the freeze reads, live: 0 (now) to 5 s back (in 1/16 notes when
  clocked). Moving it while frozen scrubs through the capture: loops crossfade to the new place over 15 ms, and the
  spectral freeze re-measures its spectrum there at the next frame. It is limited by what each capture holds (6.3 s).
- Random glide: how long Random's changes take (see `docs/design-language.md`).
- Dry/wet: smoothed over 10 ms, so CV and Random never click it.
- Random membership by default: Dry/wet, Length, Direction. Ranges start full.
- Settings page (Shift + Bypass): each parameter's random range type, unipolar or bipolar.
- Clock unpatched: ms values; patched: note values, loops lock to the grid.

## Web demo (`web-demo/moment.html`)
- Moment on its own, with the test bench at the top: sources, play / stop, volume, master clock ("Patched to Moment",
  or click the Clock jack), modulation, the readout, reset; the button combinations card at the bottom.
- Modulation (not hardware): one LFO (Sine, Triangle, Ramp up, Ramp down, Square, Smooth random; Sync in note values
  or Free in Hz; Depth) with a clocked S&H mode (a new random value on every step of the master clock, held until the
  next; rate 4 bars to 1/32), and a rhythm generator (Euclidean: Steps 1–16, Hits, Rotate, Rate 1/4 to 1/32) that
  sends a trigger on every hit. Both follow the master clock's beat, the grid Moment's loops lock to. Patch by clicking
  an output and then a jack (CV 1–3, Freeze, Random), or the other way round; cables are saved. A CV jack adds ±50%
  to what it is assigned to; Random takes triggers (the rhythm's hits, or the LFO rising past 0.3); Freeze takes
  triggers in Latch and a gate in Mom (the rhythm's gate is high for the first half of each hit step).
- Computer keyboard: Z Shift, X Freeze, C Random, V Bypass; Space plays or stops.
