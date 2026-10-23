// Moved from prototype/moment-prism-relay-v30.html (v30). Keep everything inside the class body.
import { Biquad } from './biquad.js';

/* OTT-style 3-band upward + downward compressor (Linkwitz-Riley 88 Hz / 2.5 kHz). */
/* OTT: three-band upward and downward compression run hard, blended in parallel by the amount.
   It always runs, so turning the amount never switches the signal path. */
export class FxOTT{
  constructor(e){
    this.e=e;const sr=this.sr=e.sr;
    const mk=(type,f)=>{const b=new Biquad();b.set(type,f,0.70710678,sr);return b;};
    this.f=[0,1].map(()=>({l1:mk(0,88),l2:mk(0,88),h1:mk(1,88),h2:mk(1,88),m1:mk(0,2500),m2:mk(0,2500),t1:mk(1,2500),t2:mk(1,2500)}));
    this.env=[0,0,0];this.b=[new Float64Array(3),new Float64Array(3)];
    this.td=[-30,-27,-31];this.tu=[-46,-44,-48];this.att=1-Math.exp(-1/(0.0035*sr));this.rel=1-Math.exp(-1/(0.12*sr));
    this.gs=[1,1,1];this.gk=1-Math.exp(-1/(0.002*sr));this.oL=0;this.oR=0;
  }
  set(k,v){this[k]=v;}
  tick(l,r,t){
    const ins=[l,r];
    for(let c=0;c<2;c++){
      const f=this.f[c],x=ins[c],lo=f.l2.tick(f.l1.tick(x)),rest=f.h2.tick(f.h1.tick(x));
      this.b[c][0]=lo;this.b[c][1]=f.m2.tick(f.m1.tick(rest));this.b[c][2]=f.t2.tick(f.t1.tick(rest));
    }
    let cL=0,cR=0,dL=0,dR=0;
    for(let b=0;b<3;b++){
      const e=Math.max(Math.abs(this.b[0][b]),Math.abs(this.b[1][b]));
      this.env[b]+=(e-this.env[b])*(e>this.env[b]?this.att:this.rel);
      const lev=20*Math.log10(this.env[b]+1e-9);let gdb=0;
      if(lev>this.td[b])gdb-=(lev-this.td[b])*0.94;
      if(lev<this.tu[b]){const gate=Math.min(1,Math.max(0,(lev+92)/16));gdb+=Math.min(30,(this.tu[b]-lev)*0.8)*gate;}
      const g=Math.pow(10,(gdb+14)/20);this.gs[b]+=(g-this.gs[b])*this.gk;
      cL+=this.b[0][b]*this.gs[b];cR+=this.b[1][b]*this.gs[b];dL+=this.b[0][b];dR+=this.b[1][b];
    }
    this.oL=dL+(cL-dL)*t;this.oR=dR+(cR-dR)*t;
  }
}
