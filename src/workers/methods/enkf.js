import { matMul, matTranspose, matScale, matAdd, matVecMul, matInverse, vecSub, vecAdd, periodicDist, gaspariCohn, randomNormal } from '../math';

export function updateEnKF(state, y, H, nobs, N, obsIndices, R_diag, R, localization, applyH) {
  const M = state.ensembleSize;
  const ens = state.ensemble;
  const x_mean = state.x_mean;

  let X = [];
  for (let i = 0; i < M; i++) X.push(vecSub(ens[i], x_mean));
  X = matTranspose(X); // N x M

  const HX = matMul(H, X); // nobs x M
  const HX_T = matTranspose(HX); // M x nobs

  const P_e = matScale(matMul(X, HX_T), 1 / (M - 1)); // N x nobs
  const P_loc = Array(N).fill().map(() => Array(nobs).fill(0));
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < nobs; j++) {
      P_loc[i][j] = P_e[i][j] * gaspariCohn(periodicDist(i, obsIndices[j], N), localization);
    }
  }

  const HPH = matScale(matMul(HX, HX_T), 1 / (M - 1));
  const HPH_loc = Array(nobs).fill().map(() => Array(nobs).fill(0));
  for (let i = 0; i < nobs; i++) {
    for (let j = 0; j < nobs; j++) {
      HPH_loc[i][j] = HPH[i][j] * gaspariCohn(periodicDist(obsIndices[i], obsIndices[j], N), localization);
    }
  }

  const S = matAdd(HPH_loc, R);
  for (let i = 0; i < nobs; i++) S[i][i] += 1e-6;
  const K = matMul(P_loc, matInverse(S));

  for (let i = 0; i < M; i++) {
    const y_pert = y.map(v => v + randomNormal() * Math.sqrt(R_diag));
    const Hx = applyH(ens[i]);
    const innov = vecSub(y_pert, Hx);
    ens[i] = vecAdd(ens[i], matVecMul(K, innov));
  }
}
