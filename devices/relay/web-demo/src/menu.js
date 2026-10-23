// Relay's screen menu and Save / Load (dial scrolls, Bypass = enter / confirm, Shift = back / cancel).
// Moved from the v30 prototype.
import { FX, defaults } from '../../control/fx-defs.js';
import { ZONE, genRanges } from '../../control/ranges.js';
import { pct } from '../../../../shared/control/params.js';
import { tweens } from '../../../../shared/control/tweens.js';
import { state, MU, saveState } from './state.js';
import { send, updateLatency, tempoSettled } from './audio.js';
import { GLIDES, RATES, muBpm, tween, sendRange, sendMix, sendOtt, applyRanges, rerollDevs, syncMuSlots, renderFx, setRingRot } from './relay-ui.js';
import { SD, showOSD } from './screen.js';

export const SLOTS=64;
export const SCR={mode:'main',page:'root',cur:0,edit:false,slot:1,acc:0};
function snapshot(){const m=MU();return JSON.parse(JSON.stringify({slots:m.slots,devs:m.devs,rdev:m.rdev,dial:m.dial}));}
export function openSaveLoad(mode){SCR.mode=mode;SCR.slot=+MU().lastSlot||1;if(!(SCR.slot>=1&&SCR.slot<=SLOTS))SCR.slot=1;}
export function openMenu(){SCR.mode='menu';SCR.page='root';SCR.cur=0;SCR.edit=false;}
function closeScr(){SCR.mode='main';SCR.edit=false;saveState();}
function saveSlot(id){MU().bank[id]=snapshot();MU().lastSlot=String(id);saveState();showOSD('Saved to slot',String(id));}
function loadSlot(id){
  const snap=MU().bank[id];if(!snap){showOSD('Slot '+id,'Empty');return;}
  const m=MU();tweens.clear();
  m.slots=snap.slots.map(x=>({fx:x.fx,on:x.on!==false,a:x.a,b:x.b,p:{...defaults(x.fx),...x.p}}));m.devs=snap.devs||[{},{},{},{}];m.rdev=snap.rdev||[null,null,null,null];
  m.dial=snap.dial||0;setRingRot(m.dial*2*Math.PI/0.6);
  if(m.rangeMode==='full')m.slots.forEach(sl=>{sl.a=ZONE;sl.b=1;});
  m.lastSlot=String(id);syncMuSlots();renderFx();updateLatency();showOSD('Loaded slot',String(id));
}
const CVIN=['Random 1','Random 2','Bypass','Dry/wet','OTT','Random glide'];
const CVOUT=['Fader position','Gate while fader moves','Trigger on Random 1','Trigger on Random 2','Trigger on either Random','Random value on Random 1','Random value on Random 2','Random value on either','Envelope, pre-effects','Envelope, post-effects'];
function tempoApply(){send({type:'bpm',v:muBpm()});clearTimeout(tempoApply.t);tempoApply.t=setTimeout(tempoSettled,400);}
function rangeModeApply(){const m=MU();if(m.rangeMode==='full'){m.slots.forEach((sl,i)=>{tween('r'+i+'a',sl.a,ZONE,v=>{sl.a=v;sendRange(i);});tween('r'+i+'b',sl.b,1,v=>{sl.b=v;sendRange(i);});});m.rdev=[null,null,null,null];}
  else{applyRanges(genRanges(new Set([0,1,2,3])));rerollDevs();}}
