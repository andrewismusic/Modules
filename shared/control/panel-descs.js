// Control descriptors for the Moment / Prism panel module. Moved from the v30 prototype.
// A descriptor maps one parameter between the saved state (s[k]), a 0..1 knob position, and engine messages:
//   get(s) -> position, put(s, x) stores it, eng(M, s, x) sends it (M.tx(key, value)), fmt(s) -> readout,
//   def = default position, init = default value (used by Initialize), steps(s) = number of steps (0 = continuous),
//   ui = never sent to the engine (Deviation, Glide), btn = a lit button with opts / cols, bip = bipolar ring.
import { toPos, fromPos, pct, ms, sec } from './params.js';

/* Pitch quantize choices (the second layer of every Pitch encoder) and their ring colors */
export const PQ=[['Free',null,'#ffffff'],['Chromatic',1,'#7cf29a'],['Octaves and fifths',[-24,-19,-12,-7,0,7,12,19,24],'#c49bff'],['Octaves',[-24,-12,0,12,24],'#7fe0ff']];
/* clocked Random glide lengths in beats */
export const GLIDES=[[0,'Instant'],[0.25,'1/16'],[0.5,'1/8'],[1,'1/4'],[2,'1/2'],[4,'1 bar'],[8,'2 bars'],[16,'4 bars'],[32,'8 bars'],[64,'16 bars']];
/* the Glide range setting: short = up to 2 bars / 7 s, long = up to 16 bars / 33 s */
export const glideList=long=>long?GLIDES:GLIDES.slice(0,GLIDES.findIndex(g=>g[0]===8)+1);
export const glideMsP=long=>({min:0,max:long?33000:7000,pw:2.5});

export function D_lin(k,l,p,f,d,e){return{k,l,init:d,bip:p.min<0&&p.max>0,get:s=>toPos(p,s[k]),eng:(M,s,x)=>M.tx(e,fromPos(p,x)),put:(s,x)=>{s[k]=fromPos(p,x);},fmt:s=>f(s[k]),def:toPos(p,d)};}
/* pitch in semitones, ±R; its quantize setting (qk) decides the steps */
export function D_pitch(k,l,e,qk,R=24){
  const vals=s=>{const v=PQ[s[qk]][1];return Array.isArray(v)?v.filter(w=>Math.abs(w)<=R):v;},q=(s,x)=>{const v=vals(s);return Array.isArray(v)?v[Math.round(x*(v.length-1))]:v===1?Math.round(x*2*R-R):x*2*R-R;};
  return{k,l,init:0,bip:true,steps:s=>{const v=vals(s);return Array.isArray(v)?v.length:v===1?2*R+1:0;},
    get:s=>{const v=vals(s);if(Array.isArray(v)){let bi=0;v.forEach((w,i)=>{if(Math.abs(w-s[k])<Math.abs(v[bi]-s[k]))bi=i;});return bi/(v.length-1);}return(Math.max(-R,Math.min(R,s[k]))+R)/(2*R);},
    eng:(M,s,x)=>M.tx(e,q(s,x)),put:(s,x)=>{s[k]=q(s,x);},fmt:s=>(s[k]>0?'+':'')+(vals(s)===null?s[k].toFixed(2):Math.round(s[k]))+' st',def:0.5};
}
/* a pitch encoder's quantize layer; changing it re-snaps the pitch */
export function D_steps(qk,l,pk){return{k:qk,l,init:1,steps:()=>4,color:s=>PQ[s[qk]][2],ui:true,get:s=>s[qk]/3,put:(s,x)=>{s[qk]=Math.round(x*3);},eng:()=>{},
  after:M=>{const d=M.d[pk];d.put(M.s(),d.get(M.s()));d.eng(M,M.s(),d.get(M.s()));},fmt:s=>PQ[s[qk]][0],def:1/3};}
export function D_btn(k,l,opts,cols,e,d,after){return{k,l,btn:true,init:d,opts,cols,n:opts.length,get:s=>s[k]/(opts.length-1),put:(s,x)=>{s[k]=Math.round(x*(opts.length-1));},
  eng:(M,s,x)=>M.tx(e,Math.round(x*(opts.length-1))),fmt:s=>opts[s[k]],def:d/(opts.length-1),after};}
/* a stepped encoder from a list of choices (map gives the value sent for each) */
export function D_step(k,l,list,e,init,map){return{k,l,init,steps:()=>list.length,get:s=>s[k]/(list.length-1),put:(s,x)=>{s[k]=Math.round(x*(list.length-1));},
  eng:(M,s,x)=>M.tx(e,map?map[Math.round(x*(list.length-1))]:Math.round(x*(list.length-1))),fmt:s=>list[s[k]],def:init/(list.length-1)};}
/* Deviation: 10–100%, default 80% */
export function D_amount(){return{k:'amount',l:'Random deviation',init:0.8,ui:true,get:s=>(s.amount-0.1)/0.9,put:(s,x)=>{s.amount=0.1+0.9*x;},eng:()=>{},fmt:s=>pct(s.amount),def:7/9};}
/* Glide: note values when clocked (clocked()), otherwise ms; its range follows the Glide range setting (long()) */
export function D_glide(clocked,long){const L=()=>glideList(long()),P=()=>glideMsP(long());
  return{k:'glide',l:'Random glide',init:0,ui:true,steps:()=>clocked()?L().length:0,
  get:s=>clocked()?Math.min(1,s.glideIdx/(L().length-1)):toPos(P(),Math.min(s.glideMs,P().max)),
  put:(s,x)=>{if(clocked())s.glideIdx=Math.round(x*(L().length-1));else s.glideMs=fromPos(P(),x);},eng:()=>{},
  fmt:s=>clocked()?L()[Math.min(s.glideIdx,L().length-1)][1]:(s.glideMs<10?'Instant':s.glideMs<1000?ms(s.glideMs):sec(s.glideMs/1000)),def:0};}
/* how long a Random glide lasts in ms, at knob position pos */
export function glideDuration(pos,clocked,long,bpm){const L=glideList(long);return clocked?L[Math.round(pos*(L.length-1))][0]*60/bpm*1000:fromPos(glideMsP(long),pos);}
