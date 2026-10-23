// Moved from prototype/moment-prism-relay-v30.html (v30). Keep everything inside the class body.

/* Granular cloud: grains sprayed from a rolling buffer, with pitch scatter, reverse and feedback. */
export class FxGranular{
  constructor(e){
    this.e=e;const sr=this.sr=e.sr;let R=1;while(R<sr*4)R<<=1;this.M=R-1;
    this.ring=[new Float32Array(R),new Float32Array(R)];this.w=0;
    this.size=120;this.density=24;this.spray=300;this.pitch=0;this.scatter=7;this.scale=1;this.rev=0.2;this.fb=0.2;this.mix=0.8;
    this.g=[];for(let i=0;i<64;i++)this.g.push({on:false,pos:0,inc:1,len:1,age:0,pl:1,pr:1});
    this.next=0;this.wl=0;this.wr=0;this.oL=0;this.oR=0;this.fe=0;this.fk=1-Math.exp(-1/(0.05*sr));
  }
  set(k,v){this[k]=v;}
  spawn(t){
    let g=null;for(let i=0;i<64;i++)if(!this.g[i].on){g=this.g[i];break;}
    if(!g)return;
    const sr=this.sr,len=Math.max(32,Math.round(this.size*sr/1000*(0.8+0.4*Math.random())));
    let semi=this.pitch;const sc=this.scatter*t;
    if(sc>0.01){
      if(this.scale===0)semi+=(Math.random()*2-1)*sc;
      else{const set=this.scale===1?[-24,-12,0,12,24]:[-24,-17,-12,-5,0,7,12,19,24];const ok=set.filter(v=>Math.abs(v)<=sc+0.01);semi+=ok[Math.floor(Math.random()*ok.length)];}
    }
    const ratio=Math.pow(2,semi/12),rev=Math.random()<this.rev;
    const spray=Math.random()*this.spray*t*sr/1000,need=(!rev&&ratio>1)?len*(ratio-1):0;
    const delay=Math.min(this.M-len*ratio-64,64+need+spray+(rev?len*ratio:0));
    g.pos=this.w-delay;g.inc=rev?-ratio:ratio;g.len=len;g.age=0;
    const pan=0.5+(Math.random()-0.5)*0.9*Math.min(1,t*2);g.pl=Math.cos(pan*1.5707963)*1.414;g.pr=Math.sin(pan*1.5707963)*1.414;g.on=true;
  }
  tick(l,r,t){
    const M=this.M,w=this.w,r0=this.ring[0],r1=this.ring[1];this.fe+=(Math.abs(this.wl)+Math.abs(this.wr)-this.fe)*this.fk;const fb=this.fb*t*Math.min(1,0.3/(this.fe+1e-6));
    r0[w]=l+Math.tanh(this.wl*fb)*0.6;r1[w]=r+Math.tanh(this.wr*fb)*0.6;
    const dens=2+(this.density-2)*t;
    if(--this.next<=0){this.spawn(t);this.next=this.sr/dens*(0.5+Math.random());}
    let sl=0,sr=0;
    for(let i=0;i<64;i++){
      const g=this.g[i];if(!g.on)continue;
      const s=Math.sin(Math.PI*g.age/g.len),env=s*s,ip=Math.floor(g.pos),f=g.pos-ip;
      const a0=r0[ip&M],a1=r1[ip&M];
      sl+=(a0+(r0[(ip+1)&M]-a0)*f)*env*g.pl;sr+=(a1+(r1[(ip+1)&M]-a1)*f)*env*g.pr;
      g.pos+=g.inc;if(++g.age>=g.len)g.on=false;
    }
    const norm=1/Math.sqrt(Math.max(1,dens*this.size/1000*0.375));
    this.wl=sl*norm;this.wr=sr*norm;this.w=(w+1)&M;
    const x=t*this.mix*1.5707963,ca=Math.cos(x),sb=Math.sin(x);
    this.oL=l*ca+this.wl*sb;this.oR=r*ca+this.wr*sb;
  }
}