function menuItems(){
  const m=MU(),p=SCR.page,go=pg=>{SCR.page=pg;SCR.cur=0;SCR.edit=false;},back={l:'Back',act:()=>{const from={clock:0,ott:1,random:2,cv0:3,cv1:4,cv2:5}[p]??0;go('root');SCR.cur=from;}};
  if(p==='root')return[{l:'Clock',act:()=>go('clock')},{l:'OTT',act:()=>go('ott')},{l:'Random',act:()=>go('random')},{l:'CV 1',act:()=>go('cv0')},{l:'CV 2',act:()=>go('cv1')},{l:'CV 3',act:()=>go('cv2')},{l:'Exit',act:closeScr}];
  if(p==='clock'){const it=[{l:'Source',v:()=>m.clkSrc==='ext'?'External':'Internal',act:()=>{m.clkSrc=m.clkSrc==='ext'?'int':'ext';tempoApply();}}];
    if(m.clkSrc==='int')it.push({l:'Tempo',v:()=>m.bpm+' BPM',edit:d=>{m.bpm=Math.max(40,Math.min(220,m.bpm+d));tempoApply();}});
    else it.push({l:'Rate',v:()=>RATES[m.rateIdx][1]+(state.clock.toMu?'':'  no clock'),edit:d=>{m.rateIdx=Math.max(0,Math.min(RATES.length-1,m.rateIdx+d));tempoApply();}});
    it.push(back);return it;}
  if(p==='ott')return[{l:'Follows fader',v:()=>m.ottMac?'On':'Off',act:()=>{m.ottMac=m.ottMac?0:1;send({type:'ottmac',v:m.ottMac});}},
    {l:'On in bypass',v:()=>m.ottByp?'Off':'On',act:()=>{m.ottByp=m.ottByp?0:1;send({type:'ottbyp',v:m.ottByp});}},back];
  if(p==='random')return[{l:'Amount',v:()=>pct(m.amount),edit:d=>{m.amount=Math.max(0.15,Math.min(1,Math.round((m.amount+d*0.05)*100)/100));}},
    {l:'Glide',v:()=>GLIDES[m.glideIdx][1],edit:d=>{m.glideIdx=Math.max(0,Math.min(GLIDES.length-1,m.glideIdx+d));}},
    {l:'Ranges',v:()=>m.rangeMode==='full'?'Full':'Random',act:()=>{m.rangeMode=m.rangeMode==='full'?'random':'full';rangeModeApply();}},back];
  if(/^cv\d$/.test(p)){const c=m.cv[+p[2]],it=[{l:'Mode',v:()=>c.mode==='in'?'Input':'Output',act:()=>{c.mode=c.mode==='in'?'out':'in';}}];
    if(c.mode==='in')CVIN.forEach((l,i)=>it.push({l,chk:()=>c.ins.includes(i),act:()=>{const j=c.ins.indexOf(i);if(j>=0)c.ins.splice(j,1);else c.ins.push(i);sendMix();sendOtt();}}));
    else CVOUT.forEach((l,i)=>it.push({l,radio:true,chk:()=>c.out===i,act:()=>{c.out=i;}}));
    it.push(back);return it;}
  return[back];
}
export function scrScroll(d){
  if(SCR.mode==='save'||SCR.mode==='load'){SCR.slot=((SCR.slot-1+d)%SLOTS+SLOTS)%SLOTS+1;return;}
  const it=menuItems();if(SCR.edit&&it[SCR.cur].edit){it[SCR.cur].edit(d);return;}
  SCR.cur=Math.max(0,Math.min(it.length-1,SCR.cur+d));
}
export function scrEnter(){
  if(SCR.mode==='save'){saveSlot(SCR.slot);closeScr();return;}
  if(SCR.mode==='load'){const ok=!!MU().bank[SCR.slot];loadSlot(SCR.slot);if(ok)closeScr();return;}
  const it=menuItems()[SCR.cur];if(!it)return;
  if(it.edit){SCR.edit=!SCR.edit;return;}
  it.act&&it.act();SCR.cur=Math.min(SCR.cur,menuItems().length-1);
}
export function scrBack(){
  if(SCR.mode!=='menu'){closeScr();showOSD(SCR.mode==='save'?'Save':'Load','Cancelled');return;}
  if(SCR.edit){SCR.edit=false;return;}
  if(SCR.page!=='root'){const it=menuItems();it[it.length-1].act();return;}
  closeScr();
}
export function drawScr(g,now){
  const C=SD/2;g.fillStyle='rgba(4,6,16,.9)';g.fillRect(0,0,SD,SD);g.textBaseline='middle';
  const font=(w,sz)=>`${w} ${sz}px "Barlow Semi Condensed",sans-serif`;
  if(SCR.mode==='save'||SCR.mode==='load'){
    const snap=MU().bank[SCR.slot];
    g.textAlign='center';g.fillStyle='rgba(255,236,200,.85)';g.font=font(700,9);g.fillText(SCR.mode==='save'?'SAVE TO SLOT':'LOAD SLOT',C,26);
    g.fillStyle='#fff8ec';g.font=font(800,34);g.fillText(String(SCR.slot),C,52);
    g.font=font(600,9);
    if(snap)snap.slots.forEach((sl,i)=>{const h=FX[sl.fx]?.hue;g.fillStyle=sl.fx==='none'||h==null?'rgba(150,160,170,.7)':`hsl(${h} 90% 70%)`;g.fillText(sl.fx==='none'?'(empty)':FX[sl.fx].name,C,76+i*10);});
    else{g.fillStyle='rgba(150,160,170,.8)';g.fillText(SCR.mode==='save'?'empty slot':'nothing saved here',C,84);}
    g.fillStyle='rgba(255,236,200,.75)';g.font=font(600,7.5);
    g.fillText('Bypass to confirm',C,SD-26);g.fillText('Shift to cancel',C,SD-17);return;
  }
  const it=menuItems(),title={root:'MENU',clock:'CLOCK',ott:'OTT',random:'RANDOM',cv0:'CV 1',cv1:'CV 2',cv2:'CV 3'}[SCR.page];
  g.textAlign='center';g.fillStyle='rgba(255,236,200,.85)';g.font=font(800,9);g.fillText(title,C,22);
  const rowH=15,top=C-rowH*0.5-rowH*2+4;
  for(let r=-2;r<=2;r++){
    const i=SCR.cur+r;if(i<0||i>=it.length)continue;const x=it[i],y=top+(r+2)*rowH,sel=r===0,fade=1-Math.abs(r)*0.3;
    if(sel){g.fillStyle=SCR.edit?'rgba(255,179,71,.95)':'rgba(255,179,71,.28)';g.beginPath();g.roundRect(22,y-7,SD-44,14,4);g.fill();}
    g.font=font(sel?700:500,9.5);g.textAlign='left';g.fillStyle=sel&&SCR.edit?'#2a1a00':`rgba(240,244,250,${fade})`;
    let lab=x.l;if(x.chk)lab=(x.radio?(x.chk()?'● ':'○ '):(x.chk()?'☑ ':'☐ '))+lab;g.fillText(lab,27,y+0.5);
    if(x.v){g.textAlign='right';g.fillStyle=sel&&SCR.edit?'#2a1a00':`rgba(255,210,140,${fade})`;g.fillText(x.v(),SD-27,y+0.5);}
  }
  g.textAlign='center';g.fillStyle='rgba(255,236,200,.6)';g.font=font(600,7);g.fillText(SCR.edit?'Turn to change, Bypass when done':'Bypass enter, Shift back',C,SD-24);
}
