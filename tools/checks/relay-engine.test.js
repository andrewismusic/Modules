// Behaviour checks for Relay's engine, run on the bundled worklet source.
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import { loadWorklet, send, run, noise } from './worklet-harness.js';

const ENTRY = new URL('../../devices/relay/engine/worklet.js', import.meta.url).pathname;
const PROTO = new URL('../../prototype/moment-prism-relay-v30.html', import.meta.url).pathname;
const ALL_FX = ['filter', 'formant', 'drive', 'delay', 'reverb', 'shimmer', 'granular', 'smear', 'thin', 'buffer',
  'freqshift', 'phaser', 'chorus', 'shuffle', 'tremolo', 'lofi', 'tapestop'];

async function relay() { const w = await loadWorklet(ENTRY); expect(Object.keys(w.registered)).toEqual(['relay-engine']); return w.make('relay-engine'); }
const setSlots = (p, fxs, a = 0.05, b = 1) => fxs.forEach((fx, i) => { send(p, { type: 'fx', i, fx }); send(p, { type: 'range', i, a, b }); });

describe('Relay worklet', () => {
  it('runs every effect with the fader up: output finite and audible', async () => {
    for (let g = 0; g < ALL_FX.length; g += 4) {
      const p = await relay(), n = noise(g + 1);
      setSlots(p, ALL_FX.slice(g, g + 4));
      send(p, { type: 'macro', v: 1 });
      const { L, R } = run(p, 400, () => [n(), n()]);
      let rms = 0;
      for (let i = 0; i < L.length; i++) { expect(Number.isFinite(L[i]) && Number.isFinite(R[i])).toBe(true); rms += L[i] * L[i]; }
      expect(Math.sqrt(rms / L.length)).toBeGreaterThan(0.01);
      expect(p.e.bad).toBeFalsy();
    }
  });

  it('recovers from a non-finite output and tells the page', async () => {
    const p = await relay();
    setSlots(p, ['filter']);
    run(p, 2, () => [NaN, NaN]);
    run(p, 1, () => [0, 0]);
    expect(p.port.posted.some(m => m && m.recover)).toBe(true);
  });
});

describe('Relay dead zone', () => {
  // With the fader in its dead zone (first 3%) the four slots are exactly dry. OTT sits after the slots and defaults
  // to 50% (not following the fader), so the whole output is bit-exact only with OTT at 0.
  const LIM = Math.round(0.002 * 48000) - 1; // the look-ahead buffer delays by its length minus one (95 samples, 1.98 ms)
  for (const m of [0, 0.01, 0.029]) it(`fader ${m}: output is the input delayed by the limiter, sample for sample`, async () => {
    for (let g = 0; g < ALL_FX.length; g += 4) {
      const p = await relay(), n = noise(7);
      const inL = [], inR = [];
      setSlots(p, ALL_FX.slice(g, g + 4), 0.03, 1);
      send(p, { type: 'ott', v: 0 });
      send(p, { type: 'macro', v: m });
      const { L, R } = run(p, 300, i => { const l = n(), r = n(); inL[i] = l; inR[i] = r; return [l, r]; });
      for (let i = LIM; i < L.length; i++) { if (L[i] !== Math.fround(inL[i - LIM]) || R[i] !== Math.fround(inR[i - LIM])) throw new Error(`sample ${i} differs (fx ${ALL_FX.slice(g, g + 4)})`); }
    }
  });
});

describe('Shuffler determinism', () => {
  it('pattern table is identical to the frozen prototype', async () => {
    const html = fs.readFileSync(PROTO, 'utf8');
    const start = html.indexOf('class FxShuffle{'), end = html.indexOf('\nclass FxGranular{');
    const Proto = new Function(html.slice(start, end) + '\nreturn FxShuffle;')();
    const p = await relay();
    const ours = p.e.make('shuffle').constructor.pats();
    expect(ours.length).toBe(332);
    expect(JSON.stringify(ours)).toBe(JSON.stringify(Proto.pats()));
  });
});

describe('Relay pitch', () => {
  // Relay's spectral effects do not shift pitch: Ring tilt in Spectral thin keeps its decay tilt but adds no
  // octave-up harmonics or octave-down copy (Prism keeps them).
  const level = (x, f, from) => { let re = 0, im = 0; for (let i = from; i < x.length; i++) { const a = 2 * Math.PI * f * i / 48000; re += x[i] * Math.cos(a); im += x[i] * Math.sin(a); } return Math.hypot(re, im) / (x.length - from); };
  for (const [rtilt, f, name] of [[1, 880, 'an octave up'], [-1, 220, 'an octave down']]) it(`Thin with full Ring tilt adds nothing ${name}`, async () => {
    const measure = harm => {
      const p = w.make('relay-engine');
      send(p, { type: 'fx', i: 0, fx: 'thin' }); send(p, { type: 'range', i: 0, a: 0.03, b: 1 });
      for (const [k, v] of [['ring', 5], ['rtilt', rtilt], ['thr', -70]]) send(p, { type: 'param', i: 0, k, v });
      p.e.slots[0].fx.rgx.tiltHarm = harm; send(p, { type: 'macro', v: 1 });
      const { L } = run(p, 1200, i => { const v = 0.3 * Math.sin(2 * Math.PI * 440 * i / 48000); return [v, v]; });
      return level(L, f, 600 * 128) / level(L, 440, 600 * 128);
    };
    const w = await loadWorklet(ENTRY);
    const relayLevel = measure(0), withHarmonics = measure(1);
    expect(withHarmonics).toBeGreaterThan(0.05); // the check can see them when they are there
    expect(relayLevel).toBeLessThan(0.01);
  });
});
