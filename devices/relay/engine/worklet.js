// AudioWorklet entry for Relay. Bundled into one self-contained string (see build-worklet.js) and loaded from a Blob URL.
import { RelayEngine } from './relay-engine.js';

const Z=new Float32Array(128);
class RelayProc extends AudioWorkletProcessor{
  constructor(){super();this.n=0;this.e=new RelayEngine(sampleRate);this.port.onmessage=ev=>{const d=ev.data;if(Array.isArray(d))d.forEach(m=>this.e.msg(m));else this.e.msg(d);};}
  process(inputs,outputs){
    const o=outputs[0],i=inputs[0],n=o[0].length;let iL=Z,iR=Z;
    if(i&&i.length){iL=i[0];iR=i[1]||i[0];}
    this.e.process(iL,iR,o[0],o[1]||o[0],n);if(this.e.recovered){this.e.recovered=false;this.port.postMessage({recover:1});}if((++this.n&7)===0)this.port.postMessage(this.e.macro);return true;
  }
}
registerProcessor('relay-engine',RelayProc);
