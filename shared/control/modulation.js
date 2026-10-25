// Test bench modulation (not hardware), shared by the Moment and Prism demos: one LFO with a clocked sample-and-hold
// mode, and a rhythm generator that sends triggers. Clocked timing follows the master clock's beat position, the same
// grid the engines lock their loops to, so modulation stays in time with the music.
export const LSHAPES=['Sine','Triangle','Ramp up','Ramp down','Square','Smooth random'];
/* LFO cycle and S&H step lengths in beats */
export const LRATES=[[16,'4 bars'],[8,'2 bars'],[4,'1 bar'],[2,'1/2'],[1,'1/4'],[0.5,'1/8'],[0.25,'1/16'],[0.125,'1/32']];
/* rhythm generator step lengths in beats */
export const RRATES=[[1,'1/4'],[0.5,'1/8'],[0.25,'1/16'],[0.125,'1/32']];
export const lfoHzP={min:0.02,max:10,log:1};

export const defaultLfo=()=>({mode:'lfo',shape:0,sync:true,rateIdx:3,shRateIdx:6,hz:0.5,depth:0.8,seed:1});
export const defaultRhythm=()=>({steps:16,hits:5,rotate:0,rateIdx:2,seed:1});

/* a repeatable random value in -1..1 for step n */
export function stepRandom(n,seed){let h=Math.imul((n|0)^0x9e3779b9,0x85ebca6b)^Math.imul(seed|0,0xc2b2ae35);h^=h>>>16;h=Math.imul(h,0x7feb352d);h^=h>>>15;h=Math.imul(h,0x846ca68b);h^=h>>>16;return(h>>>0)/4294967296*2-1;}
/* Euclidean rhythm: k hits spread as evenly as possible over n steps, the first on step 0, then rotated right by r */
export function euclid(n,k,r=0){k=Math.max(0,Math.min(n,k));const p=[];for(let i=0;i<n;i++)p.push((i*k)%n<k?1:0);const s=((r%n)+n)%n;return p.map((_,i)=>p[(i-s+n)%n]);}

/* LFO: shape and depth; Sync = rate in note values on the master clock, Free = rate in Hz. S&H mode: a new random
   value on every step of the master clock (rate in note values), held until the next. Output -1..1 × depth. */
export function createLfo(L){
  let ph=0,cyc=0;
  return{
    /* beat: master clock position in beats; dt: seconds since the last call (free running) */
    value(beat,dt){
      if(L.mode==='sh'){const n=Math.floor(beat/LRATES[L.shRateIdx][0]);return{v:stepRandom(n,L.seed)*L.depth,step:n};}
      let p,c;
      if(L.sync){const x=beat/LRATES[L.rateIdx][0];c=Math.floor(x);p=x-c;}
      else{ph+=L.hz*dt;if(ph>=1){cyc+=Math.floor(ph);ph-=Math.floor(ph);}p=ph;c=cyc;}
      let v;
      switch(L.shape){case 1:v=p<0.5?4*p-1:3-4*p;break;case 2:v=2*p-1;break;case 3:v=1-2*p;break;case 4:v=p<0.5?1:-1;break;
        case 5:{const a=stepRandom(c-1,L.seed),b=stepRandom(c,L.seed),t=0.5-0.5*Math.cos(Math.PI*p);v=a+(b-a)*t;break;}
        default:v=Math.sin(2*Math.PI*p);}
      return{v:v*L.depth,step:c};
    }};
}

/* Rhythm generator: a Euclidean pattern stepping on the master clock. tick(beat) returns the current step, whether it
   is a hit, the gate (high for the first half of a hit step) and how many hits started since the last tick (so a
   trigger is never lost between screen frames). */
export function createRhythm(R){
  let last=null;
  return{
    pattern:()=>euclid(R.steps,R.hits,R.rotate),
    tick(beat){
      const pat=euclid(R.steps,R.hits,R.rotate),x=beat/RRATES[R.rateIdx][0],n=Math.floor(x),ph=x-n,step=((n%R.steps)+R.steps)%R.steps;
      let trig=0;
      if(last!==null&&n>last)for(let m=Math.max(last+1,n-R.steps+1);m<=n;m++)if(pat[((m%R.steps)+R.steps)%R.steps])trig++;
      if(last===null||n<last)trig=0;
      last=n;
      return{step,hit:!!pat[step],gate:pat[step]&&ph<0.5?1:0,trig};
    },
    reset(){last=null;}};
}
