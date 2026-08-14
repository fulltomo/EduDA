import { vecSub, randomNormal } from '../math';

export function updatePF(state, y, nobs, N, R_diag, applyH) {
  const M = state.ensembleSize;
  const ens = state.ensemble;
  const weights = state.weights;
  const p = state.params;
  const resampleThresh = p.resampleThreshold ?? 0.5;

  let maxLogLik = -Infinity;
  const logLik = new Array(M);
  for (let i = 0; i < M; i++) {
    const Hx = applyH(ens[i]);
    const diff = vecSub(y, Hx);
    let nll = 0;
    for (let j = 0; j < nobs; j++) nll += (diff[j] * diff[j]) / R_diag;
    // Temperature scaling to avoid weight collapse in high dimensions
    logLik[i] = -0.5 * (nll / Math.max(1, nobs / 10));
    if (logLik[i] > maxLogLik) maxLogLik = logLik[i];
  }

  let sumW = 0;
  for (let i = 0; i < M; i++) {
    weights[i] = Math.exp(logLik[i] - maxLogLik);
    sumW += weights[i];
  }

  if (sumW > 0) {
    for (let i = 0; i < M; i++) weights[i] /= sumW;
  } else {
    for (let i = 0; i < M; i++) weights[i] = 1.0 / M;
  }

  let ess = 0;
  for (let i = 0; i < M; i++) ess += weights[i] * weights[i];
  ess = 1.0 / ess;

  if (ess < resampleThresh * M) {
    const newEns = [];
    const c = new Array(M);
    c[0] = weights[0];
    for (let i = 1; i < M; i++) c[i] = c[i - 1] + weights[i];

    const u = Math.random() / M;
    let idx = 0;
    for (let i = 0; i < M; i++) {
      const u_i = u + i / M;
      while (u_i > c[idx] && idx < M - 1) idx++;
      const particle = ens[idx].slice();
      for (let j = 0; j < N; j++) particle[j] += randomNormal() * 0.05;
      newEns.push(particle);
    }
    state.ensemble = newEns;
    state.weights = Array(M).fill(1.0 / M);
  }
}
