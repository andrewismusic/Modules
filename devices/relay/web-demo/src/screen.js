// Relay's round screen: the fluid visualizer (WebGL2, with a 2D fallback), the menu, and short messages.
// Each effect is a dye in its family's visual language and its own colour. Moved from the v30 prototype.
import { FX } from '../../control/fx-defs.js';
import { clamp01 } from '../../../../shared/control/params.js';
import { createFluidGL } from '../../../../shared/ui-web/fluid-gl.js';
import { state, MU } from './state.js';
import { ctx, analyser, engineMain, syncT } from './audio.js';
import { effRange, muBpm } from './relay-ui.js';
import { SCR, drawScr } from './menu.js';

const $=s=>document.querySelector(s);
/* find the screen canvas and start the GPU fluid (null: use the 2D renderer) */
export const screenCanvas=()=>scr;
export function initScreen(){scr=$('#screen');sg=scr.getContext('2d');GLF=createFluidGL();}
/* ---------- round display: each effect draws in its family's visual language, in its own color ----------
   Tone shapers (Filter, Formant)         -> liquid: opaque, gravity-bound, braiding where they meet
   Space (Reverb, Shimmer, Smear)         -> plume: rising, drifting soft clouds
   Time and pitch (Delay, Phaser, Shifter)-> orbit: bodies circling with echo trails
   Grain and buffer (Granular, Buffer,
     Tape stop)                           -> grains: falling particles kicked up by transients
   Spectral and texture (Thin, Lo-fi)     -> petals: rose curves that wobble with the audio */
