// Moved from prototype/moment-prism-relay-v30.html (v30). Keep everything inside the class body.

/* Frequency shifter: Hilbert allpass pair + quadrature oscillator, with feedback. */
export class FxFreqShift{
  constructor(e){
    this.e=e;this.sr=e.sr;this.shift=120;this.fb=0.35;this.stereo=1;this.mix=1;
    this.A=[0.6923878,0.9360654322959,0.9882295226860,0.9987488452737].map(v=>v*v);
    this.B=[0.4021921162426,0.8561710882420,0.9722909545651,0.9952884791278].map(v=>v*v);
    this.st=[0,1].map(()=>({ax1:new Float64Array(4),ax2:new Float64Array(4),ay1:new Float64Array(4),ay2:new Float64Array(4),bx1:new Float64Array(4),bx2:new Float64Array(4),by1:new Float64Array(4),by2:new Float64Array(4),bd:0}));
    this.ph=0;this.fs=[0,0];this.hA=0;this.hB=0;this.oL=0;this.oR=0;
  }
  set(k,v){this[k]=v;}
  hil(s,x){
    let a=x,b=x;
    for(let i=0;i<4;i++){
      const ya=this.A[i]*(a+s.ay2[i])-s.ax2[i];s.ax2[i]=s.ax1[i];s.ax1[i]=a;s.ay2[i]=s.ay1[i];s.ay1[i]=ya;a=ya;
      const yb=this.B[i]*(b+s.by2[i])-s.bx2[i];s.bx2[i]=s.bx1[i];s.bx1[i]=b;s.by2[i]=s.by1[i];s.by1[i]=yb;b=yb;
    }
    this.hA=a;this.hB=s.bd;s.bd=b;
  }
  tick(l,r,t){
    const f=this.shift*t*t;this.ph+=f/this.sr;this.ph-=Math.floor(this.ph);
    const cs=Math.cos(6.283185307*this.ph),sn=Math.sin(6.283185307*this.ph),fb=this.fb*t,ins=[l,r],amt=this.mix*Math.min(1,t*20);
    for(let c=0;c<2;c++){
      this.hil(this.st[c],ins[c]+this.fs[c]*fb);
      const sg=(c===1&&this.stereo===1)?-1:1,y=this.hA*cs+sg*this.hB*sn;
      this.fs[c]=Math.tanh(y);
      const o=ins[c]+(y-ins[c])*amt;if(c)this.oR=o;else this.oL=o;
    }
  }
}
