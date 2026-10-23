// Relay panel logic: what the dial, fader, knobs and keys send to the engine, and Random 1 / Random 2.
// Moved from the v30 prototype; the key grammar (act on release) lives in ../../control/keys.js.
import { FX, randParam, randomParams } from '../../control/fx-defs.js';
import { rangesValid, randRange, genRanges, dialTarget } from '../../control/ranges.js';
import { rollEffects, shufflerEarly, bufferNotLast } from '../../control/chain.js';
import { createRelayKeys } from '../../control/keys.js';
import { clamp01, pct, toPos, fromPos } from '../../../../shared/control/params.js';
import { tweens, tweenD } from '../../../../shared/control/tweens.js';
import { makeKnob } from '../../../../shared/ui-web/knob.js';
import { state, MU } from './state.js';
import { send, ensureAudio, updateLatency } from './audio.js';
import { SCR, openMenu, openSaveLoad, scrEnter, scrBack, scrScroll } from './menu.js';
import { vis, resetVis, retuneVis, splash, glfShake, showOSD, showFlash } from './screen.js';

const $=s=>document.querySelector(s);

/* ---------- clock ---------- */
export const GLIDES=[[0,'Instant'],[0.25,'1/16'],[0.5,'1/8'],[1,'1/4'],[2,'1/2'],[4,'1 bar'],[8,'2 bars'],[16,'4 bars'],[32,'8 bars'],[64,'16 bars']];
export const RATES=[[1/4,'÷4'],[1/3,'÷3'],[1/2,'÷2'],[1,'×1'],[2,'×2'],[3,'×3'],[4,'×4']];
const muExt=()=>state.mu.clkSrc==='ext'&&state.clock.toMu;
export const muBpm=()=>muExt()?Math.max(30,Math.min(300,Math.round(state.clock.bpm*RATES[state.mu.rateIdx][0]*10)/10)):state.mu.bpm;
/* the test sources are generated at the tempo Relay is following */
export const srcBpm=()=>muExt()?state.clock.bpm:state.mu.bpm;

/* ---------- CV inputs (configured in the menu; this demo's bench has no cables, so nothing is patched) ---------- */
const RCV=[{patched:false,lvl:0},{patched:false,lvl:0},{patched:false,lvl:0}];
export function cvInVal(dest){let v=0;(MU().cv||[]).forEach((c,n)=>{if(c.mode==='in'&&RCV[n]&&RCV[n].patched&&c.ins.includes(dest))v+=RCV[n].lvl;});return Math.max(-1,Math.min(1,v));}

/* ---------- glides ---------- */
const glideMs=()=>GLIDES[Math.max(0,Math.min(GLIDES.length-1,state.mu.glideIdx+Math.round(cvInVal(5)*4)))][0]*60/muBpm()*1000;
export function tween(key,from,to,apply){tweenD(key,from,to,glideMs(),apply);}

/* ---------- what the engine hears ---------- */
/* deviation dial: effective = base + dial × per-parameter random offset */
const curDial=()=>clamp01(MU().dial);
function effPos(i,p){const s=MU().slots[i],b=toPos(p,s.p[p.k]),tg=(MU().devs[i]||{})[p.k];return tg==null?b:clamp01(b+(tg-b)*curDial());}
function sendParam(i,p,hard){const s=MU().slots[i];if(p.o)send({type:'param',i,k:p.k,v:s.p[p.k],duck:!hard});else send({type:'param',i,k:p.k,v:fromPos(p,effPos(i,p)),sm:!hard});}
export function sendSlotParams(i,hard,contOnly){for(const p of FX[MU().slots[i].fx].params)if(!(contOnly&&p.o))sendParam(i,p,hard);}
/* the dial also carries each slider range toward a second valid range set */
export function effRange(i){const s=MU().slots[i],r=MU().rdev[i],d=curDial();if(!r||d<=0)return[s.a,s.b];return[s.a+(r.a-s.a)*d,s.b+(r.b-s.b)*d];}
export function sendRange(i){const[a,b]=effRange(i);send({type:'range',i,a,b});}
function slotMsgs(i){const s=MU().slots[i];send({type:'fx',i,fx:s.fx});sendSlotParams(i,true);sendRange(i);send({type:'on',i,v:s.on});}
export function syncMuSlots(){for(let i=0;i<4;i++)slotMsgs(i);}
export function sendMix(){send({type:'mix',v:clamp01(state.mu.mix+cvInVal(3)*0.5)});}
export function sendOtt(){send({type:'ott',v:clamp01(state.mu.ott+cvInVal(4)*0.5)});}
export function syncAll(){send({type:'ottmac',v:state.mu.ottMac});sendMix();sendOtt();send({type:'ottbyp',v:state.mu.ottByp});send({type:'bpm',v:muBpm()});send({type:'macro',v:state.mu.macro});send({type:'mbyp',v:state.mu.bypass});syncMuSlots();}

