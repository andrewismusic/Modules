// Moved from prototype/moment-prism-relay-v30.html (v30). Keep everything inside the class body.
import { FxReverb } from './reverb.js';

/* Shimmer: the reverb above with a pitch shifter feeding its own output back in. */
export class FxShimmer extends FxReverb{
  constructor(e){
    super(e);this.decay=7;this.damp=0.3;this.mix=0.55;this.interval=2;this.amt=0.55;
    let R=1;while(R<this.sr*0.3)R<<=1;this.PSM=R-1;this.ps=[new Float32Array(R),new Float32Array(R)];this.psw=0;this.pph=0;
    this.hpS=[0,0];this.hk=1-Math.exp(-2*Math.PI*300/this.sr);
  }
  rdp(b,d){const p=this.psw-d,i=Math.floor(p),f=p-i,a=b[i&this.PSM];return a+(b[(i+1)&this.PSM]-a)*f;}
  tick(l,r,t){
    this.upd(t);
    const ratio=Math.pow(2,[5,7,12,19][this.interval]/12),W=0.08*this.sr;
    this.hpS[0]+=(this.wL-this.hpS[0])*this.hk;this.hpS[1]+=(this.wR-this.hpS[1])*this.hk;
    this.ps[0][this.psw]=this.wL-this.hpS[0];this.ps[1][this.psw]=this.wR-this.hpS[1];
    let p=this.pph+(1-ratio)/W;p-=Math.floor(p);this.pph=p;let q=p+0.5;if(q>=1)q-=1;
    const s=Math.sin(Math.PI*p),g1=s*s,g2=1-g1;
    const sl=this.rdp(this.ps[0],p*W+2)*g1+this.rdp(this.ps[0],q*W+2)*g2;
    const sr_=this.rdp(this.ps[1],p*W+2)*g1+this.rdp(this.ps[1],q*W+2)*g2;
    this.psw=(this.psw+1)&this.PSM;
    const a=this.amt*t*1.3;
    this.core(l*t+Math.tanh(sr_*a),r*t+Math.tanh(sl*a));
    this.oL=l+this.wL*this.mix;this.oR=r+this.wR*this.mix;
  }
}
