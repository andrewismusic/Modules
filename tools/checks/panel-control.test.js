// Moment / Prism panel logic: key grammar (shared/control/panel-keys.js), Random's choice rule
// (shared/control/random-pick.js) and Moment's Freeze key (devices/moment/control/freeze-key.js).
import { describe, it, expect } from 'vitest';
import { createPanelKeys, HOLD_ASSIGN } from '../../shared/control/panel-keys.js';
import { pickRandom } from '../../shared/control/random-pick.js';
import { createFreezeKey } from '../../devices/moment/control/freeze-key.js';

/* a manual clock: timers fire when time is advanced past them */
function rig(over = {}) {
  let t = 0; const timers = [], log = [];
  const st = { settings: false, asg: false, ...over };
  const h = new Proxy({ inSettings: () => st.settings, hasSettings: () => !!st.hasSettings, asgOn: () => st.asg, enterSettings: () => { st.settings = true; log.push('settings'); },
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
  it('Random + Bypass does nothing yet: neither key acts, in either order', () => {
    for (const order of [['rnd', 'byp'], ['byp', 'rnd']]) {
      const r = rig(); r.keys.down(order[0]); r.keys.down(order[1]); r.keys.up(order[0]); r.keys.up(order[1]); expect(r.log).toEqual([]);
    }
  });
  it('without a settings page, Shift does not change Bypass (and no double-tap or hold functions remain)', () => {
    const r = rig(); r.keys.down('sh'); r.tap('byp'); r.keys.up('sh'); expect(r.log).toEqual(['toggleBypass']);
    const b = rig(); b.keys.down('sh'); b.tap('rnd'); b.wait(100); b.tap('rnd'); b.keys.down('byp'); b.wait(4000); b.keys.up('byp'); b.keys.up('sh'); expect(b.log).toEqual(['randomize', 'randomize', 'toggleBypass']);
  });
  it('a device with a settings page opens it with Shift + Bypass as Bypass goes down; Bypass keeps and Shift cancels', () => {
    const r = rig({ hasSettings: true }); r.keys.down('sh'); r.keys.down('byp'); expect(r.log).toEqual(['settings']); r.keys.up('byp'); r.keys.up('sh'); expect(r.log).toEqual(['settings']);
    const k = rig({ settings: true }); k.keys.down('byp'); expect(k.log).toEqual(['keep']); k.keys.up('byp'); expect(k.log).toEqual(['keep']);
    const c = rig({ settings: true }); c.keys.down('sh'); expect(c.log).toEqual(['cancel']);
  });
  it('in assignment mode: tap Random = random assignments, tap Bypass = clear, hold 0.8 s = assign the key', () => {
    const r = rig({ asg: true }); r.tap('rnd'); r.tap('byp'); r.tap('rnd', HOLD_ASSIGN); r.tap('byp', HOLD_ASSIGN + 50);
    expect(r.log).toEqual(['asgRandom', 'asgClear', 'asgKey:kRnd', 'asgKey:kByp']);
  });
  it('losing focus forgets every held key: nothing fires', () => {
    const r = rig(); r.keys.down('byp'); r.keys.down('rnd'); r.keys.clear(); r.wait(4000); r.keys.up('rnd'); r.keys.up('byp'); expect(r.log).toEqual([]);
  });
});

describe('Random', () => {
  const seq = s => () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  it('continuous parameters can land anywhere in their throw', () => {
    const rand = seq(1), xs = []; for (let t = 0; t < 4000; t++) xs.push(pickRandom({ rand }));
    expect(Math.min(...xs)).toBeLessThan(0.01); expect(Math.max(...xs)).toBeGreaterThan(0.99);
  });
  it('stepped settings and buttons pick each step about equally', () => {
    const rand = seq(2), c = [0, 0, 0, 0];
    for (let t = 0; t < 4000; t++) { const x = pickRandom({ n: 4, rand }); expect(Math.abs(x * 3 - Math.round(x * 3))).toBeLessThan(1e-9); c[Math.round(x * 3)]++; }
    for (const k of c) expect(Math.abs(k - 1000)).toBeLessThan(120);
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
  it('Latch: tap on, tap off, acting on press; Bypass + Freeze is a fresh capture; Shift changes nothing', () => {
    const r = freezeRig(); r.k.down(); expect(r.log).toEqual(['capture:on']); r.k.up(); r.k.down(); r.k.up(); expect(r.log).toEqual(['capture:on', 'release']);
    r.m.byp = true; r.k.down(); r.k.up(); r.k.down(); r.m.byp = false; expect(r.log).toEqual(['capture:on', 'release', 'use:byp', 'capture:fresh', 'use:byp', 'capture:fresh']);
    r.m.sh = true; r.k.down(); expect(r.log.at(-1)).toBe('release');
  });
  it('Temp: frozen while held, with or without Bypass', () => {
    const r = freezeRig(true); r.k.down(); expect(r.st.on).toBe(true); r.k.up(); expect(r.st.on).toBe(false);
    r.m.byp = true; r.k.down(); r.k.up(); expect(r.log).toEqual(['hold', 'unhold', 'use:byp', 'hold', 'unhold']);
  });
  it('switching to Latch while held keeps the freeze when the key is let go', () => {
    const r = freezeRig(true); r.k.down(); r.st.mom = false; r.k.up(); expect(r.log).toEqual(['hold']);
  });
  it('Random + Freeze = Random may freeze; assignment mode assigns', () => {
    const r = freezeRig(); r.m.rnd = true; r.k.down(); r.m.rnd = false; r.st.asg = true; r.k.down();
    expect(r.log).toEqual(['use:rnd', 'randomLatch', 'asg:kFrz']);
  });
});
