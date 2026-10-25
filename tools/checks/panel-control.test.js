// Moment / Prism panel logic: key grammar (shared/control/panel-keys.js), Random's choice rule
// (shared/control/random-pick.js) and Moment's Freeze key (devices/moment/control/freeze-key.js).
import { describe, it, expect } from 'vitest';
import { createPanelKeys, HOLD_SETTINGS, HOLD_ASSIGN } from '../../shared/control/panel-keys.js';
import { pickRandom } from '../../shared/control/random-pick.js';
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
  it('Random held 0.25 s shows membership; a quick tap does not', () => {
    const r = rig(); r.tap('rnd', 100); expect(r.log).toEqual(['randomize']);
    const q = rig(); q.keys.down('rnd'); q.wait(260); expect(q.log).toEqual(['members:true']); q.keys.up('rnd'); expect(q.log).toEqual(['members:true', 'members:false', 'randomize']);
  });
  it('a modifier used on a control does not also do its own action', () => {
    const r = rig(); r.keys.down('rnd'); r.keys.use('rnd'); r.keys.up('rnd'); r.keys.down('byp'); r.keys.use('byp'); r.keys.up('byp'); expect(r.log).toEqual([]);
  });
  it('Random + Bypass resets assignments; Shift + Random + Bypass gives full ranges; in either order, once', () => {
    for (const order of [['rnd', 'byp'], ['byp', 'rnd']]) {
      const r = rig(); r.keys.down(order[0]); r.keys.down(order[1]); r.keys.up(order[0]); r.keys.up(order[1]); expect(r.log).toEqual(['resetAssign']);
      const s = rig(); s.keys.down('sh'); s.keys.down(order[0]); s.keys.down(order[1]); s.keys.up(order[1]); s.keys.up(order[0]); s.keys.up('sh'); expect(s.log).toEqual(['fullRanges']);
    }
  });
  it('Shift + double-tap Random shuffles; Shift + double-tap Bypass initializes; a single Shift tap only hints', () => {
    const r = rig(); r.keys.down('sh'); r.tap('rnd'); r.wait(100); r.tap('rnd'); r.keys.up('sh'); expect(r.log).toEqual(['hint:shuffle', 'shuffle']);
    const b = rig(); b.keys.down('sh'); b.tap('byp'); b.wait(100); b.tap('byp'); b.keys.up('sh'); expect(b.log).toEqual(['hint:init', 'init']);
    const slow = rig(); slow.keys.down('sh'); slow.tap('byp'); slow.wait(600); slow.tap('byp'); expect(slow.log).toEqual(['hint:init', 'hint:init']);
  });
  it('Shift + Bypass held 3 s enters settings; Bypass then keeps (on press), Shift cancels', () => {
    const r = rig(); r.keys.down('sh'); r.keys.down('byp'); r.wait(HOLD_SETTINGS - 10); expect(r.log).toEqual([]); r.wait(20); expect(r.log).toEqual(['settings']);
    r.keys.up('byp'); r.keys.up('sh'); expect(r.log).toEqual(['settings']);
    r.keys.down('byp'); expect(r.log).toEqual(['settings', 'keep']); r.keys.up('byp'); expect(r.log).toEqual(['settings', 'keep']);
    const c = rig({ settings: true }); c.keys.down('sh'); expect(c.log).toEqual(['cancel']); c.keys.up('sh'); c.tap('rnd'); expect(c.log).toEqual(['cancel', 'randomize']);
  });
  it('Shift + Bypass released before 3 s is a (first) initialize tap, not settings', () => {
    const r = rig(); r.keys.down('sh'); r.keys.down('byp'); r.wait(1000); r.keys.up('byp'); r.wait(3000); r.keys.up('sh'); expect(r.log).toEqual(['hint:init']);
  });
  it('in assignment mode: tap Random = random assignments, tap Bypass = clear, hold 0.8 s = assign the key', () => {
    const r = rig({ asg: true }); r.tap('rnd'); r.tap('byp'); r.tap('rnd', HOLD_ASSIGN); r.tap('byp', HOLD_ASSIGN + 50);
    expect(r.log).toEqual(['asgRandom', 'asgClear', 'asgKey:kRnd', 'asgKey:kByp']);
  });
  it('losing focus forgets every held key: nothing fires', () => {
    const r = rig(); r.keys.down('sh'); r.keys.down('byp'); r.keys.down('rnd'); r.keys.clear(); r.wait(4000); r.keys.up('rnd'); r.keys.up('byp'); r.keys.up('sh'); expect(r.log).toEqual([]);
  });
  it('Random first, then Shift: Shift sets the lower limit instead of showing second layers', () => {
    const r = rig(); r.keys.down('rnd'); r.keys.down('sh'); expect(r.keys.mods().shRange).toBe(true);
    const s = rig(); s.keys.down('sh'); s.keys.down('rnd'); expect(s.keys.mods().shRange).toBe(false);
  });
});

