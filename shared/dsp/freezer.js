// Moved from prototype/moment-prism-relay-v30.html (v30). Keep everything inside the class body.
import { FFT } from './fft.js';
import { spreadTable } from './spread.js';

/* Freeze. Each capture stores raw audio plus its spectrum in one of four slots; slot gains ramp
   so repeated captures glide instead of cutting. Loops are locked to the transport clock: a capture
   plays the last complete grid slice, phase-aligned to the clock. Spectral and loop renderers can
   crossfade live, so switching type while frozen updates immediately. */
export class Freezer{
  constructor(sr){
    this.sr=sr;let R=1;while(R<sr*6.6)R<<=1;this.R=R;this.mask=R-1;
    this.ring=[new Float32Array(R),new Float32Array(R)];this.w=0;this.clock=0;
    this.on=false;this.eng=0;this.inc=1/(0.01*sr);this.wet=1;
    this.mode=0;this.mm=0;this.mmInc=1/(0.03*sr);
    this.free=false;this.loopBeats=1;this.loopMs=250;this.fadeBeats=0;this.fadeMs=0;this.bpm=120;
    this.spread=0;this.sTab=spreadTable(2049,20,sr,4096);this.pitch=0;this.tilt=0;this.thin=0;this.keep=1;this.blur=0;this.user=false;this.rolling=0;this.reverse=0;this.dir=1;this.rcnt=0;
    {let P=1;while(P<sr*0.25)P<<=1;this.PM=P-1;this.pr=[new Float32Array(P),new Float32Array(P)];this.pw_=0;this.pph=[0,0.5];this.pmix=0;}
    const N=4096,nb=N/2+1;this.N=N;this.H=N/4;this.nb=nb;this.fft=new FFT(N);
    this.win=new Float32Array(N);for(let i=0;i<N;i++)this.win[i]=0.5-0.5*Math.cos(2*Math.PI*i/N);
    this.re=new Float64Array(N);this.im=new Float64Array(N);
    this.eff=new Float32Array(nb);this.srt=new Float32Array(nb);this.pm=new Float32Array(nb);this.oct=new Float32Array(nb);
    for(let k=0;k<nb;k++)this.oct[k]=Math.log2(Math.max(20,k*sr/N)/1000);
    this.C=Math.min(R-1,Math.ceil(6.3*sr));
    this.S=[];for(let i=0;i<4;i++)this.S.push({lb:[new Float32Array(this.C),new Float32Array(this.C)],mag:[new Float32Array(nb),new Float32Array(nb)],T:0,g:0,tg:0,rate:1,dz:[this.mkDz(),this.mkDz()]});
    this.newest=0;
    this.R2=[this.mkR(),this.mkR()];this.rc=0;this.rx=1;this.rxInc=1/(0.008*sr);this.warm=false;
    this.posMs=0;this.posBeats=0;this.off=0;this.offp=0;this.magDirty=false;
    this.L=this.calcL();this.Lp=this.L;this.lx=1;this.lxInc=1/(0.015*sr);this.pend=false;this.pendL=0;this.pendO=0;
    /* Tone: a tilt EQ on the frozen sound (both modes) pivoting near 700 Hz, up to ±9 dB at each end, smoothed */
    this.tone=0;this.tns=0;this.tlp=[0,0];this.tgL=1;this.tgH=1;this.tcnt=0;this.tc=1-Math.exp(-2*Math.PI*700/sr);
    this.oL=0;this.oR=0;this.sl=0;this.sr_=0;this.ll=0;this.lr=0;
    /* Dry/wet is smoothed (10 ms) so CV and Random glides that step it never click */
    this.ws=1;this.wk=1-Math.exp(-1/(0.01*sr));
  }
  /* per-pass direction state for one loop length: the pass now playing (reversed? faded in?) and the one after it */
  mkDz(){return{pass:-1,rev:0,fin:0,npass:-1,nrev:0};}
  /* a new loop length or Position: the previous reading (Lp, offp) crossfades into the new one over 15 ms */
  swap(L,O){if(O!==this.off)this.magDirty=true;this.Lp=this.L;this.offp=this.off;this.L=L;this.off=O;this.lx=0;for(const s of this.S){s.dz[1]=s.dz[0];s.dz[0]=this.mkDz();}}
  mkR(){return{acc:[new Float32Array(this.N),new Float32Array(this.N)],hp:0};}
  Fof(L){return Math.max(2,Math.min(Math.round(0.012*this.sr),Math.floor(L/3)));}
  calcL(){const L=Math.round((this.free?this.loopMs/1000:this.loopBeats*60/this.bpm)*this.sr);return Math.max(16,Math.min(L,Math.floor((this.C-this.Fof(L)-4)/2)));}
  /* Position: how far back in the captured audio the freeze reads, in samples (up to 5 s; limited per capture to what it holds) */
  calcO(){const o=Math.round((this.free?this.posMs/1000:this.posBeats*60/this.bpm)*this.sr);return Math.max(0,Math.min(o,Math.round(5*this.sr)));}
  updL(){const L=this.calcL(),O=this.calcO();if(this.lx>=1){if(L!==this.L||O!==this.off)this.swap(L,O);}else{this.pend=true;this.pendL=L;this.pendO=O;}}
  fadeSec(){if(this.free)return Math.max(0.008,this.fadeMs/1000);return this.fadeBeats>0?this.fadeBeats*60/this.bpm:0.008;}
  set(on){this.user=on;this.update();}
  update(){
    /* Rolling never freezes by itself: it only changes what an active freeze does */
    const on=this.user;
    if(on&&!this.on){
      if(this.eng<=0){for(const s of this.S){s.g=0;s.tg=0;}this.grab(0);this.S[this.newest].g=1;this.prefill(this.R2[this.rc],null);this.rx=1;this.warm=true;}
      else this.grab(0.008);
    }
    this.on=on;
  }
  reseed(){if(!this.on){this.set(true);return;}this.user=true;this.grab(this.fadeSec());}
  copyRing(dst,c){
    const C=this.C,st=(this.w-C)&this.mask,rg=this.ring[c];
    if(st+C<=this.R)dst.set(rg.subarray(st,st+C));
    else{const a=this.R-st;dst.set(rg.subarray(st,this.R),0);dst.set(rg.subarray(0,C-a),a);}
  }
  grab(fade){
    let best=0,bs=9;
    for(let i=0;i<4;i++){const o=this.S[i];if(i===this.newest&&o.g>0)continue;const sc=o.g+(o.tg>0?2:0);if(sc<bs){bs=sc;best=i;}}
    const s=this.S[best];
    for(let c=0;c<2;c++)this.copyRing(s.lb[c],c);
    this.specMag(s);
    s.T=this.clock;s.dz=[this.mkDz(),this.mkDz()];
    const rate=1/Math.max(1,fade*this.sr);
    for(const o of this.S){o.tg=0;o.rate=rate;}
    s.g=0;s.tg=1;this.newest=best;
    if(fade<=0.0081&&this.mm<1&&this.eng>0){const nr=1-this.rc;this.prefill(this.R2[nr],s);this.rc=nr;this.rx=0;}
  }
  /* a capture's spectrum: the average of four frames ending Position samples before the capture time */
  specMag(s){
    const N=this.N,H=this.H,re=this.re,im=this.im,win=this.win,o=Math.min(this.off,this.C-N-3*H-1);
    for(let c=0;c<2;c++){
      const mg=s.mag[c],b=s.lb[c];mg.fill(0);
      for(let f=0;f<4;f++){
        const st=this.C-o-N-f*H;
        for(let i=0;i<N;i++){re[i]=b[st+i]*win[i];im[i]=0;}
        this.fft.run(re,im,false);
        for(let k=0;k<=N/2;k++)mg[k]+=re[k]*re[k]+im[k]*im[k];
      }
      for(let k=0;k<=N/2;k++)mg[k]=Math.sqrt(mg[k]/4);
    }
  }
  /* Position moved: re-measure the sounding captures at the next spectral frame (the overlap-add blends old and new) */
  remag(){this.magDirty=false;for(const s of this.S)if(s.g>0||s.tg>0)this.specMag(s);}
  combine(c,only){
    const nb=this.nb,pm=this.pm;
    if(only){pm.set(only.mag[c]);return pm;}
    let gs=0;pm.fill(0);
    for(const s of this.S){if(s.g<=0)continue;gs+=s.g;const m=s.mag[c],g=s.g;for(let k=0;k<nb;k++)pm[k]+=g*m[k]*m[k];}
    if(gs>0){const ig=1/gs;for(let k=0;k<nb;k++)pm[k]=Math.sqrt(pm[k]*ig);}
    return pm;
  }
  shape(mg){
    const nb=this.nb,e=this.eff,ratio=Math.pow(2,this.pitch/12);
    if(Math.abs(ratio-1)<1e-4)e.set(mg);
    else for(let k=0;k<nb;k++){const s=k/ratio,i=Math.floor(s),f=s-i;e[k]=i+1<nb?mg[i]+(mg[i+1]-mg[i])*f:0;}
    let e0=0;for(let k=0;k<nb;k++)e0+=e[k]*e[k];
    if(this.blur>0.001){
      const b=Math.sqrt(this.blur)*0.985;let a=0;
      for(let k=0;k<nb;k++){a=a*b+e[k]*e[k]*(1-b);e[k]=a;}
      a=0;for(let k=nb-1;k>=0;k--){a=a*b+e[k]*(1-b);e[k]=Math.sqrt(a);}
    }
    if(Math.abs(this.tilt)>0.001){const tl=this.tilt,oc=this.oct;for(let k=0;k<nb;k++)e[k]*=Math.pow(2,tl*oc[k]);}
    if(this.thin>0.001){
      const q=1-0.998*Math.pow(this.thin,0.7),srt=this.srt;srt.set(e);srt.sort();
      const lo=this.keep*(1-q),tLo=srt[Math.floor(lo*(nb-1))],tHi=srt[Math.min(nb-1,Math.ceil((lo+q)*(nb-1)))];
      for(let k=0;k<nb;k++)if(e[k]<tLo||e[k]>tHi)e[k]=0;
    }
    let e1=0;for(let k=0;k<nb;k++)e1+=e[k]*e[k];
    if(e1>1e-20&&e0>1e-20){const g=Math.min(32,Math.sqrt(e0/e1));if(Math.abs(g-1)>1e-6)for(let k=0;k<nb;k++)e[k]*=g;}
    return e;
  }
  synth(r,only){
    if(this.magDirty)this.remag();
    const N=this.N,H=this.H,re=this.re,im=this.im,win=this.win,g=4/3;
    const sp=1-(1-this.spread)*(1-this.spread),mgs=[0,1].map(c=>Float32Array.from(this.shape(this.combine(c,only))));
    if(sp>0.001){const nb=this.nb,t=this.sTab;for(let k=0;k<nb;k++){const mid=(mgs[0][k]+mgs[1][k])*0.5,p=t[k];mgs[0][k]=mgs[0][k]*(1-sp)+mid*sp*Math.sqrt(1+p);mgs[1][k]=mgs[1][k]*(1-sp)+mid*sp*Math.sqrt(1-p);}}
    for(let c=0;c<2;c++){
      const a=r.acc[c],mg=mgs[c];
      a.copyWithin(0,H);a.fill(0,N-H);
      for(let k=1;k<N/2;k++){const ph=Math.random()*6.283185307;re[k]=mg[k]*Math.cos(ph);im[k]=mg[k]*Math.sin(ph);re[N-k]=re[k];im[N-k]=-im[k];}
      re[0]=0;im[0]=0;re[N/2]=0;im[N/2]=0;
      this.fft.run(re,im,true);
      for(let i=0;i<N;i++)a[i]+=re[i]*win[i]*g;
    }
    r.hp=0;
  }
  prefill(r,only){r.acc[0].fill(0);r.acc[1].fill(0);for(let j=0;j<4;j++)this.synth(r,only);}
  specTick(){
    const r=this.R2[this.rc];if(r.hp>=this.H)this.synth(r,null);
    let l=r.acc[0][r.hp],rr=r.acc[1][r.hp];r.hp++;
    if(this.rx<1){
      const o=this.R2[1-this.rc];if(o.hp>=this.H)this.synth(o,null);
      const x=this.rx*1.5707963,c=Math.cos(x),s=Math.sin(x);
      l=o.acc[0][o.hp]*c+l*s;rr=o.acc[1][o.hp]*c+rr*s;o.hp++;this.rx=Math.min(1,this.rx+this.rxInc);
    }
    this.sl=l;this.sr_=rr;
  }
  /* one loop voice. Direction decides for each pass whether it plays backward; the choice for the next pass is made
     as the current one enters its last F samples, so turning Direction never flips a pass that is already playing.
     Into a forward pass the loop joins seamlessly (the end crossfades into the audio just before the loop start);
     into a reverse pass the current pass fades out and the reverse one fades in. w: 0 = current length, 1 = previous. */
  vs(s,L,c,w){
    const F=this.Fof(L),T=s.T,g0=this.free?T-L:Math.floor(T/L)*L-L,base0=this.C-(T-g0),base=base0-Math.max(0,Math.min(w?this.offp:this.off,base0-F-1)),q=this.clock-g0,pass=Math.floor(q/L),p=q-pass*L,b=s.lb[c],D=s.dz[w];
    if(c===0){
      if(D.pass!==pass){if(D.npass===pass){D.rev=D.nrev;D.fin=D.nrev;}else{D.rev=0;D.fin=0;}D.pass=pass;}
      if(p>=L-F&&D.npass!==pass+1){const h=Math.sin((pass+1)*12.9898+T*0.0007+L*0.013)*43758.5453,rnd=h-Math.floor(h);D.npass=pass+1;D.nrev=this.dir<0.999&&rnd>=this.dir?1:0;}
    }
    const fd=Math.min(F,L/4),nrev=D.npass===pass+1&&D.nrev;
    let v=D.rev?b[base+L-1-p]:b[base+p];
    if(D.fin)v*=Math.min(1,(p+1)/fd);
    if(nrev)v*=Math.min(1,(L-p)/fd);
    else if(p>=L-F){const j=p-(L-F),x=j/F*1.5707963;v=v*Math.cos(x)+b[base-F+j]*Math.sin(x);}
    return v;
  }
  loopTick(){
    let sl=0,sr=0,gq=0;const blend=this.lx<1;
    const x=this.lx*1.5707963,cn=Math.cos(x),sn=Math.sin(x);
    for(const s of this.S){
      if(s.g<=0)continue;gq+=s.g*s.g;
      let a=this.vs(s,this.L,0,0),b=this.vs(s,this.L,1,0);
      if(blend){a=a*sn+this.vs(s,this.Lp,0,1)*cn;b=b*sn+this.vs(s,this.Lp,1,1)*cn;}
      sl+=a*s.g;sr+=b*s.g;
    }
    if(gq>0){const n=1/Math.sqrt(gq);sl*=n;sr*=n;}
    /* loop pitch: two-tap delay-line shifter, faded in only when Pitch is away from zero */
    const P=this.PM,w=this.pw_;this.pr[0][w]=sl;this.pr[1][w]=sr;this.pw_=(w+1)&P;
    this.pmix+=((this.pitch!==0?1:0)-this.pmix)*0.002;
    if(this.pmix>1e-4){
      const ratio=Math.pow(2,this.pitch/12),W=0.06*this.sr;let p=this.pph[0]+(1-ratio)/W;p-=Math.floor(p);this.pph[0]=p;
      let q=p+0.5;if(q>=1)q-=1;const s1=Math.sin(Math.PI*p),g1=s1*s1;
      const rd=(c,d)=>{const x=w-d,i=Math.floor(x),f=x-i,b=this.pr[c],a0=b[i&P];return a0+(b[(i+1)&P]-a0)*f;};
      const yl=rd(0,p*W+2)*g1+rd(0,q*W+2)*(1-g1),yr=rd(1,p*W+2)*g1+rd(1,q*W+2)*(1-g1);
      sl+=(yl-sl)*this.pmix;sr+=(yr-sr)*this.pmix;
    }
    this.ll=sl;this.lr=sr;
  }
  tick(l,r){
    if(!this.user&&this.on)this.update();
    const w=this.w;this.ring[0][w]=l;this.ring[1][w]=r;this.w=(w+1)&this.mask;
    if(this.on){if(this.eng<1)this.eng=Math.min(1,this.eng+this.inc);}
    else if(this.eng>0)this.eng=Math.max(0,this.eng-this.inc);
    for(const s of this.S){if(s.g!==s.tg){if(s.g<s.tg)s.g=Math.min(s.tg,s.g+s.rate);else s.g=Math.max(s.tg,s.g-s.rate);}}
    if(this.lx<1){this.lx+=this.lxInc;if(this.lx>=1){this.lx=1;if(this.pend){this.pend=false;if(this.pendL!==this.L||this.pendO!==this.off)this.swap(this.pendL,this.pendO);}}}
    if(this.ws!==this.wet){this.ws+=(this.wet-this.ws)*this.wk;if(Math.abs(this.ws-this.wet)<1e-5)this.ws=this.wet;}
    const mt=this.mode?1:0;if(this.mm!==mt)this.mm=mt>this.mm?Math.min(1,this.mm+this.mmInc):Math.max(0,this.mm-this.mmInc);
    if(this.eng<=0){this.oL=l;this.oR=r;return;}
    /* Rolling: while frozen, grab fresh audio at every loop boundary */
    if(this.rolling&&this.user){
      const L=this.L,due=this.free?(++this.rcnt>=L):(this.clock%L===0);
      if(due){this.rcnt=0;this.grab(Math.max(0.008,Math.min(this.fadeSec(),L/this.sr*0.5)));}
    }
    let fl=0,fr=0;
    if(this.mm<1){if(!this.warm){this.prefill(this.R2[this.rc],null);this.rx=1;this.warm=true;}this.specTick();fl=this.sl;fr=this.sr_;}
    else this.warm=false;
    if(this.mm>0){
      this.loopTick();
      if(this.mm>=1){fl=this.ll;fr=this.lr;}
      else{const x=this.mm*1.5707963,c=Math.cos(x),s=Math.sin(x);fl=fl*c+this.ll*s;fr=fr*c+this.lr*s;}
    }
    /* Tone: the low band (one-pole) and the rest are weighted against each other; the filter always runs so moving
       Tone away from 0 never starts from a stale state */
    {const c=this.tc,a=this.tlp;a[0]+=(fl-a[0])*c;a[1]+=(fr-a[1])*c;
      if(this.tns!==this.tone){this.tns+=(this.tone-this.tns)*this.wk;if(Math.abs(this.tns-this.tone)<1e-5)this.tns=this.tone;}
      if(this.tns!==0){if((this.tcnt++&15)===0){const g=Math.pow(2,1.5*this.tns);this.tgH=g;this.tgL=1/g;}fl=a[0]*this.tgL+(fl-a[0])*this.tgH;fr=a[1]*this.tgL+(fr-a[1])*this.tgH;}}
    const bb=this.eng*this.ws*1.5707963,ca=Math.cos(bb),sb=Math.sin(bb);
    this.oL=l*ca+fl*sb;this.oR=r*ca+fr*sb;
  }
}
