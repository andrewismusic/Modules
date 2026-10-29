// Moment's audio engine: the prototype's FreezerMod (v30) wrapped with the output stage the prototype's Engine gave
// every module (soft clip above 0.8 and the non-finite safety net). Keep everything inside the class body (it also
// runs in the AudioWorklet).
import { Freezer } from '../../../shared/dsp/freezer.js';

/* Signal path: freezer (dry passes straight through until something is frozen; no spectral analysis in the path, so
   no added latency) -> bypass crossfade (10 ms) -> soft clip above 0.8 -> non-finite safety net. */
export class MomentEngine{
  constructor(sr){this.sr=sr;this.clock=0;this.f=new Freezer(sr);this.byp=0;this.bw=0;this.wk=1-Math.exp(-1/(0.01*sr));this.bad=false;this.recovered=false;}
  /* messages: fz {k,v} (a freezer setting, or byp), freeze {v} (hold on / off), reseed (fresh capture, staying
     frozen), bpm {v}, sync (restart the clock with the source) */
  msg(m){
    switch(m.type){
      case'fz':if(m.k==='byp'){this.byp=m.v?1:0;break;}if(typeof this.f[m.k]!=='number'&&typeof this.f[m.k]!=='boolean')break;
        this.f[m.k]=m.v;if(m.k==='free'||m.k==='loopBeats'||m.k==='loopMs'||m.k==='posMs'||m.k==='posBeats'||m.k==='bpm')this.f.updL();break;
      case'freeze':this.f.set(!!m.v);break;
      case'reseed':this.f.reseed();break;
      case'bpm':this.f.bpm=m.v;this.f.updL();break;
      case'sync':this.clock=0;break;
    }
  }
  /* if a non-finite value ever reaches the output, rebuild the internal state; the UI then re-sends every setting */
  recover(){this.f=new Freezer(this.sr);this.bad=false;this.recovered=true;}
  process(iL,iR,oL,oR,n){
    if(this.bad)this.recover();
    const f=this.f;
    for(let i=0;i<n;i++){
      const x=iL[i],y=iR[i];f.clock=this.clock;f.tick(x,y);
      if(this.bw!==this.byp){this.bw+=(this.byp-this.bw)*this.wk;if(Math.abs(this.bw-this.byp)<1e-4)this.bw=this.byp;}
      let l=f.oL+(x-f.oL)*this.bw,r=f.oR+(y-f.oR)*this.bw;
      const al=Math.abs(l),ar=Math.abs(r);
      if(al>0.8)l=Math.sign(l)*(0.8+0.2*Math.tanh((al-0.8)/0.2));
      if(ar>0.8)r=Math.sign(r)*(0.8+0.2*Math.tanh((ar-0.8)/0.2));
      if(!(l===l&&r===r&&Math.abs(l)<1e6&&Math.abs(r)<1e6)){l=0;r=0;this.bad=true;}
      oL[i]=l;oR[i]=r;this.clock++;
    }
  }
}
