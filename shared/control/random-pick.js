// Random for Moment and Prism (docs/design-language.md): every included parameter changes on each press, within its
// random range around its hand-set value ("home": the last value set by hand; positions 0..1).
// - Bipolar range a: anywhere from home − a to home + a.
// - Unipolar range a (signed): positive = from home up to home + a, negative = from home − |a| up to home.
// - The range is cut off at the ends of the throw. Full (a = 1, bipolar) reaches the whole throw from anywhere.
// - Stepped settings (n steps) pick one of the steps in the range; buttons always use the whole throw.
// - A range is never smaller than one LED of the 15-LED ring (1/14 of the throw) or one step.
export const LEDS=15;
export const minAmount=(n=0)=>Math.max(1/(LEDS-1),n>1?1/(n-1):0);

export function randomWindow(home,amt,pol){
  const a=Math.abs(amt);let lo,hi;
  if(!pol){lo=home-a;hi=home+a;}else if(amt>0){lo=home;hi=home+a;}else{lo=home-a;hi=home;}
  return[Math.max(0,lo),Math.min(1,hi)];
}
export function pickRandom({home,amt=1,pol=0,n=0,rand=Math.random}){
  const[lo,hi]=randomWindow(home,amt,pol);
  if(n>1){const st=[];for(let i=0;i<n;i++){const p=i/(n-1);if(p>=lo-1e-6&&p<=hi+1e-6)st.push(p);}
    if(!st.length)st.push(Math.round(home*(n-1))/(n-1));return st[Math.floor(rand()*st.length)];}
  return lo+rand()*(hi-lo);
}
/* Random + turn: the range after turning by d (positive = clockwise). Bipolar ranges grow and shrink between the
   minimum and full. Unipolar ranges are signed: turning down through the minimum jumps straight to the minimum on the
   other side (there is no zero range), so one gesture covers both directions. */
export function turnAmount(amt,d,pol,n=0){
  const m=minAmount(n);
  if(!pol)return Math.max(m,Math.min(1,Math.abs(amt)+d));
  let v=amt+d;
  if(amt>0&&v<m)v-=2*m;else if(amt<0&&v>-m)v+=2*m;
  return Math.max(-1,Math.min(1,v));
}
/* the ring while Random is held: the home LED in the parameter's color and the LEDs of the range in amber */
export function rangeLeds(home,amt,pol){
  const N=LEDS-1,hi=Math.round(Math.max(0,Math.min(1,home))*N),k=Math.max(1,Math.round(Math.abs(amt)*N)),amber=[];
  if(!pol||amt>0)for(let i=hi+1;i<=Math.min(N,hi+k);i++)amber.push(i);
  if(!pol||amt<0)for(let i=Math.max(0,hi-k);i<hi;i++)amber.push(i);
  return{home:hi,amber:amber.sort((a,b)=>a-b)};
}
/* the ring on the settings page: the noon LED in the parameter's color, amber clockwise of it (unipolar) or on both
   sides (bipolar) */
export function polarityLeds(pol){const N=LEDS-1,mid=N/2,amber=[];for(let i=0;i<=N;i++)if(i>mid||(!pol&&i<mid))amber.push(i);return{home:mid,amber};}
