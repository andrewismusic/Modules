// The demo's test bench (not hardware): play / stop, sources, volume, master clock, the effects list, reset.
import { makeKnob } from '../../../../shared/ui-web/knob.js';
import { pct } from '../../../../shared/control/params.js';
import { state, resetState } from './state.js';
import { ensureAudio, startSource, stopSource, tempoSettled, setVolume, send } from './audio.js';
import { muBpm } from './relay-ui.js';
import { showOSD } from './screen.js';

const $=s=>document.querySelector(s);
let clkK=null,volK=null;
export function updatePlay(){const b=$('#play');b.setAttribute('aria-pressed',state.playing);b.querySelector('span').textContent=state.playing?'Stop':'Play';b.querySelector('svg').innerHTML=state.playing?'<path d="M2 2h10v10H2z"/>':'<path d="M2 1l11 6-11 6z"/>';}
export async function togglePlay(){await ensureAudio();state.playing=!state.playing;updatePlay();if(state.playing)await startSource();else stopSource();}
export function selectSource(s){state.src=s;document.querySelectorAll('#sources button').forEach(x=>x.setAttribute('aria-pressed',x.dataset.src===s));}
export function refreshClock(){$('#clkMu').setAttribute('aria-pressed',state.clock.toMu);clkK.update();volK.update();}
function clockChanged(){send({type:'bpm',v:muBpm()});}
export function buildBench(onReset){
  $('#play').onclick=togglePlay;
  document.querySelectorAll('#sources button').forEach(b=>b.addEventListener('click',async()=>{selectSource(b.dataset.src);if(state.playing){await ensureAudio();startSource();}}));
  volK=makeKnob({label:'Volume',cls:'sm',get:()=>state.vol,set:x=>{state.vol=x;setVolume(x);},fmt:()=>pct(state.vol),def:0.8});
  $('#volK').append(volK);
  clkK=makeKnob({label:'BPM',cls:'sm',steps:181,get:()=>(state.clock.bpm-40)/180,set:x=>{state.clock.bpm=Math.round(40+x*180);clockChanged();},fmt:()=>state.clock.bpm+' BPM',end:tempoSettled});
  $('#clkK').append(clkK);
  $('#clkMu').onclick=()=>{state.clock.toMu=!state.clock.toMu;refreshClock();clockChanged();showOSD(state.clock.toMu?'Clock patched':'Clock unpatched',muBpm()+' BPM');tempoSettled();};
  $('#resetState').onclick=()=>{resetState();onReset();};
}
