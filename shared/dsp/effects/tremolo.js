// Moved from prototype/moment-prism-relay-v30.html (v30). Keep everything inside the class body.

/* Tremolo: tempo-synced amplitude modulation, mono or ping-pong; the slider deepens it. */
export class FxTremolo{
  constructor(e){this.e=e;this.sr=e.sr;this.rate=2;this.shape=0;this.stereo=0;this.depth=0.9;this.edge=0.3;this.g=[1,1];this.oL=0;this.oR=0;}
  set(k,v){this[k]=v;}
  wave(ph){ph-=Math.floor(ph);switch(this.shape){case 1:return ph<0.5?2*ph:2-2*ph;case 2:{const k=4+this.edge*40;return 1/(1+Math.exp(-k*(Math.sin(2*Math.PI*ph))));}case 3:return 1-ph;default:return 0.5+0.5*Math.sin(2*Math.PI*ph);}}
  tick(l,r,t){
    const beats=[2,1,0.5,0.25,0.125][this.rate]||0.5,ph=this.e.clock/(beats*60/this.e.bpm*this.sr),d=this.depth*t;
    const wl=this.wave(ph),wr=this.stereo?this.wave(ph+0.5):wl;
    const k=this.gk||(this.gk=1-Math.exp(-1/(0.002*this.sr)));this.g[0]+=((1-d*(1-wl))-this.g[0])*k;this.g[1]+=((1-d*(1-wr))-this.g[1])*k;
    this.oL=l*this.g[0];this.oR=r*this.g[1];
  }
}
