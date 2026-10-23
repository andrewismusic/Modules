// The demo's saved state: test bench settings and Relay. Saved under a versioned key; bump it whenever the shape changes.
import { slot, defaults, FX } from '../../control/fx-defs.js';
import { readSaved, writeSaved, clearSaved } from '../../../../shared/control/persist.js';

export const SAVE_KEY='relay-demo-v1';
export const SOURCES=['idm','bells','acid','pad'];
export const defaultState=()=>({vol:0.8,src:'idm',playing:false,
  clock:{bpm:120,toMu:false},
  mu:{macro:0,macroEff:0,bpm:120,glideIdx:0,amount:0.8,dial:0,bypass:false,ott:0.5,ottByp:1,ottMac:0,mix:1,clkSrc:'int',rateIdx:3,rangeMode:'random',cv:[{mode:'in',ins:[],out:0},{mode:'in',ins:[],out:0},{mode:'in',ins:[],out:0}],bank:{},lastSlot:null,rdev:[null,null,null,null],
    slots:[slot('filter',0,1,{mode:1,res:0.45}),slot('delay',0.15,0.85,{div:2,fb:0.5}),slot('reverb',0.3,1,{decay:4.5}),slot('lofi',0.1,0.6)],devs:[{},{},{},{}]}});

export let state=defaultState();
export const MU=()=>state.mu;

export function loadState(){
  try{
    const d=readSaved(SAVE_KEY);if(!d)return;const s=defaultState();
    if(typeof d.vol==='number')s.vol=d.vol;if(SOURCES.includes(d.src))s.src=d.src;
    if(d.clock)Object.assign(s.clock,{bpm:+d.clock.bpm||120,toMu:!!d.clock.toMu});
    if(d.mu){for(const k of['macro','bpm','glideIdx','amount','ott','ottByp','ottMac','mix','dial','rateIdx'])if(typeof d.mu[k]==='number')s.mu[k]=d.mu[k];
      if(d.mu.clkSrc==='ext')s.mu.clkSrc='ext';if(d.mu.rangeMode==='full')s.mu.rangeMode='full';
      if(Array.isArray(d.mu.cv)&&d.mu.cv.length>=2)s.mu.cv=[...d.mu.cv,{mode:'in',ins:[],out:0}].slice(0,3).map(c=>({mode:c.mode==='out'?'out':'in',ins:Array.isArray(c.ins)?c.ins.filter(x=>Number.isInteger(x)):[],out:Number.isInteger(c.out)?c.out:0}));
      if(d.mu.bank&&typeof d.mu.bank==='object')s.mu.bank=d.mu.bank;if(typeof d.mu.lastSlot==='string')s.mu.lastSlot=d.mu.lastSlot;if(Array.isArray(d.mu.rdev)&&d.mu.rdev.length===4)s.mu.rdev=d.mu.rdev;s.mu.bypass=!!d.mu.bypass;
      if(Array.isArray(d.mu.slots)&&d.mu.slots.length===4&&d.mu.slots.every(x=>x&&FX[x.fx]))s.mu.slots=d.mu.slots.map(x=>({fx:x.fx,on:!!x.on,a:+x.a||0,b:x.b==null?1:+x.b,p:{...defaults(x.fx),...(x.p||{})}}));
      if(Array.isArray(d.mu.devs)&&d.mu.devs.length===4)s.mu.devs=d.mu.devs.map(o=>o||{});}
    state=s;
  }catch(e){}
}
export function saveState(){try{const c=JSON.parse(JSON.stringify(state));c.playing=false;writeSaved(SAVE_KEY,c);}catch(e){}}
/* forget everything saved; keeps what is playing */
export function resetState(){clearSaved(SAVE_KEY);const keep={playing:state.playing,src:state.src};state=defaultState();Object.assign(state,keep);}
