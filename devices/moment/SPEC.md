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
  affects new captures), Dry/wet, Pitch · quant (±24 st), Direction · thin (Direction = chance a loop pass plays
  forward, Loop mode only; Thin on its second layer = spectral thinning, Spectral mode only: keeps only the loudest
  bins, from Off to a few sharp partials, level-matched), Glide, Deviation. One lit Mode button: tap = Spectral (violet) / Loop (teal); Shift + tap = Manual /
  Rolling (Rolling re-captures every loop length; back to Manual releases everything). Only Spectral/Loop is
  assignable to Random.
- Clock unpatched: ms values; patched: note values, loops lock to the grid.
