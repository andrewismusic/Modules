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

/* level of frequency f in x (Goertzel) */
const tone = (x, f, a = 0, b = x.length) => { const w = 2 * Math.PI * f / SR, c = 2 * Math.cos(w); let s1 = 0, s2 = 0;
  for (let i = a; i < b; i++) { const s0 = x[i] + c * s1 - s2; s2 = s1; s1 = s0; } return Math.sqrt(s1 * s1 + s2 * s2 - c * s1 * s2) / (b - a); };

describe('Moment Rolling', () => {
  it('Rolling on its own never freezes', () => {
    const p = moment({ mode: 1, rolling: 1, free: true, loopMs: 200 });
    run(p, 300, sine(330));
    const { L } = run(p, 100, () => [0, 0]);
    expect(rms(L)).toBe(0);
  });
  it('frozen in Rolling re-captures every loop; frozen in Manual holds the first capture', () => {
    for (const rolling of [0, 1]) {
      const p = moment({ mode: 1, free: true, loopMs: 200, rolling });
      run(p, 300, sine(330)); send(p, { type: 'freeze', v: true }); run(p, 100, sine(330));
      const { L } = run(p, 600, sine(880)); // the input changes while frozen
      const a = 400 * 128, b = 600 * 128;
      if (rolling) expect(tone(L, 880, a, b)).toBeGreaterThan(5 * tone(L, 330, a, b));
      else expect(tone(L, 330, a, b)).toBeGreaterThan(5 * tone(L, 880, a, b));
    }
  });
  it('switching an active freeze to Rolling starts re-capturing; back to Manual keeps the freeze', () => {
    const p = moment({ mode: 1, free: true, loopMs: 200 });
    run(p, 300, sine(330)); send(p, { type: 'freeze', v: true }); run(p, 100, sine(330));
    send(p, { type: 'fz', k: 'rolling', v: 1 });
    let { L } = run(p, 400, sine(880));
    expect(tone(L, 880, 200 * 128, 400 * 128)).toBeGreaterThan(5 * tone(L, 330, 200 * 128, 400 * 128));
    send(p, { type: 'fz', k: 'rolling', v: 0 });
    ({ L } = run(p, 400, () => [0, 0]));
    expect(rms(L, 100 * 128)).toBeGreaterThan(0.05);
  });
});

describe('Moment Position', () => {
  it('loop mode: the loop plays the audio from Position earlier (a 1/8 loop, Position 1 beat back)', () => {
    const P = 12000, O = 24000, inL = [];
    const p = moment({ mode: 1, free: false, loopBeats: 0.5, posBeats: 1 }), n = noise(11);
    send(p, { type: 'bpm', v: 120 });
    run(p, 600, i => { const v = n(); inL[i] = v; return [v, v]; });
    const T = 600 * 128; send(p, { type: 'freeze', v: true });
    const { L } = run(p, 400, () => [0, 0]);
    const g0 = Math.floor(T / P) * P - P;
    let err = 0;
    for (let i = 2000; i < L.length; i++) { const t = T + i, ph = (t - g0) % P; if (ph < 800 || ph > P - 800) continue; err = Math.max(err, Math.abs(L[i] - Math.fround(inL[g0 - O + ph + 1]))); } // the capture is one sample behind the clock count
    expect(err).toBeLessThan(1e-6);
  });
  it('spectral mode: Position chooses which moment the spectrum comes from, live', () => {
    const p = moment({ mode: 0, free: true, loopMs: 300 });
    run(p, 400, sine(330)); run(p, 400, sine(880)); // 330 Hz until 3.4 s before the freeze... then 880 Hz
    send(p, { type: 'freeze', v: true });
    let { L } = run(p, 200, () => [0, 0]);
    expect(tone(L, 880, 100 * 128)).toBeGreaterThan(5 * tone(L, 330, 100 * 128));
    send(p, { type: 'fz', k: 'posMs', v: 1500 }); // 1.5 s back: inside the 330 Hz part
    ({ L } = run(p, 200, () => [0, 0]));
    expect(tone(L, 330, 100 * 128)).toBeGreaterThan(5 * tone(L, 880, 100 * 128));
  });
});

describe('Moment Rolling joins', () => {
  it('Rolling, Direction 100%: the loop is the input delayed by a fixed time, to within rounding (no fades at the handovers)', () => {
    for (const o of [{ free: false, loopBeats: 0.5 }, { free: true, loopMs: 300 }]) {
      const p = moment({ mode: 1, rolling: 1, ...o }), n = noise(21), inL = [];
      run(p, 900, i => { const v = n(); inL[i] = v; return [v, v]; }); send(p, { type: 'freeze', v: true });
      const { L } = run(p, 900, i => { const v = n(); inL[i] = v; return [v, v]; });
      const t0 = 900 * 128, a = 300 * 128; let best = null;
      for (let d = 1; d < 40000 && best === null; d++) { let ok = true; for (let k = 0; k < 64; k++) if (Math.abs(L[a + k] - inL[t0 + a + k - d]) > 1e-6) { ok = false; break; } if (ok) best = d; }
      expect(best).not.toBeNull();
      for (let i = a; i < L.length; i++) if (Math.abs(L[i] - inL[t0 + i - best]) > 1e-6) throw new Error(`sample ${i} differs (delay ${best})`); // within rounding of the dry/wet mixer
    }
  });
  it('Rolling with Direction 50% on noise: joins never drop the level by more than 6 dB (10 ms windows)', () => {
    const p = moment({ mode: 1, rolling: 1, free: false, loopBeats: 0.5, dir: 0.5 }), n = noise(22);
    run(p, 900, () => { const v = n(); return [v, v]; }); send(p, { type: 'freeze', v: true });
    const { L } = run(p, 1200, () => { const v = n(); return [v, v]; });
    const W = 480, lv = []; for (let i = 100 * 128; i + W < L.length; i += 120) lv.push(rms(L, i, i + W));
    const med = [...lv].sort((x, y) => x - y)[lv.length >> 1];
    expect(20 * Math.log10(Math.min(...lv) / med)).toBeGreaterThan(-6);
  });
});

describe('Moment Repitch', () => {
  it('Loop mode, Repitch +12: an octave up by playing faster, and the loop keeps its length', () => {
    const p = moment({ mode: 1, free: false, loopBeats: 0.5, repitch: 1, pitch: 12 });
    run(p, 900, sine(330)); send(p, { type: 'freeze', v: true });
    const { L } = run(p, 600, () => [0, 0]);
    expect(tone(L, 660, 200 * 128)).toBeGreaterThan(10 * tone(L, 330, 200 * 128));
    let err = 0; for (let i = 200 * 128; i < 200 * 128 + 12000; i++) err = Math.max(err, Math.abs(L[i] - L[i + 12000]));
    expect(err).toBeLessThan(1e-3); // a wrong length would differ by about the signal level
  });
  it('Stretch (the default) keeps the same pitch through the time-stretcher, not by speed', () => {
    const p = moment({ mode: 1, free: false, loopBeats: 0.5, pitch: 12 });
    run(p, 900, sine(330)); send(p, { type: 'freeze', v: true });
    const { L } = run(p, 600, () => [0, 0]);
    expect(tone(L, 660, 200 * 128)).toBeGreaterThan(10 * tone(L, 330, 200 * 128));
    expect(p.e.f.rp).toBe(0);
  });
});
