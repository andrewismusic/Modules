<!-- Carried over from the prototype's embedded summary (v30). This file is now the source of truth; keep it current. -->

# Moment: spec

## MOMENT (freezer, 16HP) — essentially zero added latency (no spectral analysis in the path)
Reworked with the designer on 2026-10-28 and 2026-10-30 (fewer combinations, Position, switches, Repitch).
- Jacks: row 1 In L, In R, Clock, Freeze, Out L, Out R; row 2 CV 1, CV 2, CV 3, Latch / Temp switch (under the Freeze
  jack), Hold / Roll switch (under Out L), Random (trigger). (CV 4 was removed to make room.)
- Layout (no section titles):
  - Top row: Spec · Loop lit button (its two states named only by its color legend), Direction, the Stretch / Repitch
    switch, Pitch · quant. Direction and Stretch / Repitch apply in Loop mode and are printed in teal; a printed line
    runs from the button through Direction to the switch.
  - Bottom row: Length · fade, Position, Random glide (printed in amber; a printed line joins it to the Random key),
    Dry/wet.
  - Keys: Shift, Freeze, Random, Bypass. Only SHIFT is printed under the keys (no other key has a Shift function).
- Freeze key (acts on press): what it does depends on the Latch / Temp switch.
  - Latch: tap = freeze on / off. Bypass + Freeze = fresh capture (a new freeze, staying frozen; Bypass does not
    toggle). Shift does not change the Freeze key, so it never gets in the way of turning encoders.
  - Temp: frozen while held; every press is a fresh capture. Flipping the switch to Latch while holding keeps the
    freeze on.
  - Random + Freeze = let Random also freeze, re-capture or release (Latch only; 90% chance per press; off by
    default); while Random is held the Freeze light shows amber if that is on.
  - Freeze light: steady blue when frozen in Hold, pulsing when frozen in Roll, off when not frozen.
  - The Freeze jack follows the switch: in Latch a trigger toggles the freeze; in Temp it is a gate (frozen while high).
    A CV jack assigned to the Freeze key does the same.
- Hold / Roll switch: never starts or stops a freeze. While frozen in Roll the freeze re-captures every loop length;
  switching an active freeze to Roll starts that, switching back to Hold keeps the last capture. With no capture Fade
  the new capture takes over at the loop boundary with no crossfade (it continues the same audio, so at Direction
  100% the output is the input delayed by one loop); with a Fade the two blend over it.
- Spec · Loop (lit button, violet / teal): the freeze type; switching crossfades. Assignable to Random.
- Direction (Loop mode): the chance a loop pass plays forward. Each pass's direction is chosen just before it starts,
  so turning Direction never flips a pass already playing. Joins: where the position jumps, an equal-power crossfade
  (flat at both ends) with audio that runs up to the next pass's start; where playback turns around (forward into
  reverse or back), a 2 ms dip on each side of the turn, as in a ping-pong loop.
- Stretch / Repitch switch (Loop mode): Stretch = Pitch shifts by time-stretching (the prototype's two-tap shifter);
  Repitch = Pitch changes the playback speed, like tape, with no stretching artifacts. The loop keeps its length (each
  pass plays the stretch of audio ending where the loop's slice ends, at the new speed); speed glides over about 25 ms
  and a rise during a pass is held back only as far as the captured audio allows. Switching crossfades over 15 ms.
- Pitch · quant: ±24 st (time-stretched or repitched in Loop mode, spectral shift in Spectral mode).
- Length · fade: Length changes playback in real time with a crossfade; Fade (second layer) is read when a capture
  starts, so CV on Fade affects new captures.
- Position: how far back in the captured audio the freeze reads, live: 0 (now) to 5 s back (in 1/16 notes when
  clocked). Moving it while frozen scrubs through the capture: loops crossfade to the new place over 15 ms, and the
  spectral freeze re-measures its spectrum there at the next frame. It is limited by what each capture holds (6.3 s).
- Random glide: how long Random's changes take (see `docs/design-language.md`).
- Dry/wet: smoothed over 10 ms, so CV and Random never click it.
- Random membership by default: Dry/wet, Length, Direction. Random can land anywhere in each parameter's throw.
- No settings page.
- Clock unpatched: ms values; patched: note values, loops lock to the grid.
- (Removed: Thin and Tone on 2026-10-30; the engine still contains spectral thinning, fixed off.)

## Web demo (`web-demo/moment.html`)
- Moment on its own, with the test bench at the top: sources, play / stop, volume, master clock ("Patched to Moment",
  or click the Clock jack), modulation, the readout, reset; the button combinations card at the bottom.
- Modulation (not hardware): one LFO (Sine, Triangle, Ramp up, Ramp down, Square, Smooth random; Sync in note values
  or Free in Hz; Depth) with a clocked S&H mode (a new random value on every step of the master clock, held until the
  next; rate 4 bars to 1/32), and a rhythm generator (Euclidean: Steps 1–16, Hits, Rotate, Rate 1/4 to 1/32) that
  sends a trigger on every hit. Both follow the master clock's beat, the grid Moment's loops lock to. Patch by clicking
  an output and then a jack (CV 1–3, Freeze, Random), or the other way round; cables are saved. A CV jack adds ±50%
  to what it is assigned to; Random takes triggers (the rhythm's hits, or the LFO rising past 0.3); Freeze takes
  triggers in Latch and a gate in Temp (the rhythm's gate is high for the first half of each hit step).
- Computer keyboard: Z Shift, X Freeze, C Random, V Bypass; Space plays or stops.
