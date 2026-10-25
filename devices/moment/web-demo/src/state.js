// The demo's saved state: test bench settings (sources, clock, modulation, cables), Moment and the global settings.
// Saved under a versioned key; bump it whenever the shape changes.
import { readSaved, writeSaved, clearSaved } from '../../../../shared/control/persist.js';
import { defaultMoment, defaultOpts } from '../../control/moment-defs.js';
import { defaultLfo, defaultRhythm } from '../../../../shared/control/modulation.js';

export const SAVE_KEY='moment-demo-v1';
export const SOURCES=['idm','bells','acid','pad'];
export const PORTS=['CV 1','CV 2','CV 3','CV 4','Freeze','Random'];
export const defaultState=()=>({vol:0.8,src:'idm',playing:false,clock:{bpm:120,toFr:false},fr:defaultMoment(),opts:defaultOpts(),
  bench:{lfo:defaultLfo(),rhythm:defaultRhythm(),patches:{}}});
export let state=defaultState();

/* copy saved values over the defaults, keeping only keys and types the defaults know */
const merge=(t,o)=>{if(!o||typeof o!=='object')return;for(const k in t)if(k in o&&typeof o[k]===typeof t[k]&&(typeof t[k]!=='object'||t[k]===null))t[k]=o[k];};
export function loadState(){
  try{
    const d=readSaved(SAVE_KEY);if(!d)return;const s=defaultState();
    if(typeof d.vol==='number')s.vol=d.vol;if(SOURCES.includes(d.src))s.src=d.src;
    if(d.clock)Object.assign(s.clock,{bpm:Math.max(40,Math.min(220,+d.clock.bpm||120)),toFr:!!d.clock.toFr});
    if(d.fr){merge(s.fr,d.fr);for(const k of['rr','cvmap','layer'])if(d.fr[k]&&typeof d.fr[k]==='object')s.fr[k]=d.fr[k];if(d.fr.rnd)for(const k in s.fr.rnd)if(k in d.fr.rnd)s.fr.rnd[k]=d.fr.rnd[k]?1:0;}
    s.fr.held=false;s.fr.latched=false;
    merge(s.opts,d.opts);
    if(d.bench){merge(s.bench.lfo,d.bench.lfo);merge(s.bench.rhythm,d.bench.rhythm);
      if(d.bench.patches&&typeof d.bench.patches==='object')for(const[p,src]of Object.entries(d.bench.patches))if(PORTS.includes(p)&&(src==='LFO'||src==='RHY'))s.bench.patches[p]=src;}
    state=s;
  }catch(e){}
}
export function saveState(){try{const c=JSON.parse(JSON.stringify(state));c.playing=false;writeSaved(SAVE_KEY,c);}catch(e){}}
/* forget everything saved; keeps what is playing */
export function resetState(){clearSaved(SAVE_KEY);const keep={playing:state.playing,src:state.src};state=defaultState();Object.assign(state,keep);}
