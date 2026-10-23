// Moved from prototype/moment-prism-relay-v30.html (v30). Keep everything inside the class body.

/* Formant filter: three parallel band-passes morphing between vowels. */
export class FxFormant{
  constructor(e){
    this.e=e;this.sr=e.sr;this.from=0;this.to=3;this.shift=1;this.sharp=0.6;this.mix=1;
    this.V=[[800,1150,2900],[400,1600,2700],[300,2200,2950],[450,800,2830],[325,700,2530]];this.G=[1,0.7,0.35];
    this.s=new Float64Array(12);this.g=new Float64Array(3);this.k=0.1;this.cnt=0;this.oL=0;this.oR=0;
  }
  set(k,v){this[k]=v;}
  tick(l,r,t){
    const sr=this.sr;
    if((this.cnt++&15)===0){
      const va=this.V[this.from]||this.V[0],vb=this.V[this.to]||this.V[0];
      for(let j=0;j<3;j++){let f=va[j]*Math.pow(vb[j]/va[j],t)*this.shift;f=Math.min(f,sr*0.45);this.g[j]=Math.tan(Math.PI*f/sr);}
      this.k=1/(3+this.sharp*17);
    }
    const k=this.k,s=this.s,ins=[l,r];let yl=0,yr=0;
    for(let c=0;c<2;c++){
      const x=ins[c];let y=0;
      for(let j=0;j<3;j++){
        const g=this.g[j],i0=c*6+j*2,a1=1/(1+g*(g+k)),a2=g*a1,a3=g*a2;
        const v3=x-s[i0+1],v1=a1*s[i0]+a2*v3,v2=s[i0+1]+a2*s[i0]+a3*v3;s[i0]=2*v1-s[i0];s[i0+1]=2*v2-s[i0+1];
        y+=k*v1*this.G[j];
      }
      if(c)yr=y*14;else yl=y*14;
    }
    const amt=Math.min(1,t*8)*this.mix;
    this.oL=l+(yl-l)*amt;this.oR=r+(yr-r)*amt;
  }
}
