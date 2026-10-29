// Click detector for Moment: encoder sweeps, CV-style steps and key actions while frozen, run on the bundled worklet
// with a 220 Hz sine. Same measure and pass rule as Relay (click-metric.js): a move passes if it stays under 15× or
// within 1.5× of what the same frozen sound gives with the controls still.
import { describe, it, expect } from 'vitest';
import { loadWorklet, send, run } from './worklet-harness.js';
import { spikeRatio } from './click-metric.js';

const ENTRY = new URL('../../devices/moment/engine/worklet.js', import.meta.url).pathname;
const LIMIT = 15, FRAME = 6;
const sine = i => { const v = 0.3 * Math.sin(2 * Math.PI * 220 * i / 48000); return [v, v]; };
const worst = ({ L, R }) => Math.max(spikeRatio(L).ratio, spikeRatio(R).ratio);
let seed = 7;
const seeded = f => { const keep = Math.random; Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; try { return f(); } finally { Math.random = keep; } };
const w = await loadWorklet(ENTRY);
const frozen = over => { const p = w.make('moment-engine'); for (const [k, v] of Object.entries(over)) send(p, { type: 'fz', k, v });
  run(p, 2500, sine); send(p, { type: 'freeze', v: true }); run(p, 300, sine); return p; }; // warm up past the 6.3 s capture so Position never reaches the tone's start
const pass = (move, still) => move < Math.max(LIMIT, still * 1.5);
/* a sweep 0 -> 1 -> 0 over 60 UI frames, then a jump (as a stepped LFO or S&H would send) */
const sweep = (k, map) => b => { if (b % FRAME) return null; const t = b / FRAME; const x = t < 30 ? t / 30 : t < 60 ? 2 - t / 30 : t < 80 ? 0.9 : 0.1; return { type: 'fz', k, v: map(x) }; };

const BASE = { loop: { mode: 1, free: true, loopMs: 300 }, spec: { mode: 0, free: true, loopMs: 300 }, clocked: { mode: 1, free: false, loopBeats: 1 } };
const MOVES = [
  ['loop', 'dry/wet', sweep('wet', x => x)], ['spec', 'dry/wet', sweep('wet', x => x)],
  ['loop', 'length', sweep('loopMs', x => 40 + x * 900)],
  ['loop', 'pitch', sweep('pitch', x => Math.round(x * 48 - 24))], ['spec', 'pitch', sweep('pitch', x => Math.round(x * 48 - 24))],
  ['loop', 'direction', sweep('dir', x => x)], ['spec', 'thin', sweep('thin', x => x)],
  ['loop', 'mode switch', b => b % 120 === 60 ? { type: 'fz', k: 'mode', v: (b / 120 | 0) % 2 ? 1 : 0 } : null],
  ['spec', 'mode switch', b => b % 120 === 60 ? { type: 'fz', k: 'mode', v: (b / 120 | 0) % 2 ? 0 : 1 } : null],
  ['loop', 'freeze off and on', b => b % 150 === 50 ? { type: 'freeze', v: false } : b % 150 === 100 ? { type: 'freeze', v: true } : null],
  ['spec', 'freeze off and on', b => b % 150 === 50 ? { type: 'freeze', v: false } : b % 150 === 100 ? { type: 'freeze', v: true } : null],
  ['loop', 'fresh capture', b => b % 150 === 75 ? { type: 'reseed' } : null], ['spec', 'fresh capture', b => b % 150 === 75 ? { type: 'reseed' } : null],
  ['loop', 'bypass', b => b % 150 === 75 ? { type: 'fz', k: 'byp', v: (b / 150 | 0) % 2 ? 0 : 1 } : null],
  ['loop', 'rolling on and off while frozen', b => b === 30 ? { type: 'fz', k: 'rolling', v: 1 } : b === 400 ? { type: 'fz', k: 'rolling', v: 0 } : null],
  ['loop', 'tone', sweep('tone', x => x * 2 - 1)], ['spec', 'tone', sweep('tone', x => x * 2 - 1)],
  ['loop', 'position', sweep('posMs', x => x * 5000)], ['spec', 'position', sweep('posMs', x => x * 5000)],
  ['clocked', 'position steps', b => b % 24 === 0 ? { type: 'fz', k: 'posBeats', v: (b / 24 % 9) * 0.25 } : null],
  ['loop', 'free to clocked', b => b === 30 ? { type: 'fz', k: 'free', v: false } : null],
  ['loop', 'tempo change', b => b % 120 === 90 ? { type: 'bpm', v: 100 + (b % 240 ? 30 : 0) } : null],
  ['clocked', 'note length', b => b % 120 === 90 ? { type: 'fz', k: 'loopBeats', v: b % 240 ? 0.5 : 1 } : null],
  ['clocked', 'clocked to free', b => b === 30 ? { type: 'fz', k: 'free', v: true } : null],
  ['loop', 'same value re-sent every frame', b => b % FRAME ? null : { type: 'fz', k: 'mode', v: 1 }],
];

describe('Moment click detector', () => {
  for (const [base, name, f] of MOVES) it(`${base}: ${name} adds no clicks`, () => seeded(() => {
    const still = worst(run(frozen(BASE[base]), 600, sine));
    const p = frozen(BASE[base]);
    const move = worst(run(p, 600, sine, b => { const m = f(b); if (m) send(p, m); }));
    console.log(`${base} ${name}: ${move.toFixed(1)}× (still ${still.toFixed(1)}×)`);
    expect(pass(move, still)).toBe(true);
  }));
});
