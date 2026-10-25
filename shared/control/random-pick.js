// Random for Moment and Prism (docs/design-language.md): every included parameter changes on each press.
// Deviation (A, 0.1–1) sets a window around the current value: A × the parameter's random range [lo, hi], kept inside
// that range. Window mode: any value in the window. Distinct mode: at least a third of the window away from the
// current value. Stepped settings and buttons (n steps) pick one of the steps in the window, which always includes the
// neighbouring steps, so a two-state button changes about half the time at any Deviation. Positions are 0..1.
export function pickRandom({cur,lo,hi,A,n=0,distinct=false,rand=Math.random}){
  if(lo>hi)[lo,hi]=[hi,lo];
  const W=A*(hi-lo),wlo=Math.max(lo,Math.min(cur,hi)-W/2),whi=Math.min(hi,Math.max(cur,lo)+W/2),a0=Math.max(lo,Math.min(wlo,whi-W)),b0=Math.min(hi,Math.max(whi,wlo+W));
  if(n>1){const st=[];for(let i=0;i<n;i++){const p=i/(n-1);if((p>=a0-1e-6&&p<=b0+1e-6)||(p>=lo-1e-6&&p<=hi+1e-6&&Math.abs(p-cur)<=1/(n-1)+1e-6))st.push(p);}
    if(!st.length)st.push(Math.round(cur*(n-1))/(n-1));return st[Math.floor(rand()*st.length)];}
  if(distinct){const dmin=(b0-a0)/3;let x,t=0;do{x=a0+rand()*(b0-a0);}while(Math.abs(x-cur)<dmin&&++t<32);if(Math.abs(x-cur)<dmin)x=(cur-a0>b0-cur)?a0:b0;return x;}
  return a0+rand()*(b0-a0);
}
