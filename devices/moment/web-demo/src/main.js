// Moment web demo: the Moment module and a test bench with modulation.
import '../../../../shared/design/fonts.css';
import '../../../../shared/design/tokens.css';
import '../../../../shared/ui-web/panel.css';
import '../../../../shared/ui-web/bench.css';
import './demo.css';
import { JSVG, KL, LL, ICON_FREEZE, ICON_DICE, ICON_BYP } from '../../../../shared/ui-web/icons.js';
import { runTweens, tweens } from '../../../../shared/control/tweens.js';
import { state, loadState, saveState } from './state.js';
import { audioHooks, updateLatency } from './audio.js';
import { MOM, freezeDown, freezeUp, clearAllKeys, syncAll, buildSwitches, refreshSwitches } from './moment-ui.js';
import { buildBench, benchFrame, togglePlay, updatePlay, selectSource, refreshClock, mod } from './bench.js';

const $=s=>document.querySelector(s);

/* jacks and key legends */
document.querySelectorAll('[data-jack]').forEach(el=>{const[l,k]=el.dataset.jack.split('|');el.outerHTML=`<div class="jk ${k||''}"${l==='Clock'?' id="jkClock"':''}><span class="lg">${l}</span>${JSVG(k==='au'?'#5cc4f2':k==='ao'?'#ffb347':'')}</div>`;});
$('#kFrz').innerHTML=KL(ICON_FREEZE,'Freeze');$('#kFrRnd').innerHTML=KL(ICON_DICE,'Random');$('#kFrByp').innerHTML=KL(ICON_BYP,'Bypass');$('#kFrSh').innerHTML=LL;

function refreshAll(){MOM.refresh();refreshSwitches();refreshClock();selectSource(state.src);mod.refresh();updateLatency();}
audioHooks({sync:syncAll,restarted:()=>mod&&mod.restart()});

/* ---------- computer keyboard: Z Shift, X Freeze, C Random, V Bypass, Space play ---------- */
const KEYMAP={z:'sh',c:'rnd',v:'byp'};
window.addEventListener('blur',clearAllKeys);document.addEventListener('visibilitychange',()=>{if(document.hidden)clearAllKeys();});
document.addEventListener('keydown',e=>{
  if(e.target.closest('input,select,textarea')||e.metaKey||e.ctrlKey||e.altKey)return;
  const k=e.key.toLowerCase();if(e.repeat&&(KEYMAP[k]||k==='x')){e.preventDefault();return;}
  if(KEYMAP[k]){e.preventDefault();MOM.keyDown(KEYMAP[k]);return;}
  if(k==='x'){e.preventDefault();freezeDown();return;}
  if(e.code==='Space'&&!e.target.closest('button,[role=slider]')){e.preventDefault();togglePlay();}
});
document.addEventListener('keyup',e=>{const k=e.key.toLowerCase();if(KEYMAP[k])MOM.keyUp(KEYMAP[k]);else if(k==='x')freezeUp();});

/* ---------- printed lines: Spec / Loop to Direction / Thin, and Random glide to the Random key ---------- */
function drawLines(){
  const mod=$('#modFr'),r0=mod.getBoundingClientRect(),R=el=>{const r=el.getBoundingClientRect();return{l:r.left-r0.left,t:r.top-r0.top,r:r.right-r0.left,b:r.bottom-r0.top,cx:(r.left+r.right)/2-r0.left,cy:(r.top+r.bottom)/2-r0.top};};
  const btn=R($('#fr-mode .lbtn')),dt=R($('#fr-dir .knob svg')),gl=R($('#fr-glide .knob svg')),rk=R($('#kFrRnd'));
  const svg=`<svg class="plines" width="352" height="556" viewBox="0 0 352 556" aria-hidden="true">
    <line x1="${btn.r+6}" y1="${btn.cy}" x2="${dt.l-2}" y2="${btn.cy}" class="pl-mode"/>
    <line x1="${gl.cx}" y1="${gl.b+3}" x2="${gl.cx}" y2="${rk.t-6}" class="pl-rnd"/></svg>`;
  mod.insertAdjacentHTML('beforeend',svg);
}

/* ---------- scale the module to the window ---------- */
const MW=352,MH=556;
function fitRack(){
  const avail=$('#rack').parentElement.clientWidth-4;
  const s=Math.max(0.5,Math.min(avail/MW,(window.innerHeight-60)/MH,1.3));
  $('#modFr').style.transform=`scale(${s})`;$('#wrapFr').style.width=MW*s+'px';$('#wrapFr').style.height=MH*s+'px';
}
window.addEventListener('resize',fitRack);

/* ---------- frame loop ---------- */
function frame(now){runTweens(now);benchFrame(now);MOM.applyCV();requestAnimationFrame(frame);}

loadState();setInterval(saveState,1500);window.addEventListener('pagehide',saveState);
MOM.build();buildSwitches();drawLines();buildBench(()=>{tweens.clear();refreshAll();syncAll();});fitRack();refreshAll();updatePlay();requestAnimationFrame(frame);
