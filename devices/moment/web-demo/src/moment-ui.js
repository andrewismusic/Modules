// Moment's panel: the shared panel module (shared/ui-web/panel-module.js) with Moment's controls
// (../../control/moment-defs.js), the Freeze key (../../control/freeze-key.js), the Latch / Mom and Man / Roll switches,
// and what Random may do to the freeze.
import { makePanelModule } from '../../../../shared/ui-web/panel-module.js';
import { momentDescs, momentPreSync, LAYOUT, RND_DEF } from '../../control/moment-defs.js';
import { createFreezeKey } from '../../control/freeze-key.js';
import { state, saveState } from './state.js';
import { send, ensureAudio } from './audio.js';

const $=s=>document.querySelector(s);
export const FR=()=>state.fr;
export const clocked=()=>state.clock.toFr;
export const read=(l,v)=>{$('#frRead').textContent=`${l}: ${v}`;};

/* freeze actions */
export function holdDown(){const s=FR();if(s.held)return;ensureAudio();s.held=true;send(s.latched?{type:'reseed'}:{type:'freeze',v:true});MOM.refreshKeys();}
export function holdUp(){const s=FR();if(!s.held)return;s.held=false;s.latched=false;send({type:'freeze',v:false});MOM.refreshKeys();}
export function capture(){ensureAudio();FR().latched=true;send({type:'reseed'});MOM.refreshKeys();}
export function release(){const s=FR();if(s.held||!s.latched)return;s.latched=false;send({type:'freeze',v:false});MOM.refreshKeys();}
/* the Freeze jack follows the Latch / Mom switch: a trigger toggles the latch, or a gate freezes while high */
export function freezeJack(hi,edge){const s=FR();if(s.mom){if(hi)holdDown();else holdUp();}else if(hi&&edge){if(s.latched||s.held)release();else capture();}}

export const MOM=makePanelModule({id:'fr',name:'Moment',msg:'fz',mod:'#modFr',clocked,
  keys:{rnd:'#kFrRnd',byp:'#kFrByp',sh:'#kFrSh'},keyT:{kFrz:'#kFrz',kRnd:'#kFrRnd',kByp:'#kFrByp'},
  descs:momentDescs({clocked,bpm:()=>state.clock.bpm}),layout:LAYOUT,rndDef:RND_DEF,
  /* Random + Freeze turned on (Latch only): each Random press may also freeze, re-capture or release (90% of the time);
     never while Freeze is held */
  onRandom:(M,said)=>{const s=M.s();if(s.rnd.latch&&!s.mom&&!s.held&&Math.random()<0.9){if(s.latched){if(Math.random()<0.5){release();said.push('freeze released');}else{capture();said.push('fresh freeze');}}else{capture();said.push('frozen');}}},
  preSync:M=>momentPreSync(M,clocked(),state.clock.bpm),
  /* Freeze light: steady when frozen in Manual, pulsing when frozen in Rolling, off when not frozen; amber while
     Random is held if Random may freeze, breathing toward amber while frozen if it may */
  refreshKeys:M=>{const s=M.s(),k=$('#kFrz'),on=s.held||s.latched;k.classList.toggle('lit',on);k.classList.toggle('rollp',on&&!!s.rolling);
    k.classList.toggle('memb',!!s.rnd.latch&&M.mk().rv);k.classList.toggle('rmem',on&&!!s.rnd.latch&&!s.rolling);},
  /* CV on a key acts as a gate (above 0.3); on Freeze it follows the Latch / Mom switch like the Freeze jack */
  keyGate:(M,tk,hi)=>{if(tk==='kFrz')freezeJack(hi,hi);else if(hi&&tk==='kRnd')M.randomize();else if(hi&&tk==='kByp')M.toggleBypass();},
  bindKeys:(M,bind)=>bind('#kFrz',freezeDown,freezeUp)},
  {state:FR,send:m=>send(m),read,ensureAudio,saveState,bpm:()=>state.clock.bpm});

const FK=createFreezeKey({mods:()=>MOM.mk(),use:w=>MOM.keys.use(w),asgOn:MOM.asgOn,asgKey:t=>MOM.asgToggle(t),
  momentary:()=>!!FR().mom,isOn:()=>FR().latched||FR().held,
  capture:how=>{capture();read('Freeze',how==='fresh'?'fresh capture':'on');},release:()=>{release();read('Freeze','off');},
  holdDown:()=>{holdDown();read('Freeze','held');},holdUp,
  toggleRandomLatch:()=>{const s=FR();s.rnd.latch=s.rnd.latch?0:1;read('Freeze',s.rnd.latch?'Random can now freeze, re-capture or release':'Random leaves the freeze alone');MOM.refreshKeys();}});
export function freezeDown(){ensureAudio();$('#kFrz').classList.add('pressed');FK.down();}
export function freezeUp(){$('#kFrz').classList.remove('pressed');FK.up();}
export function clearAllKeys(){MOM.clearKeys();FK.clear();$('#kFrz').classList.remove('pressed');}

/* ----- the two switches above the Freeze key's jack area ----- */
export function refreshSwitches(){const s=FR();$('#tgMom').setAttribute('aria-checked',!!s.mom);$('#tgRoll').setAttribute('aria-checked',!!s.rolling);}
export function buildSwitches(){
  /* Latch / Mom: going to Latch while the key is held keeps the freeze on */
  $('#tgMom').onclick=()=>{const s=FR();s.mom=s.mom?0:1;if(!s.mom&&s.held){s.held=false;s.latched=true;}refreshSwitches();MOM.refreshKeys();read('Freeze',s.mom?'momentary: frozen while held':'latching: tap on, tap off');saveState();};
  /* Man / Roll: never starts or stops a freeze; an active freeze starts or stops re-capturing every loop */
  $('#tgRoll').onclick=()=>{const s=FR();s.rolling=s.rolling?0:1;send({type:'fz',k:'rolling',v:s.rolling});refreshSwitches();MOM.refreshKeys();read('Capture',s.rolling?'rolling: a freeze re-captures every loop length':'manual: a freeze holds what it caught');saveState();};
  refreshSwitches();
}
export function syncAll(){MOM.sync();const s=FR();send({type:'freeze',v:s.held||s.latched});}
