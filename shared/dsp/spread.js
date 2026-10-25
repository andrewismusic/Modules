// Moved from prototype/moment-prism-relay-v30.html (v30). Plain functions, bundled into the worklet by import.

export function spreadTable(nb,blk,sr,N){const p=new Float32Array(nb);for(let k=0;k<nb;k++){const f=Math.max(30,k*(sr||48000)/(N||(nb-1)*2)),x=Math.log2(f/30)*2.4;p[k]=Math.max(-1,Math.min(1,3.2*Math.sin(2*Math.PI*x+0.7)));}return p;}
export function applySpread(reL,imL,reR,imR,nb,tab,s){
  if(s<=0.001)return;
  for(let k=1;k<nb;k++){
    const mr=(reL[k]+reR[k])*0.5,mi=(imL[k]+imR[k])*0.5,sr_=(reL[k]-reR[k])*0.5,si=(imL[k]-imR[k])*0.5,p=tab[k]*s;
    const mk=1+0.1*s,gL=Math.cos((1+p)*0.7853982)*1.41421356*mk,gR=Math.sin((1+p)*0.7853982)*1.41421356*mk;
    reL[k]=mr*gL+sr_;imL[k]=mi*gL+si;reR[k]=mr*gR-sr_;imR[k]=mi*gR-si;
  }
}

