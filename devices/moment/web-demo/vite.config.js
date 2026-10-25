// Builds the Moment demo into one self-contained HTML file (dist/index.html): scripts, styles, the embedded font and
// the AudioWorklet source are all inlined.
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { workletPlugin } from '../../../tools/worklet-build.js';

export default defineConfig({
  base: './',
  plugins: [workletPlugin(), viteSingleFile()],
  server: { fs: { allow: ['../../..'] } },
  build: { outDir: 'dist', emptyOutDir: true, assetsInlineLimit: 1e9, target: 'es2020' },
});
