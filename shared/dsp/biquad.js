// Moved from prototype/moment-prism-relay-v30.html (v30). Keep everything inside the class body.

export class Biquad{
  constructor(){this.b0=1;this.b1=0;this.b2=0;this.a1=0;this.a2=0;this.z1=0;this.z2=0;}
  set(type,f,q,sr){
    const w0=2*Math.PI*f/sr,cs=Math.cos(w0),al=Math.sin(w0)/(2*q),a0=1+al;
    if(type===0){this.b0=(1-cs)/2/a0;this.b1=(1-cs)/a0;this.b2=this.b0;}
    else{this.b0=(1+cs)/2/a0;this.b1=-(1+cs)/a0;this.b2=this.b0;}
    this.a1=-2*cs/a0;this.a2=(1-al)/a0;
  }
  tick(x){const y=this.b0*x+this.z1;this.z1=this.b1*x-this.a1*y+this.z2;this.z2=this.b2*x-this.a2*y;return y;}
}
