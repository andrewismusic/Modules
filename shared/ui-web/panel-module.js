// The Moment / Prism panel module: encoders with two layers, lit buttons, key-buttons, the Shift / Random / Bypass
// keys, Random (membership, ranges, Deviation, Glide), CV assignment mode and settings mode. Moved from the v30
// prototype's makePanelModule; the key grammar is shared/control/panel-keys.js, Random's choice rule is
// shared/control/random-pick.js. Spec: docs/design-language.md.
//
// cfg: id, name, mod (panel selector), keys {sh, rnd, byp} (selectors), keyT {target: selector} (keys CV can drive),
//   descs, layout [[primary, second]], rndDef (Random membership defaults), options (settings mode), clocked(),
//   keyBtns [[k, selector, shiftAlt]], btnShift {k: alt}, and hooks preSync, onInit, onRandom, refreshKeys, keyGate,
//   bindKeys, keyColor, shiftAct.
// env: state() (this module's saved state), opts() (global settings), send(m), read(label, value), ensureAudio(),
//   saveState(), bpm().
import { clamp01 } from '../control/params.js';
import { tweens, tweenD } from '../control/tweens.js';
import { createPanelKeys } from '../control/panel-keys.js';
import { pickRandom } from '../control/random-pick.js';
import { glideDuration } from '../control/panel-descs.js';
import { JSVG } from './icons.js';

