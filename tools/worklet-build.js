// Bundles a device's AudioWorklet entry into one self-contained script string.
// The demo embeds this string and loads it from a Blob URL; the behaviour checks run the same string.
import { build } from 'esbuild';

export async function buildWorklet(entry) {
  const r = await build({ entryPoints: [entry], bundle: true, write: false, format: 'iife', minify: true, target: 'es2020' });
  return r.outputFiles[0].text;
}

// Vite plugin: `import src from 'worklet:<path to entry>'` gives the bundled source string.
export function workletPlugin() {
  return {
    name: 'worklet-source',
    resolveId(id, importer) {
      if (!id.startsWith('worklet:')) return null;
      const p = new URL(id.slice(8), 'file://' + importer).pathname;
      return '\0worklet:' + p;
    },
    async load(id) {
      if (!id.startsWith('\0worklet:')) return null;
      const src = await buildWorklet(id.slice(9));
      return 'export default ' + JSON.stringify(src) + ';';
    },
  };
}
