// Generated test sources for the demo benches (drums, bells, acid bass, synth pad), built in code so nothing loads
// from the network. Moved from prototype/moment-prism-relay-v30.html (v30).
import { FxReverb } from '../dsp/effects/reverb.js';

function rng(seed){let s=seed>>>0;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296*2-1;};}
const mtof=m=>440*Math.pow(2,(m-69)/12);
function normalize(L,R,peak){let m=0;for(let i=0;i<L.length;i++)m=Math.max(m,Math.abs(L[i]),Math.abs(R[i]));const g=m>0?peak/m:1;for(let i=0;i<L.length;i++){L[i]*=g;R[i]*=g;}}

export function makeIDM(sr,bpm){
  const beat=60/bpm,n=Math.round(beat*8*sr),L=new Float32Array(n),R=new Float32Array(n),rnd=rng(11),st=beat/8,at=s=>Math.round(s*st*sr);
  const add=(i,vl,vr)=>{const j=((i%n)+n)%n;L[j]+=vl;R[j]+=vr;};
  const put=(i,v,pan)=>add(i,v*(1-pan)*1.4,v*pan*1.4);
  const kick=(s0,amp,p)=>{let ph=0;for(let i=0;i<0.28*sr;i++){const t=i/sr;ph+=2*Math.PI*p*(0.45+2.2*Math.exp(-t*45))/sr;put(s0+i,Math.tanh(Math.sin(ph)*2.2)*Math.exp(-t*11)*amp,0.5);}};
  const snare=(s0,amp,tone,pan,dec)=>{let prev=0;for(let i=0;i<0.22*sr;i++){const t=i/sr,nz=rnd(),h=nz-prev*0.6;prev=nz;put(s0+i,(h*0.55*Math.exp(-t*dec)+Math.sin(2*Math.PI*tone*t)*0.5*Math.exp(-t*30))*amp,pan);}};
  const hat=(s0,amp,dec,pan)=>{let prev=0;for(let i=0;i<0.12*sr;i++){const t=i/sr,nz=rnd(),h=nz-prev;prev=nz;put(s0+i,h*amp*Math.exp(-t*dec),pan);}};
  const blip=(s0,amp,f,len,pan)=>{let ph=0;const N=Math.round(len*sr);for(let i=0;i<N;i++){ph+=f/sr;const sq=(ph%1)<0.5?1:-1;put(s0+i,sq*amp*Math.exp(-i/N*4)*Math.min(1,(N-i)/32),pan);}};
  const metal=(s0,amp,f,pan)=>{let pc=0,pm=0;for(let i=0;i<0.5*sr;i++){const t=i/sr;pm+=2*Math.PI*f*1.414/sr;pc+=2*Math.PI*f/sr;put(s0+i,Math.sin(pc+Math.sin(pm)*4*Math.exp(-t*8))*Math.exp(-t*9)*amp,pan);}};
  [[0,1,55],[6,.7,55],[19,.8,62],[32,1,55],[35,.55,50],[38,.75,55],[50,.8,58],[57,.6,70]].forEach(([s,a,p])=>kick(at(s),a*0.9,p));
  [[16,1,210],[48,1,210],[29,.3,260],[44,.35,240]].forEach(([s,a,f])=>snare(at(s),a*0.5,f,0.5,18));
  for(let k=0;k<10;k++)snare(at(56+8*(1-Math.pow(1-k/10,1.6))),0.12+0.25*k/10,220+k*25,0.3+0.04*k,30);
  for(let k=0;k<6;k++)snare(at(40+k*0.5),0.15+0.03*k,300,0.7,40);
  for(let s=0;s<64;s+=2){
    const r=rnd();
    if(s%16===12){hat(at(s),0.12,9,0.6);continue;}
    if(r>0.75){for(let k=0;k<3;k++)hat(at(s+k*2/3),0.07,60,0.3+0.2*k);}
    else hat(at(s),0.04+0.05*Math.abs(rnd()),50+Math.abs(rnd())*60,0.5+rnd()*0.3);
  }
  [[3,1800],[13,2600],[26,900],[27,1200],[41,3200],[45,700],[61,2200],[62,2800]].forEach(([s,f],k)=>blip(at(s),0.08,f,0.012+0.02*(k%3),k%2?0.2:0.8));
  [[10,420],[24,630],[42,470],[54,840]].forEach(([s,f],k)=>metal(at(s),0.11,f,k%2?0.25:0.75));
  normalize(L,R,0.85);return[L,R];
}