/* ---------- Random 1 / Random 2 ---------- */
export function rerollDevs(){
  if(MU().rangeMode==='full'){MU().devs=MU().slots.map(s=>Object.fromEntries(FX[s.fx].params.filter(p=>!p.o).map(p=>[p.k,dialTarget(toPos(p,s.p[p.k]))])));MU().rdev=[null,null,null,null];return;}
  MU().devs=MU().slots.map(s=>Object.fromEntries(FX[s.fx].params.filter(p=>!p.o).map(p=>[p.k,dialTarget(toPos(p,s.p[p.k]))])));
  const base=MU().slots.map(s=>({...s,mode:s.p.mode}));
  for(let t=0;t<300;t++){
    const tg=base.map(s=>{const[a,b]=randRange(s);return{...s,a,b};});
    if(!rangesValid(tg))continue;
    if([0.25,0.5,0.75].every(d=>rangesValid(base.map((s,i)=>({...s,a:s.a+(tg[i].a-s.a)*d,b:s.b+(tg[i].b-s.b)*d}))))){MU().rdev=tg.map(x=>({a:x.a,b:x.b}));return;}
  }
  MU().rdev=[null,null,null,null];
}
export function applyRanges(res){res.forEach((r,i)=>{const s=MU().slots[i];
  tween('r'+i+'a',s.a,r.a,v=>{s.a=v;sendRange(i);});tween('r'+i+'b',s.b,r.b,v=>{s.b=v;sendRange(i);});});}
function swapEffect(i,fx){
  for(const k of[...tweens.keys()])if(k.startsWith(`p${i}.`))tweens.delete(k);
  const s=MU().slots[i];s.fx=fx;s.p=randomParams(fx);s.on=true;slotMsgs(i);
}
/* apply a chain-order swap to the slots' visuals and the engine (the slots themselves are already swapped) */
function applySwap(sw){if(!sw)return;const[j,k]=sw;[vis[j],vis[k]]=[vis[k],vis[j]];send({type:'swap',i:j,j:k});}
export function randomizeMu(btn){
  glfShake();
  const mu=MU(),A=mu.amount,hit=()=>Math.random()<A,fullR=mu.rangeMode==='full';
  setDial(0);setRingRot(0);
  if(btn===0){
    const r=rollEffects(mu.slots.map(s=>s.fx),A),ch=r.ch;
    r.fxs.forEach((fx,i)=>{if(fx!==mu.slots[i].fx){swapEffect(i,fx);if(r.picked.has(i))splash(i,1.2);}});
    applySwap(shufflerEarly(mu.slots));applySwap(bufferNotLast(mu.slots));
    if(!fullR&&!rangesValid(mu.slots))applyRanges(genRanges(mu.slots,ch));
    for(const i of ch)resetVis(i);
    showFlash('RANDOM FX');
  }else{
    const ch=new Set();
    mu.slots.forEach((s,i)=>{for(const p of FX[s.fx].params)if(hit()){const v=randParam(p);ch.add(i);
      if(p.o){s.p[p.k]=v;sendParam(i,p);}else tween(`p${i}.${p.k}`,toPos(p,s.p[p.k]),toPos(p,v),x=>{s.p[p.k]=fromPos(p,x);sendParam(i,p);});}});
    if(!ch.size){const i=Math.floor(Math.random()*4);ch.add(i);}
    if(!fullR)applyRanges(genRanges(mu.slots,new Set([...ch].filter(()=>Math.random()<Math.max(A,0.35)))));
    for(const i of ch)splash(i,0.8);
    showFlash('RANDOM SETTINGS');
  }
  rerollDevs();if(btn===1)retuneVis();
  for(let i=0;i<4;i++){sendSlotParams(i);sendRange(i);}
  renderFx();updateLatency();
}

