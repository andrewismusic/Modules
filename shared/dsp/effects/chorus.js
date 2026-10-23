// Moved from prototype/moment-prism-relay-v30.html (v30). Keep everything inside the class body.

/* Chorus: three modulated delay voices spread across the stereo field; the slider adds depth and level. */
export class FxChorus{
  constructor(e){
    this.e=e;const sr=this.sr=e.sr;let R=1;while(R<sr*0.06)R<<=1;this.M=R-1;this.bl=new Float32Array(R);this.br=new Float32Array(R);this.w=0;
    this.rate=0.6;this.depth=0.6;this.voices=1;this.width=0.8;this.mix=0.7;this.fb=0.1;this.ph=[0,0.33,0.66,0.15];this.fl=0;this.fr=0;this.oL=0;this.oR=0;
  }
  set(k,v){this[k]=v;}
  rd(b,d){const p=this.w-d,i=Math.floor(p),f=p-i,a=b[i&this.M];return a+(b[(i+1)&this.M]-a)*f;}
  tick(l,r,t){
    const sr=this.sr,M=this.M,n=[2,3,4][this.voices]||3;
    this.bl[this.w]=l+this.fl*this.fb*t;this.br[this.w]=r+this.fr*this.fb*t;
    let yl=0,yr=0;
    for(let v=0;v<n;v++){
      this.ph[v]+=this.rate*(1+v*0.13)/sr;if(this.ph[v]>=1)this.ph[v]-=1;
      const d=(7+v*2.5+this.depth*t*6*(0.5+0.5*Math.sin(2*Math.PI*this.ph[v])))*sr/1000,pan=n>1?(v/(n-1)-0.5)*this.width:0;
      const xl=this.rd(this.bl,d),xr=this.rd(this.br,d);
      yl+=(xl*(0.5-pan)+xr*0.0)*1.0;yr+=(xr*(0.5+pan))*1.0;
    }
    yl*=2/n;yr*=2/n;this.fl=yl;this.fr=yr;this.w=(this.w+1)&M;
    const a=this.mix*Math.min(1,t*3);this.oL=l*(1-a*0.5)+yl*a;this.oR=r*(1-a*0.5)+yr*a;
  }
}