const FAM={none:'none',drive:'liquid',tremolo:'pulse',shuffle:'pulse',chorus:'orbit',filter:'liquid',formant:'liquid',reverb:'plume',shimmer:'plume',smear:'plume',delay:'orbit',phaser:'orbit',freqshift:'orbit',granular:'grains',buffer:'grains',tapestop:'grains',thin:'petals',lofi:'petals'};
export const SD=172;const G=80;let scr=null,sg=null,GLF=null;
const fld=document.createElement('canvas');fld.width=G;fld.height=G;const fg=fld.getContext('2d'),img=fg.createImageData(G,G);
const hsl2rgb=(h,s,l)=>{s/=100;l/=100;const k=n=>(n+h/30)%12,a=s*Math.min(l,1-l),f=n=>l-a*Math.max(-1,Math.min(k(n)-3,Math.min(9-k(n),1)));return[f(0)*255,f(8)*255,f(4)*255];};
const R01=()=>Math.random();
function tune(fam){return{g:0.6+R01()*0.8,sp:0.6+R01()*0.9,sz:0.7+R01()*0.6,n:Math.floor(3+R01()*4),k:2+Math.floor(R01()*5),sw:R01()*2-1};}
export const vis=[0,1,2,3].map(i=>({fx:null}));
export function resetVis(i){
  const fx=MU().slots[i].fx,fam=FAM[fx]||'none',a=i*Math.PI/2+0.4,v=vis[i];
  v.fx=fx;v.fam=fam;v.k=tune(fam);v.ph=R01()*6.28;v.act=0.1;
  v.parts=Array.from({length:fam==='grains'?56:fam==='plume'?34:10},()=>({x:Math.cos(a)*0.4+(R01()-0.5)*0.3,y:Math.sin(a)*0.3+(R01()-0.5)*0.3,vx:0,vy:0,age:R01(),w:0.7+R01()*1.6,o:R01()*6.28,s:R01()}));
  v.trail=[];
}
export function retuneVis(){vis.forEach(v=>{if(v.fam)v.k=tune(v.fam);});}
export function splash(i,m){const v=vis[i];if(!v||!v.parts)return;for(const p of v.parts){p.vx+=(R01()-0.5)*m;p.vy+=(R01()-0.5)*m-(v.fam==='grains'?m*0.6:0);}}
const MSGF={v:0};document.fonts&&document.fonts.ready.then(()=>{MSGF.v=0;});
let osd=null,bass=0,hiE=0;export let lvl=0;let lvlS=0;export const tbuf=new Float32Array(1024),fbuf=new Uint8Array(512);
export function showOSD(title,value){osd={kind:'text',title,value,t:performance.now()};}
export function showFlash(v){osd={kind:'flash',title:'',value:v,t:performance.now()};}
function slotT(i,m){const[a,b]=effRange(i),d=b-a;let t=Math.abs(d)<1e-6?(m>=a?1:0):(m-a)/d;const gz=m<0.015?0:m<0.03?(m-0.015)/0.015:1;return clamp01(t)*gz;}
function wall(p,lim,bounce){const d=Math.hypot(p.x,p.y);if(d>lim){p.x*=lim/d;p.y*=lim/d;const nx=p.x/lim,ny=p.y/lim,dot=p.vx*nx+p.vy*ny;if(dot>0){p.vx-=(1+bounce)*dot*nx;p.vy-=(1+bounce)*dot*ny;}p.vx*=0.9;p.vy*=0.9;}}
function audio(){
  if(!analyser)return 0;analyser.getFloatTimeDomainData(tbuf);let s=0;for(let i=0;i<tbuf.length;i++)s+=tbuf[i]*tbuf[i];
  const L=Math.sqrt(s/tbuf.length)*3;lvl+=(L-lvl)*0.3;const kick=Math.max(0,lvl-lvlS-0.04);lvlS+=(lvl-lvlS)*0.05;
  analyser.getByteFrequencyData(fbuf);let b=0;for(let i=1;i<8;i++)b+=fbuf[i];bass+=(b/7/255-bass)*0.25;let hh=0;for(let i=60;i<200;i++)hh+=fbuf[i];hiE+=(hh/140/255-hiE)*0.2;return kick;
}
function stepVis(dt,t,m){
  const kick=audio(),byp=MU().bypass,slow=byp?0.35:1;
  MU().slots.forEach((s,i)=>{
    const v=vis[i];if(v.fx!==s.fx)resetVis(i);
    const tgt=s.on&&!byp?0.2+0.8*slotT(i,m):0.08;v.act+=(tgt-v.act)*0.06;const a=v.act,K=v.k,P=v.parts;
    if(v.fam==='none'){}else if(v.fam==='liquid'){
      let cx=0,cy=0;for(const p of P){cx+=p.x;cy+=p.y;}cx/=P.length;cy/=P.length;
      const r=0.1+0.12*a*K.sz;v.r=r;
      for(const p of P){
        let fx=(cx-p.x)*1.4+Math.cos(t*p.w+p.o)*(0.4+1.4*a)*slow,fy=(cy-p.y)*1.4+K.g*0.9*slow+Math.sin(t*p.w*1.3+p.o)*(0.4+1.4*a)*slow;
        fx+=-p.y*bass*2*K.sw;fy+=p.x*bass*2*K.sw;
        for(const q of P){if(q===p)continue;const dx=p.x-q.x,dy=p.y-q.y,d2=dx*dx+dy*dy+1e-4;if(d2<r*r*0.8){const k=(r*r*0.8-d2)/(r*r)*3,d=Math.sqrt(d2);fx+=dx/d*k;fy+=dy/d*k;}}
        if(kick>0){p.vy-=kick*6*(0.5+R01());p.vx+=(R01()-0.5)*kick*4;}
        p.vx=(p.vx+fx*dt)*0.93;p.vy=(p.vy+fy*dt)*0.93;p.x+=p.vx*dt;p.y+=p.vy*dt;wall(p,0.86-r*0.5,0.1);
      }
    }else if(v.fam==='grains'){
      const n=Math.round(P.length*(0.25+0.75*a));
      P.forEach((p,j)=>{
        p.on=j<n;if(!p.on)return;
        p.vy+=K.g*1.4*slow*dt;p.vx+=Math.sin(t*0.7+p.o)*0.15*dt;
        if(kick>0&&R01()<0.6){p.vy-=kick*(8+R01()*8);p.vx+=(R01()-0.5)*kick*6;}
        if(MU().slots[i].fx==='tapestop'){p.vx*=0.97;}
        p.x+=p.vx*dt;p.y+=p.vy*dt;wall(p,0.9,0.35);
      });
    }else if(v.fam==='plume'){
      const src=v.src||(v.src={x:(R01()-0.5)*0.8,y:0.35+R01()*0.3});
      for(const p of P){
        p.age+=dt*(0.12+0.35*a)*K.sp*slow;
        if(p.age>=1){p.age=0;p.x=src.x+(R01()-0.5)*0.1;p.y=src.y;p.vx=(R01()-0.5)*0.1;p.vy=-0.2-0.3*R01();}
        p.vx+=Math.sin(p.y*5+t*1.3+p.o)*0.25*dt;p.vy-=(0.25+0.4*a+lvl*0.6)*dt*(v.fx==='shimmer'?1.6:1);
        p.vx*=0.98;p.vy*=0.97;p.x+=p.vx*dt;p.y+=p.vy*dt;
        if(Math.hypot(p.x,p.y)>0.92)p.age=1;
      }
    }else if(v.fam==='orbit'){
      v.ph+=dt*(0.4+1.8*a+bass*2)*K.sp*slow*(i%2?1:-1);
    }else v.ph+=dt*(0.15+0.6*a)*K.sp*slow;
  });
}
function renderLiquids(){
  const L=MU().slots.map((s,i)=>vis[i]).filter(v=>v.fam==='liquid');if(!L.length)return false;
  const D=img.data,t=performance.now()/1000,cols=L.map(v=>[hsl2rgb(FX[v.fx].hue,85,34),hsl2rgb(FX[v.fx].hue,95,58),hsl2rgb(FX[v.fx].hue,100,82)]);
  for(let y=0;y<G;y++){const uy=(y+0.5)/G*2-1;for(let x=0;x<G;x++){const ux=(x+0.5)/G*2-1,o=(y*G+x)*4;let best=-1,bf=0,bv=0;
    if(ux*ux+uy*uy<1){for(let j=0;j<L.length;j++){const v=L[j],rr=v.r*v.r*0.5;let f=0;for(const p of v.parts){const dx=ux-p.x,dy=uy-p.y;f+=rr/(dx*dx+dy*dy+0.0008);}
      if(f>0.7){const w=f*(1+0.35*Math.sin(ux*7+uy*10+t*1.2+j*2.3));if(w>bv){bv=w;bf=f;best=j;}}}}
    if(best<0){D[o+3]=0;continue;}
    const c=cols[best],e=Math.min(1,(bf-0.7)/0.25),hi=Math.min(1,Math.max(0,(bf-1.2)/3)),rim=bf<0.95?1:0;
    const base=rim?c[2]:c[1],top=c[0];
    D[o]=base[0]+(top[0]-base[0])*hi*0.6;D[o+1]=base[1]+(top[1]-base[1])*hi*0.6;D[o+2]=base[2]+(top[2]-base[2])*hi*0.6;D[o+3]=255*e;}}
  fg.putImageData(img,0,0);return true;
}
function drawVis(g,t){
  const C=SD/2,Rr=SD/2-4,X=x=>C+x*Rr,Y=y=>C+y*Rr,byp=MU().bypass;
  if(renderLiquids()){g.imageSmoothingEnabled=true;g.drawImage(fld,0,0,SD,SD);}
  MU().slots.forEach((s,i)=>{
    const v=vis[i],h=FX[s.fx].hue,a=v.act,K=v.k;if(!v.fam||v.fam==='liquid'||v.fam==='none')return;
    const col=(l,al)=>`hsla(${h},95%,${l}%,${al})`;
    if(v.fam==='plume'){for(const p of v.parts){const r=(2+10*p.age*K.sz)*(0.6+a),al=(1-p.age)*(0.25+0.5*a);g.fillStyle=col(60+20*p.age,al);g.beginPath();g.arc(X(p.x),Y(p.y),r,0,6.283);g.fill();}}
    else if(v.fam==='grains'){g.fillStyle=col(66,0.95);for(const p of v.parts){if(!p.on)continue;const z=1.4+2*p.s*K.sz;g.fillRect(X(p.x)-z/2,Y(p.y)-z/2,z,z);}}
    else if(v.fam==='orbit'){
      const n=K.n,rad=(0.25+0.5*(i/4+K.sz*0.3))%0.85+0.1;
      for(let j=0;j<n;j++){
        const spiral=s.fx==='freqshift'?0.15*Math.sin(v.ph*0.7+j):0,ang=v.ph+j*6.283/n,rr=rad*(s.fx==='phaser'?1+0.12*Math.sin(t*1.5+j):1)+spiral;
        for(let e=5;e>=0;e--){const ae=ang-e*0.12*(s.fx==='delay'?2:1),al=(1-e/6)*(0.4+0.6*a),z=(2.2+2.5*a)*(1-e/9);g.fillStyle=col(e?55:78,al);g.beginPath();g.arc(X(Math.cos(ae)*rr),Y(Math.sin(ae)*rr),z,0,6.283);g.fill();}
      }
    }else if(v.fam==='petals'){
      const k=s.fx==='lofi'?2+K.k%3:K.k+2,base=0.12+0.42*a,wob=s.fx==='lofi'?0.08+lvl*0.3:0.03+lvl*0.15;
      g.strokeStyle=col(70,0.9);g.lineWidth=s.fx==='thin'?1.2:2;g.beginPath();
      for(let j=0;j<=180;j++){const th=j/180*6.283,r=base*(0.35+0.65*Math.abs(Math.cos(k*th/2+v.ph)))+wob*Math.sin(th*9+t*(s.fx==='lofi'?2.2:5)),x=Math.cos(th+v.ph*0.3)*r,y=Math.sin(th+v.ph*0.3)*r;
        if(j)g.lineTo(X(x),Y(y));else g.moveTo(X(x),Y(y));}
      g.stroke();
      if(s.fx==='thin'){g.fillStyle=col(85,0.95);for(let j=0;j<k*2;j++){const th=j/(k*2)*6.283,x=Math.cos(th+v.ph*0.3)*base,y=Math.sin(th+v.ph*0.3)*base;g.beginPath();g.arc(X(x),Y(y),1.4+lvl*3,0,6.283);g.fill();}}
    }
  });
}
/* how each family feeds the shared liquid */
const FAMK={liquid:{buoy:-0.8,diss:.9965},plume:{buoy:.7,diss:.991},orbit:{buoy:0,diss:.988},grains:{buoy:-.35,diss:.982},petals:{buoy:.05,diss:.984},pulse:{buoy:0,diss:.975},none:{buoy:0,diss:.95}};
const gstate=[0,1,2,3].map(i=>({fx:null,a:0,ph:Math.random()*6.28,ex:0.3+0.4*Math.random(),last:0,beat:-1,echo:[]}));
const VG={ang:Math.random()*6.283,spin:(Math.random()<0.5?-1:1)*(0.03+Math.random()*0.08),seed:true,bdir:Math.random()<0.5?-1:1,dv:0,lastDial:0};
/* re-randomize the liquid's "gravity" and stir it, so each start and each Random press looks different */
export function glfShake(){VG.ang=Math.random()*6.283;VG.spin=(Math.random()<0.5?-1:1)*(0.03+Math.random()*0.1);VG.bdir=Math.random()<0.5?-1:1;VG.seed=true;
  gstate.forEach(G=>{G.ex=0.25+0.5*Math.random();G.ph=Math.random()*6.283;});}