/* ---------- Dry/wet and OTT knobs ---------- */
const x0=v=>v<0.005?'Off':pct(v);
export let muOttK=null,muMixK=null;

/* ---------- bypass ---------- */
export function setBypass(v){MU().bypass=v;send({type:'mbyp',v});$('#kByp').classList.toggle('on',v);$('#kByp').classList.toggle('lit',v);$('#kByp').classList.toggle('red',v);$('#modMu').classList.toggle('bypassed',v);}

/* ---------- keys: see ../../control/keys.js for the grammar ---------- */
const KEYS=createRelayKeys({
  inMenu:()=>SCR.mode!=='main',openMenu,enter:scrEnter,back:scrBack,
  save:()=>openSaveLoad('save'),load:()=>openSaveLoad('load'),
  toggleBypass:()=>setBypass(!MU().bypass),random:randomizeMu});
const KEY_EL={r1:'#kA',r2:'#kB',byp:'#kByp',sh:'#kSh'};
/* press or release one of Relay's keys (panel, pyramid or computer keyboard) */
export function rKey(which,down){
  if(KEYS.isDown(which)===down)return;
  const el=$(KEY_EL[which]);el.classList.toggle('pressed',down);if(which==='sh')el.classList.toggle('held',down);
  if(down){ensureAudio();KEYS.down(which);}else KEYS.up(which);
}
/* window lost focus: release everything without acting */
export function clearKeys(){KEYS.clear();document.querySelectorAll('.key.pressed,.key.held,.pkey.pressed').forEach(k=>k.classList.remove('pressed','held'));}

/* ---------- fader ---------- */
export function setMacro(v){v=clamp01(v);MU().macro=v;$('#fcap').style.left=(v*100)+'%';$('#fader').setAttribute('aria-valuenow',Math.round(v*100));send({type:'macro',v});}

/* ---------- dial: drag around the ring; clockwise deviates, counter-clockwise returns ---------- */
export let ringRot=0,dialDirty=false;
export function clearDialDirty(){dialDirty=false;}
export function setRingRot(r){ringRot=r;$('#ring').style.transform=`rotate(${ringRot}rad)`;}
export function setDial(v){MU().dial=clamp01(v);dialDirty=true;$('#dial').setAttribute('aria-valuenow',Math.round(MU().dial*100));}
/* turn the dial by d radians: scrolls the screen menu, or moves the deviation */
export function turnDial(d,spinRing){
  if(SCR.mode!=='main'){SCR.acc+=d;while(SCR.acc>0.32){SCR.acc-=0.32;scrScroll(1);}while(SCR.acc<-0.32){SCR.acc+=0.32;scrScroll(-1);}if(spinRing)setRingRot(ringRot+d);return;}
  const before=MU().dial;setDial(before+d/(2*Math.PI)*0.6);if(spinRing&&(MU().dial!==before||d<0&&before>0))setRingRot(ringRot+d);
}

