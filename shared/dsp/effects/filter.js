// Moved from prototype/moment-prism-relay-v30.html (v30). Keep everything inside the class body.

/* Multimode filter: TPT state-variable filter (LP / HP / BP / Notch) with drive. */
export class FxFilter{
  constructor(e){this.e=e;this.sr=e.sr;this.mode=0;this.res=0.4;this.drive=0.25;this.s=[0,0,0,0];this.oL=0;this.oR=0;}
  set(k,v){this[k]=v;}
  tick(l,r,t){
    const sr=this.sr,mode=this.mode;let fc,wet;
    if(mode===0){fc=20000*Math.pow(0.003,t);wet=Math.min(1,t*25);}
    else if(mode===1){fc=20*Math.pow(400,t);wet=Math.min(1,t*25);}
    else{fc=250*Math.pow(24,t);wet=Math.min(1,t*6);}
    if(fc>sr*0.45)fc=sr*0.45;
    const g=Math.tan(Math.PI*fc/sr),k=1.414-1.37*this.res*Math.min(1,t*4);
    const a1=1/(1+g*(g+k)),a2=g*a1,a3=g*a2,pre=1+this.drive*t*9,nm=1/Math.sqrt(pre),s=this.s;
    const xl=pre>1.001?Math.tanh(l*pre)*nm:l,xr=pre>1.001?Math.tanh(r*pre)*nm:r;
    let v3=xl-s[1],v1=a1*s[0]+a2*v3,v2=s[1]+a2*s[0]+a3*v3;s[0]=2*v1-s[0];s[1]=2*v2-s[1];
    const yl=mode===0?v2:mode===1?xl-k*v1-v2:mode===2?k*v1*2.5:xl-k*v1;
    v3=xr-s[3];v1=a1*s[2]+a2*v3;v2=s[3]+a2*s[2]+a3*v3;s[2]=2*v1-s[2];s[3]=2*v2-s[3];
    const yr=mode===0?v2:mode===1?xr-k*v1-v2:mode===2?k*v1*2.5:xr-k*v1;
    this.oL=l+(yl-l)*wet;this.oR=r+(yr-r)*wet;
  }
}
