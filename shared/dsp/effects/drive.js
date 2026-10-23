// Moved from prototype/moment-prism-relay-v30.html (v30). Keep everything inside the class body.

/* Drive: analog-style saturation. Tube (asymmetric, even harmonics), Tape (soft, compressive) or Fuzz (hard,
   gated edges). 2x oversampled shaping, input high-pass, post tone low-pass, level-compensated. */
export class FxDrive{
  constructor(e){this.e=e;const sr=this.sr=e.sr;this.drive=0.6;this.char=0;this.bias=0.3;this.tone=0.6;this.mix=1;
    this.hp=[0,0];this.hk=1-Math.exp(-2*Math.PI*25/sr);this.lp=[0,0];this.px=[0,0];this.dc=[0,0];this.dk=1-Math.exp(-2*Math.PI*10/sr);this.oL=0;this.oR=0;}
  set(k,v){this[k]=v;}
  sh(x,b){switch(this.char){case 1:return Math.atan(x*1.2)*0.85;case 2:{const y=x/Math.pow(1+Math.pow(Math.abs(x),5),0.2);return Math.max(-0.8,Math.min(0.8,y*1.1));}default:return Math.tanh(x+b)-Math.tanh(b);}}
  tick(l,r,t){
    const g=1+this.drive*t*30,b=this.bias*0.6*t,comp=1/Math.pow(g,0.62),tc=1-Math.exp(-2*Math.PI*Math.min(18000,900*Math.pow(20,this.tone))/this.sr),ins=[l,r],out=[0,0];
    for(let c=0;c<2;c++){
      this.hp[c]+=(ins[c]-this.hp[c])*this.hk;const x=(ins[c]-this.hp[c])*g,mid=(x+this.px[c])*0.5;this.px[c]=x;
      let y=(this.sh(mid,b)+this.sh(x,b))*0.5;this.dc[c]+=(y-this.dc[c])*this.dk;y-=this.dc[c];
      this.lp[c]+=(y-this.lp[c])*tc;out[c]=this.lp[c]*comp*1.4;
    }
    const a=this.mix*Math.min(1,t*6);this.oL=l+(out[0]-l)*a;this.oR=r+(out[1]-r)*a;
  }
}
