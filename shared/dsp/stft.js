// Moved from prototype/moment-prism-relay-v30.html (v30). Keep everything inside the class body.
import { FFT } from './fft.js';

/* Short-time Fourier framework shared by the spectral effects (2048 / 512 hop, sqrt-Hann, latency 2048). */
export class Stft{
  constructor(sr,N){
    N=N||2048;this.N=N;this.H=N/4;this.fft=new FFT(N);
    this.win=new Float32Array(N);for(let i=0;i<N;i++)this.win[i]=Math.sqrt(0.5-0.5*Math.cos(2*Math.PI*i/N));
    this.ring=[new Float32Array(N),new Float32Array(N)];this.ip=0;
    this.acc=[new Float32Array(N),new Float32Array(N)];this.hp=0;
    this.RE=[new Float64Array(N),new Float64Array(N)];this.IM=[new Float64Array(N),new Float64Array(N)];this.oL=0;this.oR=0;
  }
  tick(l,r,fx,t){
    const N=this.N,H=this.H,M=N-1;
    this.ring[0][this.ip]=l;this.ring[1][this.ip]=r;this.ip=(this.ip+1)&M;
    this.oL=this.acc[0][this.hp];this.oR=this.acc[1][this.hp];
    if(++this.hp>=H){
      this.hp=0;const win=this.win;
      for(let c=0;c<2;c++){const re=this.RE[c],im=this.IM[c],rg=this.ring[c];for(let i=0;i<N;i++){re[i]=rg[(this.ip+i)&M]*win[i];im[i]=0;}this.fft.run(re,im,false);fx.proc(c,re,im,t);}
      if(fx.post)fx.post(this.RE[0],this.IM[0],this.RE[1],this.IM[1]);
      for(let c=0;c<2;c++){
        const re=this.RE[c],im=this.IM[c],a=this.acc[c];a.copyWithin(0,H);a.fill(0,N-H);
        for(let k=1;k<N/2;k++){re[N-k]=re[k];im[N-k]=-im[k];}im[0]=0;im[N/2]=0;
        this.fft.run(re,im,true);for(let i=0;i<N;i++)a[i]+=re[i]*win[i]*0.5;
      }
    }
  }
}
