// Parameter mapping and display formatting shared by the device UIs. Moved from the v30 prototype.
export const clamp01=x=>Math.max(0,Math.min(1,x));
export const pct=v=>Math.round(v*100)+'%',ms=v=>(v<10?v.toFixed(1):Math.round(v))+' ms',hz=v=>(Math.abs(v)<10?v.toFixed(2):Math.round(v))+' Hz',
  sec=v=>v.toFixed(1)+' s',st=v=>(v>0?'+':'')+Math.round(v)+' st',ct=v=>Math.round(v)+' ct',db=v=>(v>0?'+':'')+v.toFixed(1)+' dB',
  times=v=>v.toFixed(2)+'×',perS=v=>(v<10?v.toFixed(1):Math.round(v))+'/s',shz=v=>(v>0?'+':'')+hz(v);

/* knob position (0..1) <-> value: linear, logarithmic (log), power curve (pw) or bipolar cube (bip) */
export const toPos=(p,v)=>{
  if(p.bip){const u=Math.sign(v)*Math.cbrt(Math.abs(v)/p.max);return(u+1)/2;}
  if(p.pw)return Math.pow(Math.max(0,(v-p.min)/(p.max-p.min)),1/p.pw);
  return p.log?Math.log(v/p.min)/Math.log(p.max/p.min):(v-p.min)/(p.max-p.min);
};
export const fromPos=(p,x)=>{
  let v;
  if(p.bip){const u=2*x-1;v=p.max*Math.sign(u)*Math.pow(Math.abs(u),3);}
  else if(p.pw)v=p.min+(p.max-p.min)*Math.pow(x,p.pw);
  else v=p.log?p.min*Math.pow(p.max/p.min,x):p.min+x*(p.max-p.min);
  if(p.step)v=Math.round(v/p.step)*p.step;return v;
};
