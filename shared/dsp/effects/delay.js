// Moved from prototype/moment-prism-relay-v30.html (v30). Keep everything inside the class body.

/* Tempo-synced delay: glide on time changes, damped feedback, ping-pong. */
export class FxDelay{
  constructor(e){
    this.e=e;const sr=this.sr=e.sr;let R=1;while(R<sr*4.5)R<<=1;this.M=R-1;
    this.bL=new Float32Array(R);this.bR=new Float32Array(R);this.w=0;
    this.div=2;this.fb=0.55;this.pp=1;this.mix=0.7;this.set('tone',0.55);
    this.d=0.375*sr;this.slew=1-Math.exp(-1/(0.15*sr));this.hc=1-Math.exp(-2*Math.PI*70/sr);
    this.lL=0;this.lR=0;this.hL=0;this.hR=0;this.oL=0;this.oR=0;
  }
  set(k,v){this[k]=v;if(k==='tone'){const fc=600*Math.pow(30,v);this.tc=1-Math.exp(-2*Math.PI*Math.min(fc,this.sr*0.45)/this.sr);}}
  rd(b,d){const p=this.w-d,i=Math.floor(p),f=p-i,a=b[i&this.M];return a+(b[(i+1)&this.M]-a)*f;}
  tick(l,r,t){
    const beats=[0.25,0.5,0.75,1,1.5,2][this.div]||0.5;
    const target=Math.min(this.M-4,beats*60/this.e.bpm*this.sr);
    this.d+=(target-this.d)*this.slew;
    const rl=this.rd(this.bL,this.d),rr=this.rd(this.bR,this.d);
    this.lL+=(rl-this.lL)*this.tc;this.lR+=(rr-this.lR)*this.tc;
    this.hL+=(this.lL-this.hL)*this.hc;this.hR+=(this.lR-this.hR)*this.hc;
    const yl=this.lL-this.hL,yr=this.lR-this.hR,send=t,fb=this.fb*(0.35+0.65*t);
    const fl=Math.tanh(yl*fb),fr=Math.tanh(yr*fb);
    if(this.pp){this.bL[this.w]=(l+r)*0.5*send+fr;this.bR[this.w]=fl;}
    else{this.bL[this.w]=l*send+fl;this.bR[this.w]=r*send+fr;}
    this.w=(this.w+1)&this.M;
    this.oL=l+yl*this.mix;this.oR=r+yr*this.mix;
  }
}
