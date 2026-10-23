// Moved from prototype/moment-prism-relay-v30.html (v30). Keep everything inside the class body.

export class FFT{
  constructor(n){
    this.n=n;this.cs=new Float64Array(n/2);this.sn=new Float64Array(n/2);
    for(let i=0;i<n/2;i++){this.cs[i]=Math.cos(2*Math.PI*i/n);this.sn[i]=Math.sin(2*Math.PI*i/n);}
    this.rev=new Uint32Array(n);const bits=Math.round(Math.log2(n));
    for(let i=0;i<n;i++){let r=0,x=i;for(let b=0;b<bits;b++){r=(r<<1)|(x&1);x>>=1;}this.rev[i]=r;}
  }
  run(re,im,inv){
    const n=this.n,rev=this.rev,cs=this.cs,sn=this.sn;
    for(let i=0;i<n;i++){const j=rev[i];if(j>i){let t=re[i];re[i]=re[j];re[j]=t;t=im[i];im[i]=im[j];im[j]=t;}}
    for(let size=2;size<=n;size<<=1){
      const half=size>>1,step=n/size;
      for(let i=0;i<n;i+=size){
        for(let j=0,k=0;j<half;j++,k+=step){
          const a=i+j,b=a+half,c=cs[k],s=inv?sn[k]:-sn[k];
          const tr=re[b]*c-im[b]*s,ti=re[b]*s+im[b]*c;
          re[b]=re[a]-tr;im[b]=im[a]-ti;re[a]+=tr;im[a]+=ti;
        }
      }
    }
    if(inv){const s=1/n;for(let i=0;i<n;i++){re[i]*=s;im[i]*=s;}}
  }
}
