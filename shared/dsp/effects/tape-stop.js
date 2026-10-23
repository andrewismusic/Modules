// Moved from prototype/moment-prism-relay-v30.html (v30). Keep everything inside the class body.

/* Tape stop: a read head that slows to a halt, then catches up to live when released. */
export class FxTapeStop{
  constructor(e){
    this.e=e;const sr=this.sr=e.sr;let R=1;while(R<sr*8)R<<=1;this.M=R-1;
    this.ring=[new Float32Array(R),new Float32Array(R)];this.w=0;this.rp=-2;this.speed=1;this.mv=0;
    this.glide=250;this.curve=0;this.mk=1-Math.exp(-1/(0.008*sr));this.oL=0;this.oR=0;
  }
  set(k,v){this[k]=v;}
  tick(l,r,t){
    const M=this.M,w=this.w;this.ring[0][w]=l;this.ring[1][w]=r;
    const tg=1-Math.pow(t,[1,0.5,2][this.curve]||1),gk=this.glide>1?1-Math.exp(-1/(this.glide/1000*this.sr)):1;
    this.speed+=(tg-this.speed)*gk;
    const eng=t>0.005||this.speed<0.999;
    this.mv+=((eng?1:0)-this.mv)*this.mk;
    if(!eng&&this.mv<1e-4){this.mv=0;this.rp=w-2;}
    else{this.rp+=this.speed;if(w-this.rp>M-8)this.rp=w-(M-8);if(this.rp>w-2)this.rp=w-2;}
    let wl=l,wr=r;
    if(this.mv>0){
      const ip=Math.floor(this.rp),f=this.rp-ip,a=this.ring[0][ip&M],b=this.ring[1][ip&M],fade=Math.min(1,this.speed*6);
      wl=(a+(this.ring[0][(ip+1)&M]-a)*f)*fade;wr=(b+(this.ring[1][(ip+1)&M]-b)*f)*fade;
    }
    this.w=(w+1)&M;
    this.oL=l+(wl-l)*this.mv;this.oR=r+(wr-r)*this.mv;
  }
}
