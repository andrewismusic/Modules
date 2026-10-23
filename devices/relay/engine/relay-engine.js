// Relay's audio engine, from the prototype's Engine (v30) with the Moment and Prism paths and the unused engine LFO
// removed. Keep everything inside the class body (it also runs in the AudioWorklet).
import { FxFilter } from '../../../shared/dsp/effects/filter.js';
import { FxFormant } from '../../../shared/dsp/effects/formant.js';
import { FxDelay } from '../../../shared/dsp/effects/delay.js';
import { FxReverb } from '../../../shared/dsp/effects/reverb.js';
import { FxShimmer } from '../../../shared/dsp/effects/shimmer.js';
import { FxGranular } from '../../../shared/dsp/effects/granular.js';
import { FxSmear } from '../../../shared/dsp/effects/smear.js';
import { FxThin } from '../../../shared/dsp/effects/thin.js';
import { FxBuffer } from '../../../shared/dsp/effects/buffer.js';
import { FxShuffle } from '../../../shared/dsp/effects/shuffle.js';
import { FxFreqShift } from '../../../shared/dsp/effects/freq-shift.js';
import { FxPhaser } from '../../../shared/dsp/effects/phaser.js';
import { FxLofi } from '../../../shared/dsp/effects/lofi.js';
import { FxTremolo } from '../../../shared/dsp/effects/tremolo.js';
import { FxDrive } from '../../../shared/dsp/effects/drive.js';
import { FxChorus } from '../../../shared/dsp/effects/chorus.js';
import { FxTapeStop } from '../../../shared/dsp/effects/tape-stop.js';
import { FxOTT } from '../../../shared/dsp/ott.js';

/* Signal path: four effect slots in series across the fader -> dry/wet -> OTT -> bypass -> 2 ms look-ahead limiter
   (ceiling 0.8) -> soft clip above 0.8 -> non-finite safety net. */
