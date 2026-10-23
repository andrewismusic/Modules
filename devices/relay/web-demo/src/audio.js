// Audio graph for the Relay demo: the engine runs as an AudioWorklet built from the bundled worklet source, with a
// ScriptProcessor fallback that runs the same engine class on the main thread. Test sources loop into its input.
import workletSrc from 'worklet:../../engine/worklet.js';
import { RelayEngine } from '../../engine/relay-engine.js';
import { makeIDM, makeBells, makeAcid, makePad } from '../../../../shared/ui-web/test-sources.js';
import { state, MU } from './state.js';
import { syncAll, srcBpm } from './relay-ui.js';
import { updatePlay } from './bench.js';

export let ctx=null,node=null,engineMain=null,master=null,analyser=null,analyserPre=null,syncT=0,send=()=>{};
let inGain=null,srcNode=null,bufs={},startP=null,engineName='';
const $=s=>document.querySelector(s);
export function setStatus(h){$('#status').innerHTML=h;}

export async function ensureAudio(){
  if(ctx){if(ctx.state!=='running')await ctx.resume();return;}
  if(startP)return startP;
  startP=(async()=>{
    ctx=new (window.AudioContext||window.webkitAudioContext)({latencyHint:'interactive'});
    try{
      if(!ctx.audioWorklet)throw new Error('no worklet');
      /* a Blob URL is the usual route; pages opened straight from disk (file://) refuse it, so try a data: URL next */
      try{await ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([workletSrc],{type:'application/javascript'})));}
      catch(e){await ctx.audioWorklet.addModule('data:text/javascript;base64,'+btoa(unescape(encodeURIComponent(workletSrc))));}
      node=new AudioWorkletNode(ctx,'relay-engine',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2],channelCount:2,channelCountMode:'explicit',channelInterpretation:'speakers'});
      send=m=>node.port.postMessage(m);node.port.onmessage=e=>{if(typeof e.data==='number')state.mu.macroEff=e.data;else if(e.data&&e.data.recover)syncAll();};engineName='AudioWorklet';
    }catch(err){
      engineMain=new RelayEngine(ctx.sampleRate);node=ctx.createScriptProcessor(1024,2,2);
      node.onaudioprocess=ev=>{const ib=ev.inputBuffer,ob=ev.outputBuffer;engineMain.process(ib.getChannelData(0),ib.getChannelData(ib.numberOfChannels>1?1:0),ob.getChannelData(0),ob.getChannelData(1),ob.length);};
      send=m=>engineMain.msg(m);engineName='ScriptProcessor fallback';
    }
    inGain=ctx.createGain();master=ctx.createGain();master.gain.value=state.vol;
    analyser=ctx.createAnalyser();analyser.fftSize=1024;analyser.smoothingTimeConstant=0.6;
    analyserPre=ctx.createAnalyser();analyserPre.fftSize=1024;inGain.connect(analyserPre);
    inGain.connect(node);node.connect(master);master.connect(analyser);analyser.connect(ctx.destination);
    makeLoops();syncAll();updateLatency();
    if(ctx.state!=='running')await ctx.resume();
  })();
  return startP;
}
const GENS={idm:makeIDM,bells:makeBells,acid:makeAcid,pad:makePad};
export function makeLoops(){bufs={};}
function getLoop(k){if(!bufs[k]&&GENS[k]){const[L,R]=GENS[k](ctx.sampleRate,srcBpm());const b=ctx.createBuffer(2,L.length,ctx.sampleRate);b.copyToChannel(L,0);b.copyToChannel(R,1);bufs[k]=b;}return bufs[k];}
export function stopSource(){if(srcNode){try{srcNode.stop?.();}catch(e){}srcNode.disconnect();srcNode=null;}}
export async function startSource(){
  stopSource();
  const b=getLoop(state.src);if(!b){state.playing=false;updatePlay();return;}
  srcNode=ctx.createBufferSource();srcNode.buffer=b;srcNode.loop=true;srcNode.connect(inGain);send({type:'sync'});syncT=ctx.currentTime;srcNode.start();
}
/* regenerate the loops at the new tempo and restart the playing one */
export function tempoSettled(){if(ctx){makeLoops();if(state.playing&&GENS[state.src])startSource();}}
export function setVolume(x){if(master)master.gain.setTargetAtTime(x,ctx.currentTime,0.02);}
export function updateLatency(){
  if(!ctx)return;const sr=ctx.sampleRate;
  const out=((ctx.baseLatency||0)+(ctx.outputLatency||0))*1000+(engineMain?2048/sr*1000:0);
  const ry=MU().slots.filter(s=>s.on&&(s.fx==='smear'||s.fx==='thin')).length*2048/sr*1000+2;
  setStatus(`<b>${engineName}</b>, ${(sr/1000).toFixed(1)} kHz<br>Relay ${Math.round(ry)} ms · browser ${Math.round(out)} ms`);
}
