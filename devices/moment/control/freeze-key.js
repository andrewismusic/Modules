// Moment's Freeze key (devices/moment/SPEC.md). It acts on press, unlike Random and Bypass, because it is played.
// - Tap: latch on / off (always a toggle).
// - Shift + Freeze: momentary (frozen while held), if not already latched.
// - Bypass + Freeze: fresh capture, staying frozen.
// - Random + Freeze: let Random also freeze, re-capture or release (on / off).
// - In CV assignment mode a tap assigns the key to the jack.
// The modifier used is marked (h.use) so it does not also do its own action.
export function createFreezeKey(h){
  let mom=false;
  const down=()=>{mom=false;const m=h.mods();
    if(h.asgOn()){h.asgKey('kFrz');return;}
    if(m.rnd){h.use('rnd');h.toggleRandomLatch();return;}
    if(m.byp){h.use('byp');h.capture('fresh');return;}
    if(m.sh){h.use('sh');if(!h.latched()){mom=true;h.holdDown();}return;}
    if(h.isOn())h.release();else h.capture('on');};
  const up=()=>{if(mom){mom=false;h.holdUp();}};
  return{down,up,clear:()=>{if(mom){mom=false;h.holdUp();}}};
}
