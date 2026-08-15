import { periodicDist, gaspariCohn } from '../math';

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

    const h_dev = new Float64Array(M);
    for (let i = 0; i < M; i++) h_dev[i] = ens[i][obsIdx] - h_mean;

    let hph = 0;
    for (let i = 0; i < M; i++) hph += h_dev[i] * h_dev[i];
    hph /= (M - 1);

    const K = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      let cov = 0;
      for (let j = 0; j < M; j++) {
        cov += (ens[j][i] - x_mean[i]) * h_dev[j];
      }
      cov /= (M - 1);
      K[i] = cov * gaspariCohn(periodicDist(i, obsIdx, N), localization) / (hph + r_val);
    }

    const alpha = 1.0 / (1.0 + Math.sqrt(r_val / (hph + r_val)));

    const innov = y_val - h_mean;

    // Update ensemble: avoid allocating dev_j array
    // x_mean_old is needed - save current x_mean
    const x_mean_old = new Float64Array(N);
    for (let i = 0; i < N; i++) x_mean_old[i] = x_mean[i];
    for (let i = 0; i < N; i++) x_mean[i] += K[i] * innov;

    for (let j = 0; j < M; j++) {
      for (let i = 0; i < N; i++) {
        const dev_ji = ens[j][i] - x_mean_old[i];
        ens[j][i] = x_mean[i] + dev_ji - K[i] * alpha * h_dev[j];
      }
    }
  }
}
