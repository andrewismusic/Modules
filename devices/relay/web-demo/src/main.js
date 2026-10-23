// Relay web demo: the Relay module, the desktop pyramid and a small test bench.
import '../../../../shared/design/fonts.css';
import '../../../../shared/design/tokens.css';
import '../../../../shared/ui-web/panel.css';
import '../../../../shared/ui-web/bench.css';
import '../../../../shared/ui-web/pyramid.css';
import './demo.css';
import { JSVG, KL, LL, ICON_DICE, ICON_DICE3, ICON_BYP } from '../../../../shared/ui-web/icons.js';
import { runTweens, tweens } from '../../../../shared/control/tweens.js';
import { rangesValid, genRanges } from '../../control/ranges.js';
import { state, MU, loadState, saveState } from './state.js';
import { ctx, engineMain, updateLatency } from './audio.js';
import { buildRelay, syncAll, rerollDevs, rKey, clearKeys, setMacro, setBypass, setDial, dialDirty, clearDialDirty,
  sendSlotParams, sendRange, renderFx, muMixK, muOttK } from './relay-ui.js';
import { SCR, scrScroll } from './menu.js';
import { initScreen, drawScreen } from './screen.js';
import { buildPyramid, pyramidFrame } from './pyramid.js';
import { buildBench, togglePlay, updatePlay, selectSource, refreshClock } from './bench.js';

const $=s=>document.querySelector(s);

/* jacks and key legends */
document.querySelectorAll('[data-jack]').forEach(el=>{const[l,k]=el.dataset.jack.split('|');el.outerHTML=`<div class="jk ${k||''}"><span class="lg">${l}</span>${JSVG(k==='au'?'#5cc4f2':k==='ao'?'#ffb347':'')}</div>`;});
$('#kA').innerHTML=KL(ICON_DICE,'Random 1');$('#kB').innerHTML=KL(ICON_DICE3,'Random 2');$('#kByp').innerHTML=KL(ICON_BYP,'Bypass');$('#kSh').innerHTML=LL;

function refreshAll(){muOttK.update();muMixK.update();refreshClock();setMacro(MU().macro);setBypass(MU().bypass);setDial(MU().dial);renderFx();selectSource(state.src);updateLatency();}

/* ---------- computer keyboard: Z Shift, A Random 1, B Random 2, X Bypass, arrows scroll menus, Space play ---------- */
const KEYMAP={a:'r1',b:'r2',x:'byp',z:'sh'};
window.addEventListener('blur',clearKeys);document.addEventListener('visibilitychange',()=>{if(document.hidden)clearKeys();});
document.addEventListener('keydown',e=>{
  if(e.target.closest('input,select,textarea')||e.metaKey||e.ctrlKey||e.altKey)return;
  const k=e.key.toLowerCase();if(e.repeat&&KEYMAP[k]){e.preventDefault();return;}
  if(KEYMAP[k]){e.preventDefault();rKey(KEYMAP[k],true);return;}
  if(SCR.mode!=='main'&&(e.key==='ArrowUp'||e.key==='ArrowDown')&&!e.target.closest('[role=slider]')){e.preventDefault();scrScroll(e.key==='ArrowDown'?1:-1);return;}
  if(e.code==='Space'&&!e.target.closest('button,[role=slider]')){e.preventDefault();togglePlay();}
});
document.addEventListener('keyup',e=>{const k=e.key.toLowerCase();if(KEYMAP[k])rKey(KEYMAP[k],false);});

/* ---------- scale the module to the window ---------- */
const MW=352,MH=556;
function fitRack(){
  const avail=$('#rack').parentElement.clientWidth-4;
  const s=Math.max(0.5,Math.min(avail/MW,(window.innerHeight-60)/MH,1.3));
  $('#modMu').style.transform=`scale(${s})`;$('#wrapMu').style.width=MW*s+'px';$('#wrapMu').style.height=MH*s+'px';
  $('#modMu').dataset.s=s;
}
window.addEventListener('resize',fitRack);

/* ---------- frame loop ---------- */
function frame(now){
  runTweens(now);
  if(dialDirty){clearDialDirty();for(let i=0;i<4;i++){sendSlotParams(i,false,true);sendRange(i);}}
  const m=engineMain?engineMain.macro:(ctx?MU().macroEff:MU().macro);
  $('#ghost').style.left=(m*100)+'%';$('#ghost').classList.toggle('on',Math.abs(m-MU().macro)>0.01);
  if(engineMain&&engineMain.recovered){engineMain.recovered=false;syncAll();}
  pyramidFrame();drawScreen(now);requestAnimationFrame(frame);
}

loadState();setInterval(saveState,1500);window.addEventListener('pagehide',saveState);
if(!MU().devs.some(d=>Object.keys(d).length)||!MU().rdev.some(Boolean))rerollDevs();
if(!rangesValid(MU().slots)){const r=genRanges(MU().slots,new Set([0,1,2,3]));r.forEach((x,i)=>{MU().slots[i].a=x.a;MU().slots[i].b=x.b;});}
initScreen();buildRelay();buildBench(()=>{tweens.clear();refreshAll();syncAll();});buildPyramid();fitRack();refreshAll();updatePlay();requestAnimationFrame(frame);
