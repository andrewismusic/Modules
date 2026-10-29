<!-- Carried over from the prototype's embedded summary (v30). This file is now the source of truth; keep it current. -->

# Design language (shared by every device)

## Panels (to scale: 556 px = 128.5 mm, 1 HP = 5.08 mm), smooth white/silver colorway, silver knob caps
Parts: Thonkiconn jacks, 15-LED-ring encoders (drawn at about a 10.5 mm knob inside a 13.5 mm LED ring), Kailh Choc keys with a light-line LED, lit buttons (RGB), 60 mm fader,
round LCD in a dial. Moment and Relay are 16HP; Prism is 20HP (five columns). Moment and Prism share an identical frame: both jack rows
use the same 6-column grid so jacks line up vertically (blank spots allowed): row 1 In L, In R, [module jacks],
Out L, Out R; row 2 CV 1, CV 2, CV 3, CV 4, blank, Random (Moment trades CV 4 and the blank for its two freeze
switches; decided 2026-10-28). Dry/wet is always the bottom-right encoder.
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
Reworked with the designer on 2026-10-28 to cut the number of combinations; Prism inherits it when it is built.
- Encoder tap = latch its second parameter (ring turns pink). Holding Shift shows every encoder's second parameter
  (and lit buttons / key-buttons switch to their shift function) while held; releasing Shift returns each encoder to
  whatever layer it was latched on. Press and hold an encoder (0.35 s) then turn = adjust the other layer momentarily.
  Bypass + tap = reset the shown parameter to default. At minimum a ring keeps one LED lit.
- An encoder can instead follow a mode (Moment's Direction / Thin follows Spec / Loop): it shows and turns the
  parameter that applies in the current mode, has no second layer, and its labels are printed in the mode colors.
- Pitch encoders have "quant" as their second layer: Free (white), Chromatic (green), Octaves and fifths (violet),
  Octaves (ice).
- Lit buttons: tap = next state (Shift + tap = their shift function, if they have one); Random + tap = membership;
  Bypass + tap = default.
- Key-buttons (Prism Order): tap = next order; Shift + tap = resolution; Random + tap = membership (amber key light
  while Random is held); Bypass + tap = default.
- Keys: Shift (leftmost) is a held modifier. Random and Bypass act on release.
  - Random + Bypass = every random range back to full (all rings blink amber).
  - Shift + Bypass = settings page, as Bypass goes down (the same as Relay's menu).
  - There is no Initialize, no shuffling of assignments and no reset of the assignment list (all removed 2026-10-28).
- Random (every included parameter changes on each press):
  - Membership: Random + tap includes or excludes the shown parameter (second-layer parameters too). Included
    parameters' lit LEDs breathe slowly between their color and amber (assignment mode, Random held and the settings
    page take over while they are on).
  - Ranges are relative to the hand-set value: the last value set by hand. Random moves a parameter within its range
    around that value, so repeated presses scatter around your sound instead of drifting away. Turning an encoder after
    a Random press starts from the value it is at and makes that the new hand-set value (the range moves with it).
  - Random held (0.25 s): the rings of included parameters show the hand-set value's LED in the parameter's color and
    its range in amber; the rest dim. Otherwise rings show the current (randomized) value.
  - Random + turn sets the shown parameter's range. Bipolar ranges grow on both sides of the hand-set value; unipolar
    ranges are signed: clockwise extends the range above the value, counter-clockwise below, and turning past the
    minimum jumps to the other side. A range is never smaller than one LED (1/14 of the throw) or one step, so at
    least one amber LED always shows beside the value (two when bipolar). Ranges start full (bipolar, the whole
    throw) and are cut off at the ends of the throw.
  - Stepped settings pick one of the steps inside the range; two-state buttons always pick from both states.
  - Random glide (its own encoder, default 0, printed in amber with a line to the Random key) glides continuous
    changes: note values when clocked (up to 8 bars), otherwise up to 16 s. Stepped settings and buttons change at once.
  - (Removed 2026-10-28: the Deviation encoder, its Window / Distinct setting, absolute upper and lower range limits,
    and the Glide range setting.)
- Settings page (Shift + Bypass; Bypass = keep and exit, Shift = cancel, both as they go down): each encoder shows its
  shown parameter's range type around noon: the noon LED in the parameter's color and amber clockwise of it
  (unipolar) or on both sides (bipolar). Press or turn an encoder to switch it. Second layers show when latched (tap
  the encoder before opening the page). Per parameter, saved.
- Modifier keys are released automatically if the window loses focus (no stuck Shift / Random / Bypass).
- CV jacks (CV 1–4 green / periwinkle / coral / yellow; Moment has CV 1–3): patching a jack opens assignment mode for
  5 s; unassigned controls breathe in the jack color. Tap an encoder, button or key to assign/unassign. Tap Bypass =
  clear this jack; tap Random = random assignments; long-press (0.8 s) Bypass or Random = assign that key. Each action
  adds 5 s; once the 5 s run out, these gestures go back to their usual meaning. CV adds ±50% of the throw (UI-only
  targets like Glide are offset at randomize time); on keys it is a gate (> 0.3). Assignments persist.

## Key grammar across devices (decided)
- All keys on every device act on release, Relay included. (The v30 prototype still acts on press for Relay's keys;
  the Relay web demo acts on release.) A key used in a Shift combination does not also do its own action on release,
  and neither does Shift.
- Exception (confirmed 2026-10-28): Moment's Freeze key acts on press, because it is played.
- Shift + Bypass opens Relay's menu as Bypass goes down: the one key action on press. The release that follows does
  nothing. Moment and Prism open their settings page the same way (decided 2026-10-28; it used to need a 3 s hold).
- The enter/back grammar (Bypass = enter, Shift = back) is the same in Relay's screens and in Moment/Prism settings.
- Relay has no Random-membership or CV-assignment gestures; its CV is configured in the menu.
