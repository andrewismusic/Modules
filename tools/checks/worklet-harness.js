// Runs a bundled worklet source with the AudioWorklet globals stubbed, so tests exercise exactly what ships.
import { buildWorklet } from '../worklet-build.js';

const cache = new Map();
export async function loadWorklet(entry, sampleRate = 48000) {
  if (!cache.has(entry)) cache.set(entry, await buildWorklet(entry));
  const src = cache.get(entry);
  const registered = {};
  class AudioWorkletProcessor { constructor() { this.port = { posted: [], postMessage(m) { this.posted.push(m); }, onmessage: null }; } }
  new Function('AudioWorkletProcessor', 'registerProcessor', 'sampleRate', src)(
    AudioWorkletProcessor, (name, cls) => { registered[name] = cls; }, sampleRate);
  return { registered, make: name => new registered[name]() };
}

// Sends messages the way the page does (through the port).
export const send = (proc, m) => proc.port.onmessage({ data: m });

// Runs `blocks` 128-sample blocks; input(i) returns [l, r] for absolute sample i. Returns {L, R} output arrays.
export function run(proc, blocks, input, perBlock) {
  const L = new Float32Array(blocks * 128), R = new Float32Array(blocks * 128);
  for (let b = 0; b < blocks; b++) {
    if (perBlock) perBlock(b);
    const iL = new Float32Array(128), iR = new Float32Array(128);
    for (let i = 0; i < 128; i++) { const [l, r] = input(b * 128 + i); iL[i] = l; iR[i] = r; }
    const oL = new Float32Array(128), oR = new Float32Array(128);
    proc.process([[iL, iR]], [[oL, oR]]);
    L.set(oL, b * 128); R.set(oR, b * 128);
  }
  return { L, R };
}

// Deterministic test noise.
export function noise(seed = 1, amp = 0.3) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return (s / 4294967296 * 2 - 1) * amp; };
}
