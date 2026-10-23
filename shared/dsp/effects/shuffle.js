// Moved from prototype/moment-prism-relay-v30.html (v30). Keep everything inside the class body.

/* Shuffler: tempo-synced slices replayed in a repeating pattern of up to 4 slices, with zero added latency. Slice j
   of the cycle is read from the current cycle when it has already happened (j <= step) and from the previous cycle
   when it has not (j > step), so nothing waits for audio to arrive. Patterns are a fixed list (every rearrangement
   of 2, 3 or 4 slices plus a seeded selection with one silent slice), so the same Pattern value always gives the
   same pattern, aligned to the master clock. The fader brings the moved slices in one by one; slice edges crossfade
   over 4 ms. */
export class FxShuffle{
  constructor(e){
    this.e=e;const sr=this.sr=e.sr;let R=1;while(R<sr*8)R<<=1;this.M=R-1;
    this.ring=[new Float32Array(R),new Float32Array(R)];this.w=0;this.P=FxShuffle.pats();
    this.div=1;this.pattern=0;this.st=-1;this.cd=0;this.cg=1;this.pd=0;this.pg=1;this.x=1;this.xi=1/(0.004*sr);
    this.sm=0;this.smk=1-Math.exp(-1/(0.003*sr));this.oL=0;this.oR=0;
  }
  static pats(){
    if(FxShuffle._p)return FxShuffle._p;
    let s=0x5eed1234;const rnd=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};
    const plain=[],sil=[];
    for(let N=2;N<=4;N++){
      const tot=Math.pow(N+1,N);
      for(let c=0;c<tot;c++){
        const q=[];let x=c,ns=0;for(let i=0;i<N;i++){const d=x%(N+1);x=(x-d)/(N+1);q.push(d===N?-1:d);if(d===N)ns++;}
        if(ns>1)continue;
        if(ns===0){if(q.every((v,i)=>v===i))continue;plain.push(q);}
        else if(q.some(v=>v>=0))sil.push(q);
      }
    }
    for(let i=sil.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[sil[i],sil[j]]=[sil[j],sil[i]];}
    const all=plain.concat(sil.slice(0,Math.round(plain.length*0.17)));
    for(let i=all.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[all[i],all[j]]=[all[j],all[i]];}
    /* each pattern also carries the fader point at which each moved slice comes in */
    FxShuffle._p=all.map(q=>{const mv=q.map((v,i)=>v!==i?i:-1).filter(i=>i>=0),th=q.map(()=>0);
      for(let k=mv.length-1;k>0;k--){const j=Math.floor(rnd()*(k+1));[mv[k],mv[j]]=[mv[j],mv[k]];}
      mv.forEach((i,k)=>{th[i]=0.05+0.7*k/Math.max(1,mv.length);});return{q,th};});
    return FxShuffle._p;
  }
  set(k,v){this[k]=v;}
  tick(l,r,t){
    const M=this.M,w=this.w,r0=this.ring[0],r1=this.ring[1];r0[w]=l;r1[w]=r;
    const L=Math.max(64,Math.round([0.25,0.5,1][this.div|0]*60/this.e.bpm*this.sr)),si=Math.floor(this.e.clock/L);
    if(si!==this.st){
      this.st=si;
      const P=this.P,pt=P[Math.max(0,Math.min(P.length-1,Math.round(this.pattern)))],N=pt.q.length,i=si%N,j=pt.q[i];
      let d=0,g=1;
      if(t>=pt.th[i]&&j!==i){if(j<0)g=0;else d=(j<=i?i-j:i-j+N)*L;}
      d=Math.min(d,M-L);
      if(d!==this.cd||g!==this.cg){this.pd=this.cd;this.pg=this.cg;this.cd=d;this.cg=g;this.x=0;}
    }
    let wl=r0[(w-this.cd)&M]*this.cg,wr=r1[(w-this.cd)&M]*this.cg;
    if(this.x<1){const a=this.x,ol=r0[(w-this.pd)&M]*this.pg,or=r1[(w-this.pd)&M]*this.pg;wl=ol+(wl-ol)*a;wr=or+(wr-or)*a;this.x=Math.min(1,this.x+this.xi);}
    this.sm+=((t>0.04?1:0)-this.sm)*this.smk;
    this.w=(w+1)&M;
    this.oL=l+(wl-l)*this.sm;this.oR=r+(wr-r)*this.sm;
  }
}
