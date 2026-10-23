<!-- Carried over from the prototype's embedded summary (v30). This file is now the source of truth; keep it current. -->

# Prototype notes (the v30 browser prototype)

## What this file is
A single self-contained HTML page prototyping Eurorack modules (Moment, Prism, Relay) and a desktop Relay concept in the browser (Web Audio). DSP is plain
sample-by-sample JavaScript classes (portable to C/C++), run in an AudioWorklet built from the same classes via
Function.toString() (ScriptProcessor fallback). Everything else is UI plus a "test bench" (not hardware). State
autosaves to localStorage (SAVE_KEY; bump it when the state shape changes).
Future plugin note: a Moment plugin would mirror the Moment module (not combine modules). Planned path: move to
Claude Code with a shared C++ core DSP library and a shared control-logic library, plus separate firmware and JUCE
plugin targets; this file stays the living spec.

## Test bench (not hardware)
Transport and sources (generated Drums, Ambient bells, a 303-style Acid bass line, a retro Synth pad chord
progression; Mic; File; loops are built on demand), volume, patch order, master clock with "patched to" switches,
Modulation: three LFOs (shape, synced or free rate, depth) and a Gate button that sends a gate while held and takes a
new random value for its S&H output on each press. Patch by clicking an output and then a module jack (or the other
way round); a patched jack shows its source's color; click it to unplug; the cable list shows every connection.
Patchable: Moment CV 1–4, Freeze, Random; Prism CV 1–4, Random; Relay CV 1–3 (inputs, or sources when set to output
in the menu), Fader, Dial (each adds ±50%). Patching a Moment/Prism CV jack opens its assignment mode. Readouts for
Moment and Prism, the Relay effects list, and a Button combinations card.

## Keyboard
Moment: Q Shift, F Freeze (with Q = momentary, with V = fresh capture), R Random, V Bypass. Prism: W Shift, O Order, N Random, M Bypass. Relay: Z Shift,
A Random 1, B Random 2, X Bypass (arrows scroll menus). Space = play/stop.

## Testing note
Real browsers run the engine as an AudioWorklet built from the DSP classes' source text. Anything attached to a class
from outside (static assignments, helper constants) is NOT included; keep helpers inside classes or list them in
DSP_CLASSES. This includes methods: write every method inside its class body (a "Class.prototype.x = ..." assignment
is lost and crashes the worklet). Always run the worklet source itself in tests (stub AudioWorkletProcessor /
registerProcessor) with every feature engaged. Safety net: if a non-finite value ever reaches the output, the engine
rebuilds its internal state and the page re-sends every setting.

## Code map
DSP: FFT, Freezer (spectral/loop voices, 4 capture slots, rolling, direction, pitch, spread), Stft (both channels
analysed, optional post() stereo stage), SpecPitch, spreadTable/applySpread, FxSmear, FxRing, FxThin (Relay's thin
keeps an internal FxRing), effects incl. FxShuffle (static pats() pattern list, shared with the UI),
FxOTT, FreezerMod (Moment), SpecMod (Prism; ORD order table; res 256–4096 with crossfade), Engine (route string e.g. 'fsm'; messages: fz, sp, freeze,
reseed, fx, param, range, on, macro, mix, ott, ottbyp, ottmac, mbyp, order, bpm, lfo, sync).
UI: FX definitions, state/persistence, makeKnob (bench/Relay knobs), makePanelModule (shared Moment/Prism logic:
descriptors D_lin/D_pitch/D_steps/D_btn/D_amount/D_glide, encoders with layers, lit buttons, keys, randomize, CV),
MOM and PRI configs, Relay (randomize, range rules, dial, SCR menu, RCV CV), GLF fluid, frame loop.
