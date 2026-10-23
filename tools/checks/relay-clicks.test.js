// Click detector for Relay: fader sweeps, dial sweeps and stepped settings, run on the bundled worklet with a 220 Hz
// sine. See click-metric.js for the measure. Reference levels measured 2026-10-23: a hard gain step 156×; intended
// 4 ms slice-edge crossfades (Shuffler, controls still) about 9×; smoothed moves 1–3×, Buffer fader sweeps up to 9×.
// A move passes if it stays under 15× or within 1.5× of what the same effect gives with the controls still.
import { describe, it, expect } from 'vitest';
import { loadWorklet, send, run } from './worklet-harness.js';
import { spikeRatio } from './click-metric.js';
import { FX, ALL_FX, randomParams } from '../../devices/relay/control/fx-defs.js';
import { dialTarget } from '../../devices/relay/control/ranges.js';
import { toPos, fromPos } from '../../shared/control/params.js';

const ENTRY = new URL('../../devices/relay/engine/worklet.js', import.meta.url).pathname;
const LIMIT = 15, FRAME = 6; // UI messages every 6 blocks of 128 samples, about 60 per second
const sine = i => { const v = 0.3 * Math.sin(2 * Math.PI * 220 * i / 48000); return [v, v]; };
const worst = ({ L, R }) => Math.max(spikeRatio(L).ratio, spikeRatio(R).ratio);

/* seeded randomness for the settings and the engine's own random choices, so every run measures the same thing */
let seed = 2026;
const seeded = f => { const keep = Math.random; Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; try { return f(); } finally { Math.random = keep; } };
const w = await loadWorklet(ENTRY);
const relay = (fxs, params, macro) => {
  const p = w.make('relay-engine');
  fxs.forEach((fx, i) => { send(p, { type: 'fx', i, fx }); send(p, { type: 'range', i, a: 0.03 + 0.1 * i, b: 1 }); for (const d of FX[fx].params) send(p, { type: 'param', i, k: d.k, v: params[i][d.k] }); });
  send(p, { type: 'macro', v: macro }); run(p, 800, sine); // let the effects settle
  return p;
};
const pass = (move, still) => move < Math.max(LIMIT, still * 1.5);

const CASES = seeded(() => [...ALL_FX.flatMap(fx => [0, 1, 2].map(() => [[fx], [randomParams(fx)]])),
  ...[['filter', 'delay', 'reverb', 'lofi'], ['shuffle', 'smear', 'chorus', 'tapestop'], ['granular', 'phaser', 'thin', 'buffer'], ['formant', 'drive', 'freqshift', 'shimmer']]
    .map(fxs => [fxs, fxs.map(f => randomParams(f))])]);

describe('Relay click detector', () => {
  for (const [fxs, params] of CASES) it(`${fxs.join(', ')}: fader and dial sweeps add no clicks`, () => seeded(() => {
    const still = Math.max(worst(run(relay(fxs, params, 0.7), 900, sine)), worst(run(relay(fxs, params, 0.2), 900, sine)));
    const f = relay(fxs, params, 0);
    const fader = worst(run(f, 900, sine, b => { if (b % FRAME) return; const k = b / FRAME; send(f, { type: 'macro', v: k < 20 ? k / 20 : k < 40 ? 1 - (k - 20) / 20 : k < 60 ? (k - 40) / 20 : 0.5 }); }));
    const tg = params.map((ps, i) => Object.fromEntries(FX[fxs[i]].params.filter(d => !d.o).map(d => [d.k, dialTarget(toPos(d, ps[d.k]))])));
    const d = relay(fxs, params, 0.7);
    const dial = worst(run(d, 900, sine, b => { if (b % FRAME) return; const x = Math.min(1, b / FRAME / 40);
      fxs.forEach((fx, i) => { for (const q of FX[fx].params) if (!q.o) send(d, { type: 'param', i, k: q.k, v: fromPos(q, toPos(q, params[i][q.k]) + (tg[i][q.k] - toPos(q, params[i][q.k])) * x), sm: true });
        send(d, { type: 'range', i, a: 0.03 + 0.1 * i + 0.2 * x, b: 1 - 0.05 * x }); }); }));
    expect(pass(fader, still), `fader ${fader.toFixed(1)}× (still ${still.toFixed(1)}×)`).toBe(true);
    expect(pass(dial, still), `dial ${dial.toFixed(1)}× (still ${still.toFixed(1)}×)`).toBe(true);
  }), 30000);

  it('a stepped setting change (delay time) switches inside a duck, without a click', () => {
    const params = [{ ...FX.delay.params.reduce((o, d) => ({ ...o, [d.k]: d.d }), {}), div: 1 }];
    const p = relay(['delay'], params, 1);
    const r = worst(run(p, 600, sine, b => { if (b === 300) send(p, { type: 'param', i: 0, k: 'div', v: 4, duck: true }); }));
    expect(p.e.slots[0].fx.div).toBe(4);
    expect(r).toBeLessThan(LIMIT);
  });

  it('a stepped setting re-sent unchanged every frame never ducks: output identical to not re-sending', () => {
    const params = seeded(() => [{ ...randomParams('delay'), div: 2 }, { ...randomParams('filter'), mode: 1 }]);
    const a = relay(['delay', 'filter'], params, 1), b = relay(['delay', 'filter'], params, 1);
    let ducked = false;
    const A = run(a, 600, sine, k => { if (k % FRAME === 0) { send(a, { type: 'param', i: 0, k: 'div', v: 2, duck: true }); send(a, { type: 'param', i: 1, k: 'mode', v: 1, duck: true }); } if (a.e.slots[0].dg < 1 || a.e.slots[1].dg < 1) ducked = true; });
    const B = run(b, 600, sine);
    expect(ducked).toBe(false);
    expect(A.L).toEqual(B.L); expect(A.R).toEqual(B.R);
  });

  it('the detector catches a real click (a hard gain step) and passes the engine\'s smoothed one', () => {
    const params = [FX.reverb.params.reduce((o, d) => ({ ...o, [d.k]: d.d }), {})];
    const p = relay(['reverb'], params, 1);
    expect(worst(run(p, 600, sine, b => { if (b === 300) { p.e.mix = 0.2; p.e.mixT = 0.2; } }))).toBeGreaterThan(LIMIT * 5);
    const q = relay(['reverb'], params, 1);
    expect(worst(run(q, 600, sine, b => { if (b === 300) send(q, { type: 'mix', v: 0.2 }); }))).toBeLessThan(3);
  });
});
