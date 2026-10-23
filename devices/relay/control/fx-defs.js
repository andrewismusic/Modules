// Relay's effect list: names, colours, parameters, defaults and random ranges. Moved from the v30 prototype.
import { FxShuffle } from '../../../shared/dsp/effects/shuffle.js';
import { pct, ms, hz, sec, st, ct, times, perS, shz, toPos, fromPos } from '../../../shared/control/params.js';

const m0=p=>p.mode===0,m1=p=>p.mode===1,m2=p=>p.mode===2;
/* Shuffler patterns come from the engine's fixed list, so the UI shows exactly what the DSP plays */
export const SHUF_P=FxShuffle.pats(),SHUF_N=SHUF_P.length;
const shufFmt=v=>{const p=SHUF_P[Math.max(0,Math.min(SHUF_N-1,Math.round(v)))];return '#'+(Math.round(v)+1)+'  '+p.q.map(x=>x<0?'–':x+1).join(' ');};
export const FX={
  filter:{name:'Filter',hue:42,params:[{k:'mode',l:'Mode',o:['Low-pass','High-pass','Band-pass','Notch'],d:0},{k:'res',l:'Resonance',min:0,max:1,d:0.4,f:pct,r:[0,0.8],m:1},{k:'drive',l:'Drive',min:0,max:1,d:0.25,f:pct,m:1}]},
  formant:{name:'Formant',hue:22,params:[{k:'from',l:'From',o:['A','E','I','O','U'],d:0},{k:'to',l:'To',o:['A','E','I','O','U'],d:3},{k:'shift',l:'Shift',min:0.5,max:2,d:1,log:1,f:times},{k:'sharp',l:'Sharpness',min:0,max:1,d:0.6,f:pct},{k:'mix',l:'Level',min:0,max:1,d:1,f:pct,r:[0.6,1],m:1}]},
  delay:{name:'Delay',hue:165,params:[{k:'div',l:'Time',o:['1/16','1/8','1/8 dotted','1/4','1/4 dotted','1/2'],d:2},{k:'pp',l:'Stereo',o:['Straight','Ping-pong'],d:1},{k:'fb',l:'Feedback',min:0,max:0.95,d:0.55,f:pct,r:[0.2,0.8],m:1},{k:'tone',l:'Tone',min:0,max:1,d:0.55,f:pct},{k:'mix',l:'Level',min:0,max:1,d:0.7,f:pct,r:[0.4,0.9]}]},
  reverb:{name:'Reverb',hue:232,params:[{k:'decay',l:'Decay',min:0.3,max:12,d:3.5,log:1,f:sec,r:[1,9],m:1},{k:'size',l:'Size',min:0.5,max:2,d:1,f:times},{k:'damp',l:'Damping',min:0,max:1,d:0.45,f:pct},{k:'pre',l:'Pre-delay',min:0,max:200,d:20,f:ms},{k:'mix',l:'Level',min:0,max:1,d:0.6,f:pct,r:[0.4,0.9]}]},
  shimmer:{name:'Shimmer',hue:208,params:[{k:'interval',l:'Interval',o:['+5','+7','+12','+19'],d:2},{k:'decay',l:'Decay',min:1,max:20,d:7,log:1,f:sec,r:[2,14],m:1},{k:'amt',l:'Shimmer',min:0,max:0.9,d:0.55,f:pct,r:[0.2,0.75],m:1},{k:'damp',l:'Damping',min:0,max:1,d:0.3,f:pct},{k:'mix',l:'Level',min:0,max:1,d:0.55,f:pct,r:[0.35,0.8]}]},
  granular:{name:'Granular',hue:284,params:[{k:'scale',l:'Scatter steps',o:['Free','Octaves','Fifths'],d:1},{k:'size',l:'Size',min:20,max:500,d:120,log:1,f:ms},{k:'density',l:'Density',min:2,max:80,d:24,log:1,f:perS,m:1},{k:'spray',l:'Spray',min:0,max:1000,d:300,f:ms,m:1},
      {k:'pitch',l:'Pitch',min:-12,max:12,step:1,d:0,f:st,r:[-12,12]},{k:'scatter',l:'Scatter',min:0,max:24,d:7,f:st,m:1},{k:'rev',l:'Reverse',min:0,max:1,d:0.2,f:pct},{k:'fb',l:'Feedback',min:0,max:0.7,d:0.2,f:pct,r:[0,0.45],m:1},{k:'mix',l:'Level',min:0,max:1,d:0.8,f:pct,r:[0.5,1],m:1}]},
  smear:{name:'Spectral smear',hue:258,params:[{k:'shape',l:'Shape',o:['Swell','Sustain'],d:0},{k:'region',l:'Smear',o:['Inside band','Outside band'],d:0},{k:'time',l:'Time',min:0.1,max:10,d:3,log:1,f:sec,m:1},{k:'lo',l:'Low edge',min:20,max:20000,d:20,log:1,f:hz},{k:'hi',l:'High edge',min:20,max:20000,d:20000,log:1,f:hz}]},
  thin:{name:'Spectral thin',hue:305,params:[{k:'keep',l:'Keep',min:0,max:1,d:1,f:v=>v>=0.98?'Loudest':v<=0.02?'Quietest':'Mid '+Math.round(v*100),r:[0,1]},{k:'stab',l:'Stability',min:0,max:1,d:0.4,f:pct},{k:'makeup',l:'Makeup',min:0,max:1,d:0.85,f:pct},
      {k:'ring',l:'Ring',min:0,max:10,d:0,pw:2,f:v=>v<0.01?'Off':sec(v),r:[0,5],m:1},{k:'thr',l:'Threshold',min:-90,max:0,d:-50,f:v=>Math.round(v)+' dB',r:[-70,-20]},
      {k:'rtilt',l:'Ring tilt',min:-1,max:1,d:0,f:v=>Math.abs(v)<0.03?'Even':v>0?'Highs '+Math.round(v*100):'Lows '+Math.round(-v*100)}]},
  buffer:{name:'Buffer',hue:325,params:[{k:'mode',l:'Mode',o:['Stutter','Reverse','Pitch'],d:0},{k:'rev',l:'Direction',o:['Forward','Backward'],d:0,show:m0},{k:'glide',l:'Slider',o:['Glides pitch','Blends in'],d:0,show:m2},
      {k:'chunk',l:'Chunk',min:60,max:1000,d:320,f:ms,show:m1},{k:'semi',l:'Interval',min:-12,max:12,step:1,d:-12,f:st,show:m2,m:p=>p.glide===0},{k:'detune',l:'Detune',min:0,max:30,d:8,f:ct,show:m2},{k:'win',l:'Grain',min:20,max:150,d:60,f:ms,show:m2},{k:'mix',l:'Level',min:0,max:1,d:1,f:pct,r:[0.6,1],m:1}]},
  shuffle:{name:'Shuffler',hue:148,params:[{k:'div',l:'Slice',o:['1/16','1/8','1/4'],d:1},
      {k:'pattern',l:'Pattern',min:0,max:SHUF_N-1,step:1,d:0,f:shufFmt,r:[0,SHUF_N-1]}]},
  freqshift:{name:'Freq shifter',hue:188,params:[{k:'stereo',l:'Right channel',o:['Same','Mirrored'],d:1},{k:'shift',l:'Shift',min:-2000,max:2000,d:120,bip:1,f:shz,m:1},{k:'fb',l:'Feedback',min:0,max:0.9,d:0.35,f:pct,r:[0,0.7],m:1},{k:'mix',l:'Level',min:0,max:1,d:1,f:pct,r:[0.5,1],m:1}]},
  phaser:{name:'Phaser',hue:95,params:[{k:'stages',l:'Stages',o:['4','6','8','12'],d:1},{k:'rate',l:'Rate',min:0.05,max:8,d:0.35,log:1,f:hz},{k:'fb',l:'Feedback',min:0,max:0.9,d:0.6,f:pct,m:1},{k:'center',l:'Center',min:150,max:3000,d:800,log:1,f:hz}]},
  lofi:{name:'Lo-fi',hue:62,params:[{k:'wow',l:'Wow',min:0,max:1,d:0.3,f:pct,m:1,r:[0,0.4],rb:1},{k:'flutter',l:'Flutter',min:0,max:1,d:0.25,f:pct,m:1,r:[0,0.4],rb:1},
      {k:'char',l:'Character',min:0,max:1,d:0.5,f:pct,m:1},{k:'drop',l:'Dropouts',min:0,max:1,d:0.1,f:pct,m:1,r:[0,0.2],rb:1}]},
  drive:{name:'Drive',hue:12,params:[{k:'char',l:'Character',o:['Tube','Tape','Fuzz'],d:0},{k:'drive',l:'Drive',min:0,max:1,d:0.6,f:pct,m:1,r:[0.25,1]},
      {k:'bias',l:'Bias',min:0,max:1,d:0.3,f:pct},{k:'tone',l:'Tone',min:0,max:1,d:0.6,f:pct},{k:'mix',l:'Level',min:0,max:1,d:1,f:pct,m:1,r:[0.5,1]}]},
  tremolo:{name:'Tremolo',hue:0,params:[{k:'rate',l:'Rate',o:['1/2','1/4','1/8','1/16','1/32'],d:2},{k:'shape',l:'Shape',o:['Sine','Triangle','Square','Ramp'],d:0},{k:'stereo',l:'Stereo',o:['Mono','Ping-pong'],d:0},
      {k:'depth',l:'Depth',min:0,max:1,d:0.9,f:pct,m:1,r:[0.5,1]},{k:'edge',l:'Edge',min:0,max:1,d:0.3,f:pct}]},
  chorus:{name:'Chorus',hue:132,params:[{k:'voices',l:'Voices',o:['2','3','4'],d:1},{k:'rate',l:'Rate',min:0.05,max:5,d:0.6,log:1,f:hz},{k:'depth',l:'Depth',min:0,max:1,d:0.6,f:pct,m:1},
      {k:'width',l:'Width',min:0,max:1,d:0.8,f:pct},{k:'fb',l:'Feedback',min:0,max:0.6,d:0.1,f:pct},{k:'mix',l:'Level',min:0,max:1,d:0.7,f:pct,m:1,r:[0.4,1]}]},
  tapestop:{name:'Tape stop',hue:340,params:[{k:'curve',l:'Response',o:['Even','Fast drop','Late drop'],d:0},{k:'glide',l:'Glide',min:0,max:2000,d:250,f:ms}]},
  none:{name:'Empty',hue:null,params:[]}
};
export const GROUPS=[['Tone',['filter','formant','drive']],['Time and space',['delay','reverb','shimmer']],['Texture',['granular','smear','thin','lofi']],['Pitch and motion',['buffer','shuffle','freqshift','phaser','chorus','tremolo','tapestop']],['',['none']]];
export const ALL_FX=GROUPS.flatMap(g=>g[1]).filter(k=>k!=='none');
export const defaults=t=>Object.fromEntries(FX[t].params.map(p=>[p.k,p.d]));
export const slot=(fx,a,b,over={})=>({fx,on:true,a,b,p:{...defaults(fx),...over}});

export function randParam(p){if(p.o)return Math.floor(Math.random()*p.o.length);const useR=p.r&&(!p.rb||Math.random()<0.8),lo=useR?toPos(p,p.r[0]):0,hi=useR?toPos(p,p.r[1]):1;return fromPos(p,lo+Math.random()*(hi-lo));}
export const randomParams=fx=>{const p={};for(const d of FX[fx].params)p[d.k]=randParam(d);return p;};
