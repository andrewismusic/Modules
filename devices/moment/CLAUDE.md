# Moment: device notes

16HP freezer. The spec is `SPEC.md` here; the shared grammar is `docs/design-language.md`.

**Shared with Prism:**
- the panel frame and jack grid;
- the encoder and key scheme;
- Random, Deviation and Glide;
- CV assignment and settings mode.

In the prototype these come from one implementation, `makePanelModule`. Keep them in `shared/control` and
`shared/ui-web`.

**Watch for:**
- No spectral analysis in the main path: Moment adds essentially zero latency, and must keep that.
- Thin applies only in Spectral mode and Direction only in Loop mode. They share one encoder as main and second layer.
- A Moment plugin is the first plugin candidate. It mirrors the module only.
