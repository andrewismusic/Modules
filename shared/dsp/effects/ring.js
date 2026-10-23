// Moved from prototype/moment-prism-relay-v30.html (v30). Keep everything inside the class body.

/* Ring: partials crossing the threshold keep sounding as pure tones and decay at the rate they were born with.
   Phase-vocoder frequency tracking with identity phase locking; Shift / Blend and Tilt harmonics move whole peaks. */
export class FxRing{
  constructor(e){
    const sr=this.sr=e.sr,N=e.N||2048,nb=N/2+1;this.N=N;this.H=N/4;this.nb=nb;
    this.rm=[new Float64Array(nb),new Float64Array(nb)];this.rp=[new Float64Array(nb),new Float64Array(nb)];this.ri=[new Float64Array(nb),new Float64Array(nb)];this.pp=[new Float64Array(nb),new Float64Array(nb)];
    this.om=new Float64Array(nb);this.oct=new Float32Array(nb);for(let k=0;k<nb;k++){this.om[k]=2*Math.PI*k*this.H/N;this.oct[k]=Math.log2(Math.max(20,k*sr/N)/1000);}
    this.ring=0;this.thr=-50;this.rtilt=0;this.rshift=0;this.rblend=0.5;this.any=false;this.live=0;this.quant=null;
    this.voices=0;this.vglide=0.3;this.stealOld=0;this.V=[];this.vr=new Float64Array(nb);this.vi=new Float64Array(nb);
    this.ra=[new Float32Array(nb),new Float32Array(nb)];this.rg=new Uint8Array(nb);this.pks=new Int32Array(nb);
    this.sph=[0,1].map(()=>[0,1,2,3,4].map(()=>new Float64Array(nb)));this.sact=[0,1].map(()=>[0,1,2,3,4].map(()=>new Uint8Array(nb)));
  }
  set(k,v){this[k]=v;}
  proc(c,re,im,T){
    const nb=this.nb,N=this.N,H=this.H;
    if(this.voices>0)return this.procVoices(c,re,im,T);
    /* Ring: partials that cross the threshold keep sounding as pure tones (phase-vocoder frequency tracking,
       unwrapped phase). Each partial keeps the decay it was born with, so turning Ring or Tilt down later never
       cuts existing tails short. */
    const canSeed=T>0.01,rm=this.rm[c],rp=this.rp[c],ri=this.ri[c],pp=this.pp[c],ra=this.ra[c],om=this.om,rg=this.rg;
    const thrLin=Math.pow(10,this.thr/20)*N/Math.PI,TW=6.283185307,tw=this.rtilt*(1+2*this.rtilt*this.rtilt)*0.6;
    let any=false;
    for(let k=0;k<nb;k++){
      const x=re[k],y=im[k],f=1,km=Math.hypot(x,y);rg[k]=0;
      const ph=Math.atan2(y,x);let d=ph-pp[k]-om[k];d-=TW*Math.round(d/TW);const inc=om[k]+d;pp[k]=ph;
      if(canSeed&&km>=thrLin&&km>=rm[k]*ra[k]){rm[k]=km;rp[k]=ph;ri[k]=inc;ra[k]=Math.pow(10,-3*H/(T*Math.pow(2,tw*this.oct[k])*this.sr));re[k]=x*f;im[k]=y*f;any=true;}
      else if(rm[k]>1e-9){
        if(this.live)ra[k]=T>0.01?Math.pow(10,-3*H/(T*Math.pow(2,tw*this.oct[k])*this.sr)):0;
        rm[k]*=ra[k];any=true;rg[k]=rm[k]>km?1:2;
        if(rg[k]===2){re[k]=x*f;im[k]=y*f;}
        if(rm[k]<1e-7){rm[k]=0;rg[k]=0;}
      }else{re[k]=x*f;im[k]=y*f;}
    }
    this.any=any;if(!any)return;
    /* advance phases: every ringing bin moves at the frequency of the peak it belongs to (identity phase locking) */
    {let lastPk=-1;const own=this.pks;let np0=0;
      for(let k=1;k<nb-1;k++)if(rg[k]&&rm[k]>=rm[k-1]&&rm[k]>=rm[k+1])own[np0++]=k;
      let pi=0;
      for(let k=0;k<nb;k++){
        if(!rg[k])continue;
        while(pi<np0-1&&Math.abs(own[pi+1]-k)<=Math.abs(own[pi]-k))pi++;
        const pk=np0&&Math.abs(own[pi]-k)<=4?own[pi]:k;
        rp[k]+=ri[pk];
        if(rg[k]===1){re[k]=rm[k]*Math.cos(rp[k]);im[k]=rm[k]*Math.sin(rp[k]);}else rg[k]=0;
      }
    }
    /* find ringing partials (local peaks), then place moved copies with each partial's own bin shape and phase
       offsets around its peak, driven by a phase accumulator at the new frequency: clean shifted tones, no gaps */
    let mx=0;for(let k=0;k<nb;k++)if(rm[k]>mx)mx=rm[k];
    const floor=mx*0.002;let np=0;
    for(let k=3;k<nb-3;k++){const m=rm[k];if(m>floor&&m>rm[k-1]&&m>=rm[k+1])this.pks[np++]=k;}
    const sh=this.rshift,ht=Math.abs(this.rtilt),moves=[];
    if(Math.abs(sh)>0.01||this.quant){const b=this.rblend;moves.push([0,Math.pow(2,sh/12),Math.min(1,2*b)]);
      const go=Math.min(1,2*(1-b));if(go<1)for(let k=0;k<nb;k++)if(rg[k]){re[k]*=go;im[k]*=go;}}
    if(ht>0.5){const h=Math.pow((ht-0.5)/0.5,0.8);if(this.rtilt>0){moves.push([1,2,0.8*h],[2,3,0.5*h],[3,4,0.3*h]);}else moves.push([4,0.5,0.95*h]);}
    for(const[slot,R,gain]of moves){
      if(gain<=0.001)continue;const acc=this.sph[c][slot],act=this.sact[c][slot];
      for(let i=0;i<np;i++){
        const k0=this.pks[i];let Rk=R;if(slot===0&&this.quant){const f=Math.max(1,ri[k0]*this.sr/(6.283185307*H));Rk=this.quant(f*R)/f;}
        const jc=Math.round(k0*Rk);if(jc<2||jc>nb-3){act[k0]=0;continue;}
        if(act[k0]===2)acc[k0]+=ri[k0]*Rk;else acc[k0]=rp[k0]*Rk;act[k0]=3;
        for(let dd=-2;dd<=2;dd++){const src=k0+dd,j=jc+dd,m=rm[src];if(m<=0)continue;const phz=acc[k0]+(rp[src]-rp[k0]);re[j]+=gain*m*Math.cos(phz);im[j]+=gain*m*Math.sin(phz);}
      }
      for(let k=0;k<nb;k++)act[k]=act[k]===3?2:0;
    }
  }
  procVoices(c,re,im,T){
  const nb=this.nb,N=this.N,H=this.H,sr=this.sr,TW=6.283185307,V=this.V,vr=this.vr,vi=this.vi,binHz=sr/N;
  const thrLin=Math.pow(10,this.thr/20)*N/Math.PI,R=Math.pow(2,this.rshift/12),tw=this.rtilt*(1+2*this.rtilt*this.rtilt)*0.6;
  if(c===0){
    if(T>0.01){
      const pp=this.pp[0],cand=[];
      for(let k=2;k<nb-2;k++){const m=Math.hypot(re[k],im[k]),m1=Math.hypot(re[k-1],im[k-1]),m2=Math.hypot(re[k+1],im[k+1]);
        if(m>=thrLin&&m>m1&&m>=m2){const ph=Math.atan2(im[k],re[k]),om=TW*k*H/N;let d=ph-pp[k]-om;d-=TW*Math.round(d/TW);cand.push({k,m,f:(om+d)*sr/(TW*H)});}}
      for(let k=0;k<nb;k++)pp[k]=Math.atan2(im[k],re[k]);
      cand.sort((a,b)=>b.m-a.m);
      for(const p of cand.slice(0,this.voices*2)){
        const dec=Math.pow(10,-3*H/(T*Math.pow(2,tw*Math.log2(Math.max(20,p.f)/1000))*sr));
        const near=V.find(v=>Math.abs(12*Math.log2(v.ft/p.f))<0.6);
        if(near){if(p.m>near.a){near.a=p.m;near.dec=dec;}continue;}
        if(V.length<this.voices){V.push({f:p.f,ft:p.f,a:p.m,dec,age:0,ph:Math.random()*TW,k:p.k});continue;}
        let vv=V[0];for(const v of V)if(this.stealOld?v.age>vv.age:v.a<vv.a)vv=v;
        if(this.stealOld||p.m>vv.a){vv.ft=p.f;vv.a=Math.max(p.m,vv.a*0.5);vv.dec=dec;vv.age=0;}
      }
    }
    const kg=1-Math.exp(-H/(Math.max(0.004,this.vglide)*sr));
    for(const v of V){v.f=Math.exp(Math.log(v.f)+(Math.log(v.ft)-Math.log(v.f))*kg);if(this.live&&T>0.01)v.dec=Math.pow(10,-3*H/(T*Math.pow(2,tw*Math.log2(Math.max(20,v.f)/1000))*sr));
      v.a*=(T>0.01||!this.live)?v.dec:0;v.age++;let fr=v.f*R;if(this.quant)fr=this.quant(fr);v.fr=fr;v.ph+=TW*fr*H/sr;}
    for(let i=V.length-1;i>=0;i--)if(V[i].a<1e-6)V.splice(i,1);
  }
  vr.fill(0);vi.fill(0);
  for(const v of V){const p=v.fr/binHz;if(p<2||p>nb-3)continue;const k0=Math.floor(p);
    for(let j=k0-1;j<=k0+2;j++){const dd=j-p;if(Math.abs(dd)>=2)continue;const w=Math.cos(Math.PI*dd/4)**2,ph=v.ph-Math.PI*dd;vr[j]+=v.a*w*Math.cos(ph);vi[j]+=v.a*w*Math.sin(ph);}}
  for(let k=0;k<nb;k++){const vm=vr[k]*vr[k]+vi[k]*vi[k],xm=re[k]*re[k]+im[k]*im[k];if(vm>xm){re[k]=vr[k];im[k]=vi[k];}}
  this.any=V.length>0;
}

}
