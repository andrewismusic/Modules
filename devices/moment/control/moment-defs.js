// Moment's controls (devices/moment/SPEC.md): descriptors, panel layout, Random defaults and settings.
// Moved from the v30 prototype's MOM config.
import { toPos, fromPos, pct, ms } from '../../../shared/control/params.js';
import { D_lin, D_pitch, D_steps, D_btn, D_amount, D_glide, glideList, glideMsP } from '../../../shared/control/panel-descs.js';

/* clocked loop lengths and capture fades, in beats */
export const LOOPS=[[0.0625,'1/64'],[0.09375,'1/64 dot'],[0.125,'1/32'],[0.1875,'1/32 dot'],[0.25,'1/16'],[0.375,'1/16 dot'],[0.5,'1/8'],[0.75,'1/8 dot'],[1,'1/4'],[1.5,'1/4 dot'],[2,'1/2'],[3,'1/2 dot']];
export const FADES=[[0,'Instant'],[0.25,'1/16'],[0.5,'1/8'],[1,'1/4'],[2,'1/2'],[4,'1 bar'],[8,'2 bars'],[16,'4 bars']];
const fmsP={min:5,max:3000,log:1},fadeMsP={min:0,max:4000,pw:2};
/* Random membership by default: Dry/wet, Length, Direction */
export const RND_DEF={wet:1,len:1,fade:0,pitch:0,pq:0,dir:1,thin:0,mode:0,glide:0,amount:0,latch:0};
export const defaultMoment=()=>({held:false,latched:false,byp:0,cvmap:{},rr:{},layer:{},rnd:{...RND_DEF},amount:0.8,glideIdx:0,glideMs:0,wet:1,fadeIdx:0,fadeMs:0,lenIdx:8,ms:250,pitch:0,pq:1,dir:1,thin:0,spread:0,mode:0,rolling:0});
export const defaultOpts=()=>({glideLong:0,devMode:0});
export const LAYOUT=[['len'],['fade'],['pitch','pq'],['dir','thin'],['mode'],['glide'],['amount'],['wet']];

/* h: clocked() (Clock jack patched), opts() (settings), released() (Rolling switched back to Manual) */
export function momentDescs(h){
  const c=h.clocked;
  return[D_lin('wet','Dry/wet',{min:0,max:1},pct,1,'wet'),
    {k:'fade',l:'Capture fade',init:0,steps:()=>c()?FADES.length:0,get:s=>c()?s.fadeIdx/(FADES.length-1):toPos(fadeMsP,s.fadeMs),
      put:(s,x)=>{if(c())s.fadeIdx=Math.round(x*(FADES.length-1));else s.fadeMs=fromPos(fadeMsP,x);},
      eng:(M,s,x)=>{if(c())M.tx('fadeBeats',FADES[Math.round(x*(FADES.length-1))][0]);else M.tx('fadeMs',fromPos(fadeMsP,x));},fmt:s=>c()?FADES[s.fadeIdx][1]:(s.fadeMs<10?'Instant':ms(s.fadeMs)),def:0},
    {k:'len',l:'Loop length',init:0,steps:()=>c()?LOOPS.length:0,get:s=>c()?s.lenIdx/(LOOPS.length-1):toPos(fmsP,s.ms),
      put:(s,x)=>{if(c())s.lenIdx=Math.round(x*(LOOPS.length-1));else s.ms=fromPos(fmsP,x);},
      eng:(M,s,x)=>{if(c())M.tx('loopBeats',LOOPS[Math.round(x*(LOOPS.length-1))][0]);else M.tx('loopMs',fromPos(fmsP,x));},fmt:s=>c()?LOOPS[s.lenIdx][1]:ms(s.ms),def:()=>c()?8/(LOOPS.length-1):toPos(fmsP,250)},
    D_pitch('pitch','Pitch','pitch','pq'),D_steps('pq','Pitch quant','pitch'),
    D_lin('dir','Direction',{min:0,max:1},v=>v>0.98?'Forward':v<0.02?'Reverse':Math.round(v*100)+'% forward',1,'dir'),
    D_lin('thin','Thin',{min:0,max:1},v=>v<0.01?'Off':pct(v),0,'thin'),
    D_btn('mode','Freeze type',['Spec','Loop'],['#b48cff','#3fe3c2'],'mode',0),
    D_btn('rolling','Capture',['Man','Roll'],['#d9dfe6','#4fb2ff'],'rolling',0,M=>{const s=M.s();if(!s.rolling&&(s.held||s.latched))h.released();}),
    D_amount(),D_glide(c,()=>!!h.opts().glideLong)];
}
/* settings mode options (global: shared by Moment and Prism) */
export function momentOptions(h){return[
  {k:'glide',key:'glideLong',l:'Glide range',v:['short (2 bars / 7 s)','long (16 bars / 33 s)'],apply:()=>{const s=h.state(),long=!!h.opts().glideLong;s.glideIdx=Math.min(s.glideIdx,glideList(long).length-1);s.glideMs=Math.min(s.glideMs,glideMsP(long).max);}},
  {k:'amount',key:'devMode',l:'Deviation',v:['window (any value in reach)','distinct (clearly different)']}];}
/* the engine messages for the clock-dependent settings, sent before the descriptors on every sync */
export function momentPreSync(M,clocked,bpm){const s=M.s();M.tx('free',!clocked);M.tx('bpm',bpm);M.tx('fadeBeats',FADES[s.fadeIdx][0]);M.tx('fadeMs',s.fadeMs);M.tx('loopBeats',LOOPS[s.lenIdx][0]);M.tx('loopMs',s.ms);}
