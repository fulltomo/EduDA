import { vecSub, periodicDist, gaspariCohn } from '../math';

export function updateEnSRF(state, y, nobs, N, obsIndices, R_diag, localization) {
  const M = state.ensembleSize;
  const ens = state.ensemble;
  const x_mean = state.x_mean;

  for (let ob = 0; ob < nobs; ob++) {
    const obsIdx = obsIndices[ob];
    const y_val = y[ob];
    const r_val = R_diag;

    let h_mean = 0;
    for (let i = 0; i < M; i++) h_mean += ens[i][obsIdx];
    h_mean /= M;

    const h_dev = new Array(M);
    for (let i = 0; i < M; i++) h_dev[i] = ens[i][obsIdx] - h_mean;

    let hph = 0;
    for (let i = 0; i < M; i++) hph += h_dev[i] * h_dev[i];
    hph /= (M - 1);

    const ph = new Array(N).fill(0);
    for (let i = 0; i < N; i++) {
      let cov = 0;
      for (let j = 0; j < M; j++) {
        cov += (ens[j][i] - x_mean[i]) * h_dev[j];
      }
      cov /= (M - 1);
      ph[i] = cov * gaspariCohn(periodicDist(i, obsIdx, N), localization);
    }

    const K = ph.map(v => v / (hph + r_val));
    const alpha = 1.0 / (1.0 + Math.sqrt(r_val / (hph + r_val)));
    const K_tilde = K.map(v => v * alpha);

    const innov = y_val - h_mean;

    const x_mean_old = x_mean.slice();
    for (let i = 0; i < N; i++) x_mean[i] += K[i] * innov;

    for (let j = 0; j < M; j++) {
      const dev_j = vecSub(ens[j], x_mean_old);
      for (let i = 0; i < N; i++) {
        const dev_updated = dev_j[i] - K_tilde[i] * h_dev[j];
        ens[j][i] = x_mean[i] + dev_updated;
      }
    }
  }
}
