// The demo's test bench (not hardware): play / stop, sources, volume, master clock, modulation (LFO with clocked S&H,
// rhythm generator) with cables to Moment's CV 1–3, Freeze and Random jacks, and reset.
import { makeKnob } from '../../../../shared/ui-web/knob.js';
import { buildModBench } from '../../../../shared/ui-web/mod-bench.js';
import { pct } from '../../../../shared/control/params.js';
import { state, saveState, resetState } from './state.js';
import { ensureAudio, startSource, stopSource, tempoSettled, setVolume, send, beatPos } from './audio.js';
import { MOM, FR, read, freezeJack, holdUp } from './moment-ui.js';

const $=s=>document.querySelector(s);
let clkK=null,volK=null;
export let mod=null;
export function updatePlay(){const b=$('#play');b.setAttribute('aria-pressed',state.playing);b.querySelector('span').textContent=state.playing?'Stop':'Play';b.querySelector('svg').innerHTML=state.playing?'<path d="M2 2h10v10H2z"/>':'<path d="M2 1l11 6-11 6z"/>';}
export async function togglePlay(){await ensureAudio();state.playing=!state.playing;updatePlay();if(state.playing)await startSource();else stopSource();}
export function selectSource(s){state.src=s;document.querySelectorAll('#sources button').forEach(x=>x.setAttribute('aria-pressed',x.dataset.src===s));}
/* the Clock jack shows the master clock's cable */
export function refreshClock(){$('#clkFr').setAttribute('aria-pressed',state.clock.toFr);clkK.update();volK.update();
  const j=$('#jkClock');j.classList.toggle('patched',state.clock.toFr);j.style.setProperty('--pc',state.clock.toFr?'#d9dfe6':'transparent');}
function clockChanged(){MOM.cfg.preSync(MOM);MOM.refresh();}

/* the module jacks the bench can patch, found by their printed names */
function benchPorts(){const ports={},mod=$('#modFr');
  mod.querySelectorAll('.jk').forEach(el=>{const l=(el.dataset.cv?'CV '+{A:1,B:2,C:3,D:4}[el.dataset.cv]:el.querySelector('.lg')?.textContent||'').trim();
    if(['CV 1','CV 2','CV 3','Freeze','Random'].includes(l))ports[l]={el,name:'Moment '+l};});
  return ports;}
const cvLetter=p=>{const m=/^CV (\d)$/.exec(p);return m?'ABCD'[+m[1]-1]:null;};

export function buildBench(onReset){
  $('#play').onclick=togglePlay;
  document.querySelectorAll('#sources button').forEach(b=>b.addEventListener('click',async()=>{selectSource(b.dataset.src);if(state.playing){await ensureAudio();startSource();}}));
  volK=makeKnob({label:'Volume',cls:'sm',get:()=>state.vol,set:x=>{state.vol=x;setVolume(x);},fmt:()=>pct(state.vol),def:0.8});
  $('#volK').append(volK);
  clkK=makeKnob({label:'BPM',cls:'sm',steps:181,get:()=>(state.clock.bpm-40)/180,set:x=>{state.clock.bpm=Math.round(40+x*180);send({type:'bpm',v:state.clock.bpm});},fmt:()=>state.clock.bpm+' BPM',end:()=>{clockChanged();tempoSettled();}});
  $('#clkK').append(clkK);
  const toggleClock=()=>{state.clock.toFr=!state.clock.toFr;refreshClock();clockChanged();read('Clock',state.clock.toFr?'patched: lengths are note values, loops lock to the beat':'unpatched: lengths in ms');saveState();};
  $('#clkFr').onclick=toggleClock;$('#jkClock').classList.add('pport');$('#jkClock').addEventListener('click',toggleClock);
  mod=buildModBench({box:$('#lfoBox'),list:$('#patchList'),hint:$('#patchHint'),bench:state.bench,ports:benchPorts(),beat:beatPos,changed:saveState,
    onConnect:p=>{ensureAudio();const L=cvLetter(p);if(L)MOM.cvPatch(L,true);},
    onUnplug:p=>{const L=cvLetter(p);if(L)MOM.cvPatch(L,false);if(p==='Freeze'&&FR().mom)holdUp();}});
  /* restore saved cables (without opening assignment mode) */
  for(const p of Object.keys(state.bench.patches)){const L=cvLetter(p);if(L)MOM.cv[L].p=true;}
  $('#resetState').onclick=()=>{for(const p of Object.keys(state.bench.patches)){const L=cvLetter(p);if(L)MOM.cvPatch(L,false);}resetState();onReset();};
}
/* every screen frame: bench outputs into the patched jacks */
export function benchFrame(now){
  const res=mod.tick(now);
  for(const[p,{v,trig}]of Object.entries(res)){const L=cvLetter(p);
    if(L)MOM.cvSet(L,v);else if(p==='Random'&&trig)MOM.randomize();
    /* Freeze follows the Latch / Mom switch: in Mom it is a gate (frozen while the input is high) */
    else if(p==='Freeze'){if(FR().mom)freezeJack(v>0.3,false);else if(trig)freezeJack(true,true);}}
}
