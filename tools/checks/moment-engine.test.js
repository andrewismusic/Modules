// Behaviour checks for Moment's engine, run on the bundled worklet source.
import { describe, it, expect } from 'vitest';
import { loadWorklet, send, run, noise } from './worklet-harness.js';

const ENTRY = new URL('../../devices/moment/engine/worklet.js', import.meta.url).pathname;
const SR = 48000;
const w = await loadWorklet(ENTRY);
const moment = (over = {}) => { const p = w.make('moment-engine'); for (const [k, v] of Object.entries(over)) send(p, { type: 'fz', k, v }); return p; };
const rms = (x, a = 0, b = x.length) => { let s = 0; for (let i = a; i < b; i++) s += x[i] * x[i]; return Math.sqrt(s / (b - a)); };
const sine = (f, a = 0.3) => i => { const v = a * Math.sin(2 * Math.PI * f * i / SR); return [v, v]; };

describe('Moment worklet', () => {
  it('registers moment-engine and runs every feature: output finite', () => {
    expect(Object.keys(w.registered)).toEqual(['moment-engine']);
    for (const mode of [0, 1]) for (const rolling of [0, 1]) {
      const p = moment({ mode, rolling, pitch: 7, dir: 0.4, thin: 0.6, spread: 0.5, free: true, loopMs: 180, fadeMs: 40 }), n = noise(mode * 2 + rolling + 1);
      run(p, 200, () => [n(), n()]);
      send(p, { type: 'freeze', v: true });
      const a = run(p, 400, () => [n(), n()]);
      send(p, { type: 'reseed' });
      const b = run(p, 400, () => [0, 0]);
      for (const x of [a.L, a.R, b.L, b.R]) for (let i = 0; i < x.length; i++) if (!Number.isFinite(x[i])) throw new Error('non-finite');
      expect(rms(b.L)).toBeGreaterThan(0.01);
      expect(p.e.bad).toBeFalsy();
    }
  });

  it('recovers from a non-finite output and tells the page', () => {
    const p = moment();
    run(p, 2, () => [NaN, NaN]);
    run(p, 1, () => [0, 0]);
    expect(p.port.posted.some(m => m && m.recover)).toBe(true);
  });
});

describe('Moment latency', () => {
  it('adds no delay: until something is frozen the output is the input, sample for sample', () => {
    for (const mode of [0, 1]) {
      const p = moment({ mode, pitch: 5, thin: 0.5 }), n = noise(3), inL = [], inR = [];
      const { L, R } = run(p, 300, i => { const l = n(), r = n(); inL[i] = l; inR[i] = r; return [l, r]; });
      for (let i = 0; i < L.length; i++) if (L[i] !== Math.fround(inL[i]) || R[i] !== Math.fround(inR[i])) throw new Error(`sample ${i} differs`);
    }
  });
  it('bypassed while frozen: the output returns to the dry input', () => {
    const p = moment({ mode: 1, free: true, loopMs: 250 }), n = noise(4);
    run(p, 200, () => [n(), n()]);
    send(p, { type: 'freeze', v: true });
    run(p, 100, () => [n(), n()]);
    send(p, { type: 'fz', k: 'byp', v: 1 });
    run(p, 100, () => [n(), n()]);
    const inL = [], { L } = run(p, 50, i => { const l = n(), r = n(); inL[i] = l; return [l, r]; });
    const t0 = p._t - 50 * 128;
    for (let i = 0; i < L.length; i++) expect(Math.abs(L[i] - inL[t0 + i])).toBeLessThan(1e-4);
  });
});

describe('Moment freeze', () => {
  for (const mode of [0, 1]) it(`${mode ? 'loop' : 'spectral'} mode holds the sound after the input stops`, () => {
    const p = moment({ mode, free: true, loopMs: 250 });
    run(p, 300, sine(330));
    send(p, { type: 'freeze', v: true });
    run(p, 40, sine(330));
    const { L } = run(p, 400, () => [0, 0]);
    expect(rms(L)).toBeGreaterThan(0.1);
    send(p, { type: 'freeze', v: false });
    run(p, 40, () => [0, 0]);
    const off = run(p, 40, () => [0, 0]);
    expect(rms(off.L)).toBeLessThan(1e-6);
  });

  it('clocked loops repeat at exactly the note length (a 1/8 at 120 BPM is 12000 samples)', () => {
    const p = moment({ mode: 1, free: false, loopBeats: 0.5 });
    send(p, { type: 'bpm', v: 120 });
    const n = noise(9);
    run(p, 600, () => [n(), n()]);
    send(p, { type: 'freeze', v: true });
    run(p, 200, () => [0, 0]);
    const { L } = run(p, 400, () => [0, 0]);
    const P = 12000; let err = 0;
    for (let i = 1000; i < 1000 + P; i++) err = Math.max(err, Math.abs(L[i] - L[i + P]));
    expect(err).toBeLessThan(1e-6);
  });

  it('Direction 0 plays every pass backwards: each pass is the forward pass reversed', () => {
    const make = dir => { const p = moment({ mode: 1, free: false, loopBeats: 0.5, dir }), n = noise(5);
      run(p, 600, () => [n(), n()]); send(p, { type: 'freeze', v: true }); run(p, 200, () => [0, 0]); return run(p, 300, () => [0, 0]).L; };
    const f = make(1), r = make(0), P = 12000, t0 = 600 * 128 + 200 * 128, a = P - (t0 % P); // a = first pass start in this run
    let err = 0;
    for (let k = 0; k < 2; k++) for (let i = 1000; i < P - 1000; i++) err = Math.max(err, Math.abs(r[a + k * P + i] - f[a + k * P + P - 1 - i]));
    expect(err).toBeLessThan(1e-6);
  });
});
