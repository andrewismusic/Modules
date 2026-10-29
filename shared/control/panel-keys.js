// Key grammar shared by Moment and Prism (docs/design-language.md).
// - Shift is a held modifier. Random and Bypass act on release.
// - Random held 0.25 s shows Random membership and ranges (h.showMembership). A tap on its own randomizes.
// - Random + Bypass = every random range back to full (whichever order; on release).
// - Shift + Bypass = settings, as Bypass goes down (like Relay's menu); the releases that follow do nothing.
//   In settings Bypass = keep and exit, Shift = cancel, both as they go down.
// - In CV assignment mode: tap Random = random assignments, tap Bypass = clear the jack; holding either 0.8 s assigns
//   that key to the jack instead.
// - A key used in a combination (or on a control, via use()) never also does its own action.
// The device's own key (Moment Freeze, Prism Order) and the encoders read mods() and call use().
export const HOLD_MEMBERSHIP=250,HOLD_ASSIGN=800;

export function createPanelKeys(h,{now=()=>performance.now(),after=(ms,f)=>{const t=setTimeout(f,ms);return()=>clearTimeout(t);}}={}){
  const K={sh:false,rnd:false,byp:false,rv:false,usedR:false,usedB:false,combo:false,rbDone:false,bypSet:false,asgR:null,asgB:null};
  let cancelRv=()=>{};
  const comboStart=()=>{K.combo=true;K.rbDone=false;};
  const comboRelease=()=>{if(!K.rbDone){h.fullRanges();K.rbDone=true;}if(!K.rnd&&!K.byp)K.combo=false;};
  const shDown=()=>{if(K.sh)return;if(h.inSettings()){h.exitSettings(false);return;}K.sh=true;h.changed();};
  const shUp=()=>{if(!K.sh)return;K.sh=false;h.changed();};
  const rndDown=()=>{if(K.rnd||K.asgR!==null)return;if(h.inSettings())return;if(h.asgOn()){K.asgR=now();return;}
    K.rnd=true;K.usedR=false;K.rv=false;cancelRv();cancelRv=after(HOLD_MEMBERSHIP,()=>{if(K.rnd){K.rv=true;h.showMembership(true);}});if(K.byp)comboStart();};
  const rndUp=()=>{
    if(K.asgR!==null){const held=now()-K.asgR;K.asgR=null;if(held>=HOLD_ASSIGN)h.asgKey('kRnd');else h.asgRandom();return;}
    if(!K.rnd)return;K.rnd=false;cancelRv();if(K.rv){K.rv=false;h.showMembership(false);}if(K.combo){comboRelease();return;}
    if(!K.usedR)h.randomize();};
  const bypDown=()=>{if(K.byp||K.asgB!==null||K.bypSet)return;
    if(h.inSettings()){h.exitSettings(true);K.bypSet=true;return;}
    if(h.asgOn()){K.asgB=now();return;}
    if(K.sh&&!K.rnd){K.bypSet=true;h.enterSettings();return;}
    K.byp=true;K.usedB=false;if(K.rnd)comboStart();};
  const bypUp=()=>{if(K.bypSet){K.bypSet=false;return;}
    if(K.asgB!==null){const held=now()-K.asgB;K.asgB=null;if(held>=HOLD_ASSIGN)h.asgKey('kByp');else h.asgClear();return;}
    if(!K.byp)return;K.byp=false;if(K.combo){comboRelease();return;}
    if(!K.usedB)h.toggleBypass();};
  /* forget every held key (window lost focus): nothing fires */
  const clear=()=>{cancelRv();const rv=K.rv;Object.assign(K,{sh:false,rnd:false,byp:false,rv:false,combo:false,asgR:null,asgB:null,bypSet:false});if(rv)h.showMembership(false);h.changed();};
  const down=w=>({sh:shDown,rnd:rndDown,byp:bypDown})[w](),up=w=>({sh:shUp,rnd:rndUp,byp:bypUp})[w]();
  /* a control acted while a modifier was held: the modifier must not also do its own action */
  const use=w=>{if(w==='rnd')K.usedR=true;else if(w==='byp')K.usedB=true;};
  /* Random + turn on an included control sets its range: the range display comes on at once */
  const showRanges=()=>{if(K.rnd&&!K.rv){cancelRv();K.rv=true;h.showMembership(true);}};
  return{down,up,clear,use,showRanges,mods:()=>({sh:K.sh,rnd:K.rnd,byp:K.byp,rv:K.rv}),isDown:w=>!!K[w]};
}
