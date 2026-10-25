// Test bench modulation cards and click-to-patch cables (not hardware), shared by the Moment and Prism demos.
// One LFO (shapes, Sync / Free, or clocked S&H) and a rhythm generator (Euclidean steps that send triggers).
// Click an output, then a module jack (or the other way round); click a patched jack, or × in the cable list, to unplug.
// Logic: shared/control/modulation.js.
import { makeKnob } from './knob.js';
import { pct, hz, toPos, fromPos } from '../control/params.js';
import { LSHAPES, LRATES, RRATES, lfoHzP, createLfo, createRhythm } from '../control/modulation.js';

export const SRC={LFO:{l:'LFO',c:'#8f9bff'},RHY:{l:'Rhythm',c:'#ffffff'}};

/* o: box (element for the cards), list (cable list element), hint (hint element), bench ({lfo, rhythm, patches}),
   ports (jack id -> {el, name}), beat() (master clock position in beats), onConnect(port, src), onUnplug(port),
   changed() (save) */
export function buildModBench(o){
  const B=o.bench,lfo=createLfo(B.lfo),rhy=createRhythm(B.rhythm);let sel=null,last=0,prevHi={};
  const out={LFO:0,RHY:0},trig={LFO:0,RHY:0};
  const card=html=>{const c=document.createElement('div');c.className='lfocard';c.innerHTML=html;o.box.append(c);return c;};
  const outBtn=(src,label)=>`<button class="bout" data-src="${src}" aria-label="${SRC[src].l} output"><span class="bj"></span><span class="bm"><i></i></span>${label}</button>`;

  /* LFO */
  const L=B.lfo,lc=card(`<b class="srct"><i style="background:${SRC.LFO.c}"></i>LFO</b><div class="seg sm" role="group" aria-label="LFO mode"><button data-m="lfo">LFO</button><button data-m="sh">S&amp;H</button></div>
    <select class="mini" aria-label="LFO shape">${LSHAPES.map((x,k)=>`<option value="${k}">${x}</option>`).join('')}</select>
    <div class="seg sm" role="group" aria-label="LFO timing" data-sync><button data-v="1">Sync</button><button data-v="0">Free</button></div><span class="rk"></span><span class="dk"></span>${outBtn('LFO','Out')}`);
  const shp=lc.querySelector('select'),syn=lc.querySelector('[data-sync]');
  const rk=makeKnob({label:'Rate',cls:'sm',steps:()=>L.mode==='sh'||L.sync?LRATES.length:0,
    get:()=>L.mode==='sh'?L.shRateIdx/(LRATES.length-1):L.sync?L.rateIdx/(LRATES.length-1):toPos(lfoHzP,L.hz),
    set:x=>{if(L.mode==='sh')L.shRateIdx=Math.round(x*(LRATES.length-1));else if(L.sync)L.rateIdx=Math.round(x*(LRATES.length-1));else L.hz=fromPos(lfoHzP,x);},
    fmt:()=>L.mode==='sh'?LRATES[L.shRateIdx][1]:L.sync?LRATES[L.rateIdx][1]:hz(L.hz),def:null,end:o.changed});
  const dk=makeKnob({label:'Depth',cls:'sm',get:()=>L.depth,set:x=>{L.depth=x;},fmt:()=>pct(L.depth),def:0.8,end:o.changed});
  lc.querySelector('.rk').append(rk);lc.querySelector('.dk').append(dk);
  const lfoUI=()=>{lc.querySelectorAll('[data-m]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===L.mode));shp.value=L.shape;shp.hidden=L.mode==='sh';syn.hidden=L.mode==='sh';
    syn.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',(b.dataset.v==='1')===L.sync));rk.update();dk.update();};
  lc.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{L.mode=b.dataset.m;lfoUI();o.changed();});
  shp.onchange=()=>{L.shape=+shp.value;o.changed();};
  syn.querySelectorAll('button').forEach(b=>b.onclick=()=>{L.sync=b.dataset.v==='1';lfoUI();o.changed();});

  /* rhythm generator */
  const R=B.rhythm,rc=card(`<b class="srct"><i style="background:${SRC.RHY.c}"></i>Rhythm</b><span class="k1"></span><span class="k2"></span><span class="k3"></span><span class="k4"></span><span class="rsteps" aria-hidden="true"></span>${outBtn('RHY','Trig')}`);
  const rkn=(label,get,set,fmt,n)=>makeKnob({label,cls:'sm',steps:n,get,set:x=>{set(x);drawSteps();},fmt,def:null,end:o.changed});
  const kSteps=rkn('Steps',()=>(R.steps-1)/15,x=>{R.steps=1+Math.round(x*15);R.hits=Math.min(R.hits,R.steps);R.rotate=Math.min(R.rotate,R.steps-1);kHits.update();kRot.update();},()=>R.steps+' steps',16);
  const kHits=rkn('Hits',()=>R.hits/Math.max(1,R.steps),x=>{R.hits=Math.round(x*R.steps);},()=>R.hits+' hits',()=>R.steps+1);
  const kRot=rkn('Rotate',()=>R.steps>1?R.rotate/(R.steps-1):0,x=>{R.rotate=Math.round(x*(R.steps-1));},()=>'+'+R.rotate,()=>Math.max(2,R.steps));
  const kRate=rkn('Rate',()=>R.rateIdx/(RRATES.length-1),x=>{R.rateIdx=Math.round(x*(RRATES.length-1));},()=>RRATES[R.rateIdx][1],RRATES.length);
  [kSteps,kHits,kRot,kRate].forEach((k,i)=>rc.querySelector('.k'+(i+1)).append(k));
  const stepsEl=rc.querySelector('.rsteps');let curStep=-1;
  const drawSteps=()=>{const p=rhy.pattern();stepsEl.innerHTML=p.map((h,i)=>`<i class="${h?'h':''}${i===curStep?' cur':''}"></i>`).join('');};

  /* patching */
  const name=p=>o.ports[p]?.name||p;
  const connect=(src,p)=>{B.patches[p]=src;prevHi[p]=false;o.onConnect(p,src);o.changed();};
  const unplug=p=>{delete B.patches[p];o.onUnplug(p);o.changed();};
  const clickPort=p=>{if(sel&&sel.kind==='out'){connect(sel.id,p);sel=null;}else if(B.patches[p]&&!sel)unplug(p);else sel=sel&&sel.id===p?null:{kind:'in',id:p};refresh();};
  const clickOut=id=>{if(sel&&sel.kind==='in'){connect(id,sel.id);sel=null;}else sel=sel&&sel.id===id?null:{kind:'out',id};refresh();};
  const refresh=()=>{
    for(const[p,{el}]of Object.entries(o.ports)){const src=B.patches[p];el.classList.toggle('patched',!!src);el.style.setProperty('--pc',src?SRC[src].c:'transparent');el.classList.toggle('psel',!!sel&&sel.id===p);
      el.title=src?`${name(p)} ← ${SRC[src].l} (click to unplug)`:`${name(p)}: click to patch`;}
    document.querySelectorAll('.bout').forEach(b=>b.classList.toggle('psel',!!sel&&sel.kind==='out'&&sel.id===b.dataset.src));
    const list=Object.entries(B.patches);
    o.list.innerHTML=list.length?list.map(([p,s])=>`<span class="pcable" style="--pc:${SRC[s].c}">${SRC[s].l} → ${name(p)} <button class="pdel" data-p="${p}" aria-label="Unplug ${name(p)}">×</button></span>`).join(''):'<span class="keys">No cables. Click an output, then a module jack (or the other way round).</span>';
    o.list.querySelectorAll('.pdel').forEach(b=>b.onclick=()=>{unplug(b.dataset.p);refresh();});
    o.hint.textContent=sel?(sel.kind==='out'?`${SRC[sel.id].l} selected: now click a module jack`:`${name(sel.id)} selected: now click an output`):'';
  };
  document.querySelectorAll('.bout').forEach(b=>b.onclick=()=>clickOut(b.dataset.src));
  for(const[p,{el}]of Object.entries(o.ports)){el.classList.add('pport');el.addEventListener('click',e=>{e.stopPropagation();clickPort(p);});}

  /* every screen frame: new output values; returns for each patched jack its level and whether it was triggered
     (the rhythm generator's hits, or an LFO crossing 0.3 upward) */
  const tick=now=>{const dt=last?Math.min(0.1,(now-last)/1000):0;last=now;const beat=o.beat();
    out.LFO=lfo.value(beat,dt).v;const r=rhy.tick(beat);out.RHY=r.gate;trig.RHY=r.trig;if(r.step!==curStep){curStep=r.step;drawSteps();}
    const res={};
    for(const[p,src]of Object.entries(B.patches)){const v=out[src],hi=v>0.3;let t=src==='RHY'?trig.RHY>0:hi&&!prevHi[p];prevHi[p]=hi;res[p]={v,trig:t};}
    document.querySelectorAll('.bout').forEach(b=>{const v=out[b.dataset.src]||0,i=b.querySelector('.bm i');if(i){i.style.width=Math.abs(v)*50+'%';i.style.left=v>=0?'50%':(50-Math.abs(v)*50)+'%';}});
    return res;};
  /* the clock restarted (a new source started): the rhythm starts again without firing the steps it skipped */
  const restart=()=>rhy.reset();
  lfoUI();drawSteps();refresh();
  return{tick,refresh,restart,connect,unplug};
}