describe('Random choice rule', () => {
  const seq = s => () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  it('stays inside the Deviation window and the random range', () => {
    const rand = seq(1);
    for (let t = 0; t < 2000; t++) {
      const lo = rand() * 0.5, hi = 0.5 + rand() * 0.5, A = 0.1 + rand() * 0.9, cur = rand();
      const x = pickRandom({ cur, lo, hi, A, rand });
      expect(x).toBeGreaterThanOrEqual(lo - 1e-9); expect(x).toBeLessThanOrEqual(hi + 1e-9);
      const c = Math.min(Math.max(cur, lo), hi); expect(Math.abs(x - c)).toBeLessThanOrEqual(A * (hi - lo) + 1e-9);
    }
  });
  it('Distinct mode lands at least a third of the window away', () => {
    const rand = seq(2);
    for (let t = 0; t < 2000; t++) { const cur = rand(), A = 0.1 + rand() * 0.9, x = pickRandom({ cur, lo: 0, hi: 1, A, distinct: true, rand });
      const a0 = Math.max(0, Math.min(Math.max(0, cur - A / 2), 1 - A)), b0 = Math.min(1, Math.max(Math.min(1, cur + A / 2), A));
      expect(Math.abs(x - cur)).toBeGreaterThanOrEqual((b0 - a0) / 3 - 1e-9); }
  });
  it('a two-state button changes about half the time, even at minimum Deviation', () => {
    const rand = seq(3); let ch = 0;
    for (let t = 0; t < 4000; t++) if (pickRandom({ cur: 0, lo: 0, hi: 1, A: 0.1, n: 2, rand }) === 1) ch++;
    expect(ch / 4000).toBeGreaterThan(0.45); expect(ch / 4000).toBeLessThan(0.55);
  });
  it('stepped settings always pick a step', () => {
    const rand = seq(4);
    for (let t = 0; t < 500; t++) { const x = pickRandom({ cur: rand(), lo: 0, hi: 1, A: rand(), n: 12, rand }); expect(Math.abs(x * 11 - Math.round(x * 11))).toBeLessThan(1e-9); }
  });
});

describe('Moment Freeze key', () => {
  const freezeRig = () => {
    const m = { sh: false, rnd: false, byp: false }, st = { on: false, latched: false, asg: false }, log = [];
    const k = createFreezeKey({ mods: () => m, use: w => log.push('use:' + w), asgOn: () => st.asg, asgKey: t => log.push('asg:' + t), latched: () => st.latched, isOn: () => st.on,
      capture: how => { st.on = st.latched = true; log.push('capture:' + how); }, release: () => { st.on = st.latched = false; log.push('release'); },
      holdDown: () => { st.on = true; log.push('hold'); }, holdUp: () => { st.on = false; log.push('unhold'); }, toggleRandomLatch: () => log.push('randomLatch') });
    return { k, m, st, log };
  };
  it('tap latches on, tap again releases; it acts on press', () => {
    const r = freezeRig(); r.k.down(); expect(r.log).toEqual(['capture:on']); r.k.up(); r.k.down(); r.k.up(); expect(r.log).toEqual(['capture:on', 'release']);
  });
  it('Shift + Freeze is momentary', () => {
    const r = freezeRig(); r.m.sh = true; r.k.down(); expect(r.st.on).toBe(true); r.k.up(); expect(r.st.on).toBe(false); expect(r.log).toEqual(['use:sh', 'hold', 'unhold']);
  });
  it('Bypass + Freeze = fresh capture; Random + Freeze = Random may freeze; assignment mode assigns', () => {
    const r = freezeRig(); r.m.byp = true; r.k.down(); r.m.byp = false; r.m.rnd = true; r.k.down(); r.st.asg = true; r.k.down();
    expect(r.log).toEqual(['use:byp', 'capture:fresh', 'use:rnd', 'randomLatch', 'asg:kFrz']);
  });
});
