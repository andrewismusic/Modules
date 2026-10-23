// Click metric: a click is an isolated jump in the waveform's slope. For each sample, the second difference is
// compared with the largest second difference in the 10 ms on either side of it (leaving out the nearest 1 ms).
// Gradual changes of timbre or level keep this ratio near 1; a discontinuity stands out far above its neighbours.
export function spikeRatio(x, from = 0, sr = 48000) {
  const n = x.length, d = new Float64Array(n);
  for (let i = from + 2; i < n; i++) d[i] = Math.abs(x[i] - 2 * x[i - 1] + x[i - 2]);
  const W = Math.round(0.01 * sr), G = Math.round(0.001 * sr), floor = 1e-6;
  // running maximum over [i - W, i - G] (left) and [i + G, i + W] (right), using a monotonic queue of indices
  const winMax = (lo, hi) => { const out = new Float64Array(n), q = []; let qh = 0;
    // window for i is [i+lo, i+hi]; slide j over all indices once
    let j = 0;
    for (let i = 0; i < n; i++) {
      const a = i + lo, b = Math.min(n - 1, i + hi);
      for (; j <= b; j++) { while (q.length > qh && d[q[q.length - 1]] <= d[j]) q.pop(); q.push(j); }
      while (q.length > qh && q[qh] < a) qh++;
      out[i] = q.length > qh && b >= Math.max(0, a) ? d[q[qh]] : 0;
    }
    return out; };
  const L = winMax(-W, -G), R = winMax(G, W);
  let worst = 0, at = -1;
  for (let i = from + W + 2; i < n - W; i++) { const r = d[i] / (Math.max(L[i], R[i]) + floor); if (r > worst) { worst = r; at = i; } }
  return { ratio: worst, at };
}
