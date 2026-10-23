# Standing instructions for Claude Code

This repository holds a product line of three Eurorack modules (Moment, Prism, Relay) and a desktop Relay. Start
with `docs/HANDOFF.md` if you have not read it in this session.

## Where things are
- **Shared design language and controls:** `docs/design-language.md`.
- **Device specs:** `devices/<device>/SPEC.md`. Each device folder also has a `CLAUDE.md` with device-specific notes.
- **Rejected and removed ideas:** `docs/decisions.md`. Do not re-propose them without new information.
- **Reference prototype:** `prototype/moment-prism-relay-v30.html`. Frozen: read it, run it, compare against it by
  ear, never edit it. It is a reference for behaviour and sound, not for sample-exact output.

## Rules
1. **Keep specs current.** Any change to behaviour, layout, naming or defaults updates the matching spec file in the
   same change. Shared behaviour goes in `docs/design-language.md`, never copied into device specs.
2. **Shared before local.** If two devices need the same DSP, control logic or UI element, it goes in `shared/`.
3. **AudioWorklet rule (web builds).** The worklet runs code built from self-contained source. Keep DSP code free of
   outside-the-class attachments (`Class.prototype.x =`, static assignments outside the class body, unlisted helper
   functions). Every test of web audio runs the worklet source itself, with the worklet globals stubbed.
4. **Audio safety.**
   - No setting change may click: duck, crossfade or smooth it, following the click-control rules in
     `docs/HANDOFF.md` §4.
   - A stepped setting re-sent unchanged must not duck.
   - Keep the non-finite-output safety net and Relay's output limiter.
5. **Behaviour checks must pass before a change is called done** (no sample-for-sample matching with the prototype):
   - Prism transparency at minimum settings.
   - Relay exactly dry in its dead zone.
   - Shuffler determinism.
   - A click detector on dial and fader sweeps.
6. **Determinism.** Seeded tables (Shuffler patterns, any future seeds) are frozen. Only append to them.
7. **Demos.**
   - Each device's `web-demo/` builds to one self-contained HTML file.
   - External scripts or fonts must not be required for the demo to work; it degrades gracefully without the web
     font.
8. **Measure, then report.** Check clicks, latency, alignment and levels with a test or a measurement before saying
   something is fixed.

## Communication
- The designer wants clear, plain explanations of what changed and what they will hear or see.
- When an instruction is ambiguous or conflicts with the spec, ask before building.
