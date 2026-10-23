// Glides for UI-side value changes (Random glide, range moves). Moved from the v30 prototype.
export const tweens=new Map();
export function tweenD(key,from,to,dur,apply){if(dur<=0||Math.abs(to-from)<1e-6){tweens.delete(key);apply(to);return;}tweens.set(key,{from,to,t0:performance.now(),dur,apply});}
export function runTweens(now){for(const[key,t]of tweens){const k=Math.min(1,(now-t.t0)/t.dur),e=k*k*(3-2*k);t.apply(t.from+(t.to-t.from)*e);if(k>=1)tweens.delete(key);}}
