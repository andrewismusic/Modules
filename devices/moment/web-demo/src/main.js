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
import { MOM, freezeDown, freezeUp, clearAllKeys, syncAll } from './moment-ui.js';
import { buildBench, benchFrame, togglePlay, updatePlay, selectSource, refreshClock, mod } from './bench.js';

const $=s=>document.querySelector(s);

/* jacks and key legends */
document.querySelectorAll('[data-jack]').forEach(el=>{const[l,k]=el.dataset.jack.split('|');el.outerHTML=`<div class="jk ${k||''}"${l==='Clock'?' id="jkClock"':''}><span class="lg">${l}</span>${JSVG(k==='au'?'#5cc4f2':k==='ao'?'#ffb347':'')}</div>`;});
$('#kFrz').innerHTML=KL(ICON_FREEZE,'Freeze');$('#kFrRnd').innerHTML=KL(ICON_DICE,'Random');$('#kFrByp').innerHTML=KL(ICON_BYP,'Bypass');$('#kFrSh').innerHTML=LL;

function refreshAll(){MOM.refresh();refreshClock();selectSource(state.src);mod.refresh();updateLatency();}
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
MOM.build();buildBench(()=>{tweens.clear();refreshAll();syncAll();});fitRack();refreshAll();updatePlay();requestAnimationFrame(frame);
