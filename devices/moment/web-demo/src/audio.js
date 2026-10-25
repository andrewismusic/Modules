// Audio graph for the Moment demo: the engine runs as an AudioWorklet built from the bundled worklet source, with a
// ScriptProcessor fallback that runs the same engine class on the main thread. Test sources loop into its input.
import workletSrc from 'worklet:../../engine/worklet.js';
import { MomentEngine } from '../../engine/moment-engine.js';
import { makeIDM, makeBells, makeAcid, makePad } from '../../../../shared/ui-web/test-sources.js';
import { state } from './state.js';

export let ctx=null,engineMain=null,send=()=>{};
let node=null,master=null,inGain=null,srcNode=null,bufs={},startP=null,engineName='',syncT=0,onSync=()=>{},onRecover=()=>{},onRestart=()=>{};
const $=s=>document.querySelector(s);
export function setStatus(h){$('#status').innerHTML=h;}
/* hooks: sync() re-sends every setting (after start and after a recovery); restarted() when the clock restarts */
export function audioHooks(h){onSync=h.sync;onRecover=h.sync;onRestart=h.restarted;}

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
      node=new AudioWorkletNode(ctx,'moment-engine',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2],channelCount:2,channelCountMode:'explicit',channelInterpretation:'speakers'});
      send=m=>node.port.postMessage(m);node.port.onmessage=e=>{if(e.data&&e.data.recover)onRecover();};engineName='AudioWorklet';
    }catch(err){
      engineMain=new MomentEngine(ctx.sampleRate);node=ctx.createScriptProcessor(1024,2,2);
      node.onaudioprocess=ev=>{const ib=ev.inputBuffer,ob=ev.outputBuffer;engineMain.process(ib.getChannelData(0),ib.getChannelData(ib.numberOfChannels>1?1:0),ob.getChannelData(0),ob.getChannelData(1),ob.length);
        if(engineMain.recovered){engineMain.recovered=false;setTimeout(onRecover,0);}};
      send=m=>engineMain.msg(m);engineName='ScriptProcessor fallback';
    }
    inGain=ctx.createGain();master=ctx.createGain();master.gain.value=state.vol;
    inGain.connect(node);node.connect(master);master.connect(ctx.destination);
    bufs={};onSync();updateLatency();
    if(ctx.state!=='running')await ctx.resume();
  })();
  return startP;
}
const GENS={idm:makeIDM,bells:makeBells,acid:makeAcid,pad:makePad};
function getLoop(k){if(!bufs[k]&&GENS[k]){const[L,R]=GENS[k](ctx.sampleRate,state.clock.bpm);const b=ctx.createBuffer(2,L.length,ctx.sampleRate);b.copyToChannel(L,0);b.copyToChannel(R,1);bufs[k]=b;}return bufs[k];}
export function stopSource(){if(srcNode){try{srcNode.stop?.();}catch(e){}srcNode.disconnect();srcNode=null;}}
/* the engine's clock restarts with the source, so loops and bench modulation line up with the music */
export async function startSource(){
  stopSource();
  const b=getLoop(state.src);if(!b)return;
  srcNode=ctx.createBufferSource();srcNode.buffer=b;srcNode.loop=true;srcNode.connect(inGain);send({type:'sync'});syncT=ctx.currentTime;onRestart();srcNode.start();
}
/* regenerate the loops at the new tempo and restart the playing one */
export function tempoSettled(){if(ctx){bufs={};if(state.playing&&GENS[state.src])startSource();}}
export function setVolume(x){if(master)master.gain.setTargetAtTime(x,ctx.currentTime,0.02);}
/* master clock position in beats: from the audio clock while playing (the grid the engine uses), otherwise free running */
let freeBeat=0,freeT=0;
export function beatPos(){const bpm=state.clock.bpm;
  if(ctx&&state.playing&&srcNode)return(ctx.currentTime-syncT)*bpm/60;
  const t=performance.now()/1000;if(freeT)freeBeat+=(t-freeT)*bpm/60;freeT=t;return freeBeat;}
export function updateLatency(){
  if(!ctx)return;const sr=ctx.sampleRate;
  const out=((ctx.baseLatency||0)+(ctx.outputLatency||0))*1000+(engineMain?2048/sr*1000:0);
  setStatus(`<b>${engineName}</b>, ${(sr/1000).toFixed(1)} kHz<br>Moment 0 ms · browser ${Math.round(out)} ms`);
}
