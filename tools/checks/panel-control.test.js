// Moment / Prism panel logic: key grammar (shared/control/panel-keys.js), Random's choice rule
// (shared/control/random-pick.js) and Moment's Freeze key (devices/moment/control/freeze-key.js).
import { describe, it, expect } from 'vitest';
import { createPanelKeys, HOLD_ASSIGN } from '../../shared/control/panel-keys.js';
import { pickRandom, randomWindow, turnAmount, rangeLeds, polarityLeds, minAmount } from '../../shared/control/random-pick.js';
import { createFreezeKey } from '../../devices/moment/control/freeze-key.js';

/* a manual clock: timers fire when time is advanced past them */
function rig(over = {}) {
  let t = 0; const timers = [], log = [];
  const st = { settings: false, asg: false, ...over };
  const h = new Proxy({ inSettings: () => st.settings, asgOn: () => st.asg, enterSettings: () => { st.settings = true; log.push('settings'); },
    exitSettings: keep => { st.settings = false; log.push(keep ? 'keep' : 'cancel'); } },
    { get: (o, k) => o[k] || ((...a) => { if (k !== 'changed' && k !== 'showMembership') log.push(a.length ? `${k}:${a[0]}` : k); else if (k === 'showMembership') log.push(`members:${a[0]}`); }) });
  const keys = createPanelKeys(h, { now: () => t, after: (ms, f) => { const e = { at: t + ms, f, on: true }; timers.push(e); return () => { e.on = false; }; } });
  const wait = ms => { t += ms; for (const e of timers) if (e.on && e.at <= t) { e.on = false; e.f(); } };
  const tap = (w, hold = 50) => { keys.down(w); wait(hold); keys.up(w); };
  return { keys, log, wait, tap, st };
}

describe('Panel keys', () => {
  it('Random and Bypass act on release, not on press', () => {
    const r = rig(); r.keys.down('rnd'); expect(r.log).toEqual([]); r.keys.up('rnd'); expect(r.log).toEqual(['randomize']);
    r.keys.down('byp'); expect(r.log).toEqual(['randomize']); r.keys.up('byp'); expect(r.log).toEqual(['randomize', 'toggleBypass']);
  });
  it('Random held 0.25 s shows membership and ranges; a quick tap does not', () => {
    const r = rig(); r.tap('rnd', 100); expect(r.log).toEqual(['randomize']);
    const q = rig(); q.keys.down('rnd'); q.wait(260); expect(q.log).toEqual(['members:true']); q.keys.up('rnd'); expect(q.log).toEqual(['members:true', 'members:false', 'randomize']);
  });
  it('a modifier used on a control does not also do its own action', () => {
    const r = rig(); r.keys.down('rnd'); r.keys.use('rnd'); r.keys.up('rnd'); r.keys.down('byp'); r.keys.use('byp'); r.keys.up('byp'); expect(r.log).toEqual([]);
  });
  it('Random + Bypass sets every range to full, in either order, once; with Shift too', () => {
    for (const order of [['rnd', 'byp'], ['byp', 'rnd']]) {
      const r = rig(); r.keys.down(order[0]); r.keys.down(order[1]); r.keys.up(order[0]); r.keys.up(order[1]); expect(r.log).toEqual(['fullRanges']);
    }
    const s = rig(); s.keys.down('sh'); s.keys.down('rnd'); s.keys.down('byp'); s.keys.up('byp'); s.keys.up('rnd'); s.keys.up('sh'); expect(s.log).toEqual(['fullRanges']);
  });
  it('Shift + Bypass opens settings at once, as Bypass goes down; the releases do nothing', () => {
    const r = rig(); r.keys.down('sh'); r.keys.down('byp'); expect(r.log).toEqual(['settings']); r.keys.up('byp'); r.keys.up('sh'); expect(r.log).toEqual(['settings']);
  });
  it('in settings, Bypass keeps and Shift cancels, as they go down', () => {
    const k = rig({ settings: true }); k.keys.down('byp'); expect(k.log).toEqual(['keep']); k.keys.up('byp'); expect(k.log).toEqual(['keep']);
    const c = rig({ settings: true }); c.keys.down('sh'); expect(c.log).toEqual(['cancel']); c.keys.up('sh'); c.tap('rnd'); expect(c.log).toEqual(['cancel', 'randomize']);
  });
  it('no double-tap or hold functions remain: Shift + Random taps just randomize, Shift + Bypass held long is still only settings', () => {
    const r = rig(); r.keys.down('sh'); r.tap('rnd'); r.wait(100); r.tap('rnd'); r.keys.up('sh'); expect(r.log).toEqual(['randomize', 'randomize']);
    const b = rig(); b.keys.down('sh'); b.keys.down('byp'); b.wait(4000); b.keys.up('byp'); b.keys.up('sh'); expect(b.log).toEqual(['settings']);
  });
  it('in assignment mode: tap Random = random assignments, tap Bypass = clear, hold 0.8 s = assign the key', () => {
    const r = rig({ asg: true }); r.tap('rnd'); r.tap('byp'); r.tap('rnd', HOLD_ASSIGN); r.tap('byp', HOLD_ASSIGN + 50);
    expect(r.log).toEqual(['asgRandom', 'asgClear', 'asgKey:kRnd', 'asgKey:kByp']);
  });
  it('losing focus forgets every held key: nothing fires', () => {
    const r = rig(); r.keys.down('byp'); r.keys.down('rnd'); r.keys.clear(); r.wait(4000); r.keys.up('rnd'); r.keys.up('byp'); expect(r.log).toEqual([]);
  });
});

