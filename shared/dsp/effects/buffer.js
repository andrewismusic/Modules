// Moved from prototype/moment-prism-relay-v30.html (v30). Keep everything inside the class body.

/* Buffer: stutter looper (tempo-quantized slices), reverser, delay-line pitch shifter. */
export class FxBuffer{
  constructor(e){
    this.e=e;const sr=this.sr=e.sr;let R=1;while(R<sr*4.5)R<<=1;this.M=R-1;
    this.ring=[new Float32Array(R),new Float32Array(R)];this.w=0;
    this.mode=0;this.rev=0;this.chunk=320;this.semi=-12;this.glide=0;this.detune=8;this.win=60;this.mix=1;
    const cap=Math.ceil(sr*4.3);this.cap=[new Float32Array(cap),new Float32Array(cap)];this.capLen=0;this.T=0;
    this.eng=false;this.S=0;this.pos=0;this.sm=0;this.smk=1-Math.exp(-1/(0.003*sr));
    this.k=0;this.C=0;this.anc=[0,0];this.ph=[0,0];this.oL=0;this.oR=0;this.Lc=0;this.xL=0;this.xf=1;this.xi=1/(0.006*sr);this.och=null;
  }
  set(k,v){this[k]=v;}
  rd(c,d){const p=this.w-d,i=Math.floor(p),f=p-i,b=this.ring[c],a=b[i&this.M];return a+(b[(i+1)&this.M]-a)*f;}
  tick(l,r,t){
    const sr=this.sr,M=this.M,w=this.w,r0=this.ring[0],r1=this.ring[1];
    r0[w]=l;r1[w]=r;
    let wl=0,wr=0,amt=0;
    if(this.mode===0){
      const bpm=this.e.bpm,eng=t>0.04,CAP=this.cap[0].length,clk=this.e.clock;
      if(eng&&!this.eng){
        const st=w+1-CAP;
        for(let i=0;i<CAP;i++){const j=(st+i)&M;this.cap[0][i]=r0[j];this.cap[1][i]=r1[j];}
        this.capLen=CAP;this.T=clk+1;
      }
      this.eng=eng;this.sm+=((eng?1:0)-this.sm)*this.smk;
      if(this.sm>1e-4&&this.capLen>0){
        const idx=Math.min(4,Math.floor(Math.max(0,t-0.04)/0.96*5));
        const Lt=Math.max(64,Math.round([2,1,0.5,0.25,0.125][idx]*60/bpm*sr));if(!this.Lc)this.Lc=Lt;
        if(Lt!==this.Lc&&this.xf>=1){this.xL=this.Lc;this.Lc=Lt;this.xf=0;}
        const T=this.T,rd=L=>{const g0=Math.floor(T/L)*L-L,base=CAP-(T-g0),p=((clk-g0)%L+L)%L,rp=this.rev?L-1-p:p,fd=Math.min(0.004*sr,L/4),env=Math.min(1,(p+1)/fd,(L-p)/fd),bi=Math.max(0,Math.min(CAP-1,base+rp));return[this.cap[0][bi]*env,this.cap[1][bi]*env];};
        const nw=rd(this.Lc);wl=nw[0];wr=nw[1];
        if(this.xf<1){const od=rd(this.xL),a=this.xf;wl=od[0]+(wl-od[0])*a;wr=od[1]+(wr-od[1])*a;this.xf=Math.min(1,this.xf+this.xi);}
      }
      amt=this.sm*this.mix;
    }else if(this.mode===1){
      const Ct=Math.max(64,Math.round(this.chunk*sr/1000));if(!this.C)this.C=Ct;
      /* a chunk-size change starts a second set of read heads at the new size and crossfades to it over 6 ms */
      if(Ct!==this.C&&this.xf>=1){this.och={k:this.k,C:this.C,anc:[this.anc[0],this.anc[1]]};this.k=this.k%Ct;this.C=Ct;this.xf=0;}
      const rdc=st=>{let a=0,b=0;const C=st.C;for(let h=0;h<2;h++){const ph=(st.k+h*(C>>1))%C;if(ph===0)st.anc[h]=w;const i=(st.anc[h]-1-ph)&M,sn=Math.sin(Math.PI*ph/C),g=sn*sn;a+=r0[i]*g;b+=r1[i]*g;}st.k=(st.k+1)%C;return[a,b];};
      const nw=rdc(this);wl=nw[0];wr=nw[1];
      if(this.xf<1&&this.och){const od=rdc(this.och),a=this.xf;wl=od[0]+(wl-od[0])*a;wr=od[1]+(wr-od[1])*a;this.xf=Math.min(1,this.xf+this.xi);if(this.xf>=1)this.och=null;}
      amt=t*this.mix;
    }
    if(this.mode<2){
    }else{
      const semis=this.glide===0?this.semi*t:this.semi;this.Ws=this.Ws||Math.max(64,this.win*sr/1000);this.Ws+=(Math.max(64,this.win*sr/1000)-this.Ws)*0.0008;const W=this.Ws;
      amt=(this.glide===0?Math.min(1,t*12):t)*this.mix;
      for(let c=0;c<2;c++){
        const ratio=Math.pow(2,(semis+(c?1:-1)*this.detune/200)/12);
        let p=this.ph[c]+(1-ratio)/W;p-=Math.floor(p);this.ph[c]=p;
        let q=p+0.5;if(q>=1)q-=1;
        const s=Math.sin(Math.PI*p),y=this.rd(c,p*W+2)*s*s+this.rd(c,q*W+2)*(1-s*s);
        if(c)wr=y;else wl=y;
      }
    }
    this.w=(w+1)&M;
    this.oL=l+(wl-l)*amt;this.oR=r+(wr-r)*amt;
  }
}
