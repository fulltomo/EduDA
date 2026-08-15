import { matInverse, periodicDist, gaspariCohn, randomNormal } from '../math';

export function updateEnKF(state, y, H, nobs, N, obsIndices, R_diag, R, localization, applyH) {
  const M = state.ensembleSize;
  const ens = state.ensemble;
  const x_mean = state.x_mean;

  // Build perturbation matrix X (N x M): X[:,j] = ens[j] - x_mean
  // Then HX (nobs x M) = rows of X at obsIndices
  const X_at_obs = new Array(nobs); // nobs x M (HX)
  const X_full = new Array(N);      // N x M
  for (let i = 0; i < N; i++) {
    const row = new Float64Array(M);
    for (let j = 0; j < M; j++) row[j] = ens[j][i] - x_mean[i];
    X_full[i] = row;
  }
  for (let i = 0; i < nobs; i++) {
    X_at_obs[i] = X_full[obsIndices[i]];
  }

  // P_e = X * (HX)^T / (M-1) -> N x nobs
  // P_loc[i][j] = P_e[i][j] * GC(dist(i, obsIndices[j]))
  const invM1 = 1 / (M - 1);
  const P_loc = new Array(N);
  for (let i = 0; i < N; i++) {
    const row = new Float64Array(nobs);
    const Xi = X_full[i];
    for (let j = 0; j < nobs; j++) {
      let sum = 0;
      const Xj = X_at_obs[j];
      for (let k = 0; k < M; k++) sum += Xi[k] * Xj[k];
      row[j] = sum * invM1 * gaspariCohn(periodicDist(i, obsIndices[j], N), localization);
    }
    P_loc[i] = row;
  }

  // HPH = HX * (HX)^T / (M-1), then localize
  const S = new Array(nobs);
  for (let i = 0; i < nobs; i++) {
    S[i] = new Float64Array(nobs);
    const Xi = X_at_obs[i];
    for (let j = 0; j < nobs; j++) {
      let sum = 0;
      const Xj = X_at_obs[j];
      for (let k = 0; k < M; k++) sum += Xi[k] * Xj[k];
      S[i][j] = sum * invM1 * gaspariCohn(periodicDist(obsIndices[i], obsIndices[j], N), localization);
    }
    S[i][i] += R_diag + 1e-6; // Add R diagonal + regularization
  }

  const S_inv = matInverse(S);
  
  // K = P_loc * S_inv: N x nobs
  const K = new Array(N);
  for (let i = 0; i < N; i++) {
    const row = new Float64Array(nobs);
    const Pi = P_loc[i];
    for (let j = 0; j < nobs; j++) {
      let sum = 0;
      for (let k = 0; k < nobs; k++) sum += Pi[k] * S_inv[k][j];
      row[j] = sum;
    }
    K[i] = row;
  }

  // Update each ensemble member
  for (let i = 0; i < M; i++) {
    const y_pert = new Array(nobs);
    for (let j = 0; j < nobs; j++) y_pert[j] = y[j] + randomNormal() * Math.sqrt(R_diag);
    const Hx = applyH(ens[i]);
    const innov = new Array(nobs);
    for (let j = 0; j < nobs; j++) innov[j] = y_pert[j] - Hx[j];
    for (let j = 0; j < N; j++) {
      let sum = 0;
      for (let k = 0; k < nobs; k++) sum += K[j][k] * innov[k];
      ens[i][j] += sum;
    }
  }
}
