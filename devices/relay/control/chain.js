// Random 1's choice of effects and the chain-order rules. Moved from the v30 prototype's randomizeMu as functions of
// the slot list, so the rules can be checked on their own. Callers apply the result (messages, visualizer).
import { ALL_FX } from './fx-defs.js';

/* selection weights for Random FX: Drive comes up half as often */
export const FXW={drive:0.5};
export function pickFx(pool){const tot=pool.reduce((a,k)=>a+(FXW[k]??1),0);let r=Math.random()*tot;for(const k of pool){r-=FXW[k]??1;if(r<=0)return k;}return pool[pool.length-1];}

/* New effects for some slots (each slot is chosen with probability `amount`, at least one). A slot may come up empty,
   but at least three effects always remain. Returns the new effect names, the changed slots, and the slots that got
   a new effect picked (for the visualizer's splash). */
export function rollEffects(fxs,amount){
  fxs=fxs.slice();const ch=new Set(),picked=new Set();
  fxs.forEach((s,i)=>{if(Math.random()<amount)ch.add(i);});if(!ch.size)ch.add(Math.floor(Math.random()*4));
  for(const i of ch){
    const filled=fxs.filter((o,j)=>j!==i&&o!=='none').length;
    if(filled>=3&&Math.random()<0.2){fxs[i]='none';continue;}
    const taken=new Set(fxs.filter((o,j)=>j!==i)),pool=ALL_FX.filter(k=>!taken.has(k)&&k!==fxs[i]);
    if(pool.length){fxs[i]=pickFx(pool);picked.add(i);}
  }
  while(fxs.filter(s=>s!=='none').length<3){const i=fxs.findIndex(s=>s==='none'),taken=new Set(fxs),pool=ALL_FX.filter(k=>!taken.has(k));fxs[i]=pickFx(pool);ch.add(i);}
  return{fxs,ch,picked};
}

/* Shuffler is always the first or second effect in the chain: if it lands later, it trades places with one of the
   first two effects (never with Buffer, so the Buffer rule still holds). Swaps `sl` in place; returns [i, j] or null. */
export function shufflerEarly(sl){
  const fx=sl.map((s,i)=>i).filter(i=>sl[i].fx!=='none'),pos=fx.findIndex(i=>sl[i].fx==='shuffle');
  if(pos<2)return null;const k=fx[pos],cand=fx.slice(0,2).filter(i=>sl[i].fx!=='buffer'),j=cand.length?cand[Math.floor(Math.random()*cand.length)]:fx[0];
  [sl[j],sl[k]]=[sl[k],sl[j]];return[j,k];
}
/* Buffer never ends the chain: if it is the last effect, it trades places with an earlier one. Returns [i, j] or null. */
export function bufferNotLast(sl){
  let last=-1;sl.forEach((s,i)=>{if(s.fx!=='none')last=i;});
  if(last<0||sl[last].fx!=='buffer')return null;
  const earlier=sl.map((s,i)=>i).filter(i=>i<last&&sl[i].fx!=='none'&&sl[i].fx!=='buffer'&&sl[i].fx!=='shuffle');if(!earlier.length)return null;
  const j=earlier[Math.floor(Math.random()*earlier.length)];[sl[j],sl[last]]=[sl[last],sl[j]];return[j,last];
}
