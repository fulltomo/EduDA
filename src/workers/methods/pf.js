import { randomNormal, periodicDist, gaspariCohn } from '../math';

export function updatePF(state, y, nobs, N, R_diag, applyH, obsIndices) {
  const M = state.ensembleSize;
  const ens = state.ensemble;
  const weights = state.weights;
  const p = state.params || {};
  const resampleThresh = p.resampleThreshold ?? 0.5;
  const isLPF = p.filterType !== 'SIR'; // Default to LPF (Guided)
  const localization = p.localization ?? 5.0;

  if (nobs === 0) return;

  if (isLPF) {
    // EnKF-Guided Local Particle Filter (LPF / Hybrid PF)
    const invM = 1.0 / M;
    const invM1 = 1.0 / (M - 1);

    const x_mean = new Float64Array(N);
    for (let m = 0; m < M; m++) {
      for (let i = 0; i < N; i++) x_mean[i] += ens[m][i];
    }
    for (let i = 0; i < N; i++) x_mean[i] *= invM;

    const h_dev = new Float64Array(M);
    const K = new Float64Array(N);
    const x_mean_old = new Float64Array(N);

    for (let ob = 0; ob < nobs; ob++) {
      const obsIdx = obsIndices ? obsIndices[ob] : ob;
      const y_val = y[ob];

      let h_mean = 0;
      for (let m = 0; m < M; m++) h_mean += ens[m][obsIdx];
      h_mean *= invM;

      for (let m = 0; m < M; m++) h_dev[m] = ens[m][obsIdx] - h_mean;

      let hph = 0;
      for (let m = 0; m < M; m++) hph += h_dev[m] * h_dev[m];
      hph *= invM1;

      const denom = hph + R_diag;
      const alpha = 1.0 / (1.0 + Math.sqrt(R_diag / denom));

      for (let i = 0; i < N; i++) {
        let cov = 0;
        for (let m = 0; m < M; m++) {
          cov += (ens[m][i] - x_mean[i]) * h_dev[m];
        }
        cov *= invM1;
        const gloc = gaspariCohn(periodicDist(i, obsIdx, N), localization);
        K[i] = cov * gloc / denom;
      }

      const innov = y_val - h_mean;
      for (let i = 0; i < N; i++) x_mean_old[i] = x_mean[i];
      for (let i = 0; i < N; i++) x_mean[i] += K[i] * innov;

      for (let m = 0; m < M; m++) {
        for (let i = 0; i < N; i++) {
          const dev_mi = ens[m][i] - x_mean_old[i];
          const jitter = randomNormal() * 0.01;
          ens[m][i] = x_mean[i] + dev_mi - K[i] * alpha * h_dev[m] + jitter;
        }
      }
    }
    state.weights = Array(M).fill(1.0 / M);
  } else {
    // Standard SIR (Sequential Importance Resampling Bootstrap)
    let maxLogLik = -Infinity;
    const logLik = new Float64Array(M);
    for (let i = 0; i < M; i++) {
      const Hx = applyH(ens[i]);
      let nll = 0;
      for (let j = 0; j < nobs; j++) {
        const diff = y[j] - Hx[j];
        nll += (diff * diff) / R_diag;
      }
      logLik[i] = -0.5 * nll;
      if (logLik[i] > maxLogLik) maxLogLik = logLik[i];
    }

    let sumW = 0;
    for (let i = 0; i < M; i++) {
      weights[i] = Math.exp(logLik[i] - maxLogLik);
      sumW += weights[i];
    }

    if (sumW > 0) {
      const invSum = 1.0 / sumW;
      for (let i = 0; i < M; i++) weights[i] *= invSum;
    } else {
      weights.fill(1.0 / M);
    }

    let ess = 0;
    for (let i = 0; i < M; i++) ess += weights[i] * weights[i];
    ess = 1.0 / ess;

    if (ess < resampleThresh * M) {
      const newEns = [];
      const c = new Float64Array(M);
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
}
