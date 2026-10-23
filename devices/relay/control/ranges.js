// Relay's fader ranges and dial destinations. Moved from the v30 prototype; genRanges takes the slots as an argument.
/* range rules: the first 3% is always dry; at least 80% of the throw has an effect; any gap is at the left;
   Tape stop ends in the top tenth, Spectral thin in the top fifth, and a low-pass or high-pass Filter in the top tenth */
export const ZONE=0.03,zmap=x=>ZONE+(1-ZONE)*x;
export function endRule(s){if(s.fx==='tapestop')return 0.9;if(s.fx==='thin')return 0.8;if(s.fx==='filter'&&((s.mode??s.p?.mode)===0||(s.mode??s.p?.mode)===1))return 0.9;return 0;}
export function rangesValid(slots){
  for(const s of slots){const e=endRule(s);if(e&&!(s.a<s.b&&s.b>=e))return false;if(Math.min(s.a,s.b)<ZONE-1e-6)return false;}
  const on=slots.filter(s=>s.on&&s.fx!=='none');if(!on.length)return false;
  const nor=on.filter(s=>s.a<=s.b),inv=on.filter(s=>s.a>s.b);
  const An=nor.length?Math.min(...nor.map(s=>s.a)):null,Ai=inv.length?Math.max(...inv.map(s=>s.a)):null;
  if(Ai==null)return An<=0.2;if(An==null)return Ai>=0.999;return Ai>=An;
}
export function randRange(s){const e=endRule(s);if(e){const b=e+Math.random()*(1-e);return[zmap(Math.pow(Math.random(),1.3)*(b-ZONE-0.05)/(1-ZONE)),b];}return[zmap(Math.pow(Math.random(),1.6)),zmap(1-Math.pow(Math.random(),1.6))];}
/* new ranges for the slots in `change` (all four if the result would otherwise break the rules) */
export function genRanges(slots,change){
  const cur=slots.map(s=>({on:s.on,a:s.a,b:s.b,fx:s.fx,mode:s.p.mode}));
  const attempt=set=>{for(let t=0;t<500;t++){const c=cur.map((s,i)=>set.has(i)?(([a,b])=>({...s,a,b}))(randRange(s)):s);if(rangesValid(c))return c;}return null;};
  let res=rangesValid(cur)&&!change.size?cur:attempt(change.size?change:new Set([0,1,2,3]));
  if(!res)res=attempt(new Set([0,1,2,3]));
  if(!res)res=cur.map(s=>{const e=endRule(s);return e?{...s,a:0.3,b:Math.max(e,0.95)}:{...s,a:ZONE+0.05,b:0.7};});
  return res;
}
/* each continuous setting gets a destination for the dial: values near either end head most of the way to the other end;
   middle values head toward a random end, at least 40% of the throw away */
export function dialTarget(b){if(b<0.3)return 0.75+Math.random()*0.25;if(b>0.7)return Math.random()*0.25;return Math.random()<0.5?Math.max(0,b-0.4-Math.random()*0.2):Math.min(1,b+0.4+Math.random()*0.2);}
