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
Simplified with the designer on 2026-10-28 and 2026-10-30 to cut the number of combinations; Prism inherits it when it
is built.
- Encoder tap = latch its second parameter (ring turns pink). Holding Shift shows every encoder's second parameter
  (and lit buttons / key-buttons switch to their shift function) while held; releasing Shift returns each encoder to
  whatever layer it was latched on. Press and hold an encoder (0.35 s) then turn = adjust the other layer momentarily.
  Bypass + tap = reset the shown parameter to default. At minimum a ring keeps one LED lit.
- Pitch encoders have "quant" as their second layer: Free (white), Chromatic (green), Octaves and fifths (violet),
  Octaves (ice).
- Lit buttons: tap = next state (Shift + tap = their shift function, if they have one); Random + tap = membership;
  Bypass + tap = default. A lit button's states are named only once, by its color legend.
- Key-buttons (Prism Order): tap = next order; Shift + tap = resolution; Random + tap = membership (amber key light
  while Random is held); Bypass + tap = default.
- Keys: Shift (leftmost) is a held modifier. Random and Bypass act on release.
  - Random + Bypass has no function for now: neither key acts.
  - A device with a settings page opens it with Shift + Bypass, as Bypass goes down (the same as Relay's menu); Bypass
    keeps and exits, Shift cancels. Moment has no settings page, so on Moment Shift does not change Bypass.
  - There is no Initialize, no shuffling of assignments and no reset of the assignment list.
- Random (every included parameter changes on each press, to any value in its throw):
  - Membership: Random + tap includes or excludes the shown parameter (second-layer parameters too). While Random is
    held (0.25 s) the rings of included parameters light fully amber and the rest dim; a quick tap just randomizes.
  - Stepped settings and buttons pick one of their steps.
  - Random glide (its own encoder, default 0, printed in amber with a line to the Random key) glides continuous
    changes: note values when clocked (up to 8 bars), otherwise up to 16 s. Stepped settings and buttons change at once.
  - (Removed: the Deviation encoder and its Window / Distinct setting, random ranges in every form (absolute limits,
    then ranges around the hand-set value with a unipolar / bipolar setting), the Glide range setting, and breathing
    LEDs for membership.)
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
  nothing. A Moment / Prism settings page opens the same way (Prism only, for now; it used to need a 3 s hold).
- The enter/back grammar (Bypass = enter, Shift = back) is the same in Relay's screens and in Moment/Prism settings.
- Relay has no Random-membership or CV-assignment gestures; its CV is configured in the menu.