/* ---- demo sources: 303-style acid line, retro synth pad, and a short song with a synthesized singing voice ---- */
function sawBL(ph,dt){let v=2*ph-1;if(ph<dt){const t=ph/dt;v-=t+t-t*t-1;}else if(ph>1-dt){const t=(ph-1)/dt;v-=t*t+t+t+1;}return v;}
export function makeAcid(sr,bpm){
  const st=60/bpm/4,steps=32,n=Math.round(st*steps*sr),L=new Float32Array(n),R=new Float32Array(n);
  /* note, accent, slide; null = rest */
  const P=[[36,1,0],[36,0,0],[48,0,1],[36,0,0],[39,1,0],null,[36,0,0],[43,0,1],[46,1,0],[36,0,0],[48,0,0],null,[41,1,1],[39,0,0],[36,0,0],[34,1,0],
           [36,1,0],[36,0,1],[48,0,0],[46,0,0],[36,1,0],null,[39,0,1],[41,0,0],[43,1,0],[36,0,0],[51,1,1],[48,0,0],null,[36,0,0],[39,1,0],[31,0,1]];
  let ph=0,f=mtof(36),z=[0,0,0,0],env=0,amp=0,cut=0;const dly=new Float32Array(Math.round(st*3*sr)+1);let dw=0;
  for(let i=0;i<n;i++){
    const s=Math.floor(i/(st*sr)),ins=i-s*st*sr,p=P[s%steps],prev=P[(s+steps-1)%steps],slid=prev&&prev[2];
    if(ins<1&&p){if(!slid){env=p[1]?1.6:1;}}
    const gate=p&&(p[2]||ins<st*sr*0.62);const tf=p?mtof(p[0]):f;
    f+=(tf-f)*(slid&&p?0.0016:1);
    amp+=((gate?(p&&p[1]?1:0.75):0)-amp)*0.006;env*=Math.exp(-1/(0.16*sr));
    const fc=Math.min(9000,180+env*2600+ (p&&p[1]?600:0)),g=1-Math.exp(-2*Math.PI*fc/sr),res=3.3;
    const dt=f/sr;ph+=dt;if(ph>=1)ph-=1;const x=sawBL(ph,dt);
    let u=Math.tanh(x-res*z[3]);for(let k=0;k<4;k++){z[k]+=g*(u-z[k]);u=z[k];}
    const y=Math.tanh(z[3]*1.8)*amp*0.6;
    const e=dly[(dw+1)%dly.length];dly[dw]=y+e*0.35;dw=(dw+1)%dly.length;
    L[i]=y+e*0.18;R[i]=y+e*0.32;
  }
  normalize(L,R,0.8);return[L,R];
}
export function makePad(sr,bpm){
  const bar=60/bpm*4,n=Math.round(bar*8*sr),L=new Float32Array(n),R=new Float32Array(n);
  const chords=[[57,60,64,67],[53,57,60,64],[48,52,55,59],[55,59,62,64]];
  const voices=[];chords.forEach((c,ci)=>c.forEach(m=>{for(const d of[-0.09,0,0.08])voices.push({ci,f:mtof(m+d),pan:0.5+d*4,ph:Math.random()});}));
  const att=0.9*sr,rel=1.4*sr,seg=n/4;
  for(const v of voices){const t0=v.ci*seg;for(let i=0;i<seg+rel;i++){const j=Math.round((t0+i)%n),e=Math.min(1,i/att)*(i<seg?1:Math.max(0,1-(i-seg)/rel));if(e<=0)continue;
    const dt=v.f/sr;v.ph+=dt;if(v.ph>=1)v.ph-=1;const x=sawBL(v.ph,dt)*e*0.05;L[j]+=x*(1-v.pan)*2;R[j]+=x*v.pan*2;}}
  let a=0,b=0,c2=0,d=0;for(let p=0;p<2;p++)for(let i=0;i<n;i++){const fc=900+700*Math.sin(2*Math.PI*i/n*2),g=1-Math.exp(-2*Math.PI*fc/sr);a+=(L[i]-a)*g;b+=(a-b)*g;c2+=(R[i]-c2)*g;d+=(c2-d)*g;if(p){L[i]=b;R[i]=d;}}
  const rv=new FxReverb({sr,bpm});rv.decay=4;rv.mix=0.4;rv.size=1.2;const oL=new Float32Array(n),oR=new Float32Array(n);
  for(let p=0;p<2;p++)for(let i=0;i<n;i++){rv.tick(L[i],R[i],0.6);if(p){oL[i]=rv.oL;oR[i]=rv.oR;}}
  normalize(oL,oR,0.75);return[oL,oR];
}
export function makeBells(sr,bpm){
  const beat=60/bpm,n=Math.round(beat*16*sr),dur=n/sr,L=new Float32Array(n),R=new Float32Array(n),rnd=rng(23);
  const put=(i,v,pan)=>{const j=i%n;L[j]+=v*(1-pan)*1.4;R[j]+=v*pan*1.4;};
  const plucks=[50,54,57,59,62,64,66,69];
  const pluck=(s0,m,amp,pan)=>{
    const f=mtof(m),D=sr/f,Di=Math.floor(D),fr=D-Di,buf=new Float32Array(Di+2);let lp=0;
    for(let i=0;i<buf.length;i++){lp+=(rnd()-lp)*0.12;buf[i]=lp;}
    const len=Math.round(4*sr),M=buf.length;let w=0,last=0;
    for(let i=0;i<len;i++){
      const r0=(w-Di+M*4)%M,r1=(r0-1+M)%M,v=buf[r0]*(1-fr)+buf[r1]*fr;
      const nv=(v+last)*0.4978;last=v;buf[w]=nv;w=(w+1)%M;
      put(s0+i,v*amp*Math.min(1,i/(0.006*sr)),pan);
    }
  };
  const bell=(s0,m,amp,pan)=>{const f=mtof(m);let pc=0,pm=0;const len=Math.round(6*sr);
    for(let i=0;i<len;i++){const t=i/sr;pm+=2*Math.PI*f*2/sr;pc+=2*Math.PI*f/sr;const ix=0.9*Math.exp(-t*3)+0.08;
      put(s0+i,Math.sin(pc+ix*Math.sin(pm))*Math.exp(-t*0.7)*amp*Math.min(1,t/0.012),pan);}};
  for(let s=0;s<32;s++){if(Math.abs(rnd())>0.42)continue;pluck(Math.round(s*0.5*beat*sr),plucks[Math.floor(Math.abs(rnd())*plucks.length*0.999)],0.3+0.15*Math.abs(rnd()),0.5+rnd()*0.35);}
  [[0,62],[3.5,69],[6,66],[8,64],[11.5,71],[13,57]].forEach(([b,m],k)=>bell(Math.round(b*beat*sr),m,0.1,k%2?0.3:0.7));
  for(const[m,a]of[[38,0.05],[45,0.035]]){const f=Math.round(mtof(m)*dur)/dur;for(let i=0;i<n;i++){const v=Math.sin(2*Math.PI*f*i/sr)*a*(0.6+0.4*Math.sin(2*Math.PI*i/n));L[i]+=v;R[i]+=v;}}
  const c=1-Math.exp(-2*Math.PI*2400/sr);let a=0,b=0;
  for(let p=0;p<2;p++)for(let i=0;i<n;i++){a+=(L[i]-a)*c;b+=(R[i]-b)*c;if(p){L[i]=a;R[i]=b;}}
  const rv=new FxReverb({sr,bpm});rv.decay=6;rv.mix=0.85;rv.damp=0.7;rv.pre=30;rv.size=1.4;
  const oL=new Float32Array(n),oR=new Float32Array(n);
  for(let p=0;p<2;p++)for(let i=0;i<n;i++){rv.tick(L[i],R[i],0.7);if(p){oL[i]=rv.oL;oR[i]=rv.oR;}}
  normalize(oL,oR,0.8);return[oL,oR];
}

/* =====================================================================
   UI — two modules: Moment (freezer) and Relay (macro multi-effect)
   ===================================================================== */
