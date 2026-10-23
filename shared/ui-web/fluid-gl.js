// Moved from prototype/moment-prism-relay-v30.html (v30).
/* ---------- realistic display: a small fluid simulation on the graphics chip (WebGL2).
   Each effect is a dye of its own color in one shared liquid; its family decides how the dye is fed in and moves.
   Dyes never blend: each pixel shows the strongest dye, lit from its own surface slope. Falls back to the 2D renderer. ---------- */
export function createFluidGL(){
  const cv=document.createElement('canvas');cv.width=280;cv.height=280;
  const gl=cv.getContext('webgl2',{alpha:true,premultipliedAlpha:false,antialias:false});
  if(!gl||!gl.getExtension('EXT_color_buffer_float'))return null;
  gl.getExtension('OES_texture_float_linear');
  const S=112,VS=`#version 300 es
in vec2 p;out vec2 uv;void main(){uv=p*.5+.5;gl_Position=vec4(p,0,1);}`;
  const H=`#version 300 es
precision highp float;in vec2 uv;out vec4 o;uniform vec2 tx;`;
  const FS={
    adv:H+`uniform sampler2D V,Q;uniform float dt,cap;uniform vec4 diss;void main(){vec2 v=texture(V,uv).xy;vec4 q=min(texture(Q,uv-dt*v)*diss,vec4(cap));o=length(uv-.5)<.5?q:vec4(0);}`,
    splat:H+`uniform sampler2D Q;uniform vec2 pt;uniform vec4 val;uniform float r;void main(){vec2 d=uv-pt;o=texture(Q,uv)+val*exp(-dot(d,d)/r);}`,
    force:H+`uniform sampler2D V,D;uniform vec4 buoy;uniform vec2 gdir;uniform float dt,swirl,rep;void main(){vec2 v=texture(V,uv).xy;vec4 d=texture(D,uv);vec2 c=uv-.5;
      vec4 dx=texture(D,uv+vec2(tx.x,0))-texture(D,uv-vec2(tx.x,0)),dy=texture(D,uv+vec2(0,tx.y))-texture(D,uv-vec2(0,tx.y));
      float gx=dx.x+dx.y+dx.z+dx.w,gy=dy.x+dy.y+dy.z+dy.w;vec2 f=-vec2(dot(d,vec4(gx))-dot(d,dx),dot(d,vec4(gy))-dot(d,dy))*rep;
      v+=dt*dot(d,buoy)*gdir;v+=dt*(swirl*vec2(-c.y,c.x)+f);v*=length(c)<.49?1.:0.;o=vec4(v,0,1);}`,
    div:H+`uniform sampler2D V;void main(){float l=texture(V,uv-vec2(tx.x,0)).x,r=texture(V,uv+vec2(tx.x,0)).x,b=texture(V,uv-vec2(0,tx.y)).y,t=texture(V,uv+vec2(0,tx.y)).y;o=vec4(.5*(r-l+t-b),0,0,1);}`,
    pres:H+`uniform sampler2D P,Dv;void main(){float l=texture(P,uv-vec2(tx.x,0)).x,r=texture(P,uv+vec2(tx.x,0)).x,b=texture(P,uv-vec2(0,tx.y)).x,t=texture(P,uv+vec2(0,tx.y)).x;o=vec4((l+r+b+t-texture(Dv,uv).x)*.25,0,0,1);}`,
    grad:H+`uniform sampler2D P,V;void main(){float l=texture(P,uv-vec2(tx.x,0)).x,r=texture(P,uv+vec2(tx.x,0)).x,b=texture(P,uv-vec2(0,tx.y)).x,t=texture(P,uv+vec2(0,tx.y)).x;vec2 v=texture(V,uv).xy-.5*vec2(r-l,t-b);o=vec4(v,0,1);}`,
    mask:H+`uniform sampler2D Q;uniform vec4 keep;void main(){o=texture(Q,uv)*keep;}`,
    show:H+`uniform sampler2D D;uniform vec3 c0,c1,c2,c3;uniform float dim,spec;
      float hgt(vec2 p){vec4 d=texture(D,p);return max(max(d.x,d.y),max(d.z,d.w));}
      void main(){vec4 d=texture(D,uv);float m=max(max(d.x,d.y),max(d.z,d.w));vec2 c=uv-.5;if(length(c)>.5){o=vec4(0);return;}
        float a1=max(d.x,d.y),b1=min(d.x,d.y),a2=max(d.z,d.w),b2=min(d.z,d.w),m2=max(min(a1,a2),max(b1,b2));
        vec4 w=pow(d/(m+1e-5),vec4(30.));vec3 col=(c0*w.x+c1*w.y+c2*w.z+c3*w.w)/(w.x+w.y+w.z+w.w+1e-5);
        float e=1.5/280.;vec3 n=normalize(vec3(-(hgt(uv+vec2(e,0))-hgt(uv-vec2(e,0)))*6.,-(hgt(uv+vec2(0,e))-hgt(uv-vec2(0,e)))*6.,1.));
        vec3 L=normalize(vec3(-.45,.55,.7));float df=max(dot(n,L),0.),sp=pow(max(dot(reflect(-L,n),vec3(0,0,1)),0.),28.);
        float rim=smoothstep(.5,.455,length(c)),body=smoothstep(.04,.22,m)*rim;vec3 sh=col*(.42+.7*df)+vec3(1.)*sp*(.35+spec)*body;sh=mix(sh,col*.55,smoothstep(.85,1.4,m)*.25);
        sh*=mix(1.,mix(.35,1.,smoothstep(0.,.1,m-m2)),step(.07,m2));
        vec3 bg=mix(vec3(.035,.04,.08),vec3(.01,.012,.03),length(c)*2.);o=vec4(mix(bg,sh,body)*dim,1);}`};
  const sh=(t,src)=>{const s=gl.createShader(t);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;};
  const P={};
  try{for(const k in FS){const pr=gl.createProgram();gl.attachShader(pr,sh(gl.VERTEX_SHADER,VS));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,FS[k]));gl.bindAttribLocation(pr,0,'p');gl.linkProgram(pr);
    if(!gl.getProgramParameter(pr,gl.LINK_STATUS))throw new Error('link');P[k]={pr,u:{}};}}catch(e){return null;}
  const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
  const tex=()=>{const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA16F,S,S,0,gl.RGBA,gl.HALF_FLOAT,null);
    for(const[a,b]of[[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,a,b);
    const f=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,f);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t,0);return{t,f};};
  const dbl=()=>{let a=tex(),b=tex();return{get r(){return a;},get w(){return b;},swap(){[a,b]=[b,b===a?a:a];const t=a;a=b;b=t;}};};
  const mk=()=>{let a=tex(),b=tex();return{r:()=>a,w:()=>b,swap(){const t=a;a=b;b=t;}};};
  const V=mk(),D=mk(),Pr=mk(),Dv=tex();
  if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)return null;
  const U=(p,n)=>p.u[n]??(p.u[n]=gl.getUniformLocation(p.pr,n));
  function run(name,target,set){const p=P[name];gl.useProgram(p.pr);let unit=0;
    const tx=(n,t)=>{gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,t);gl.uniform1i(U(p,n),unit++);};
    gl.uniform2f(U(p,'tx'),1/S,1/S);set(p,tx);
    if(target){gl.bindFramebuffer(gl.FRAMEBUFFER,target.f);gl.viewport(0,0,S,S);}else{gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,cv.width,cv.height);}
    gl.drawArrays(gl.TRIANGLES,0,3);}
  function splat(T,x,y,val,r){run('splat',T.w(),(p,tx)=>{tx('Q',T.r().t);gl.uniform2f(U(p,'pt'),x,y);gl.uniform4fv(U(p,'val'),val);gl.uniform1f(U(p,'r'),r);});T.swap();}
  function clearChan(i){const k=[1,1,1,1];k[i]=0;run('mask',D.w(),(p,tx)=>{tx('Q',D.r().t);gl.uniform4fv(U(p,'keep'),k);});D.swap();}
  return{canvas:cv,splat,clearChan,step(dt,buoy,diss,swirl,rep,gx,gy){
      run('force',V.w(),(p,tx)=>{tx('V',V.r().t);tx('D',D.r().t);gl.uniform4fv(U(p,'buoy'),buoy);gl.uniform1f(U(p,'dt'),dt);gl.uniform1f(U(p,'swirl'),swirl);gl.uniform1f(U(p,'rep'),rep);gl.uniform2f(U(p,'gdir'),gx,gy);});V.swap();
      run('adv',V.w(),(p,tx)=>{tx('V',V.r().t);tx('Q',V.r().t);gl.uniform1f(U(p,'dt'),dt);gl.uniform1f(U(p,'cap'),50.);gl.uniform4f(U(p,'diss'),.995,.995,1,1);});V.swap();
      run('adv',D.w(),(p,tx)=>{tx('V',V.r().t);tx('Q',D.r().t);gl.uniform1f(U(p,'dt'),dt);gl.uniform1f(U(p,'cap'),1.15);gl.uniform4fv(U(p,'diss'),diss);});D.swap();
      run('div',Dv,(p,tx)=>{tx('V',V.r().t);});
      for(let i=0;i<18;i++){run('pres',Pr.w(),(p,tx)=>{tx('P',Pr.r().t);tx('Dv',Dv.t);});Pr.swap();}
      run('grad',V.w(),(p,tx)=>{tx('P',Pr.r().t);tx('V',V.r().t);});V.swap();},
    show(cols,dim,spec){run('show',null,(p,tx)=>{tx('D',D.r().t);['c0','c1','c2','c3'].forEach((n,i)=>gl.uniform3fv(U(p,n),cols[i]));gl.uniform1f(U(p,'dim'),dim);gl.uniform1f(U(p,'spec'),spec);});},V,D};
}
