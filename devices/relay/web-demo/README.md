# Relay web demo

The Relay module, the desktop pyramid and a small test bench (generated sources, play / stop, volume, master clock,
the effects list), built into one self-contained HTML file: **`relay.html`** in this folder. Open it in a desktop
browser and press Play. It needs no network: scripts, styles, the font and the audio engine are all inside it.

- `npm run dev:relay`: live development server.
- `npm run build:relay`: builds `dist/index.html` and copies it to `relay.html`. Rebuild and commit `relay.html` with any
  change to Relay, so the shared file stays current.

Code: `src/` is the page (state, audio graph, panel logic, screen menu, visualizer, pyramid, bench). The engine is in
`../engine/`, Relay's control rules in `../control/`, and shared pieces in `shared/`.
