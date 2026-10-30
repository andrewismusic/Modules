// Random for Moment and Prism (docs/design-language.md): every included parameter changes on each press, to any
// value in its throw (decided 2026-10-30: no Deviation, no ranges). Positions are 0..1.
// Stepped settings and buttons (n steps) pick one of their steps.
export function pickRandom({n=0,rand=Math.random}={}){
  if(n>1)return Math.floor(rand()*n)/(n-1);
  return rand();
}