export const CVN={A:1,B:2,C:3,D:4};
export function makePanelModule(cfg,env){
  const $=s=>document.querySelector(s);
  const M={id:cfg.id,cfg,d:{},kn:{},cv:{A:{p:false,lvl:0},B:{p:false,lvl:0},C:{p:false,lvl:0},D:{p:false,lvl:0}},asg:{jack:null,until:0},cvOff:{},cvLast:{},cvGate:{}};
  M.s=env.state;M.mod=()=>$(cfg.mod);M.tx=(k,v)=>env.send({type:cfg.msg,k,v});M.read=env.read;
  for(const d of cfg.descs)M.d[d.k]=d;
  M.asgOn=()=>!!M.asg.jack&&performance.now()<M.asg.until;
  M.sync=()=>{const s=M.s();cfg.preSync&&cfg.preSync(M);for(const d of cfg.descs)if(!d.ui)d.eng(M,s,d.get(s));M.tx('byp',s.byp);};
  M.rr=k=>M.s().rr[k]||[0,1];
  M.setVal=(k,x,quiet)=>{const d=M.d[k],s=M.s();tweens.delete(M.id+'.'+k);d.put(s,x);d.eng(M,s,d.get(s));d.after&&d.after(M);if(!quiet)M.read(d.l,d.fmt(s));M.refresh();};
  M.toggleMem=k=>{const s=M.s();s.rnd[k]=s.rnd[k]?0:1;M.read(M.d[k]?.l||k,s.rnd[k]?'included in Random':'excluded from Random');M.refresh();};
  M.reset=k=>{const d=M.d[k];const dv=typeof d.def==='function'?d.def(M.s()):d.def;M.setVal(k,dv,true);M.read(d.l,'reset');};
  M.set={on:false,snap:null};
  M.optFor=k=>(cfg.options||[]).find(o=>o.k===k);
  M.setOpt=(o,v)=>{env.opts()[o.key]=v;o.apply&&o.apply(v);M.read('Setting',o.l+': '+o.v[v]);M.refresh();};
  M.enterSet=()=>{M.set.on=true;M.set.snap=JSON.parse(JSON.stringify(env.opts()));M.refresh();M.read('Settings','turn a lit encoder (tap for its second option); Bypass = keep, Shift = cancel');};
  M.exitSet=keep=>{if(!keep){const o=M.set.snap,O=env.opts();for(const k in o)O[k]=o[k];for(const op of cfg.options||[])op.apply&&op.apply(O[op.key]);}M.set.on=false;M.refresh();env.saveState();M.read('Settings',keep?'saved':'cancelled');};

  /* ----- keys ----- */
  const flash=()=>{for(const id of Object.values(cfg.keyT)){const k=$(id);k.classList.add('flash');setTimeout(()=>k.classList.remove('flash'),180);setTimeout(()=>k.classList.add('flash'),360);setTimeout(()=>k.classList.remove('flash'),540);}};
  M.init=()=>{const s=M.s();for(const d of cfg.descs)if(d.init!==undefined){const dv=typeof d.def==='function'?d.def(s):d.def;d.put(s,dv);}cfg.onInit&&cfg.onInit(M);M.sync();M.refresh();flash();M.read(cfg.name,'initialized');};
  M.resetAssign=()=>{M.s().rnd={...cfg.rndDef};M.refresh();flash();M.read('Random assignments','reset to defaults');};
  M.shuffleAssign=()=>{const r=M.s().rnd;for(const k of Object.keys(cfg.rndDef))r[k]=Math.random()<0.5?1:0;M.refresh();flash();M.read('Random assignments','shuffled');};
  M.restoreRanges=()=>{M.s().rr={};const m=M.mod();m.classList.add('blinkall');setTimeout(()=>{m.classList.remove('blinkall');M.refresh();},1000);M.read('Random ranges','full range');};
  M.toggleBypass=()=>{const s=M.s();s.byp=s.byp?0:1;M.tx('byp',s.byp);M.refreshKeys();};
  M.keys=createPanelKeys({
    inSettings:()=>M.set.on,enterSettings:M.enterSet,exitSettings:M.exitSet,asgOn:M.asgOn,
    asgKey:t=>M.asgToggle(t),asgRandom:()=>M.asgRandom(),asgClear:()=>M.asgClear(),
    showMembership:()=>M.refresh(),changed:()=>M.refresh(),fullRanges:M.restoreRanges,resetAssign:M.resetAssign,shuffle:M.shuffleAssign,init:M.init,
    hint:w=>w==='shuffle'?M.read('Shuffle assignments','tap Random again (with Shift held)'):M.read('Initialize','tap Bypass again (with Shift held)'),
    toggleBypass:M.toggleBypass,randomize:()=>M.randomize()});
  const mods=()=>M.keys.mods();
  M.mk=mods;
  const keyEl=w=>$(cfg.keys[w]);
  M.keyDown=w=>{env.ensureAudio();const el=keyEl(w);el.classList.add('pressed');if(w==='sh')el.classList.add('held');M.keys.down(w);};
  M.keyUp=w=>{const el=keyEl(w);el.classList.remove('pressed','held');M.keys.up(w);};
  M.clearKeys=()=>{M.keys.clear();for(const w of['sh','rnd','byp'])keyEl(w).classList.remove('pressed','held');};

  /* ----- encoders ----- */
  M.knob=(pk,sk)=>{
    const s=M.s(),N=15,el=document.createElement('div');el.className='knob';el.tabIndex=0;el.setAttribute('role','slider');
    el.innerHTML=`<svg viewBox="0 0 70 70" aria-hidden="true">${Array.from({length:N},(_,i)=>{const a=(-135+270*i/(N-1))*Math.PI/180;return`<circle class="led" cx="${(35+31.5*Math.sin(a)).toFixed(2)}" cy="${(35-31.5*Math.cos(a)).toFixed(2)}" r="2.6"/>`;}).join('')}<circle class="body" cx="35" cy="35" r="25.5"/><circle class="cap" cx="35" cy="35" r="22"/></svg>`;
    const leds=[...el.querySelectorAll('.led')];let peek=false;
    /* the parameter shown: Shift held shows the second layers (unless Shift came after Random, for the lower limit) */
    const cur=()=>{const m=mods();if(M.set.on&&!sk)return pk;const L=sk&&((m.sh&&!m.shRange&&!M.set.on)||s.layer[pk])?1:0;return(peek?!L:L)?sk:pk;};
    el.cur=cur;
    el.update=()=>{
      const k=cur(),d=M.d[k],ranges=mods().rv&&s.rnd[k]&&!M.set.on;
      el.classList.toggle('mem',!!s.rnd[k]);el.classList.toggle('sec',k===sk);el.classList.toggle('rng',!!ranges);
      const a=s.cvmap[k],on=M.asgOn();el.classList.toggle('cva',on&&a===M.asg.jack);el.classList.toggle('cvo',on&&!!a&&a!==M.asg.jack);if(a)el.style.setProperty('--cvc',`var(--cv${a})`);
      const col=d.color&&d.color(s);el.classList.toggle('colored',!!col);if(col)el.style.setProperty('--sc',col);
      const p=d.get(s),bip=d.bip;
      const opt=M.set.on?M.optFor(k):null;el.classList.toggle('opt',!!opt);el.classList.toggle('optoff',M.set.on&&!opt);
      leds.forEach((L,i)=>{const x=i/(N-1);let o;
        if(opt){const v=env.opts()[opt.key];o=v?i>7:i<7;}
        else if(M.set.on)o=false;
        else if(ranges){const[lo,hi]=M.rr(k);o=x>=Math.min(lo,hi)-0.034&&x<=Math.max(lo,hi)+0.034;}
        else if(bip)o=p>=0.5?(x>=0.5-1e-6&&x<=p+0.034):(x<=0.5+1e-6&&x>=p-0.034);
        else o=i===0||(p>0.004&&x<=p+0.034);
        L.classList.toggle('on',o);});
      el.setAttribute('aria-label',d.l);el.setAttribute('aria-valuetext',d.fmt(s));el.title=`${d.l}: ${d.fmt(s)}`+(sk?` (tap for ${M.d[k===pk?sk:pk].l})`:'');
    };
    const stepsOf=k=>{const d=M.d[k];return d.steps?d.steps(s):0;};
    const commit=(k,x,lim)=>{x=clamp01(x);const n=stepsOf(k);if(!lim&&n>1)x=Math.round(x*(n-1))/(n-1);
      if(lim){const r=[...M.rr(k)];r[lim==='lo'?0:1]=x;s.rr[k]=r;M.read(M.d[k].l,`random range ${Math.round(Math.min(...r)*100)} to ${Math.round(Math.max(...r)*100)}%`);el.update();return;}
      if(x!==M.d[k].get(s))M.setVal(k,x);else M.read(M.d[k].l,M.d[k].fmt(s));};
    el.addEventListener('pointerdown',e=>{
      if(e.button>0)return;e.preventDefault();el.setPointerCapture(e.pointerId);
      const sy=e.clientY,sx=e.clientX;let moved=0,held=false,k0=null,p0=0,lim=null,optOnly=false;
      const ht=setTimeout(()=>{if(moved<=3){held=true;if(sk){peek=true;el.update();}}},350);
      const mv=ev=>{const dy=sy-ev.clientY,dx=ev.clientX-sx;moved=Math.max(moved,Math.abs(dy)+Math.abs(dx));if(moved<=3)return;
        if(k0===null){k0=cur();if(M.set.on){optOnly=true;}else{
          const m=mods();lim=m.rnd&&s.rnd[k0]?(m.sh?'lo':'hi'):null;if(m.rnd){M.keys.use('rnd');M.keys.showRanges();}if(lim&&m.sh)M.keys.use('sh');p0=lim?M.rr(k0)[lim==='lo'?0:1]:M.d[k0].get(s);}}
        /* settings mode: turning picks the option (clockwise = second choice) and never moves the parameter */
        if(optOnly){const o=M.optFor(k0),v=dy+dx>0?1:0;if(o&&env.opts()[o.key]!==v)M.setOpt(o,v);return;}
        commit(k0,p0+(dy+dx)/(ev.shiftKey?700:170),lim);};
      const up=()=>{clearTimeout(ht);el.removeEventListener('pointermove',mv);el.removeEventListener('pointerup',up);el.removeEventListener('pointercancel',up);
        if(peek)peek=false;
        if(moved<=3&&!held)M.tapKnob(pk,sk);
        el.update();};
      el.addEventListener('pointermove',mv);el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);
    });
    el.addEventListener('keydown',e=>{const k=cur(),n=stepsOf(k),st=n>1?1/(n-1):(e.shiftKey?0.1:0.01);let dl=0;
      if(e.key==='ArrowUp'||e.key==='ArrowRight')dl=st;else if(e.key==='ArrowDown'||e.key==='ArrowLeft')dl=-st;
      else if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();M.tapKnob(pk,sk);el.update();return;}else return;
      e.preventDefault();e.stopPropagation();commit(k,M.d[k].get(s)+dl,null);});
    M.kn[pk]=el;if(sk)M.kn[sk]=el;el.update();return el;
  };
  M.tapKnob=(pk,sk)=>{
    const s=M.s(),k=M.kn[pk].cur(),m=mods();
    if(M.set.on){if(sk){s.layer[pk]=s.layer[pk]?0:1;M.refresh();const o=M.optFor(M.kn[pk].cur());if(o)M.read('Setting',o.l+': '+o.v[env.opts()[o.key]]);}return;}
    if(M.asgOn()){M.asgToggle(k);return;}
    if(m.rnd){M.keys.use('rnd');if(m.sh)M.keys.use('sh');M.toggleMem(k);return;}
    if(m.byp){M.keys.use('byp');M.reset(k);return;}
    if(m.sh)M.keys.use('sh');
    if(sk){s.layer[pk]=s.layer[pk]?0:1;M.read(M.d[s.layer[pk]?sk:pk].l,M.d[s.layer[pk]?sk:pk].fmt(s));M.refresh();}
  };
  /* the action of a lit button or key-button tap: assignment, membership, reset, or the next state */
  const press=(t,k)=>{const s=M.s(),d=M.d[t],m=mods();
    if(M.asgOn()){M.asgToggle(t);return;}
    if(m.rnd){M.keys.use('rnd');if(m.sh)M.keys.use('sh');M.toggleMem(t);return;}
    if(m.byp){M.keys.use('byp');M.reset(t);return;}
    if(m.sh){M.keys.use('sh');if(cfg.shiftAct&&cfg.shiftAct(M,k))return;}
    M.setVal(t,((s[t]+1)%d.n)/(d.n-1));};
  const tapEvents=(el,act)=>{
    el.addEventListener('pointerdown',e=>{e.preventDefault();el.classList.add('pressed');});
    el.addEventListener('pointerup',()=>{if(!el.classList.contains('pressed'))return;el.classList.remove('pressed');act();});
    el.addEventListener('pointercancel',()=>el.classList.remove('pressed'));el.addEventListener('contextmenu',e=>e.preventDefault());
    el.addEventListener('keydown',e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();e.stopPropagation();act();}});};
  /* ----- lit buttons ----- */
  M.btn=k=>{
    const s=M.s(),b=document.createElement('button'),alt=(cfg.btnShift||{})[k];b.className='lbtn';
    const tgt=()=>alt&&mods().sh?alt:k;
    b.update=()=>{const t=tgt(),d=M.d[t];b.style.setProperty('--bc',d.cols[s[t]]);b.classList.toggle('mem',!!s.rnd[t]&&mods().rv);b.setAttribute('aria-label',`${d.l}: ${d.fmt(s)}`);b.title=`${M.d[k].l}: ${M.d[k].fmt(s)}`+(alt?` (Shift: ${M.d[alt].l})`:'');
      const a=s.cvmap[k],on=M.asgOn();b.classList.toggle('cva',on&&a===M.asg.jack);b.classList.toggle('cvo',on&&!!a&&a!==M.asg.jack);if(a)b.style.setProperty('--cvc',`var(--cv${a})`);};
    tapEvents(b,()=>press(tgt(),k));
    M.kn[k]=b;b.update();return b;
  };
  /* ----- key-buttons (Prism Order): a key whose light shows a stepped setting ----- */
  M.keyBtn=(k,sel,alt)=>{
    const s=M.s(),el=$(sel);el.classList.add('stc');
    const tgt=()=>alt&&mods().sh?alt:k;
    el.update=()=>{const t=tgt(),d=M.d[t];el.style.setProperty('--lc',cfg.keyColor?cfg.keyColor(M,k):d.cols[s[t]]);el.classList.toggle('osc',!!s.rnd[t]&&mods().rv);el.setAttribute('aria-label',`${d.l}: ${d.fmt(s)}`);el.title=`${M.d[k].l}: ${M.d[k].fmt(s)}`+(alt?` · Shift: ${M.d[alt].l}: ${M.d[alt].fmt(s)}`:'');
      const a=s.cvmap[k],on=M.asgOn();el.classList.toggle('cva',on&&a===M.asg.jack);if(a)el.style.setProperty('--cvc',`var(--cv${a})`);};
    tapEvents(el,()=>press(tgt(),k));
    M.kn[k]=el;if(alt)M.kn[alt]=el;el.update();return el;
  };
  M.refresh=()=>{const mod=M.mod();mod.classList.toggle('rndheld',!!mods().rv&&!M.set.on);mod.classList.toggle('setmode',!!M.set.on);
    const seen=new Set();for(const k in M.kn){const el=M.kn[k];if(seen.has(el))continue;seen.add(el);el.update();}M.refreshKeys();
    mod.classList.toggle('asgmode',M.asgOn());if(M.asgOn())mod.style.setProperty('--ac',`var(--cv${M.asg.jack})`);
    mod.querySelectorAll('.cvj').forEach(j=>j.classList.toggle('on',M.cv[j.dataset.cv].p));};
  M.refreshKeys=()=>{const s=M.s(),on=M.asgOn();
    M.mod().classList.toggle('bypassed',!!s.byp);const bk=$(cfg.keys.byp);bk.classList.toggle('lit',!!s.byp);bk.classList.toggle('red',!!s.byp);
    for(const t in cfg.keyT){const el=$(cfg.keyT[t]),a=s.cvmap[t];el.classList.toggle('cva',on&&a===M.asg.jack);if(a)el.style.setProperty('--cvc',`var(--cv${a})`);}
    cfg.refreshKeys&&cfg.refreshKeys(M);};

  /* ----- randomize ----- */
  M.glideMs=()=>{const s=M.s(),pos=clamp01(M.d.glide.get(s)+(M.cvOff.glide||0)*0.5);return glideDuration(pos,cfg.clocked(),!!env.opts().glideLong,env.bpm());};
  M.randomize=()=>{
    const s=M.s(),A=Math.max(0.1,Math.min(1,s.amount+(M.cvOff.amount||0)*0.5)),dur=M.glideMs(),said=[],distinct=env.opts().devMode===1;
    for(const k of Object.keys(cfg.rndDef)){
      if(!s.rnd[k]||!M.d[k])continue;const d=M.d[k];
      const[lo,hi]=M.rr(k),n=d.btn?d.n:(d.steps?d.steps(s):0);
      const x=pickRandom({cur:clamp01(d.get(s)),lo,hi,A,n,distinct});
      if(d.btn||n>1||dur<=0||d.ui)M.setVal(k,x,true);
      else tweenD(M.id+'.'+k,d.get(s),x,dur,v=>{d.put(s,v);d.eng(M,s,v);if(M.kn[k])M.kn[k].update();});
      said.push(d.l);
    }
    cfg.onRandom&&cfg.onRandom(M,A,said);
    M.refresh();M.read('Randomized',said.join(', ')||'nothing');
  };

  /* ----- CV 1–4 (jacks A–D): patching opens assignment mode for 5 s; each action adds 5 s ----- */
  M.targets=()=>[...Object.keys(cfg.rndDef).filter(k=>M.d[k]),...Object.keys(cfg.keyT)];
  M.asgStart=L=>{M.asg.jack=L;M.asg.until=performance.now()+5000;M.refresh();M.read('CV '+CVN[L],'assignment mode');};
  M.asgExtend=()=>{M.asg.until=performance.now()+5000;};
  /* assignment actions only while the mode is still open (it can time out while a key is held) */
  M.asgToggle=t=>{if(!M.asgOn())return;const map=M.s().cvmap;if(map[t]===M.asg.jack)delete map[t];else map[t]=M.asg.jack;M.asgExtend();M.cvResync();M.refresh();M.read('CV '+CVN[M.asg.jack],(map[t]?'assigned to ':'unassigned from ')+(M.d[t]?.l||t.slice(1)));};
  M.asgClear=()=>{if(!M.asgOn())return;const map=M.s().cvmap;for(const t in map)if(map[t]===M.asg.jack)delete map[t];M.asgExtend();M.cvResync();M.refresh();M.read('CV '+CVN[M.asg.jack],'all assignments removed');};
  M.asgRandom=()=>{if(!M.asgOn())return;const map=M.s().cvmap;for(const t of M.targets()){if(map[t]&&map[t]!==M.asg.jack)continue;if(Math.random()<0.3)map[t]=M.asg.jack;else delete map[t];}M.asgExtend();M.cvResync();M.refresh();M.read('CV '+CVN[M.asg.jack],'random assignments');};
  M.cvResync=()=>{for(const k in M.cvLast)delete M.cvLast[k];M.sync();};
  M.cvPatch=(L,on)=>{const c=M.cv[L];c.p=on;if(on)M.asgStart(L);else{c.lvl=0;if(M.asg.jack===L)M.asg.until=0;M.cvResync();}M.refresh();};
  M.cvSet=(L,v)=>{M.cv[L].lvl=v;};
  /* CV adds ±50% of the throw; UI-only targets (Deviation, Glide) are offset when Random is pressed; on keys it is a
     gate (above 0.3) */
  M.applyCV=()=>{
    const s=M.s(),map=s.cvmap;M.cvOff={};
    for(const k of Object.keys(cfg.rndDef)){const d=M.d[k];if(!d)continue;const L=map[k],c=L&&M.cv[L],v=c&&c.p?c.lvl:null;
      if(v===null){if(M.cvLast[k]!==undefined){delete M.cvLast[k];if(!d.ui)d.eng(M,s,d.get(s));}continue;}
      if(d.ui){M.cvOff[k]=v;continue;}
      const pos=clamp01(d.get(s)+v*0.5);if(M.cvLast[k]===undefined||Math.abs(M.cvLast[k]-pos)>0.003){M.cvLast[k]=pos;d.eng(M,s,pos);}}
    for(const tk in cfg.keyT){const L=map[tk],c=L&&M.cv[L],hi=!!(c&&c.p&&c.lvl>0.3);if(hi!==!!M.cvGate[tk]){M.cvGate[tk]=hi;cfg.keyGate(M,tk,hi);}}
    if(M.asg.jack&&performance.now()>M.asg.until){M.asg.jack=null;M.refresh();}
  };

  /* ----- build ----- */
  M.build=()=>{
    for(const[pk,sk]of cfg.layout){const cell=$(`#${cfg.id}-${pk}`);if(!cell)continue;const slot=cell.querySelector('.kslot');
      if(M.d[pk].btn){slot.append(M.btn(pk));const d=M.d[pk],lg=document.createElement('div');lg.className='btnlg';lg.innerHTML=d.opts.map((o,i)=>`<span><i style="background:${d.cols[i]}"></i>${o}</span>`).join('');cell.append(lg);}
      else slot.append(M.knob(pk,sk));}
    const bind=(id,dn,up)=>{const el=$(id);el.addEventListener('pointerdown',e=>{e.preventDefault();el.setPointerCapture(e.pointerId);dn();});for(const ev of['pointerup','pointercancel','lostpointercapture'])el.addEventListener(ev,()=>{if(el.classList.contains('pressed'))up();});
      el.addEventListener('contextmenu',e=>e.preventDefault());el.addEventListener('keydown',e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();e.stopPropagation();dn();}});el.addEventListener('keyup',e=>{if(e.key===' '||e.key==='Enter')up();});};
    for(const[k,sel,alt]of cfg.keyBtns||[])M.keyBtn(k,sel,alt);
    for(const w of['sh','rnd','byp'])bind(cfg.keys[w],()=>M.keyDown(w),()=>M.keyUp(w));cfg.bindKeys&&cfg.bindKeys(M,bind);
    M.mod().querySelectorAll('.cvj').forEach(j=>{j.innerHTML=j.innerHTML.replace('__JSVG__',JSVG(''));});
    M.refresh();
  };
  return M;
}
