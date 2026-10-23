// Relay desktop (concept): a triangular pyramid in real CSS 3D; drag sideways or use the arrows to turn it.
// Its controls drive the same Relay as the panel. Moved from the v30 prototype.
import { clamp01 } from '../../../../shared/control/params.js';
import { ICON_DICE, ICON_DICE3, ICON_BYP } from '../../../../shared/ui-web/icons.js';
import { state, MU } from './state.js';
import { rKey, turnDial, setMacro, sendMix, sendOtt, muMixK, muOttK, ringRot } from './relay-ui.js';
import { showOSD, screenCanvas } from './screen.js';
import { SCR } from './menu.js';

const $=s=>document.querySelector(s);
/* ---------- RELAY DESKTOP (concept): a triangular pyramid; drag sideways (or use the arrows) to turn it ----------
   Geometry (2.5 px per mm): base edge 440 px (176 mm), height 440 px (176 mm), faces lean back 16.1 degrees.
   Lighting: one directional key light from the upper left front plus ambient. For each face JS works out how much
   light it gets (--fb), the light's direction across the face (--ltx/--lty, used to shade the sides of every solid),
   and where the controls' shadows fall (--lx/--ly, --so). The floor canvas gets the pyramid's cast shadow. */
const PY={S:440,H:440,RI:440/(2*Math.sqrt(3)),T:20};PY.SL=Math.hypot(PY.RI,PY.H);PY.B=Math.atan(PY.RI/PY.H);
PY.L=(()=>{const v=[-0.55,-0.8,0.5],n=Math.hypot(...v);return v.map(x=>x/n);})();
/* solids for round parts: stacked 1 px layers (reads as a solid cylinder from any angle); cls adds shape (e.g. hex, ring) */
function pyStack(x,y,w,h,z0,dz,bg,cls){let s='';for(let z=z0;z<z0+dz;z+=1)s+=`<i class="stk${cls?' '+cls:''}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;background:${bg};transform:translateZ(${z}px)"></i>`;return s;}
function pyBox(w,h,dz,rgb){/* four side walls of a w x h box standing dz proud of the face */
  const W=(st,nx,ny)=>`<i class="fc bv" style="${st};--nx:${nx};--ny:${ny};--r:${rgb[0]};--g:${rgb[1]};--b:${rgb[2]}"></i>`;
  return W(`left:0;top:${h}px;width:${w}px;height:${dz}px;transform-origin:50% 0;transform:rotateX(90deg)`,0,1)+W(`left:0;top:${-dz}px;width:${w}px;height:${dz}px;transform-origin:50% 100%;transform:rotateX(-90deg)`,0,-1)
    +W(`left:${-dz}px;top:0;width:${dz}px;height:${h}px;transform-origin:100% 50%;transform:rotateY(90deg)`,-1,0)+W(`left:${w}px;top:0;width:${dz}px;height:${h}px;transform-origin:0 50%;transform:rotateY(-90deg)`,1,0);}
