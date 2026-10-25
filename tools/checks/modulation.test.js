// Test bench modulation: the LFO's clocked sample and hold and the rhythm generator (shared/control/modulation.js).
import { describe, it, expect } from 'vitest';
import { euclid, createLfo, createRhythm, defaultLfo, defaultRhythm, LRATES } from '../../shared/control/modulation.js';

describe('Euclidean rhythms', () => {
  it('spreads the hits evenly', () => {
    expect(euclid(8, 3)).toEqual([1, 0, 0, 1, 0, 0, 1, 0]);
    expect(euclid(16, 4)).toEqual([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]);
    expect(euclid(5, 0)).toEqual([0, 0, 0, 0, 0]);
    expect(euclid(4, 9)).toEqual([1, 1, 1, 1]);
    for (let n = 1; n <= 16; n++) for (let k = 0; k <= n; k++) expect(euclid(n, k).reduce((a, b) => a + b, 0)).toBe(k);
  });
  it('rotates', () => { expect(euclid(8, 3, 1)).toEqual([0, 1, 0, 0, 1, 0, 0, 1]); expect(euclid(8, 3, 8)).toEqual(euclid(8, 3)); });
});

describe('Rhythm generator', () => {
  it('counts every hit, even when screen frames are slower than the steps', () => {
    for (const frame of [0.01, 0.07, 0.3]) {
      const R = { ...defaultRhythm(), steps: 8, hits: 3, rateIdx: 3 }, g = createRhythm(R); let n = 0;
      for (let b = 0; b < 32; b += frame) n += g.tick(b).trig;
      expect(Math.abs(n - 32 / 0.125 / 8 * 3)).toBeLessThanOrEqual(1);
    }
  });
  it('the gate is high for the first half of each hit step', () => {
    const g = createRhythm({ ...defaultRhythm(), steps: 4, hits: 1, rateIdx: 0 });
    expect(g.tick(0.2).gate).toBe(1); expect(g.tick(0.7).gate).toBe(0); expect(g.tick(1.2).gate).toBe(0); expect(g.tick(4.1).gate).toBe(1);
  });
});

describe('LFO', () => {
  it('S&H mode holds one value per clock step and changes on the next', () => {
    const L = { ...defaultLfo(), mode: 'sh', shRateIdx: 6, depth: 1 }, f = createLfo(L), step = LRATES[6][0];
    const vals = [];
    for (let k = 0; k < 40; k++) { const a = f.value(k * step + 0.01, 0).v, b = f.value(k * step + step * 0.99, 0).v; expect(a).toBe(b); expect(Math.abs(a)).toBeLessThanOrEqual(1); vals.push(a); }
    expect(new Set(vals).size).toBeGreaterThan(35);
    expect(f.value(5 * step + 0.02, 0).v).toBe(vals[5]); // the same step always gives the same value
  });
  it('synced shapes stay inside ±depth and repeat every cycle', () => {
    for (let shape = 0; shape < 5; shape++) { const L = { ...defaultLfo(), shape, depth: 0.6, rateIdx: 4 }, f = createLfo(L);
      for (let b = 0; b < 8; b += 0.013) { const v = f.value(b, 0).v; expect(Math.abs(v)).toBeLessThanOrEqual(0.6 + 1e-9); expect(f.value(b + 1, 0).v).toBeCloseTo(v, 9); } }
  });
});
