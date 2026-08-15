import { matInverse } from '../math';

export function updateEKF(state, y, H, H_T, R, N, applyH, obsIndices) {
  const nobs = obsIndices.length;
  const P = state.P;
  
  // Clamp P
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (isNaN(P[r][c])) P[r][c] = r === c ? 1.0 : 0;
      if (P[r][c] > 50) P[r][c] = 50;
      if (P[r][c] < -50) P[r][c] = -50;
    }
  }

  // HP = H * P: select rows of P at obsIndices -> nobs x N
  const HP = new Array(nobs);
  for (let i = 0; i < nobs; i++) {
    HP[i] = P[obsIndices[i]]; // direct reference, no copy needed since we don't modify
  }

  // HPH = HP * H_T: for each (i,j), HPH[i][j] = HP[i][obsIndices[j]] = P[obsIndices[i]][obsIndices[j]]
  const HPH = new Array(nobs);
  for (let i = 0; i < nobs; i++) {
    const row = new Float64Array(nobs);
    const pi = obsIndices[i];
    for (let j = 0; j < nobs; j++) {
      row[j] = P[pi][obsIndices[j]];
    }
    HPH[i] = row;
  }

  // S = HPH + R
  const S = new Array(nobs);
  for (let i = 0; i < nobs; i++) {
    S[i] = new Float64Array(nobs);
    for (let j = 0; j < nobs; j++) {
      S[i][j] = HPH[i][j] + R[i][j];
    }
  }
  const S_inv = matInverse(S);

  // P * H_T: select columns of P at obsIndices -> N x nobs
  const PH_T = new Array(N);
  for (let i = 0; i < N; i++) {
    const row = new Float64Array(nobs);
    for (let j = 0; j < nobs; j++) {
      row[j] = P[i][obsIndices[j]];
    }
    PH_T[i] = row;
  }

  // K = PH_T * S_inv: N x nobs
  const K = new Array(N);
  for (let i = 0; i < N; i++) {
    const row = new Float64Array(nobs);
    for (let j = 0; j < nobs; j++) {
      let sum = 0;
      for (let k = 0; k < nobs; k++) sum += PH_T[i][k] * S_inv[k][j];
      row[j] = sum;
    }
    K[i] = row;
  }

  // Innovation and state update
  const Hx = applyH(state.x);
  const innov = new Array(nobs);
  for (let i = 0; i < nobs; i++) innov[i] = y[i] - Hx[i];
  
  // x = x + K * innov
  for (let i = 0; i < N; i++) {
    let sum = 0;
    for (let j = 0; j < nobs; j++) sum += K[i][j] * innov[j];
    state.x[i] += sum;
  }

  // P_upd = (I - K*H) * P
  // K*H: N x N, but K is N x nobs and H is nobs x N (sparse)
  // (K*H)[i][j] = sum_k K[i][k] * H[k][j] = K[i][indexOf(j in obsIndices)] if j is observed, else 0
  // So: P_upd[i][j] = P[i][j] - sum_k K[i][k] * P[obsIndices[k]][j]
  const P_upd = new Array(N);
  for (let i = 0; i < N; i++) {
    P_upd[i] = new Float64Array(N);
    for (let j = 0; j < N; j++) {
      let kh_p = 0;
      for (let k = 0; k < nobs; k++) {
        kh_p += K[i][k] * P[obsIndices[k]][j];
      }
      P_upd[i][j] = P[i][j] - kh_p;
    }
  }
  
  // Symmetrize
  for (let r = 0; r < N; r++) {
    for (let c = r; c < N; c++) {
      const sym = 0.5 * (P_upd[r][c] + P_upd[c][r]);
      P_upd[r][c] = sym;
      P_upd[c][r] = sym;
    }
  }
  state.P = P_upd;
}