function glfFrame(t,m){
  const kick=audio(),byp=MU().bypass,mf=0.06+0.94*Math.min(1,Math.max(0,(m-0.02)/0.3)),dl=MU().dial,dt=(1/60)*0.6*mf,buoy=[0,0,0,0],diss=[1,1,1,1],cols=[];
  MU().slots.forEach((s,i)=>{
    const G=gstate[i],fam=FAM[s.fx]||'none',K=FAMK[fam];
    if(G.fx!==s.fx){if(G.fx!==null)GLF.clearChan(i);G.fx=s.fx;G.echo=[];}
    const tgt=s.fx!=='none'&&!byp?0.15+0.85*slotT(i,m):0;G.a+=(tgt-G.a)*0.08;const a=G.a;
    buoy[i]=K.buoy*(0.5+a);diss[i]=K.diss;
    const P=s.p||{};
    if(s.fx==='reverb')diss[i]=0.986+0.012*Math.min(1,(P.decay||3)/12);else if(s.fx==='shimmer')diss[i]=0.986+0.012*Math.min(1,(P.decay||6)/20);
    else if(s.fx==='smear')diss[i]=0.986+0.012*Math.min(1,(P.time||3)/10);else if(s.fx==='thin')diss[i]=0.98+0.016*Math.min(1,(P.ring||0)/5);
    G.em=(G.em||0)*0.985;
    const hue0=FX[s.fx].hue??220,hue=(hue0+dl*55*(i%2?1:-1)+360)%360,yel=hue0>=35&&hue0<=80,rgb=hsl2rgb(hue,yel?100:85,yel?55:44).map(v=>v/255);cols.push(rgb);
    if(a<0.02||byp)return;
    const tot=gstate.reduce((q,o)=>q+(o.em||0),0)+1e-6,share=(G.em||0)/tot,budget=1/(1+(fam==='liquid'?9:5)*Math.max(0,share-(fam==='liquid'?0.22:0.32)));
    const dye=[0,0,0,0];const put=(x,y,amt,r,vx,vy)=>{amt*=budget*(0.35+0.65*mf);vx=(vx||0)*0.6*mf;vy=(vy||0)*0.6*mf;G.em+=amt*r*400;dye.fill(0);
      const sd=Math.sqrt(r)*1.3;for(let q=0;q<3;q++){const ox=(Math.random()-0.5)*sd*2,oy=(Math.random()-0.5)*sd*2;dye[i]=amt*(0.25+Math.random()*0.35);GLF.splat(GLF.D,x+ox,y+oy,dye,r*(0.35+Math.random()*0.5));}
      const sw=(Math.random()-0.5)*1.2*mf;GLF.splat(GLF.V,x+sd,y,[0,sw,0,0],r*2);GLF.splat(GLF.V,x-sd,y,[0,-sw,0,0],r*2);if(vx||vy)GLF.splat(GLF.V,x,y,[vx,vy,0,0],r*1.6);return;GLF.splat(GLF.D,x,y,dye,r);if(vx||vy)GLF.splat(GLF.V,x,y,[vx,vy,0,0],r*1.6);};
    if(fam==='liquid'){if(Math.random()<(0.12+0.3*a)*(0.15+0.85*mf)){const an=Math.random()*6.283,rr=Math.sqrt(Math.random())*0.36;put(0.5+Math.cos(an)*rr,0.5+Math.sin(an)*rr,0.85,0.0005+0.0006*a,(Math.random()-0.5)*0.3,(Math.random()-0.5)*0.3);}
      if(kick>0){const an=Math.random()*6.283,rr=Math.sqrt(Math.random())*0.36;put(0.5+Math.cos(an)*rr,0.5+Math.sin(an)*rr,0.3,0.0016,(Math.random()-0.5)*0.6,(Math.random()-0.5)*0.6+0.9*kick*8);}}
    else if(fam==='plume'){G.ex+=(Math.random()-0.5)*0.02;G.ex=Math.min(0.75,Math.max(0.25,G.ex));put(G.ex,0.16,0.18+0.3*a,0.0009,0,0.35+0.4*lvl);}
    else if(fam==='orbit'){G.ph+=dt*(0.6+2.2*a)*(i%2?1:-1)*(s.fx==='phaser'?0.5+(P.rate||0.35):1);
      if(s.fx==='chorus'){const nv=2+(P.voices??1);for(let v=1;v<nv;v++){const ang=G.ph+v*6.283/nv,rr=0.22;put(0.5+Math.cos(ang)*rr,0.5+Math.sin(ang)*rr,0.25*a,0.0005,-Math.sin(ang)*0.4*(i%2?1:-1),Math.cos(ang)*0.4*(i%2?1:-1));}}const r=0.18+0.12*((i*0.37)%1),x=0.5+Math.cos(G.ph)*r,y=0.5+Math.sin(G.ph)*r;
      put(x,y,0.35+0.4*a,0.0007,-Math.sin(G.ph)*0.5*(i%2?1:-1),Math.cos(G.ph)*0.5*(i%2?1:-1));
      if(s.fx==='delay'&&t-G.last>60/muBpm()*([0.25,0.5,0.75,1,1.5,2][P.div??2])){G.last=t;G.echo.push({x,y,n:2+Math.round((P.fb??0.5)*6)});}
      G.echo=G.echo.filter(e=>{if(Math.random()<0.15){put(e.x,e.y,0.12*e.n*a,0.0005,0,0);e.n--;}return e.n>0;});}
    else if(fam==='grains'){const slow=s.fx==='tapestop'?1-a*0.9:1,n=Math.round((1+3*a*(s.fx==='granular'?(P.density||24)/24:1))*slow+kick*40);for(let k=0;k<Math.min(n,8);k++){const ang=Math.random()*6.283,r=Math.sqrt(Math.random())*0.38;put(0.5+Math.cos(ang)*r,0.5+Math.sin(ang)*r,0.9,0.00012+0.00012*Math.random(),(Math.random()-0.5)*0.3,(Math.random()-0.5)*0.3+kick*3);}}
    else if(fam==='petals'){G.ph+=dt*(1.2+2*a)*(s.fx==='lofi'?0.6:1);const k=s.fx==='lofi'?2:5,th=G.ph,r=0.06+0.28*Math.abs(Math.cos(k*th*0.5))*(0.5+a)+(s.fx==='lofi'?0.03*Math.sin(t*9):0);
      const x=0.5+Math.cos(th)*r,y=0.5+Math.sin(th)*r;put(x,y,0.7,0.00018,Math.cos(th)*0.6,Math.sin(th)*0.6);}
    else if(fam==='pulse'){const rate=[2,1,0.5,0.25,0.125][s.p.rate??2],b=Math.floor((ctx?ctx.currentTime-syncT:t)*muBpm()/60/rate);
      if(b!==G.beat){G.beat=b;for(let k=0;k<10;k++){const ang=k/10*6.283+G.ph,r=0.12;put(0.5+Math.cos(ang)*r,0.5+Math.sin(ang)*r,0.5*a,0.0006,Math.cos(ang)*1.2*a,Math.sin(ang)*1.2*a);}G.ph+=0.3;}}
  });
  if(dl>0.03&&!byp)for(let k=0;k<Math.ceil(dl*3);k++){const ang=Math.random()*6.283,r=Math.sqrt(Math.random())*0.4;GLF.splat(GLF.V,0.5+Math.cos(ang)*r,0.5+Math.sin(ang)*r,[(Math.random()-0.5)*dl*1.2*mf,(Math.random()-0.5)*dl*1.2*mf,0,0],0.004);}
  {const d=MU().dial-VG.lastDial;VG.lastDial=MU().dial;VG.dv+=(d-VG.dv)*0.25;}
  VG.ang+=VG.spin*dt*6;const gx=Math.sin(VG.ang),gy=Math.cos(VG.ang);
  if(VG.seed){VG.seed=false;for(let k=0;k<14;k++){const a=Math.random()*6.283,r=Math.sqrt(Math.random())*0.4,x=0.5+Math.cos(a)*r,y=0.5+Math.sin(a)*r,dye=[0,0,0,0];
    dye[k%4]=0.25+Math.random()*0.4;if(MU().slots[k%4].fx!=='none')GLF.splat(GLF.D,x,y,dye,0.0004+Math.random()*0.0012);GLF.splat(GLF.V,x,y,[(Math.random()-0.5)*0.8,(Math.random()-0.5)*0.8,0,0],0.004);}}
  GLF.step(dt,buoy,diss,((bass*1.6-0.2)*0.6*VG.bdir-VG.dv*90)*(byp?0:1),22+dl*45,gx,gy);
  while(cols.length<4)cols.push([0.3,0.3,0.3]);
  GLF.show(cols,byp?0.45:1,Math.min(0.8,hiE*2.5));
}

