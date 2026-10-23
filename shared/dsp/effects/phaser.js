// Moved from prototype/moment-prism-relay-v30.html (v30). Keep everything inside the class body.

/* Phaser: 4–12 first-order allpass stages, stereo LFO (90° apart), feedback. */
export class FxPhaser{
  constructor(e){
    this.e=e;this.sr=e.sr;this.rate=0.35;this.stages=1;this.fb=0.6;this.center=800;
    this.x1=[new Float64Array(12),new Float64Array(12)];this.y1=[new Float64Array(12),new Float64Array(12)];
    this.fs=[0,0];this.lfo=0;this.a=[0,0];this.cnt=0;this.oL=0;this.oR=0;
  }
  set(k,v){this[k]=v;}
  tick(l,r,t){
    const sr=this.sr;
    if((this.cnt++&7)===0){
      this.lfo+=8*this.rate/sr;if(this.lfo>1)this.lfo-=1;
      for(let c=0;c<2;c++){
        const lv=Math.sin(2*Math.PI*(this.lfo+c*0.25));
        let f=this.center*Math.pow(2,lv*(0.8+2.2*t));f=Math.min(f,sr*0.45);
        const tn=Math.tan(Math.PI*f/sr);this.a[c]=(tn-1)/(tn+1);
      }
    }
    const N=[4,6,8,12][this.stages]||6,fb=this.fb*t,wet=Math.min(1,t*2)*0.5,ins=[l,r];
    for(let c=0;c<2;c++){
      const a=this.a[c],x1=this.x1[c],y1=this.y1[c];let x=ins[c]+this.fs[c]*fb;
      for(let s=0;s<N;s++){const y=a*x+x1[s]-a*y1[s];x1[s]=x;y1[s]=y;x=y;}
      this.fs[c]=Math.max(-2,Math.min(2,x));
      const o=ins[c]*(1-wet)+x*wet;if(c)this.oR=o;else this.oL=o;
    }
  }
}
