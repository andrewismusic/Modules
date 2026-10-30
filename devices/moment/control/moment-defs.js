// Moment's controls (devices/moment/SPEC.md): descriptors, panel layout and Random defaults.
// Moved from the v30 prototype's MOM config and reworked in the 2026-10 reviews.
import { toPos, fromPos, pct, ms } from '../../../shared/control/params.js';
import { D_lin, D_pitch, D_steps, D_btn, D_glide } from '../../../shared/control/panel-descs.js';

/* clocked loop lengths and capture fades, in beats */
export const LOOPS=[[0.0625,'1/64'],[0.09375,'1/64 dot'],[0.125,'1/32'],[0.1875,'1/32 dot'],[0.25,'1/16'],[0.375,'1/16 dot'],[0.5,'1/8'],[0.75,'1/8 dot'],[1,'1/4'],[1.5,'1/4 dot'],[2,'1/2'],[3,'1/2 dot']];
export const FADES=[[0,'Instant'],[0.25,'1/16'],[0.5,'1/8'],[1,'1/4'],[2,'1/2'],[4,'1 bar'],[8,'2 bars'],[16,'4 bars']];
/* Position reaches up to 5 s back: in ms, or in 1/16 notes when clocked */
export const POS_MAX_MS=5000;
export const posSteps=bpm=>Math.floor(POS_MAX_MS/1000/(60/bpm/4))+1;
const fmsP={min:5,max:3000,log:1},fadeMsP={min:0,max:4000,pw:2},posMsP={min:0,max:POS_MAX_MS};
/* the mode colors: Spectral violet, Loop teal (lit button; Loop-only controls are printed in teal) */
export const SPEC_COL='#b48cff',LOOP_COL='#3fe3c2';
/* Random membership by default: Dry/wet, Length, Direction */
export const RND_DEF={wet:1,len:1,fade:0,pitch:0,pq:0,dir:1,pos:0,mode:0,glide:0,latch:0};
export const defaultMoment=()=>({held:false,latched:false,byp:0,cvmap:{},layer:{},rnd:{...RND_DEF},glideIdx:0,glideMs:0,wet:1,fadeIdx:0,fadeMs:0,
  lenIdx:8,ms:250,pitch:0,pq:1,dir:1,posMs:0,posIdx:0,mode:0,mom:0,rolling:0,repitch:0});
/* top row: Spec / Loop, Direction, (the Stretch / Repitch switch), Pitch · quant;
   bottom row: Length · fade, Position, Random glide, Dry/wet */
export const LAYOUT=[['mode'],['dir'],['pitch','pq'],['len','fade'],['pos'],['glide'],['wet']];

/* h: clocked() (Clock jack patched), bpm() */
export function momentDescs(h){
  const c=h.clocked,N=()=>posSteps(h.bpm());
  return[D_lin('wet','Dry/wet',{min:0,max:1},pct,1,'wet'),
    {k:'fade',l:'Capture fade',init:0,steps:()=>c()?FADES.length:0,get:s=>c()?s.fadeIdx/(FADES.length-1):toPos(fadeMsP,s.fadeMs),
      put:(s,x)=>{if(c())s.fadeIdx=Math.round(x*(FADES.length-1));else s.fadeMs=fromPos(fadeMsP,x);},
      eng:(M,s,x)=>{if(c())M.tx('fadeBeats',FADES[Math.round(x*(FADES.length-1))][0]);else M.tx('fadeMs',fromPos(fadeMsP,x));},fmt:s=>c()?FADES[s.fadeIdx][1]:(s.fadeMs<10?'Instant':ms(s.fadeMs)),def:0},
    {k:'len',l:'Loop length',init:0,steps:()=>c()?LOOPS.length:0,get:s=>c()?s.lenIdx/(LOOPS.length-1):toPos(fmsP,s.ms),
      put:(s,x)=>{if(c())s.lenIdx=Math.round(x*(LOOPS.length-1));else s.ms=fromPos(fmsP,x);},
      eng:(M,s,x)=>{if(c())M.tx('loopBeats',LOOPS[Math.round(x*(LOOPS.length-1))][0]);else M.tx('loopMs',fromPos(fmsP,x));},fmt:s=>c()?LOOPS[s.lenIdx][1]:ms(s.ms),def:()=>c()?8/(LOOPS.length-1):toPos(fmsP,250)},
    {k:'pos',l:'Position',init:0,steps:()=>c()?N():0,get:s=>c()?Math.min(s.posIdx,N()-1)/(N()-1):toPos(posMsP,s.posMs),
      put:(s,x)=>{if(c())s.posIdx=Math.round(x*(N()-1));else s.posMs=fromPos(posMsP,x);},
      eng:(M,s,x)=>{if(c())M.tx('posBeats',Math.round(x*(N()-1))*0.25);else M.tx('posMs',fromPos(posMsP,x));},
      fmt:s=>c()?(s.posIdx?`−${Math.min(s.posIdx,N()-1)}/16`:'Now'):(s.posMs<5?'Now':`−${(s.posMs/1000).toFixed(2)} s`),def:0},
    D_pitch('pitch','Pitch','pitch','pq'),D_steps('pq','Pitch quant','pitch'),
    D_lin('dir','Direction',{min:0,max:1},v=>v>0.98?'Forward':v<0.02?'Reverse':Math.round(v*100)+'% forward',1,'dir'),
    D_btn('mode','Freeze type',['Spec','Loop'],[SPEC_COL,LOOP_COL],'mode',0),
    D_glide(c)];
}
/* the engine messages for the clock-dependent settings and the switches, sent before the descriptors on every sync */
export function momentPreSync(M,clocked,bpm){const s=M.s(),N=posSteps(bpm);M.tx('free',!clocked);M.tx('bpm',bpm);M.tx('fadeBeats',FADES[s.fadeIdx][0]);M.tx('fadeMs',s.fadeMs);
  M.tx('loopBeats',LOOPS[s.lenIdx][0]);M.tx('loopMs',s.ms);M.tx('posBeats',Math.min(s.posIdx,N-1)*0.25);M.tx('posMs',s.posMs);M.tx('rolling',s.rolling);M.tx('repitch',s.repitch);}
