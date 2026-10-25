// AudioWorklet entry for Moment. Bundled into one self-contained string (tools/worklet-build.js) and loaded from a Blob URL.
import { MomentEngine } from './moment-engine.js';

const Z=new Float32Array(128);
class MomentProc extends AudioWorkletProcessor{
  constructor(){super();this.e=new MomentEngine(sampleRate);this.port.onmessage=ev=>{const d=ev.data;if(Array.isArray(d))d.forEach(m=>this.e.msg(m));else this.e.msg(d);};}
  process(inputs,outputs){
    const o=outputs[0],i=inputs[0],n=o[0].length;let iL=Z,iR=Z;
    if(i&&i.length){iL=i[0];iR=i[1]||i[0];}
    this.e.process(iL,iR,o[0],o[1]||o[0],n);if(this.e.recovered){this.e.recovered=false;this.port.postMessage({recover:1});}return true;
  }
}
registerProcessor('moment-engine',MomentProc);
