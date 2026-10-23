// Moved from prototype/moment-prism-relay-v30.html (v30). Keep everything inside the class body.

/* Lo-fi: wow and flutter with wandering rates, tape-style character (asymmetric drive, low bump,
   high rolloff), rare soft dropouts that never reach silence, and hiss that sweeps to vinyl crackle. */
export class FxLofi{
  constructor(e){
    this.e=e;const sr=this.sr=e.sr;let R=1;while(R<sr*0.05)R<<=1;this.M=R-1;this.bl=new Float32Array(R);this.br=new Float32Array(R);this.w=0;
    this.wow=0.3;this.flutter=0.25;this.char=0.5;this.nmix=0.25;this.drop=0.1;
    this.wph=0;this.f1=0;this.f2=0;this.drift=0;this.dT=0;this.wr=0;this.wrT=0;this.fr=0;this.frT=0;this.d=0.5*sr/1000;
    this.bpL=[0,0];this.bpR=[0,0];this.lpL=0;this.lpR=0;this.dpG=1;this.dpT=1;this.dpTimer=0;this.dlL=0;this.dlR=0;
    this.ndL=0;this.ndR=0;this.nbL=0;this.nbR=0;this.crL=0;this.crR=0;this.srf=0;this.cnt=0;this.oL=0;this.oR=0;
    this.cg=1;this.cA=0;this.cTa=0;this.cOut=1;this.lpC=1;this.bump=0;this.bk=1.2;this.ba1=1;this.ba2=0;this.ba3=0;
    this.dkC=1-Math.exp(-2*Math.PI*1200/sr);this.dpLpC=1-Math.exp(-2*Math.PI*2000/sr);this.dpDn=1-Math.exp(-1/(0.006*sr));this.dpUp=1-Math.exp(-1/(0.03*sr));
  }
  set(k,v){this[k]=v;}
  tick(l,r,t){
    const sr=this.sr;
    if((this.cnt++&31)===0){
      const n=32;
      this.dT+=(Math.random()*2-1-this.dT)*0.02;this.drift+=(this.dT-this.drift)*0.05;
      if(Math.random()<n/(0.6*sr))this.wrT=Math.random()*2-1;if(Math.random()<n/(0.3*sr))this.frT=Math.random()*2-1;
      this.wr+=(this.wrT-this.wr)*0.01;this.fr+=(this.frT-this.fr)*0.02;
      if(this.dpTimer>0){this.dpTimer-=n;if(this.dpTimer<=0)this.dpT=1;}
      else if(Math.random()<this.drop*t*0.35*n/sr){this.dpT=0.3+0.35*Math.random();this.dpTimer=(0.04+0.18*Math.random())*sr;}
      const c=this.char*t;this.cg=1+6*c;this.cA=0.2*c;this.cTa=Math.tanh(this.cA);this.cOut=(1+0.1*c)/this.cg;
      this.lpC=1-Math.exp(-2*Math.PI*Math.min(20000*Math.pow(0.18,c),sr*0.45)/sr);this.bump=c*0.7;
      const bg=Math.tan(Math.PI*100/sr);this.ba1=1/(1+bg*(bg+this.bk));this.ba2=bg*this.ba1;this.ba3=bg*this.ba2;
    }
    this.wph+=0.55*(1+0.4*this.wr)/sr;if(this.wph>=1)this.wph-=1;
    this.f1+=7.3*(1+0.2*this.fr)/sr;if(this.f1>=1)this.f1-=1;this.f2+=11.9*(1-0.15*this.fr)/sr;if(this.f2>=1)this.f2-=1;
    const wd=this.wow*t*6*(1+0.4*this.drift),fd=this.flutter*t*0.6;
    const wob=wd*(0.5+0.5*Math.sin(6.2832*this.wph))+fd*(0.5+0.3*Math.sin(6.2832*this.f1)+0.2*Math.sin(6.2832*this.f2));
    this.d+=((0.5+wob)*sr/1000-this.d)*0.003;
    const M=this.M,w=this.w;this.bl[w]=l;this.br[w]=r;this.w=(w+1)&M;
    const p=w-this.d,ip=Math.floor(p),f=p-ip;
    let xL=this.bl[ip&M]+(this.bl[(ip+1)&M]-this.bl[ip&M])*f,xR=this.br[ip&M]+(this.br[(ip+1)&M]-this.br[ip&M])*f;
    {const B=this.bpL,C=this.bpR,ba1=this.ba1,ba2=this.ba2,ba3=this.ba3,bk=this.bk,bump=this.bump;
      let v3=xL-B[1],v1=ba1*B[0]+ba2*v3,v2=B[1]+ba2*B[0]+ba3*v3;B[0]=2*v1-B[0];B[1]=2*v2-B[1];xL+=v1*bk*bump;
      v3=xR-C[1];v1=ba1*C[0]+ba2*v3;v2=C[1]+ba2*C[0]+ba3*v3;C[0]=2*v1-C[0];C[1]=2*v2-C[1];xR+=v1*bk*bump;
      xL=(Math.tanh(this.cg*xL+this.cA)-this.cTa)*this.cOut;xR=(Math.tanh(this.cg*xR+this.cA)-this.cTa)*this.cOut;
      this.lpL+=(xL-this.lpL)*this.lpC;this.lpR+=(xR-this.lpR)*this.lpC;xL=this.lpL;xR=this.lpR;}
    {this.dpG+=(this.dpT-this.dpG)*(this.dpT<this.dpG?this.dpDn:this.dpUp);
      this.dlL+=(xL-this.dlL)*this.dpLpC;this.dlR+=(xR-this.dlR)*this.dpLpC;const dull=1-this.dpG;
      xL=(xL+(this.dlL-xL)*dull)*this.dpG;xR=(xR+(this.dlR-xR)*dull)*this.dpG;}
    const nm=this.nmix*t;
    if(nm>0.0005){
      if(Math.random()<0.0025*48000/sr)this.crL=(Math.random()*2-1)*(0.5+Math.random()*0.5);
      if(Math.random()<0.0025*48000/sr)this.crR=(Math.random()*2-1)*(0.5+Math.random()*0.5);
      this.crL*=0.55;this.crR*=0.55;this.srf+=((Math.random()*2-1)*0.25-this.srf)*0.05;
      const lv=nm*0.05;

    }
    this.oL=xL;this.oR=xR;
  }
}
