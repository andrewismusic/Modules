<!-- Carried over from the prototype's embedded summary (v30). This file is now the source of truth; keep it current. -->

# Design language (shared by every device)

## Panels (to scale: 556 px = 128.5 mm, 1 HP = 5.08 mm), smooth white/silver colorway, silver knob caps
Parts: Thonkiconn jacks, 15-LED-ring encoders (drawn at about a 10.5 mm knob inside a 13.5 mm LED ring), Kailh Choc keys with a light-line LED, lit buttons (RGB), 60 mm fader,
round LCD in a dial. Moment and Relay are 16HP; Prism is 20HP (five columns). Moment and Prism share an identical frame: both jack rows
use the same 6-column grid so jacks line up vertically (blank spots allowed): row 1 In L, In R, [module jacks],
Out L, Out R; row 2 CV 1, CV 2, CV 3, CV 4, blank, Random. Dry/wet is always the bottom-right encoder.
Four centered keys on every module: Shift, [module key], Random, Bypass (Relay: Shift, Random 1, Random 2, Bypass).
Keys are light blue (Shift is pink and blank). Each key cap carries an icon and its main function in white; the shift
functions are printed under the keys in pink, with SHIFT printed under the Shift key. All key text is one size. On Relay the fader always sits exactly halfway between the dial and the keys.
Pink is the series' shift color everywhere (second-layer LEDs and names, shift legends); amber means Random; white
means settings.
No rings around audio jacks. Encoder LEDs are the same blue on all modules; labels are one color everywhere: main
parameter name in blue, the second-layer name directly under it in pink (same weight), both above the encoder.
Panels should never have large blank areas; elements are spaced evenly with a little air between them; the second
jack row sits a little lower than the first for finger room.
Bypass on any module: its Bypass key light turns red, all other lights dim; controls stay adjustable.

## Shared encoder / key scheme (Moment and Prism)
- Encoder tap = latch its second parameter (ring turns pink). Holding Shift shows every encoder's second parameter
  (and lit buttons / key-buttons switch to their shift function) while held; releasing Shift returns each encoder to
  whatever layer it was latched on. Press and hold an encoder (0.35 s) then turn = adjust the other layer momentarily.
  Bypass + tap = reset the shown parameter to default. At minimum a ring keeps one LED lit.
- Random membership: Random + tap includes/excludes the SHOWN parameter (second-layer parameters can be assigned too).
  Membership is shown only while Random is held for at least 0.25 s (a quick tap just randomizes): included controls
  show their random range in amber and the rest dim.
  Random + turn = set the upper random limit; Random + Shift + turn = set the lower limit (press Random first; pressing
  Shift first and then Random is the shuffle combo).
- Pitch encoders have "quant" as their second layer: Free (white), Chromatic (green), Octaves and fifths (violet),
  Octaves (ice).
- Lit buttons: tap = next state (Shift + tap = their shift function); Random + tap = membership; Bypass + tap = default.
- Key-buttons (Prism Order): tap = next order; Shift + tap = resolution; Random + tap or Shift + Random + tap =
  membership (amber key light while Random is held); Bypass + tap = default.
- Keys: Shift (leftmost) is a modifier. Random and Bypass act on release. Shift + double-tap Random = shuffle
  assignments. Shift + double-tap Bypass = initialize all values (keeps assignments, ranges, CV, settings).
  Shift + Bypass held 3 s = settings mode. Random + Bypass = reset assignments. Shift + Random + Bypass = full random
  ranges (all rings blink amber).
- Random (every included parameter changes on each press): Deviation (its own encoder, 10–100%, default 80%) sets a window around the current value: 10% of the parameter's random range at minimum, the whole range
  at maximum. Settings choose Window (any value in the window, close / far / same all possible) or Distinct (at least a
  third of the window away). Stepped settings and buttons pick at random within the window, which always reaches at least the neighbouring step
  (so a two-state button such as Spec / Loop changes about half the time at any Deviation; no forced change).
  Glide (its own encoder, default 0) glides continuous changes: note values when clocked, otherwise ms.
- Settings mode (Shift + Bypass held 3 s; same grammar as Relay's menu: Bypass = enter / keep and exit, Shift = back /
  cancel): only encoders that carry an option light, in white; left half lit = first choice, right half = second.
  Turn to choose; tap to see the encoder's second-layer option. Options are global (shared by both modules):
  Glide encoder: Glide range short (2 bars / 7 s) or long (16 bars / 33 s). Deviation encoder: Window or Distinct.
  Prism only: Time encoder: Smear tails on Random (ring out / cut). Ring encoder: Ring tails (keep birth decay / follow
  knobs live). Ring tilt (Ring's second layer): Ring tails on Random (ring out / cut).
- Modifier keys are released automatically if the window loses focus (no stuck Shift / Random / Bypass).
- CV 1–4 (green / periwinkle / coral / yellow): patching a jack opens assignment mode for 5 s; unassigned controls
  breathe in the jack color. Tap an encoder, button or key (Moment: Hold, Capture) to assign/unassign. Tap Bypass =
  clear this jack; tap Random = random assignments; long-press (0.8 s) Bypass or Random = assign that key. Each action
  adds 5 s. CV adds ±50% of the throw (UI-only targets like Amount and Glide are offset at randomize time); on keys
  it is a gate (> 0.3). Assignments persist.

## Key grammar across devices (decided)
- All keys on every device act on release, Relay included. (The v30 prototype still acts on press for Relay's keys;
  the new code changes this.)
- Shift + Bypass opens Relay's menu immediately. Moment and Prism need it held 3 s to enter settings mode. This
  difference is intended: Relay has a screen.
- The enter/back grammar (Bypass = enter, Shift = back) is the same in Relay's screens and in Moment/Prism settings.
- Relay has no Random-membership or CV-assignment gestures; its CV is configured in the menu.