function pyLed(v){let s='';for(let i=0;i<15;i++){const a=(-135+270*i/14)*Math.PI/180,x=40+Math.sin(a)*36,y=40-Math.cos(a)*36,on=i/14<=v+1e-6&&v>0.004;
  s+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.3" fill="${on?'#7fdcff':'rgba(0,0,0,.2)'}"${on?' style="filter:drop-shadow(0 0 2px #39c2ff)"':''}/>`;}return s;}
export function buildPyramid(){
  const st=$('#pyrStage'),py=$('#pyr'),scene=$('#pscene'),gscene=$('#pgscene');if(!st)return;let ry=-35,drag=null,anim=null;
  const tri=`<svg class="ptri" viewBox="0 0 440 458" aria-hidden="true"><defs><linearGradient id="pyg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#000" stop-opacity=".06"/></linearGradient></defs>
    <polygon points="220,0 440,458 0,458" style="fill:rgb(calc(246*var(--fb)) calc(248*var(--fb)) calc(245*var(--fb)))"/><polygon points="220,0 440,458 0,458" fill="url(#pyg)"/>
    <path d="M1.5 457 L220 2 L438.5 457" fill="none" stroke="rgba(255,255,255,.75)" stroke-width="2"/><path d="M0 457.5 H440" stroke="rgba(0,0,0,.35)" stroke-width="1.2"/></svg>`;
  const lab=(x,y,t,c)=>`<span class="plab${c?' '+c:''}" style="left:${x}px;top:${y}px">${t}</span>`;
  /* face 0: dial with the live screen, four keys */
  const keys=[['sh','','','Shift'],['r1',ICON_DICE,'Random 1','Save'],['r2',ICON_DICE3,'Random 2','Load'],['byp',ICON_BYP,'Bypass','Menu']];
  let f0=`<div class="pctl pdial" id="pdial" style="left:145px;top:207px" title="Dial"><i class="shd" style="--h:10;inset:0;border-radius:50%"></i>${pyStack(0,0,150,150,0,4,'#2c3035')}${pyStack(0,0,150,150,4,6,'#33373c','ringm')}
    <canvas id="pscreen"></canvas><i class="glass"></i><i class="ring lit" id="pring"></i><i class="ringhl"></i></div>`;
  /* keys: chunky boxes (PKEY_H tall) with the module's key tops: cap, dish, thin LED line, icon and name */
  const PKEY_H=20;
  keys.forEach(([w,ic,t,lg],i)=>{const x=92+i*66,rgb=w==='sh'?[224,85,159]:[63,147,201];
    f0+=`<div class="pctl pkey${w==='sh'?' sh':''}" data-w="${w}" role="button" aria-label="${t||'Shift'}" style="left:${x}px;top:376px"><i class="kb shd" style="--h:${PKEY_H}"></i>${pyBox(58,52,PKEY_H,rgb)}<i class="kt lit" style="transform:translateZ(${PKEY_H}px)"><span class="lline"></span>${ic?`<span class="kic">${ic}</span><span class="ktx">${t}</span>`:''}</i></div>`+lab(x+29,442,lg,'pk');});
  /* face 1: vertical fader, Dry/wet and OTT knobs below it either side */
  let f1=`<div class="pctl pfader" id="pfader" style="left:192px;top:118px" title="Fader"><i class="slot"></i><div class="pctl pfcap" id="pfcap"><i class="shd" style="--h:13;inset:0;border-radius:3px"></i>${pyBox(50,26,13,[214,216,210])}<i class="ct lit"></i></div></div>`;
  for(const[id,x,t]of[['pMixK',120,'Dry/wet'],['pOttK',320,'OTT']])
    f1+=lab(x,338,t)+`<div class="pctl pknob" id="${id}" style="left:${x-40}px;top:352px" title="${t}"><svg viewBox="0 0 80 80"></svg><i class="shd" style="--h:26;left:13px;top:13px;width:54px;height:54px;border-radius:50%"></i>${pyStack(13,13,54,54,0,6,'#8f9499')}<i class="skirt lit"></i>${pyStack(18,18,44,44,6,20,'#b9bdc2')}<i class="cap lit"></i><i class="ptr"></i></div>`;
  /* face 2: the five 1/4-inch jacks in one row near the bottom edge */
  let f2='';['Exp','In L','In R','Out L','Out R'].forEach((t,i)=>{const x=80+i*70;f2+=lab(x,378,t)+`<div class="pctl pjack" style="left:${x-20}px;top:392px" title="${t}"><i class="shd" style="--h:6;left:6px;top:6px;width:28px;height:28px;border-radius:50%"></i>${pyStack(2.68,5,34.64,30,0,3,'#a7acb1','hexm')}<i class="hex lit"></i>${pyStack(10.5,10.5,19,19,3,5,'#9ca1a6')}<i class="top lit"></i></div>`;});
  py.innerHTML=[f0,f1,f2].map((c,k)=>`<div class="pface" data-k="${k}" style="transform:rotateY(${k*120}deg) translateZ(${PY.RI}px) rotateX(${PY.B*180/Math.PI}deg)">${tri}${c}</div>`).join('');
  const faces=[...py.querySelectorAll('.pface')],gc=$('#pground').getContext('2d');
  const light=()=>{
    const L=PY.L,cb=Math.cos(PY.B),sb=Math.sin(PY.B),T=PY.T*Math.PI/180,dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
    faces.forEach((f,k)=>{const p=(k*120+ry)*Math.PI/180,sp=Math.sin(p),cp=Math.cos(p);
      const n=[sp*cb,-sb,cp*cb],xf=[cp,0,-sp],yf=[sp*sb,cb,cp*sb],ln=dot(n,L),tx=dot(L,xf),ty=dot(L,yf),d=Math.max(0.3,ln),cl=v=>Math.max(-2.6,Math.min(2.6,v));
      f.style.setProperty('--fb',(0.5+0.56*Math.max(0,ln)).toFixed(3));f.style.setProperty('--ltx',tx.toFixed(3));f.style.setProperty('--lty',ty.toFixed(3));
      f.style.setProperty('--lx',cl(-tx/d).toFixed(3));f.style.setProperty('--ly',cl(-ty/d).toFixed(3));f.style.setProperty('--so',(0.08+0.32*Math.max(0,Math.min(1,ln*1.4))).toFixed(3));
      f.style.visibility=sb*Math.sin(T)+cp*cb*Math.cos(T)<-0.12?'hidden':'visible';});
    /* floor: soft pool of light, contact shadow along the base, and the cast shadow of the apex */
    const g=gc,C=700,R=2*PY.RI,V=[0,1,2].map(k=>{const a=(k*120+ry+60)*Math.PI/180;return[C+R*Math.sin(a),C+R*Math.cos(a)];});
    const s=-PY.H/L[1],A=[C-s*L[0],C-s*L[2]];
    g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,1400,1400);g.filter='none';
    const fl=g.createRadialGradient(C,C,0,C,C,560);fl.addColorStop(0,'rgba(255,255,255,.55)');fl.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=fl;g.beginPath();g.arc(C,C,560,0,7);g.fill();
    const hull=pts=>{pts=pts.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]),lo=[],up=[];
      for(const p of pts){while(lo.length>=2&&cr(lo[lo.length-2],lo[lo.length-1],p)<=0)lo.pop();lo.push(p);}
      for(const p of pts.reverse()){while(up.length>=2&&cr(up[up.length-2],up[up.length-1],p)<=0)up.pop();up.push(p);}return lo.slice(0,-1).concat(up.slice(0,-1));};
    const poly=(P,fill,blur)=>{g.filter=`blur(${blur}px)`;g.fillStyle=fill;g.beginPath();P.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();g.fill();};
    const H=hull([...V,A]),sh=g.createLinearGradient(C,C,A[0],A[1]);sh.addColorStop(0,'rgba(20,24,28,.42)');sh.addColorStop(1,'rgba(20,24,28,.12)');
    poly(H,sh,16);poly(H,'rgba(20,24,28,.16)',5);poly(V.map(p=>[C+(p[0]-C)*1.04,C+(p[1]-C)*1.04]),'rgba(10,12,14,.38)',7);g.filter='none';
  };
  const setR=()=>{const k=Math.min(1.2,(st.clientWidth||800)/640);const hS=Math.round(640*k);if(st._h!==hS){st._h=hS;st.style.height=hS+'px';scene.style.top=gscene.style.top=Math.round(hS*0.8)+'px';}scene.style.transform=gscene.style.transform=`scale(${k}) rotateX(${-PY.T}deg)`;py.style.transform=`rotateY(${ry}deg)`;light();};
  setR();PY.setR=setR;window.addEventListener('resize',setR);
  const turn=d=>{const a=ry,b=Math.round((ry+d)/120)*120-35,t0=performance.now();cancelAnimationFrame(anim);
    const step=now=>{const x=Math.min(1,(now-t0)/600),e=x<.5?2*x*x:1-Math.pow(-2*x+2,2)/2;ry=a+(b-a)*e;setR();if(x<1)anim=requestAnimationFrame(step);};anim=requestAnimationFrame(step);};
  $('#pyrL').onclick=()=>turn(-120);$('#pyrR').onclick=()=>turn(120);
  st.addEventListener('pointerdown',e=>{if(e.target.closest('.pctl,button,input'))return;cancelAnimationFrame(anim);drag={x:e.clientX,r:ry};st.setPointerCapture(e.pointerId);});
  st.addEventListener('pointermove',e=>{if(!drag)return;ry=drag.r+(e.clientX-drag.x)*0.5;setR();});
  for(const ev of['pointerup','pointercancel'])st.addEventListener(ev,()=>{drag=null;});
  document.querySelectorAll('.pkey').forEach(b=>{const w=b.dataset.w;b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);b.classList.add('pressed');rKey(w,true);});
    for(const ev of['pointerup','pointercancel'])b.addEventListener(ev,()=>{if(b.classList.contains('pressed')){b.classList.remove('pressed');rKey(w,false);}});});
  const pd=$('#pdial');pd.addEventListener('pointerdown',e=>{e.preventDefault();pd.setPointerCapture(e.pointerId);const r=pd.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let last=Math.atan2(e.clientY-cy,e.clientX-cx);
    const mv=ev=>{const a=Math.atan2(ev.clientY-cy,ev.clientX-cx);let d=a-last;if(d>Math.PI)d-=2*Math.PI;if(d<-Math.PI)d+=2*Math.PI;last=a;turnDial(d,false);};
    const up=()=>{pd.removeEventListener('pointermove',mv);pd.removeEventListener('pointerup',up);};pd.addEventListener('pointermove',mv);pd.addEventListener('pointerup',up);});
  const pf=$('#pfader');pf.addEventListener('pointerdown',e=>{e.preventDefault();pf.setPointerCapture(e.pointerId);const set=ev=>{const r=pf.getBoundingClientRect();setMacro(clamp01(1-(ev.clientY-r.top)/r.height));};set(e);
    const up=()=>{pf.removeEventListener('pointermove',set);pf.removeEventListener('pointerup',up);};pf.addEventListener('pointermove',set);pf.addEventListener('pointerup',up);});
  /* knobs: drag up or down; double-click resets */
  const knob=(id,get,set,def,name)=>{const el=$('#'+id);let y0=null,v0=0;
    el.addEventListener('pointerdown',e=>{e.preventDefault();el.setPointerCapture(e.pointerId);y0=e.clientY;v0=get();});
    el.addEventListener('pointermove',e=>{if(y0==null)return;set(clamp01(v0+(y0-e.clientY)/160));showOSD(name,get());});
    for(const ev of['pointerup','pointercancel'])el.addEventListener(ev,()=>{y0=null;});
    el.addEventListener('dblclick',()=>{set(def);showOSD(name,get());});};
  knob('pMixK',()=>state.mu.mix,x=>{state.mu.mix=x;sendMix();muMixK.update();},1,'Dry/wet');
  knob('pOttK',()=>state.mu.ott,x=>{state.mu.ott=x;sendOtt();muOttK.update();},0.5,'OTT');
}
const PYK={};
export function pyramidFrame(){
  const c=$('#pscreen'),scr=screenCanvas();if(!c||!scr)return;const g=c.getContext('2d');if(c.width!==scr.width){c.width=scr.width;c.height=scr.height;}g.clearRect(0,0,c.width,c.height);g.drawImage(scr,0,0);
  const cap=$('#pfcap');if(cap)cap.style.top=((1-MU().macro)*100)+'%';
  const k=$('.pkey[data-w="byp"]');if(k)k.classList.toggle('red',!!MU().bypass);
  for(const[w,mode]of[['r1','save'],['r2','load']]){const e=$(`.pkey[data-w="${w}"]`);if(e)e.classList.toggle('pink',SCR.mode===mode);}
  const rg=$('#pring');if(rg)rg.style.transform=`translateZ(10px) rotate(${ringRot}rad)`;
  for(const[id,v]of[['pMixK',state.mu.mix],['pOttK',state.mu.ott]]){if(PYK[id]===v)continue;PYK[id]=v;const el=$('#'+id);if(!el)continue;el.querySelector('svg').innerHTML=pyLed(v);el.querySelector('.ptr').style.setProperty('--a',(-135+270*v)+'deg');}
}

