// Moved from prototype/moment-prism-relay-v30.html (v30). Keep everything inside the class body.
import { Stft } from '../stft.js';
import { SpecPitch } from '../spec-pitch.js';
import { FxRing } from './ring.js';

/* Ring voices: at most N tones. A new partial takes a free voice; when all are busy, the oldest (or quietest) voice
   glides to the new frequency instead of a new tone starting. Each voice keeps the decay it was born with (or follows
   the knobs live). Voices are drawn as window-shaped lobes at their exact frequency with their own running phase. */
/* Spectral thin: keeps a shrinking set of bins ranked by loudness (loudest, quietest or in between).
   Optional ringing: bins that cross the threshold keep sounding and decay, with phase-vocoder
   frequency tracking so each ring holds its true pitch. */
export class FxThin{
  constructor(e){
    this.e=e;const sr=this.sr=e.sr;this.st=new Stft(sr,e.N);const N=this.st.N,nb=N/2+1;this.nb=nb;
    this.Mk=[new Float32Array(nb).fill(1),new Float32Array(nb).fill(1)];this.mag=new Float32Array(nb);this.srt=new Float32Array(nb);
    this.keep=1;this.stab=0.4;this.makeup=1;this.gs=[1,1];this.ring=0;this.thr=-50;this.rtilt=0;this.ringFree=0;this.rshift=0;this.rblend=0.5;this.pitch=0;this.ttilt=0;this.tshim=0;this.tint=12;this.quant=null;
    this.shm=[new Float64Array(nb),new Float64Array(nb)];this.shp=[0,1].map(()=>Float64Array.from({length:nb},()=>Math.random()*6.283185307));this.shq=new Float64Array(nb);this.sp=new SpecPitch(this.st.N,e.sr);this.rgx=new FxRing({sr,N:this.st.N});
    this.ra=[new Float32Array(nb),new Float32Array(nb)];this.rg=new Uint8Array(nb);this.pks=new Int32Array(nb);
    /* phase accumulators for moved partials: slot 0 = Ring shift, 1-3 = 2x/3x/4x harmonics, 4 = octave-down */
    this.sph=[0,1].map(()=>[0,1,2,3,4].map(()=>new Float64Array(nb)));this.sact=[0,1].map(()=>[0,1,2,3,4].map(()=>new Uint8Array(nb)));
    this.rm=[new Float32Array(nb),new Float32Array(nb)];this.rp=[new Float64Array(nb),new Float64Array(nb)];
    this.ri=[new Float64Array(nb),new Float64Array(nb)];this.pp=[new Float64Array(nb),new Float64Array(nb)];
    this.oct=new Float32Array(nb);this.om=new Float64Array(nb);
    for(let k=0;k<nb;k++){this.oct[k]=Math.log2(Math.max(20,k*sr/N)/1000);this.om[k]=2*Math.PI*k*this.st.H/N;}
    this.oL=0;this.oR=0;
  }
  set(k,v){this[k]=v;if(this.rgx&&k in this.rgx&&k!=="ring")this.rgx[k]=v;}
  proc(c,re,im,t){
    const nb=this.nb,N=this.st.N,H=this.st.H,Mk=this.Mk[c],mag=this.mag,q=1-0.992*Math.pow(t,0.7);
    for(let k=0;k<nb;k++)mag[k]=Math.sqrt(re[k]*re[k]+im[k]*im[k]);
    let g=1;
    if(q<0.999){
      /* rank only frequencies within 50 dB of the frame's loudest, so "quiet" means quiet sound rather than the noise floor */
      let pk=0;for(let k=0;k<nb;k++)if(mag[k]>pk)pk=mag[k];
      const tt=this.ttilt||0,rk=this.rk||(this.rk=new Float32Array(nb));for(let k=0;k<nb;k++)rk[k]=tt?mag[k]*Math.pow(2,tt*1.6*this.oct[k]):mag[k];
      pk=0;for(let k=0;k<nb;k++)if(rk[k]>pk)pk=rk[k];
      const fl=pk*0.00316;let na=0;for(let k=0;k<nb;k++)if(rk[k]>=fl)this.srt[na++]=rk[k];
      const act=this.srt.subarray(0,Math.max(1,na));act.sort();const top=act.length-1;
      const lo=Math.pow(this.keep,0.3)*(1-q),tLo=Math.max(fl,act[Math.floor(lo*top)]),tHi=act[Math.min(top,Math.ceil((lo+q)*top))];
      const s=Math.exp(-H/(0.005*Math.pow(400,this.stab)*this.sr));let ein=0,eout=0;
      for(let k=0;k<nb;k++){const m=mag[k],r=rk[k],tg=(r>=tLo&&r<=tHi)?1:0;Mk[k]=Mk[k]*s+tg*(1-s);ein+=m*m;const o=m*Mk[k];eout+=o*o;}
      if(eout>1e-14&&ein>1e-14)g=Math.pow(Math.min(40,Math.sqrt(ein/eout)),this.makeup*0.86);
    }else Mk.fill(1);
    this.gs[c]+=(g-this.gs[c])*0.35;g=this.gs[c];
    const pw=(this.pitch||this.quant||this.tshim>0.001)?Math.min(1,t/0.03):0,cr=this.cr||(this.cr=new Float64Array(nb)),ci=this.ci||(this.ci=new Float64Array(nb));
    if(pw>0)for(let k=0;k<nb;k++){cr[k]=re[k];ci[k]=im[k];}
    for(let k=0;k<nb;k++){const f=Mk[k]*g;re[k]*=f;im[k]*=f;}
    if(pw>0){if(this.pitch||this.quant)this.sp.apply(c,re,im,Math.pow(2,this.pitch/12),this.quant);
      if(this.tshim>0.001){
        /* Thin shimmer: the thinned partials feed a decaying echo that is shifted by the interval on every pass */
        const SM=this.shm[c],SP=this.shp[c],tmp=this.shq,r=Math.pow(2,this.tint/12),fb=(0.55+0.4*this.tshim)*(r>1?1/Math.sqrt(r):1);
        for(let k=0;k<nb;k++){const sk=k/r,i0=Math.floor(sk),fr=sk-i0;tmp[k]=i0+1<nb?SM[i0]*(1-fr)+SM[i0+1]*fr:0;}
        for(let k=0;k<nb;k++){SM[k]=tmp[k]*fb+Math.hypot(re[k],im[k])*this.tshim*0.5;SP[k]+=this.om[k];const a=SM[k]*this.tshim;re[k]+=a*Math.cos(SP[k]);im[k]+=a*Math.sin(SP[k]);}
      }
      if(pw<1)for(let k=0;k<nb;k++){re[k]=cr[k]+(re[k]-cr[k])*pw;im[k]=ci[k]+(im[k]-ci[k])*pw;}}
    if(this.ring>0.01||this.rgx.any)this.rgx.proc(c,re,im,this.ring*(this.ringFree?1:Math.sqrt(t)),null);
  }
  tick(l,r,t){this.st.tick(l,r,this,t);this.oL=this.st.oL;this.oR=this.st.oR;}
}