/* ---------- effects list on the bench ---------- */
export function renderFx(){$('#fxlist').innerHTML=MU().slots.map((s,i)=>s.fx==='none'?`<li style="--c:#7b838a" class="byp"><b>${i+1}</b> <em>empty</em></li>`:`<li style="--c:hsl(${FX[s.fx].hue} 90% 62%)"><b>${i+1}</b> ${FX[s.fx].name}</li>`).join('');}

/* ---------- build the panel's controls ---------- */
export function buildRelay(){
  muOttK=makeKnob({label:'OTT',title:'OTT amount at the end of the chain',get:()=>state.mu.ott,set:x=>{state.mu.ott=x;sendOtt();},fmt:()=>x0(state.mu.ott),def:0.5,touched:v=>showOSD('OTT',v)});
  $('#muOttK').append(muOttK);
  muMixK=makeKnob({label:'Dry/wet',get:()=>state.mu.mix,set:x=>{state.mu.mix=x;sendMix();},fmt:()=>pct(state.mu.mix),def:1,touched:v=>showOSD('Dry/wet',v)});
  $('#muMixK').append(muMixK);
  for(const[w,id]of Object.entries(KEY_EL)){
    const el=$(id);
    el.addEventListener('pointerdown',e=>{e.preventDefault();el.setPointerCapture(e.pointerId);rKey(w,true);});
    for(const ev of['pointerup','pointercancel','lostpointercapture'])el.addEventListener(ev,()=>{if(el.classList.contains('pressed'))rKey(w,false);});
    el.addEventListener('contextmenu',e=>e.preventDefault());
    el.addEventListener('keydown',e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();e.stopPropagation();rKey(w,true);}});
    el.addEventListener('keyup',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();rKey(w,false);}});
  }
  const fader=$('#fader');
  const faderPos=e=>{const r=fader.getBoundingClientRect();return(e.clientX-r.left)/r.width;};
  fader.addEventListener('pointerdown',e=>{fader.setPointerCapture(e.pointerId);setMacro(faderPos(e));
    const mv=ev=>{if(ev.pointerId===e.pointerId)setMacro(faderPos(ev));};
    const up=ev=>{if(ev.pointerId!==e.pointerId)return;fader.removeEventListener('pointermove',mv);fader.removeEventListener('pointerup',up);fader.removeEventListener('pointercancel',up);};
    fader.addEventListener('pointermove',mv);fader.addEventListener('pointerup',up);fader.addEventListener('pointercancel',up);});
  fader.addEventListener('keydown',e=>{const s=e.shiftKey?0.1:0.02;if(e.key==='ArrowRight'||e.key==='ArrowUp'){setMacro(MU().macro+s);e.preventDefault();}else if(e.key==='ArrowLeft'||e.key==='ArrowDown'){setMacro(MU().macro-s);e.preventDefault();}});
  const dial=$('#dial');
  dial.addEventListener('pointerdown',e=>{
    e.preventDefault();dial.setPointerCapture(e.pointerId);dial.focus({preventScroll:true});
    const r=dial.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let last=Math.atan2(e.clientY-cy,e.clientX-cx);
    const mv=ev=>{const a=Math.atan2(ev.clientY-cy,ev.clientX-cx);let d=a-last;if(d>Math.PI)d-=2*Math.PI;if(d<-Math.PI)d+=2*Math.PI;last=a;turnDial(d,true);};
    const up=()=>{dial.removeEventListener('pointermove',mv);dial.removeEventListener('pointerup',up);dial.removeEventListener('pointercancel',up);};
    dial.addEventListener('pointermove',mv);dial.addEventListener('pointerup',up);dial.addEventListener('pointercancel',up);
  });
  dial.addEventListener('keydown',e=>{let d=0;if(e.key==='ArrowRight'||e.key==='ArrowUp')d=0.03;else if(e.key==='ArrowLeft'||e.key==='ArrowDown')d=-0.03;else return;e.preventDefault();if(SCR.mode!=='main'){scrScroll(d>0?1:-1);return;}setDial(MU().dial+d);setRingRot(ringRot+d*10);});
}
