// Key grammar shared by Moment and Prism (docs/design-language.md). Moved from the v30 prototype's makePanelModule.
// - Shift is a held modifier. Random and Bypass act on release.
// - Random held 0.25 s shows Random membership (h.showMembership). A tap on its own randomizes.
// - Random + Bypass = reset assignments; Shift + Random + Bypass = full random ranges (whichever order; on release).
// - Shift + double-tap Random = shuffle assignments; Shift + double-tap Bypass = initialize (taps within 0.45 s).
// - Shift + Bypass held 3 s = settings mode. In settings mode Bypass = keep and exit (on press), Shift = cancel.
// - In CV assignment mode: tap Random = random assignments, tap Bypass = clear the jack; holding either 0.8 s assigns
//   that key to the jack instead.
// - A key used in a combination (or on a control, via use()) never also does its own action.
// The device's own key (Moment Freeze, Prism Order) and the encoders read mods() and call use().
export const HOLD_MEMBERSHIP=250,DOUBLE_TAP=450,HOLD_SETTINGS=3000,HOLD_ASSIGN=800;

export function createPanelKeys(h,{now=()=>performance.now(),after=(ms,f)=>{const t=setTimeout(f,ms);return()=>clearTimeout(t);}}={}){
  const K={sh:false,rnd:false,byp:false,rv:false,shRange:false,usedSh:false,usedR:false,usedB:false,shAtR:false,shAtB:false,
    combo:false,rbDone:false,bypSet:false,asgR:null,asgB:null,tR:-Infinity,tB:-Infinity};
  let cancelRv=()=>{},cancelSet=()=>{};
  const dbl=key=>{const t=now(),hit=t-K[key]<DOUBLE_TAP;K[key]=hit?-Infinity:t;return hit;};
  const comboStart=()=>{K.combo=true;K.rbDone=false;};
  const comboRelease=()=>{if(!K.rbDone){if(K.sh){K.usedSh=true;h.fullRanges();}else h.resetAssign();K.rbDone=true;}if(!K.rnd&&!K.byp)K.combo=false;};
  const shDown=()=>{if(K.sh)return;if(h.inSettings()){h.exitSettings(false);return;}K.sh=true;K.usedSh=false;K.shRange=K.rnd;h.changed();};
  const shUp=()=>{if(!K.sh)return;K.sh=false;K.shRange=false;h.changed();};
  const rndDown=()=>{if(K.rnd||K.asgR!==null)return;if(h.inSettings())return;if(h.asgOn()){K.asgR=now();return;}
    K.rnd=true;K.usedR=false;K.shAtR=K.sh;K.rv=false;cancelRv();cancelRv=after(HOLD_MEMBERSHIP,()=>{if(K.rnd){K.rv=true;h.showMembership(true);}});if(K.byp)comboStart();};
  const rndUp=()=>{if(h.inSettings()&&!K.rnd)return;
    if(K.asgR!==null){const held=now()-K.asgR;K.asgR=null;if(held>=HOLD_ASSIGN)h.asgKey('kRnd');else h.asgRandom();return;}
    if(!K.rnd)return;K.rnd=false;cancelRv();if(K.rv){K.rv=false;h.showMembership(false);}if(K.combo){comboRelease();return;}
    if(K.usedR)return;if(K.shAtR){K.usedSh=true;if(dbl('tR'))h.shuffle();else h.hint('shuffle');}else h.randomize();};
  const bypDown=()=>{if(K.byp||K.asgB!==null||K.bypSet)return;if(h.inSettings()){h.exitSettings(true);K.bypSet=true;return;}if(h.asgOn()){K.asgB=now();return;}
    K.byp=true;K.usedB=false;K.shAtB=K.sh;if(K.rnd)comboStart();
    cancelSet();if(K.sh)cancelSet=after(HOLD_SETTINGS,()=>{if(K.byp&&K.sh&&!K.combo){K.usedB=true;K.usedSh=true;h.enterSettings();}});};
  const bypUp=()=>{cancelSet();if(K.bypSet){K.bypSet=false;return;}
    if(K.asgB!==null){const held=now()-K.asgB;K.asgB=null;if(held>=HOLD_ASSIGN)h.asgKey('kByp');else h.asgClear();return;}
    if(!K.byp)return;K.byp=false;if(K.combo){comboRelease();return;}
    if(K.usedB)return;if(K.shAtB){K.usedSh=true;if(dbl('tB'))h.init();else h.hint('init');}else h.toggleBypass();};
  /* forget every held key (window lost focus): nothing fires */
  const clear=()=>{cancelRv();cancelSet();const rv=K.rv;Object.assign(K,{sh:false,rnd:false,byp:false,rv:false,shRange:false,combo:false,asgR:null,asgB:null,bypSet:false});if(rv)h.showMembership(false);h.changed();};
  const down=w=>({sh:shDown,rnd:rndDown,byp:bypDown})[w](),up=w=>({sh:shUp,rnd:rndUp,byp:bypUp})[w]();
  /* a control acted while a modifier was held: the modifier must not also do its own action */
  const use=w=>{if(w==='rnd')K.usedR=true;else if(w==='byp')K.usedB=true;else if(w==='sh')K.usedSh=true;};
  /* Random + turn on an included control sets a limit: the membership display comes on at once */
  const showRanges=()=>{if(K.rnd&&!K.rv){cancelRv();K.rv=true;h.showMembership(true);}};
  return{down,up,clear,use,showRanges,mods:()=>({sh:K.sh,rnd:K.rnd,byp:K.byp,rv:K.rv,shRange:K.shRange}),isDown:w=>!!K[w]};
}