export function drawScreen(now){
  const t=now/1000,dpr=(window.devicePixelRatio||1)*(+$('#modMu').dataset.s||1),g=sg;
  if(scr.width!==Math.round(SD*dpr)){scr.width=Math.round(SD*dpr);scr.height=Math.round(SD*dpr);}
  g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,SD,SD);
  g.save();g.beginPath();g.arc(SD/2,SD/2,SD/2,0,6.283);g.clip();
  const bg=g.createRadialGradient(SD/2,SD/2,4,SD/2,SD/2,SD/2);bg.addColorStop(0,'#0d1022');bg.addColorStop(1,'#03040a');g.fillStyle=bg;g.fillRect(0,0,SD,SD);
  const m=engineMain?engineMain.macro:(ctx?MU().macroEff:MU().macro);
  if(GLF){glfFrame(t,m);g.drawImage(GLF.canvas,0,0,SD,SD);}else{stepVis(1/60,t,m);g.globalAlpha=MU().bypass?0.45:1;drawVis(g,t);g.globalAlpha=1;}
  const sh=g.createRadialGradient(SD*0.35,SD*0.28,2,SD*0.35,SD*0.28,SD*0.55);sh.addColorStop(0,'rgba(255,255,255,.08)');sh.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=sh;g.fillRect(0,0,SD,SD);
  if(MU().dial>0.001){g.strokeStyle=MU().bypass?'rgba(255,210,122,.3)':'rgba(255,210,122,.9)';g.shadowColor='#ffb347';g.shadowBlur=6;g.lineWidth=2.5;g.beginPath();g.arc(SD/2,SD/2,SD/2-3,-Math.PI/2,-Math.PI/2+MU().dial*2*Math.PI);g.stroke();g.shadowBlur=0;}
  if(ctx&&state.playing){const ph=(((ctx.currentTime-syncT)*muBpm()/60)%1+1)%1,a=Math.exp(-ph*7);g.fillStyle=`rgba(255,220,160,${0.25+0.75*a})`;g.beginPath();g.arc(SD/2,12,1.5+1.2*a,0,6.283);g.fill();}
  if(SCR.mode!=='main'){drawScr(g,now);g.restore();return;}
  if(!MSGF.v){g.font='800 20px "Barlow Semi Condensed",sans-serif';MSGF.v=Math.min(20,Math.floor(20*(SD-32)/g.measureText('RANDOM SETTINGS').width));}
  const msg=(v,a)=>{g.textAlign='center';g.textBaseline='middle';g.shadowColor='rgba(255,210,122,.9)';g.shadowBlur=10;g.font=`800 ${MSGF.v}px "Barlow Semi Condensed",sans-serif`;g.fillStyle=`rgba(255,248,232,${a})`;g.fillText(v,SD/2,SD/2);g.shadowBlur=0;};
  if(MU().bypass&&!(osd&&osd.kind==='flash'))msg('BYPASSED',0.95);
  if(osd&&osd.kind==='flash'){const age=now-osd.t,a=Math.max(0,1-age/1500);if(a<=0)osd=null;else msg(osd.value,a);}
  else if(osd){const age=now-osd.t,dur=osd.kind==='fx'?1900:1300;
    if(age>dur)osd=null;else{const a=age<dur-300?1:1-(age-(dur-300))/300;
      g.fillStyle=`rgba(4,6,16,${0.72*a})`;g.fillRect(0,0,SD,SD);g.textAlign='center';g.textBaseline='middle';g.shadowColor='rgba(255,210,122,.8)';g.shadowBlur=6;
      g.fillStyle=`rgba(255,236,200,${0.9*a})`;g.font='700 8px "Barlow Semi Condensed",sans-serif';g.fillText(osd.title.toUpperCase(),SD/2,34);
      if(osd.kind==='entry'){g.font='800 24px "Barlow Semi Condensed",sans-serif';g.fillStyle=`rgba(255,250,240,${a})`;g.fillText(osd.value,SD/2,SD/2+2);g.font='600 8px "Barlow Semi Condensed",sans-serif';g.fillStyle=`rgba(255,236,200,${0.85*a})`;g.fillText(osd.hint1,SD/2,SD/2+28);g.fillText(osd.hint2,SD/2,SD/2+40);}
      else if(osd.kind==='fx'){g.font='700 12px "Barlow Semi Condensed",sans-serif';MU().slots.forEach((s,i)=>{const h=FX[s.fx].hue??220;g.shadowColor=`hsla(${h},100%,60%,.9)`;g.fillStyle=s.fx==='none'?`rgba(150,160,170,${a*0.7})`:`hsla(${h},95%,72%,${a})`;g.fillText(s.fx==='none'?'(empty)':FX[s.fx].name,SD/2,52+i*15);});}
      else{let fs=22;const v=String(osd.value);g.font=`800 ${fs}px "Barlow Semi Condensed",sans-serif`;while(fs>9&&g.measureText(v).width>SD-30){fs--;g.font=`800 ${fs}px "Barlow Semi Condensed",sans-serif`;}g.fillStyle=`rgba(255,250,240,${a})`;g.fillText(v,SD/2,SD/2+6);}
      g.shadowBlur=0;}}
  g.restore();
}