export class RelayEngine{
  constructor(sr){
    this.sr=sr;this.bpm=120;this.clock=0;this.macroT=0;this.macro=0;this.macro1=0;this.mcv=0;this.mk=1-Math.exp(-1/(0.014*sr));this.wk=1-Math.exp(-1/(0.01*sr));
    this.mbyp=0;this.mbw=0;this.ml=0;this.mr=0;this.ott=new FxOTT(this);this.ottAmt=0;this.ottByp=1;this.ottMac=0;this.ottW=0;this.mix=1;this.mixT=1;this.xfInc=1/(0.04*sr);this.ps=new Map();this.tk=1-Math.exp(-1/(0.008*sr));this.dkInc=1/(0.006*sr);
    this.limN=Math.round(0.002*sr);this.limL=new Float32Array(this.limN);this.limR=new Float32Array(this.limN);this.limW=0;this.limG=1;this.limT=1;this.limH=0;this.limAtk=1-Math.exp(-1/(0.0006*sr));this.limRel=1-Math.exp(-1/(0.15*sr));
    this.slots=[0,1,2,3].map(()=>({fx:null,on:true,a:0,b:1,w:1,dg:1,pend:[]}));
  }
  make(type){
    switch(type){
      case'filter':return new FxFilter(this);case'formant':return new FxFormant(this);
      case'delay':return new FxDelay(this);case'reverb':return new FxReverb(this);case'shimmer':return new FxShimmer(this);
      case'granular':return new FxGranular(this);case'smear':return new FxSmear(this);
      /* Relay's Thin keeps Ring tilt's decay tilt but not its pitch-moved harmonics (no pitch shifting in Relay's spectral effects) */
      case'thin':{const f=new FxThin(this);f.rgx.tiltHarm=0;return f;}
      case'buffer':return new FxBuffer(this);case'shuffle':return new FxShuffle(this);case'freqshift':return new FxFreqShift(this);case'phaser':return new FxPhaser(this);
      case'lofi':return new FxLofi(this);case'tremolo':return new FxTremolo(this);case'drive':return new FxDrive(this);case'chorus':return new FxChorus(this);case'tapestop':return new FxTapeStop(this);
    }
    return null;
  }
  msg(m){
    const s=this.slots[m.i];
    switch(m.type){
      case'macro':this.macroT=m.v;break;
      case'mcv':this.mcv=m.v;break;
      case'fx':for(const key of[...this.ps.keys()])if(key.startsWith(m.i+'.'))this.ps.delete(key);if(s.pend)s.pend.length=0;s.dg=1;s.old=s.fx;s.fx=this.make(m.fx);s.xf=s.old?0:1;break;
      case'mix':this.mixT=m.v;break;
      case'param':if(m.duck&&s.fx&&typeof s.fx[m.k]==='number'){s.pend=s.pend||[];const q=s.pend.find(p=>p[0]===m.k);
        /* a stepped setting that is re-sent unchanged must not duck the slot (the dial re-sends settings every frame) */
        if(q)q[1]=m.v;else if(s.fx[m.k]!==m.v)s.pend.push([m.k,m.v]);if(s.dg===undefined)s.dg=1;break;}
      if(s.fx&&typeof s.fx[m.k]==='number'){if(m.sm){const key=m.i+'.'+m.k,e=this.ps.get(key);if(e)e.tgt=m.v;else this.ps.set(key,{i:m.i,k:m.k,cur:s.fx[m.k],tgt:m.v});}else{this.ps.delete(m.i+'.'+m.k);s.fx.set(m.k,m.v);}}break;
      case'range':s.a=m.a;s.b=m.b;break;
      case'on':s.on=m.v;break;
      case'swap':{this.ps.clear();const t=this.slots[m.i];this.slots[m.i]=this.slots[m.j];this.slots[m.j]=t;break;}
      case'bpm':this.bpm=m.v;break;
      case'mbyp':this.mbyp=m.v?1:0;break;
      case'ott':this.ottAmt=m.v;break;
      case'ottbyp':this.ottByp=m.v?1:0;break;
      case'ottmac':this.ottMac=m.v?1:0;break;
      case'sync':this.clock=0;break;
    }
  }
  multi(l,r,m){
    const slots=this.slots,dl=l,dr=r,gz=m<0.015?0:m<0.03?(m-0.015)/0.015:1;
    for(let k=0;k<4;k++){
      const S=slots[k];if(!S.fx&&!S.old)continue;
      const tw=S.on?1:0;if(S.w!==tw){S.w+=(tw-S.w)*this.wk;if(Math.abs(S.w-tw)<1e-4)S.w=tw;}
      if(S.w===0)continue;
      const d=S.b-S.a;let t0=Math.abs(d)<1e-6?(m>=S.a?1:0):(m-S.a)/d;t0=(t0<0?0:t0>1?1:t0)*gz;
      if(S.ts===undefined)S.ts=t0;S.ts+=(t0-S.ts)*this.tk;const t=S.ts;
      if(S.pend&&S.pend.length){S.dg-=this.dkInc;if(S.dg<=0){S.dg=0;for(const[k2,v2]of S.pend)if(S.fx&&typeof S.fx[k2]==='number')S.fx.set(k2,v2);S.pend.length=0;}}
      else if(S.dg<1)S.dg=Math.min(1,S.dg+this.dkInc);
      let ol=l,or=r;
      if(S.fx){S.fx.tick(l,r,t);ol=S.fx.oL;or=S.fx.oR;}
      if(S.old){
        S.xf=Math.min(1,S.xf+this.xfInc);const a=Math.sin(S.xf*1.5707963),b=Math.cos(S.xf*1.5707963);
        S.old.tick(l,r,t);ol=ol*a+S.old.oL*b;or=or*a+S.old.oR*b;if(S.xf>=1)S.old=null;
      }
      const pr=t>=0.06?1:t/0.06,ww=S.w*S.dg*pr;if(ww===1){l=ol;r=or;}else if(ww>0){l+=(ol-l)*ww;r+=(or-r)*ww;}
    }
    this.ottW+=((this.ottMac?m:this.ottAmt)-this.ottW)*this.wk;
    if(this.ottByp){this.ott.tick(l,r,this.ottW);const q=Math.min(1,this.ottW*25);l+=(this.ott.oL-l)*q;r+=(this.ott.oR-r)*q;}
    this.mix+=(this.mixT-this.mix)*this.wk;l=dl+(l-dl)*this.mix;r=dr+(r-dr)*this.mix;
    if(this.mbw!==this.mbyp){this.mbw+=(this.mbyp-this.mbw)*this.wk;if(Math.abs(this.mbw-this.mbyp)<1e-4)this.mbw=this.mbyp;}
    l=l+(dl-l)*this.mbw;r=r+(dr-r)*this.mbw;
    if(!this.ottByp){this.ott.tick(l,r,this.ottW);const q=Math.min(1,this.ottW*25);l+=(this.ott.oL-l)*q;r+=(this.ott.oR-r)*q;}
    {const LA=this.limN,w=this.limW;this.limL[w]=l;this.limR[w]=r;this.limW=(w+1)%LA;
      const pk=Math.max(Math.abs(l),Math.abs(r)),tg=pk>0.8?0.8/pk:1;
      if(tg<=this.limT){this.limT=tg;this.limH=LA;}else if(this.limH>0)this.limH--;else this.limT+=(1-this.limT)*this.limRel;
      this.limG+=(this.limT-this.limG)*(this.limT<this.limG?this.limAtk:this.limRel);
      const rI=this.limW;l=this.limL[rI]*this.limG;r=this.limR[rI]*this.limG;}
    this.ml=l;this.mr=r;
  }
  /* if a non-finite value ever reaches the output, rebuild the internal state; the UI then re-sends every setting */
  recover(){this.ott=new FxOTT(this);for(const S of this.slots){S.fx=null;S.old=null;S.ts=undefined;S.pend=[];S.dg=1;}
    this.ps.clear();this.limL.fill(0);this.limR.fill(0);this.limG=1;this.limT=1;this.bad=false;this.recovered=true;}
  process(iL,iR,oL,oR,n){
    if(this.bad)this.recover();
    for(let i=0;i<n;i++){
      /* smoothed parameter moves (dial, glides) step every 16 samples instead of once per block, so they never zipper */
      if((i&15)===0&&this.ps.size)for(const[key,e]of this.ps){const S=this.slots[e.i];if(!S||!S.fx){this.ps.delete(key);continue;}
        e.cur+=(e.tgt-e.cur)*0.035;if(Math.abs(e.tgt-e.cur)<=1e-5*Math.max(1,Math.abs(e.tgt))){e.cur=e.tgt;this.ps.delete(key);}S.fx.set(e.k,e.cur);}
      const tg=Math.max(0,Math.min(1,this.macroT+(this.mcv||0)));
      /* two smoothing stages in a row: control updates arrive in steps, this turns them into smooth curves */
      this.macro1+=(tg-this.macro1)*this.mk;this.macro+=(this.macro1-this.macro)*this.mk;const m=this.macro;
      this.multi(iL[i],iR[i],m);let l=this.ml,r=this.mr;
      const al=Math.abs(l),ar=Math.abs(r);
      if(al>0.8)l=Math.sign(l)*(0.8+0.2*Math.tanh((al-0.8)/0.2));
      if(ar>0.8)r=Math.sign(r)*(0.8+0.2*Math.tanh((ar-0.8)/0.2));
      if(!(l===l&&r===r&&Math.abs(l)<1e6&&Math.abs(r)<1e6)){l=0;r=0;this.bad=true;}
      oL[i]=l;oR[i]=r;this.clock++;
    }
  }
}
