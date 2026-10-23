// Moved from prototype/moment-prism-relay-v30.html (v30). Keep everything inside the class body.
import { Stft } from '../stft.js';
import { SpecPitch } from '../spec-pitch.js';

/* Spectral smear: each bin's magnitude lingers over time, inside or outside a chosen band. */
export class FxSmear{
  constructor(e){
    this.e=e;this.sr=e.sr;this.st=new Stft(e.sr,e.N);const nb=this.st.N/2+1;
    this.S=[new Float32Array(nb),new Float32Array(nb)];this.wt=new Float32Array(nb);
    this.time=3;this.shape=0;this.lo=20;this.hi=20000;this.region=0;this.pitch=0;this.tilt=0;this.blur=0;this.drift=0;this.shim=0;this.quant=null;this.sp=new SpecPitch(this.st.N,e.sr);
    this.dv=[new Float64Array(nb),new Float64Array(nb)];this.dth=[new Float64Array(nb),new Float64Array(nb)];this.sc=new Float64Array(nb);
    this.oct=new Float32Array(nb);for(let k=0;k<nb;k++)this.oct[k]=Math.log2(Math.max(20,k*e.sr/this.st.N)/1000);this.bb=new Float64Array(nb);this.ps=new Float64Array(nb+1);
    this.calcW();this.oL=0;this.oR=0;
  }
  set(k,v){this[k]=v;if(k==='lo'||k==='hi'||k==='region')this.calcW();}
  calcW(){
    const N=this.st.N;
    for(let k=0;k<=N/2;k++){
      const f=Math.max(1,k*this.sr/N);
      const a=Math.min(1,Math.max(0,(Math.log2(f/this.lo)+0.25)/0.5)),b=Math.min(1,Math.max(0,(Math.log2(this.hi/f)+0.25)/0.5));
      if(this.lo<=this.hi&&!this.region)this.wt[k]=a*b;
      else if(this.region)this.wt[k]=1-a*b;
      else{
        const lo=this.hi,hi=this.lo,amt=Math.min(1,Math.log2(hi/lo));
        const a2=Math.min(1,Math.max(0,(Math.log2(f/lo)+0.25)/0.5)),b2=Math.min(1,Math.max(0,(Math.log2(hi/f)+0.25)/0.5));
        this.wt[k]=(1-a2*b2)*amt;
      }
    }
  }
  proc(c,re,im,t){
    const N=this.st.N,H=this.st.H,S=this.S[c],wt=this.wt;
    const tau=this.time*Math.pow(t,1.5),a=tau<0.001?0:Math.exp(-H/(tau*this.sr));
    const w=Math.min(1,tau/0.04),nb=N/2+1,ex=w>0&&(this.pitch||this.quant||this.blur>0.001||Math.abs(this.tilt)>0.001||this.drift>0.001||this.shim>0.001),dr=this.tr||(this.tr=new Float64Array(nb)),di=this.ti||(this.ti=new Float64Array(nb));
    if(ex&&w<1)for(let k=0;k<nb;k++){dr[k]=re[k];di[k]=im[k];}
    const tw=this.tilt*(1+2*this.tilt*this.tilt)*0.6,bb=this.bb;
    /* Shimmer: part of what is already smeared is fed back an octave up, so tails climb */
    if(this.shim>0.001&&w>0){const sc=this.sc,g=this.shim*0.5;sc.set(S);for(let k=2;k<nb;k++)S[k]+=g*sc[k>>1]*(k&1?0.5:1);}
    for(let k=0;k<nb;k++){
      const x=re[k],y=im[k],pw=x*x+y*y,m=Math.sqrt(pw);
      const ak=tau<0.001?0:(tw?Math.exp(-H/(tau*Math.pow(2,tw*this.oct[k])*this.sr)):a);
      const s=this.shape?Math.max(pw,S[k]*ak*ak):S[k]*ak+pw*(1-ak);S[k]=s;bb[k]=Math.sqrt(s);
      const nm=m+(bb[k]-m)*wt[k];
      if(m>1e-9){const g=nm/m;re[k]=x*g;im[k]=y*g;}
      else{const ph=Math.random()*6.283185307;re[k]=nm*Math.cos(ph);im[k]=nm*Math.sin(ph);}
    }
    if(this.blur>0.001&&w>0){
      /* Blur: smooth the smeared magnitudes across neighbouring frequencies (wider with more Blur), keep each bin's phase */
      const R=Math.max(1,Math.round(this.blur*this.blur*24*N/1024)),ps=this.ps;ps[0]=0;
      for(let k=0;k<nb;k++){const m=Math.hypot(re[k],im[k]);bb[k]=m;ps[k+1]=ps[k]+m;}
      for(let k=0;k<nb;k++){const a0=Math.max(0,k-R),b0=Math.min(nb,k+R+1),avg=(ps[b0]-ps[a0])/(b0-a0),m=bb[k],nm=m+(avg-m)*this.blur;
        if(m>1e-9){const g=nm/m;re[k]*=g;im[k]*=g;}else{const ph=Math.random()*6.283185307;re[k]=nm*Math.cos(ph);im[k]=nm*Math.sin(ph);}}
    }
    if(this.drift>0.001&&w>0){
      /* Drift: every smeared frequency gets its own slowly wandering detune (a random walk of phase velocity) */
      const dv=this.dv[c],dth=this.dth[c],amt=this.drift*this.drift*0.12;
      for(let k=1;k<nb;k++){dv[k]=dv[k]*0.985+(Math.random()-0.5)*amt;dth[k]+=dv[k];const cs=Math.cos(dth[k]),sn=Math.sin(dth[k]),x=re[k],y=im[k];re[k]=x*cs-y*sn;im[k]=x*sn+y*cs;}
    }
    if((this.pitch||this.quant)&&w>0)this.sp.apply(c,re,im,Math.pow(2,this.pitch/12),this.quant);
    if(ex&&w<1)for(let k=0;k<nb;k++){re[k]=dr[k]+(re[k]-dr[k])*w;im[k]=di[k]+(im[k]-di[k])*w;}
  }
  tick(l,r,t){this.st.tick(l,r,this,t);this.oL=this.st.oL;this.oR=this.st.oR;}
}
