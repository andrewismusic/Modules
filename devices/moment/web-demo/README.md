# Moment web demo

Moment on its own with a test bench (generated sources, play / stop, volume, master clock, an LFO with clocked S&H,
a rhythm generator, cables), built into one self-contained HTML file: **`moment.html`** in this folder. Open it in a
desktop browser and press Play. It needs no network: scripts, styles, the font and the audio engine are all inside it.

- `npm run dev:moment`: live development server.
- `npm run build:moment`: builds `dist/index.html` and copies it to `moment.html`. Rebuild and commit `moment.html`
  with any change to Moment or the shared panel code.

Code: `src/` is the page (state, audio graph, panel glue, bench). The engine is in `../engine/`, Moment's controls and
Freeze key in `../control/`, and the shared panel module, key grammar and modulation in `shared/`.
