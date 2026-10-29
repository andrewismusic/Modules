// Moment's Freeze key (devices/moment/SPEC.md). It acts on press (decided 2026-10-25), unlike Random and Bypass.
// The Latch / Mom switch (h.momentary()) decides what a press does:
// - Latch: tap = freeze on / off; Shift + Freeze = fresh capture (a new freeze, staying frozen).
// - Mom: frozen while held (each press is a fresh capture); Shift + Freeze does the same.
// - Random + Freeze: let Random also freeze, re-capture or release (on / off).
// - Bypass + Freeze: nothing (Bypass does not toggle either).
// - In CV assignment mode a tap assigns the key to the jack.
// If the switch goes to Latch while the key is held, the freeze stays on when the key is let go.
export function createFreezeKey(h){
  let mom=false;
  const down=()=>{mom=false;const m=h.mods();
    if(h.asgOn()){h.asgKey('kFrz');return;}
    if(m.rnd){h.use('rnd');h.toggleRandomLatch();return;}
    if(m.byp){h.use('byp');return;}
    if(h.momentary()){mom=true;h.holdDown();return;}
    if(m.sh){h.capture('fresh');return;}
    if(h.isOn())h.release();else h.capture('on');};
  const up=()=>{if(mom){mom=false;if(h.momentary())h.holdUp();}};
  return{down,up,clear:()=>{if(mom){mom=false;h.holdUp();}}};
}