describe('Random ranges around the hand-set value', () => {
  const seq = s => () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  it('bipolar: within home ± range, cut at the ends', () => {
    const rand = seq(1);
    for (let t = 0; t < 2000; t++) { const home = rand(), amt = minAmount() + rand() * (1 - minAmount()), x = pickRandom({ home, amt, pol: 0, rand });
      expect(x).toBeGreaterThanOrEqual(Math.max(0, home - amt) - 1e-9); expect(x).toBeLessThanOrEqual(Math.min(1, home + amt) + 1e-9); }
  });
  it('unipolar: positive ranges only go up from the hand-set value, negative ones only down', () => {
    const rand = seq(2);
    for (let t = 0; t < 2000; t++) { const home = rand(), amt = (rand() < 0.5 ? -1 : 1) * (0.1 + rand() * 0.9), x = pickRandom({ home, amt, pol: 1, rand });
      if (amt > 0) { expect(x).toBeGreaterThanOrEqual(home - 1e-9); expect(x).toBeLessThanOrEqual(Math.min(1, home + amt) + 1e-9); }
      else { expect(x).toBeLessThanOrEqual(home + 1e-9); expect(x).toBeGreaterThanOrEqual(Math.max(0, home + amt) - 1e-9); } }
  });
  it('full bipolar reaches the whole throw from anywhere', () => { expect(randomWindow(0.9, 1, 0)).toEqual([0, 1]); expect(randomWindow(0, 1, 0)).toEqual([0, 1]); });
  it('a range never shrinks below one LED (or one step); unipolar ranges jump across noon instead of reaching zero', () => {
    expect(turnAmount(0.1, -0.5, 0)).toBeCloseTo(1 / 14, 9);
    expect(turnAmount(0.4, -0.2, 0, 4)).toBeCloseTo(1 / 3, 9);
    expect(turnAmount(1 / 14, -0.01, 1)).toBeCloseTo(-1 / 14 - 0.01, 9);
    expect(turnAmount(-1 / 14, 0.01, 1)).toBeCloseTo(1 / 14 + 0.01, 9);
    expect(turnAmount(0.9, 0.5, 1)).toBe(1); expect(turnAmount(-0.9, -0.5, 1)).toBe(-1);
  });
  it('stepped settings always pick a step within the range, and the neighbouring step is always reachable', () => {
    const rand = seq(4); let moved = 0;
    for (let t = 0; t < 1000; t++) { const x = pickRandom({ home: 5 / 11, amt: minAmount(12), pol: 0, n: 12, rand }); expect(Math.abs(x * 11 - Math.round(x * 11))).toBeLessThan(1e-9); expect(Math.abs(x * 11 - 5)).toBeLessThanOrEqual(1 + 1e-9); if (Math.round(x * 11) !== 5) moved++; }
    expect(moved).toBeGreaterThan(500);
  });
  it('the ring while Random is held: the home LED, then at least one amber LED on each side that the range covers', () => {
    expect(rangeLeds(0.5, 1 / 14, 0)).toEqual({ home: 7, amber: [6, 8] });
    expect(rangeLeds(0.5, 3 / 14, 1)).toEqual({ home: 7, amber: [8, 9, 10] });
    expect(rangeLeds(0.5, -2 / 14, 1)).toEqual({ home: 7, amber: [5, 6] });
    expect(rangeLeds(0, 1, 0).amber.length).toBe(14);
  });
  it('the settings page shows the range type around noon', () => {
    expect(polarityLeds(1)).toEqual({ home: 7, amber: [8, 9, 10, 11, 12, 13, 14] });
    expect(polarityLeds(0).amber.length).toBe(14);
  });
});

describe('Moment Freeze key', () => {
  const freezeRig = (mom = false) => {
    const m = { sh: false, rnd: false, byp: false }, st = { on: false, latched: false, asg: false, mom }, log = [];
    const k = createFreezeKey({ mods: () => m, use: w => log.push('use:' + w), asgOn: () => st.asg, asgKey: t => log.push('asg:' + t), momentary: () => st.mom, isOn: () => st.on,
      capture: how => { st.on = st.latched = true; log.push('capture:' + how); }, release: () => { st.on = st.latched = false; log.push('release'); },
      holdDown: () => { st.on = true; log.push('hold'); }, holdUp: () => { st.on = false; log.push('unhold'); }, toggleRandomLatch: () => log.push('randomLatch') });
    return { k, m, st, log };
  };
  it('Latch: tap on, tap off, acting on press; Shift + Freeze is a fresh capture', () => {
    const r = freezeRig(); r.k.down(); expect(r.log).toEqual(['capture:on']); r.k.up(); r.k.down(); r.k.up(); expect(r.log).toEqual(['capture:on', 'release']);
    r.m.sh = true; r.k.down(); r.k.up(); r.k.down(); expect(r.log).toEqual(['capture:on', 'release', 'capture:fresh', 'capture:fresh']);
  });
  it('Mom: frozen while held, with or without Shift', () => {
    const r = freezeRig(true); r.k.down(); expect(r.st.on).toBe(true); r.k.up(); expect(r.st.on).toBe(false);
    r.m.sh = true; r.k.down(); r.k.up(); expect(r.log).toEqual(['hold', 'unhold', 'hold', 'unhold']);
  });
  it('switching to Latch while held keeps the freeze when the key is let go', () => {
    const r = freezeRig(true); r.k.down(); r.st.mom = false; r.k.up(); expect(r.log).toEqual(['hold']);
  });
  it('Random + Freeze = Random may freeze; Bypass + Freeze does nothing; assignment mode assigns', () => {
    const r = freezeRig(); r.m.rnd = true; r.k.down(); r.m.rnd = false; r.m.byp = true; r.k.down(); r.m.byp = false; r.st.asg = true; r.k.down();
    expect(r.log).toEqual(['use:rnd', 'randomLatch', 'use:byp', 'asg:kFrz']);
  });
});
