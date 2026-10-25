<!-- Carried over from the prototype's embedded summary (v30). This file is now the source of truth; keep it current. -->

# Moment: spec

## MOMENT (freezer, 16HP) — essentially zero added latency (no spectral analysis in the path)
- Jacks: In L/R, Clock, Freeze (trigger toggles latch), Out L/R; CV 1–4, Random (trigger).
- Layout (no section titles): Length, Fade, Pitch · quant, Direction · thin / Mode button, Glide, Deviation, Dry/wet.
- Keys: Shift, Freeze, Random, Bypass. Freeze: tap = latch on / off (always a toggle); Shift + Freeze = momentary
  (frozen while held; HOLD printed under the key); Bypass + Freeze = fresh capture while staying frozen. Freeze key light: blue
  when frozen, pulsing while Rolling. Random + Freeze = let Random also freeze, re-capture or release (at most 90%
  chance per press; off by default); while Random is held the Freeze key light shows amber if that is on.
- Encoders: Length (changes playback in real time with a crossfade), Fade (read when a capture starts, so CV on Fade
  affects new captures), Dry/wet (smoothed over 10 ms, so CV and Random never click it), Pitch · quant (±24 st),
  Direction · thin (Direction = chance a loop pass plays forward, Loop mode only. Each pass's direction is chosen just
  before it starts, so turning Direction never flips a pass already playing; a pass into a forward pass joins it
  seamlessly, as at 100%, and a pass into a reverse pass fades out while the reverse pass fades in; Thin on its second layer = spectral thinning, Spectral mode only: keeps only the loudest
  bins, from Off to a few sharp partials, level-matched), Glide, Deviation. One lit Mode button: tap = Spectral (violet) / Loop (teal); Shift + tap = Manual /
  Rolling (Rolling re-captures every loop length; back to Manual releases everything). Only Spectral/Loop is
  assignable to Random.
- Clock unpatched: ms values; patched: note values, loops lock to the grid.
- Freeze key timing: acts on press (see `docs/design-language.md`, to be confirmed by the designer).

## Web demo (`web-demo/moment.html`)
- Moment on its own, with the test bench at the top: sources, play / stop, volume, master clock ("Patched to Moment",
  or click the Clock jack), modulation, the readout, reset; the button combinations card at the bottom.
- Modulation (not hardware): one LFO (Sine, Triangle, Ramp up, Ramp down, Square, Smooth random; Sync in note values
  or Free in Hz; Depth) with a clocked S&H mode (a new random value on every step of the master clock, held until the
  next; rate 4 bars to 1/32), and a rhythm generator (Euclidean: Steps 1–16, Hits, Rotate, Rate 1/4 to 1/32) that
  sends a trigger on every hit. Both follow the master clock's beat, the grid Moment's loops lock to. Patch by clicking
  an output and then a jack (CV 1–4, Freeze, Random), or the other way round; cables are saved. A CV jack adds ±50%
  to what it is assigned to; Freeze and Random take triggers (the rhythm's hits, or the LFO rising past 0.3).
- Computer keyboard: Z Shift, X Freeze, C Random, V Bypass; Space plays or stops.
