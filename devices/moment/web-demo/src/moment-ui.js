// Moment's panel: the shared panel module (shared/ui-web/panel-module.js) with Moment's controls
// (../../control/moment-defs.js), the Freeze key (../../control/freeze-key.js) and what Random may do to the freeze.
import { makePanelModule } from '../../../../shared/ui-web/panel-module.js';
import { momentDescs, momentOptions, momentPreSync, LAYOUT, RND_DEF } from '../../control/moment-defs.js';
import { createFreezeKey } from '../../control/freeze-key.js';
import { state, saveState } from './state.js';
import { send, ensureAudio } from './audio.js';

const $=s=>document.querySelector(s);
export const FR=()=>state.fr;
export const clocked=()=>state.clock.toFr;
export const read=(l,v)=>{$('#frRead').textContent=`${l}: ${v}`;};

/* freeze actions */
export function holdDown(){const s=FR();if(s.held)return;ensureAudio();s.held=true;send({type:'freeze',v:true});MOM.refreshKeys();}
export function holdUp(){const s=FR();if(!s.held)return;s.held=false;s.latched=false;send({type:'freeze',v:false});MOM.refreshKeys();}
export function capture(){ensureAudio();FR().latched=true;send({type:'reseed'});MOM.refreshKeys();}
export function release(){const s=FR();if(s.held||!s.latched)return;s.latched=false;send({type:'freeze',v:false});MOM.refreshKeys();}
/* a trigger at the Freeze jack toggles the latch */
export function freezeTrigger(){const s=FR();if(s.latched||s.held)release();else capture();}

export const MOM=makePanelModule({id:'fr',name:'Moment',msg:'fz',mod:'#modFr',clocked,
  keys:{rnd:'#kFrRnd',byp:'#kFrByp',sh:'#kFrSh'},keyT:{kFrz:'#kFrz',kRnd:'#kFrRnd',kByp:'#kFrByp'},btnShift:{mode:'rolling'},
  descs:momentDescs({clocked,opts:()=>state.opts,released:()=>{const s=FR();s.held=false;s.latched=false;send({type:'freeze',v:false});MOM.refreshKeys();}}),
  layout:LAYOUT,options:momentOptions({state:FR,opts:()=>state.opts}),rndDef:RND_DEF,
  /* Random + Freeze turned on: each Random press may also freeze, re-capture or release (at most 90% of the time,
     scaled by Deviation); never while Freeze is held */
  onRandom:(M,A,said)=>{const s=M.s();if(s.rnd.latch&&!s.held&&Math.random()<0.9*A){if(s.latched){if(Math.random()<0.5){release();said.push('freeze released');}else{capture();said.push('fresh freeze');}}else{capture();said.push('frozen');}}},
  preSync:M=>momentPreSync(M,clocked(),state.clock.bpm),
  onInit:()=>{const s=FR();s.held=false;s.latched=false;send({type:'freeze',v:false});},
  refreshKeys:M=>{const s=M.s(),k=$('#kFrz');k.classList.toggle('lit',s.held||s.latched);k.classList.toggle('memb',!!s.rnd.latch&&M.mk().rv);k.classList.toggle('rolling',!!s.rolling&&!s.held&&!s.latched);},
  /* CV on a key acts as a gate (above 0.3) */
  keyGate:(M,tk,hi)=>{if(tk==='kFrz'){if(hi)holdDown();else holdUp();}else if(hi&&tk==='kRnd')M.randomize();else if(hi&&tk==='kByp')M.toggleBypass();},
  bindKeys:(M,bind)=>bind('#kFrz',freezeDown,freezeUp)},
  {state:FR,opts:()=>state.opts,send:m=>send(m),read,ensureAudio,saveState,bpm:()=>state.clock.bpm});

const FK=createFreezeKey({mods:()=>MOM.mk(),use:w=>MOM.keys.use(w),asgOn:MOM.asgOn,asgKey:t=>MOM.asgToggle(t),
  latched:()=>FR().latched,isOn:()=>FR().latched||FR().held,
  capture:how=>{capture();read('Freeze',how==='fresh'?'fresh capture':'on');},release:()=>{const s=FR();s.held=false;release();read('Freeze','off');},
  holdDown:()=>{holdDown();read('Freeze','momentary');},holdUp,
  toggleRandomLatch:()=>{const s=FR();s.rnd.latch=s.rnd.latch?0:1;read('Freeze',s.rnd.latch?'Random can now freeze, re-capture or release':'Random leaves the freeze alone');MOM.refreshKeys();}});
export function freezeDown(){ensureAudio();$('#kFrz').classList.add('pressed');FK.down();}
export function freezeUp(){$('#kFrz').classList.remove('pressed');FK.up();}
export function clearAllKeys(){MOM.clearKeys();FK.clear();$('#kFrz').classList.remove('pressed');}
export function syncAll(){MOM.sync();const s=FR();send({type:'freeze',v:s.held||s.latched});}
