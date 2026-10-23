// Knob with a 15-LED ring: drag up/right to turn, double-tap resets, arrow keys step. Moved from the v30 prototype.
import { clamp01 } from '../control/params.js';

export function makeKnob(o){
  const N=15,el=document.createElement('div');el.className='knob'+(o.cls?' '+o.cls:'');el.tabIndex=0;
  el.setAttribute('role','slider');el.setAttribute('aria-label',o.title||o.label);el.title=o.title||o.label;
  el.innerHTML=`<svg viewBox="0 0 70 70" aria-hidden="true">${Array.from({length:N},(_,i)=>{const a=(-135+270*i/(N-1))*Math.PI/180;return`<circle class="led" cx="${(35+31.5*Math.sin(a)).toFixed(2)}" cy="${(35-31.5*Math.cos(a)).toFixed(2)}" r="2.6"/>`;}).join('')}<circle class="body" cx="35" cy="35" r="25.5"/><circle class="cap" cx="35" cy="35" r="22"/></svg><span class="kl">${o.label}</span><span class="kv"></span>`;
  const leds=[...el.querySelectorAll('.led')],kv=el.querySelector('.kv');
  const steps=()=>typeof o.steps==='function'?o.steps():(o.steps||0);
  const q=x=>{x=clamp01(x);const n=steps();if(n>1)x=Math.round(x*(n-1))/(n-1);return x;};
  el.update=()=>{
    el.classList.toggle('mem',!!(o.mem&&o.mem()));
    const rg=o.range&&o.range(),p=o.get(),bip=typeof o.bip==='function'?o.bip():o.bip;
    leds.forEach((d,i)=>{
      const x=i/(N-1);let on;
      if(rg){const lo=Math.min(rg[0],rg[1]),hi=Math.max(rg[0],rg[1]);on=x>=lo-0.034&&x<=hi+0.034;}
      else if(o.bin)on=p<0.5?i<7:i>7;
      else if(bip)on=p>=0.5?(x>=0.5-1e-6&&x<=p+0.034):(x<=0.5+1e-6&&x>=p-0.034);
      else on=i===0||(p>0.004&&x<=p+0.034);
      d.classList.toggle('on',on);
    });
    const s=o.fmt();kv.textContent=s;el.setAttribute('aria-valuetext',s);
  };
  const commit=x=>{const n=q(x);if(n!==o.get()){o.set(n);el.update();}o.touched&&o.touched(o.fmt());};
  let lastTap=0;
  el.addEventListener('pointerdown',e=>{
    if(e.button>0)return;e.preventDefault();el.setPointerCapture(e.pointerId);
    const sy=e.clientY,sx=e.clientX,sp=o.get();let moved=0;
    const mv=ev=>{const dy=sy-ev.clientY,dx=ev.clientX-sx;moved=Math.max(moved,Math.abs(dy)+Math.abs(dx));if(moved>3)commit(sp+(dy+dx)/(ev.shiftKey?700:170));};
    const up=()=>{el.removeEventListener('pointermove',mv);el.removeEventListener('pointerup',up);el.removeEventListener('pointercancel',up);
      if(moved<=3){
        if(o.hook&&o.hook()){lastTap=0;el.update();o.end&&o.end();return;}
        const now=performance.now(),dv=typeof o.def==='function'?o.def():o.def;
        if(now-lastTap<380){if(o.tap)o.tap(true);if(dv!=null)commit(dv);lastTap=0;el.update();}
        else{lastTap=now;if(o.tap){o.tap();el.update();}}}
      o.end&&o.end();};
    el.addEventListener('pointermove',mv);el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);
  });
  el.addEventListener('keydown',e=>{const n=steps(),s=n>1?1/(n-1):(e.shiftKey?0.1:0.01);let d=0;
    if(e.key==='ArrowUp'||e.key==='ArrowRight')d=s;else if(e.key==='ArrowDown'||e.key==='ArrowLeft')d=-s;
    else if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();if(!(o.hook&&o.hook())&&o.tap)o.tap();el.update();return;}else return;
    e.preventDefault();e.stopPropagation();commit(o.get()+d);o.end&&o.end();});
  el.update();return el;
}

