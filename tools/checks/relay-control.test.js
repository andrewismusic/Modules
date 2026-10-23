// Relay control checks: key grammar (act on release) and the Random 1 / Random 2 rules.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRelayKeys } from '../../devices/relay/control/keys.js';
import { rollEffects, shufflerEarly, bufferNotLast } from '../../devices/relay/control/chain.js';
import { genRanges, rangesValid, endRule, ZONE } from '../../devices/relay/control/ranges.js';
import { ALL_FX, slot, randomParams } from '../../devices/relay/control/fx-defs.js';

function harness() {
  const log = []; let menu = false;
  const keys = createRelayKeys({
    inMenu: () => menu,
    openMenu: () => { log.push('menu'); menu = true; },
    enter: () => log.push('enter'), back: () => { log.push('back'); menu = false; },
    save: () => { log.push('save'); menu = true; }, load: () => { log.push('load'); menu = true; },
    toggleBypass: () => log.push('bypass'), random: n => log.push('random' + (n + 1)),
  });
  return { keys, log, setMenu: v => { menu = v; } };
}
const seq = (k, s) => s.split(' ').forEach(t => (t[0] === '+' ? k.down : k.up)(t.slice(1)));

describe('Relay keys', () => {
  it('Random 1, Random 2 and Bypass act on release, not on press', () => {
    const { keys, log } = harness();
    for (const w of ['r1', 'r2', 'byp']) { keys.down(w); expect(log).toEqual([]); keys.up(w); log.length = 0; }
    seq(keys, '+r1 -r1 +r2 -r2 +byp -byp'); expect(log).toEqual(['random1', 'random2', 'bypass']);
  });
  it('Shift + Random 1 saves and Shift + Random 2 loads, on release, without randomizing', () => {
    const h = harness(); seq(h.keys, '+sh +r1 -r1 -sh'); expect(h.log).toEqual(['save']);
    const g = harness(); seq(g.keys, '+sh +r2 -sh -r2'); expect(g.log).toEqual(['load']);
  });
  it('Shift pressed while a key is held makes it a combination', () => {
    const { keys, log } = harness(); seq(keys, '+r1 +sh -r1 -sh'); expect(log).toEqual(['save']);
  });
  it('Shift + Bypass opens the menu on press; releasing either key does nothing more', () => {
    const { keys, log } = harness();
    keys.down('sh'); keys.down('byp'); expect(log).toEqual(['menu']);
    keys.up('byp'); keys.up('sh'); expect(log).toEqual(['menu']);
    const h2 = harness(); seq(h2.keys, '+sh +byp -sh -byp'); expect(h2.log).toEqual(['menu']);
  });
  it('in the menu Bypass enters and Shift goes back, on release; Random keys do nothing', () => {
    const { keys, log, setMenu } = harness(); setMenu(true);
    keys.down('byp'); expect(log).toEqual([]); keys.up('byp'); expect(log).toEqual(['enter']);
    seq(keys, '+r1 -r1 +r2 -r2'); expect(log).toEqual(['enter']);
    keys.down('sh'); expect(log).toEqual(['enter']); keys.up('sh'); expect(log).toEqual(['enter', 'back']);
  });
  it('Shift released after opening Save does not cancel it', () => {
    const { keys, log } = harness(); seq(keys, '+sh +r1 -r1 -sh'); expect(log).toEqual(['save']);
    seq(keys, '+sh -sh'); expect(log).toEqual(['save', 'back']);
  });
  it('Shift on its own does nothing on the main screen; clear() forgets held keys', () => {
    const { keys, log } = harness(); seq(keys, '+sh -sh'); expect(log).toEqual([]);
    keys.down('r1'); keys.clear(); keys.up('r1'); expect(log).toEqual([]);
  });
});

describe('Relay randomize rules', () => {
  let s = 1;
  beforeEach(() => { s = 12345; vi.spyOn(Math, 'random').mockImplementation(() => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }); });
  afterEach(() => vi.restoreAllMocks());

  it('Random 1: at least three effects, no duplicates, Shuffler first or second, Buffer never last, Drive half as often', () => {
    let fxs = ['filter', 'delay', 'reverb', 'lofi'];
    const count = {}, N = 20000;
    for (let n = 0; n < N; n++) {
      const amount = [0.15, 0.5, 0.8, 1][n % 4];
      const r = rollEffects(fxs, amount);
      const sl = r.fxs.map(fx => ({ fx }));
      shufflerEarly(sl); bufferNotLast(sl);
      fxs = sl.map(x => x.fx);
      const on = fxs.filter(f => f !== 'none');
      expect(on.length).toBeGreaterThanOrEqual(3);
      expect(new Set(on).size).toBe(on.length);
      const order = fxs.filter(f => f !== 'none');
      if (order.includes('shuffle')) expect(order.indexOf('shuffle')).toBeLessThan(2);
      expect(order[order.length - 1]).not.toBe('buffer');
      for (const i of r.picked) count[r.fxs[i]] = (count[r.fxs[i]] || 0) + 1;
    }
    const others = ALL_FX.filter(k => k !== 'drive').map(k => count[k] || 0), mean = others.reduce((a, b) => a + b) / others.length;
    expect(count.drive / mean).toBeGreaterThan(0.4);
    expect(count.drive / mean).toBeLessThan(0.6);
  });

  it('ranges: endpoints at least 3%, end rules hold, gaps only at the left, 80% of the throw covered', () => {
    for (let n = 0; n < 3000; n++) {
      const fx = [...ALL_FX].sort(() => Math.random() - 0.5).slice(0, 4);
      const slots = fx.map(f => ({ ...slot(f, 0.1, 0.9), p: randomParams(f) }));
      const res = genRanges(slots, new Set([0, 1, 2, 3]));
      expect(rangesValid(res)).toBe(true);
      for (const r of res) {
        expect(Math.min(r.a, r.b)).toBeGreaterThanOrEqual(ZONE - 1e-6);
        const e = endRule(r); if (e) { expect(r.b).toBeGreaterThanOrEqual(e); expect(r.a).toBeLessThan(r.b); }
      }
      // the first effect to come in starts no later than 20% (gaps only at the left, at least 80% of the throw covered)
      // (a range with a > b runs backwards: full at the left, so it covers the low end)
      const starts = res.filter(r => r.on && r.fx !== 'none').map(r => (r.a <= r.b ? r.a : ZONE));
      expect(Math.min(...starts)).toBeLessThanOrEqual(0.2 + 1e-9);
    }
  });
});
