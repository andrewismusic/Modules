// Moment's Freeze key (devices/moment/SPEC.md). It acts on press (decided 2026-10-25), unlike Random and Bypass.
// The Latch / Temp switch (h.momentary()) decides what a press does:
// - Latch: tap = freeze on / off; Bypass + Freeze = fresh capture (a new freeze, staying frozen).
// - Temp: frozen while held (each press is a fresh capture); Bypass + Freeze does the same.
// - Random + Freeze: let Random also freeze, re-capture or release (on / off).
// - Shift does not change the Freeze key, so encoders' main layers stay reachable while Shift is free.
// - The modifier used is marked (h.use), so Bypass does not also toggle bypass.
// - In CV assignment mode a tap assigns the key to the jack.
// If the switch goes to Latch while the key is held, the freeze stays on when the key is let go.
export function createFreezeKey(h){
  let mom=false;
  const down=()=>{mom=false;const m=h.mods();
    if(h.asgOn()){h.asgKey('kFrz');return;}
    if(m.rnd){h.use('rnd');h.toggleRandomLatch();return;}
    if(m.byp)h.use('byp');
    if(h.momentary()){mom=true;h.holdDown();return;}
    if(m.byp){h.capture('fresh');return;}
    if(h.isOn())h.release();else h.capture('on');};
  const up=()=>{if(mom){mom=false;if(h.momentary())h.holdUp();}};
  return{down,up,clear:()=>{if(mom){mom=false;h.holdUp();}}};
}
