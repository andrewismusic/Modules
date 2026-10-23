<!-- Carried over from the prototype's embedded summary (v30). This file is now the source of truth; keep it current. -->

# Relay (module and desktop): spec

## RELAY (macro multi-effect, 16HP)
Signal path: four effect slots in series, each with a range on the fader → Dry/wet → OTT (parallel 3-band
upward/downward compression, defaults to 50%, true bypass at 0) → bypass → 2 ms look-ahead limiter (ceiling 0.8).
Each effect is only heard once it is inside its range (it fades in over the first 6% of its range), so with the fader
in the dead zone Relay is exactly dry. Click control: the fader is smoothed in two stages (no staircase when it is moved
quickly); dial and glide parameter changes are smoothed; each slot's position on the fader is smoothed (8 ms) so moving ranges never
step; stepped settings (e.g. delay division) switch inside a 6 ms duck to the slot's input; effect swaps crossfade 40 ms. The dial re-sends only continuous settings, and the engine ignores a stepped setting
re-sent unchanged (re-sending them every frame used to duck the slots at 60 Hz: the dial crackle, fixed in v30); smoothed
settings step every 16 samples; Reverb pre-delay and Buffer pitch grain size glide instead of jumping. Latency: 2 ms (limiter) plus 43 ms for each Spectral smear/thin effect present; Buffer pitch
and Granular have inherent wet delays; others ~0.
- Jacks (two aligned rows of five): In L, In R, Clock, Out L, Out R / CV 1, CV 2, CV 3, Fader CV, Dial CV.
- Controls: a larger centered dial (round screen about 40 mm) with Dry/wet and OTT in its upper corners, fader
  just above the keys
  (first 3% always dry, not printed; no position marker), keys left→right: Shift (blank pink cap;
  SHIFT), Random 1 (five-pip die; SAVE under it), Random 2 (three-pip die; LOAD), Bypass (tap toggles; MENU).
- Random 1 = new effects (a slot may be empty; ≥3 effects remain; Drive picked half as often; Buffer never last; Shuffler always
  the first or second effect in the chain: if it lands later it trades places with one of the first two, never Buffer).
  Random 2 = new settings and slider ranges. Both reset the dial and reroll its targets; the screen flashes RANDOM FX /
  RANDOM SETTINGS (one size, fading over 1.5 s); BYPASSED shows while bypassed.
- Dial: moves every continuous setting (and, in Random-range mode, every slider range) toward its own destination.
- Range rules: endpoints ≥3%; ≥80% of the throw covered; gaps only at the left; Tape stop ends in the top 10%,
  Spectral thin in the top 20%, low/high-pass Filter in the top 10%.
- Shift+Random 1 = Save, Shift+Random 2 = Load (dial scrolls slots 1–64; Bypass confirms, Shift cancels). Presets store effects, settings, ranges, dial targets and position only. Menu settings are GLOBAL.
- Menu (Shift+Bypass; dial scrolls, Bypass = enter / edit / confirm, Shift = back / cancel). No fader marker on the
  screen. Clock (Internal tempo / External ÷4…×4),
  OTT (Follows fader, On in bypass), Random (Amount, Glide up to 16 bars, Ranges Random/Full), CV 1 / CV 2 / CV 3 (each set to Input or Output; Input:
  any of Random 1, Random 2, Bypass, Dry/wet, OTT, Random glide; Output (CV 1, CV 2 and CV 3 each): one of fader position, fader-moving gate,
  triggers on Random 1/2/either, random values on Random 1/2/either, envelope pre/post).
- Effects: Filter, Formant, Drive (Tube/Tape/Fuzz), Delay, Reverb, Shimmer, Granular, Spectral smear, Spectral thin,
  Buffer, Freq shifter, Phaser, Chorus, Buffer (modes: Stutter = loops a tempo-synced slice of the last few seconds, slice length shortening as the fader
  rises; Reverse chunks = plays short chunks of the incoming audio backwards; Pitch = delay-line pitch shifter. Every
  change of slice length or chunk size crossfades old and new playback over 6 ms),
  Shuffler (Slice 1/16, 1/8, 1/4; Pattern 1–332. Replays tempo-synced slices in a repeating pattern of 2, 3 or 4
  slices, aligned to the master clock, with NO added latency: a slice that has already happened this cycle is read from
  this cycle, a later one from the previous cycle. The pattern list is fixed and built by FxShuffle.pats() (every
  rearrangement of 2–4 slices, 284, plus a fixed seeded selection of 48 with one silent slice), so the same Pattern
  value always plays the same pattern; the UI shows it as e.g. "#12  3 1 – 2". The fader brings the moved slices in one
  at a time (each pattern stores its own entry points; all are in by 75%). Slice edges crossfade 4 ms. Dial moves Pattern),
  Tremolo (2 ms gain smoothing), Lo-fi (wow, flutter, character, dropouts; no noise), Tape stop. Swaps crossfade 40 ms.
- Screen: WebGL2 fluid (2D fallback). Each slot is a dye; dyes repel, are capped and budgeted, rendered with borders.
  Families: liquid (Filter, Formant, Drive; opaque like the others, but arrives less often and in smaller
  drops so it can't take over), plume (Reverb, Shimmer, Smear), orbit (Delay, Phaser, Freq shifter,
  Chorus), grains (Granular, Buffer, Tape stop), petals (Thin, Lo-fi), pulse (Tremolo, Shuffler).
  Turning the dial pushes the paint in the direction it is turned. Paint appears anywhere in the circle and arrives
  less often when the fader is low (so it can't stack into bars); it fades out just inside the rim (no grid steps). New paint always arrives already smeared (several offset soft splats with a little swirl).
  Each start and each Random press re-randomizes the liquid's gravity direction (which also
  drifts slowly) and stirs it with random splats, so it never settles into the same shape. Motion is slow and nearly stops
  with the fader fully left; the dial adds swirl, turbulence, repulsion and a hue shift; audio drives kicks, swirl, gloss.

## Relay desktop (concept)
A regular triangular pyramid, 176 mm along each base edge and 176 mm tall (faces lean back 16°; drawn at 2.5 px/mm),
rendered large in real CSS 3D below the rack with no title or caption: drag sideways or use the arrows to turn it. No name printed. Every control is a
solid (stacked layers for round parts, boxes for keys and the fader cap). One key light from the upper left front plus
ambient: face brightness, the sides of each control, each control's shadow on its face and the pyramid's cast shadow
on the floor all follow the light as it turns (the floor is drawn on a separate layer underneath, so it never covers
the pyramid). Face 1: dial (60 mm, knurled bezel, recessed live screen) with wide margins, keys Shift, Random 1,
Random 2, Bypass below with Save / Load / Menu printed under them (Bypass has a red LED when bypassed). Face 2: the
fader running vertically down the centre, Dry/wet and OTT knobs with LED rings below it on either side (drag up/down,
double-click resets). Face 3: five 1/4-inch jacks in one row near the bottom edge: Exp, In L, In R, Out L, Out R.
Its controls drive the same Relay as the panel.
