// Moved from prototype/moment-prism-relay-v30.html (v30). Keep everything inside the class body.

/* Reverb: input diffusion + 8-line modulated feedback delay network (Hadamard). */
export class FxReverb{
  constructor(e){
    this.e=e;const sr=this.sr=e.sr;
    this.decay=3.5;this.size=1;this.damp=0.45;this.pre=20;this.mix=0.6;
    this.base=[31.7,37.9,41.3,47.3,53.1,59.9,67.7,73.1].map(v=>v*sr/1000);
    let sz=1;while(sz<0.16*sr+64)sz<<=1;this.M=sz-1;
    this.lines=[];for(let i=0;i<8;i++)this.lines.push(new Float32Array(sz));this.w=0;
    this.len=this.base.slice();this.g=new Float64Array(8);this.lp=new Float64Array(8);this.v=new Float64Array(8);
    this.mp=new Float64Array(8);this.mi=new Float64Array(8);
    for(let i=0;i<8;i++){this.mp[i]=i*0.7;this.mi[i]=2*Math.PI*(0.25+0.07*i)/sr;}
    this.md=4*sr/44100;
    this.ap=[[142,107,379,277],[151,113,389,283]].map(a=>a.map(n=>({b:new Float32Array(Math.round(n*sr/44100)),i:0})));
    let pz=1;while(pz<0.25*sr)pz<<=1;this.PM=pz-1;this.pdL=new Float32Array(pz);this.pdR=new Float32Array(pz);this.pw=0;
    this.cnt=0;this.dc=0.36;this.pd=0;this.oL=0;this.oR=0;this.wL=0;this.wR=0;
  }
  set(k,v){this[k]=v;}
  ap_(a,x){const b=a.b,v=b[a.i],y=v-0.6*x;b[a.i]=x+0.6*y;if(++a.i>=b.length)a.i=0;return y;}
  upd(t){
    if((this.cnt++&31)===0){
      const rt=this.decay*(0.35+0.65*t),sr=this.sr;
      for(let i=0;i<8;i++){this.len[i]+=(this.base[i]*this.size-this.len[i])*0.08;this.g[i]=Math.pow(10,-3*this.len[i]/(rt*sr));}
      this.dc=this.damp*0.8;this.pdT=Math.min(this.PM-2,this.pre*sr/1000);
    }
  }
  core(il,ir){
    this.pdL[this.pw]=il;this.pdR[this.pw]=ir;
    /* pre-delay glides (a jump in read position would click when the dial moves Pre-delay) */
    this.pd+=((this.pdT??this.pd)-this.pd)*0.0015;const rp=this.pw-this.pd,ri=Math.floor(rp),fr=rp-ri,i0=ri&this.PM,i1=(ri+1)&this.PM;let xl=this.pdL[i0]+(this.pdL[i1]-this.pdL[i0])*fr,xr=this.pdR[i0]+(this.pdR[i1]-this.pdR[i0])*fr;this.pw=(this.pw+1)&this.PM;
    for(let i=0;i<4;i++){xl=this.ap_(this.ap[0][i],xl);xr=this.ap_(this.ap[1][i],xr);}
    const v=this.v,M=this.M,w=this.w;let oL=0,oR=0;
    for(let i=0;i<8;i++){
      let ph=this.mp[i]+this.mi[i];if(ph>6.283185307)ph-=6.283185307;this.mp[i]=ph;
      const p=w-this.len[i]-this.md*(1+Math.sin(ph)),ip=Math.floor(p),f=p-ip,buf=this.lines[i];
      const a=buf[ip&M],s=a+(buf[(ip+1)&M]-a)*f;
      if(i&1)oR+=s;else oL+=s;
      this.lp[i]=s+(this.lp[i]-s)*this.dc;v[i]=this.lp[i]*this.g[i];
    }
    for(let h=1;h<8;h<<=1)for(let i=0;i<8;i+=h<<1)for(let j=i;j<i+h;j++){const a=v[j],b=v[j+h];v[j]=a+b;v[j+h]=a-b;}
    for(let i=0;i<8;i++)this.lines[i][w]=v[i]*0.35355339+((i&1)?xr:xl)*0.6;
    this.w=(w+1)&M;this.wL=oL*0.3;this.wR=oR*0.3;
  }
  tick(l,r,t){this.upd(t);this.core(l*t,r*t);this.oL=l+this.wL*this.mix;this.oR=r+this.wR*this.mix;}
}
