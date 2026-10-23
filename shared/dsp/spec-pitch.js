// Moved from prototype/moment-prism-relay-v30.html (v30). Keep everything inside the class body.

/* Spectral pitch shift with peak locking: each spectral peak is moved as a whole (its neighbouring bins keep their
   shape and phase offsets) and driven by its own phase accumulator at the new frequency. Clean on tones, soft on noise. */
export class SpecPitch{
  constructor(N,sr){const nb=N/2+1;this.N=N;this.nb=nb;this.H=N/4;this.sr=sr||48000;this.rk=new Float64Array(nb);this.occ=new Uint8Array(nb);this.pp=[new Float64Array(nb),new Float64Array(nb)];this.acc=[new Float64Array(nb),new Float64Array(nb)];this.act=[new Uint8Array(nb),new Uint8Array(nb)];
    this.mag=new Float64Array(nb);this.ph=new Float64Array(nb);this.oR=new Float64Array(nb);this.oI=new Float64Array(nb);this.pk=new Int32Array(nb);
    this.ph0=new Float64Array(nb);this.cur0=new Uint8Array(nb);this.g=[1,1];}
  apply(c,re,im,R,Q){
    const nb=this.nb,N=this.N,H=this.H,TW=6.283185307,mag=this.mag,ph=this.ph,pp=this.pp[c],acc=this.acc[c],act=this.act[c],oR=this.oR,oI=this.oI;
    let mx=0;for(let k=0;k<nb;k++){mag[k]=Math.hypot(re[k],im[k]);ph[k]=Math.atan2(im[k],re[k]);if(mag[k]>mx)mx=mag[k];}
    if(Math.abs(R-1)<1e-4&&!Q){for(let k=0;k<nb;k++){pp[k]=ph[k];act[k]=0;}return;}
    const occ=this.occ;occ.fill(0);
    if(c===0)this.cur0.fill(0);oR.fill(0);oI.fill(0);const fl=mx*1e-4;let np=0;
    for(let k=2;k<nb-2;k++){const m=mag[k];if(m>fl&&m>mag[k-1]&&m>=mag[k+1])this.pk[np++]=k;}
    for(let i=0;i<np;i++){
      const k0=this.pk[i],om=TW*k0*H/N;let d=ph[k0]-pp[k0]-om;d-=TW*Math.round(d/TW);
      let Rk=R;if(Q){if(c===1&&this.cur0[k0])Rk=this.rk[k0];else{const f=Math.max(1,(om+d)*this.sr/(TW*H));Rk=Q(f*R)/f;}this.rk[k0]=Rk;}
      const jc=Math.round(k0*Rk);if(jc<1||jc>nb-2)continue;const inc=(om+d)*Rk,gm=occ[jc]?0.35:1;occ[jc]=1;
      if(act[k0]===2)acc[k0]+=inc;else acc[k0]=ph[k0]*Rk;act[k0]=3;
      /* right channel follows the left channel's accumulator, keeping its own phase offset: the stereo image survives */
      if(c===0)this.cur0[k0]=1;else if(this.cur0[k0])acc[k0]=this.acc[0][k0]+(ph[k0]-this.ph0[k0]);
      const lo=i>0?Math.ceil((this.pk[i-1]+k0)/2):1,hi=i<np-1?Math.floor((this.pk[i+1]+k0)/2):nb-1;
      for(let s=Math.max(lo,k0-3);s<=Math.min(hi,k0+3);s++){const j=jc+(s-k0);if(j<1||j>nb-2)continue;const p=acc[k0]+(ph[s]-ph[k0]);oR[j]+=gm*mag[s]*Math.cos(p);oI[j]+=gm*mag[s]*Math.sin(p);}
    }
    let ei=0,eo=0;for(let k=0;k<nb;k++){ei+=mag[k]*mag[k];eo+=oR[k]*oR[k]+oI[k]*oI[k];}
    const gt=eo>1e-12?1.25*Math.max(0.5,Math.min(2,Math.sqrt(ei/eo))):1;this.g[c]+=(gt-this.g[c])*0.3;const g=this.g[c];
    for(let k=0;k<nb;k++){act[k]=act[k]===3?2:0;pp[k]=ph[k];re[k]=oR[k]*g;im[k]=oI[k]*g;}
    if(c===0)this.ph0.set(ph);else this.cur0.fill(0);
  }
}
