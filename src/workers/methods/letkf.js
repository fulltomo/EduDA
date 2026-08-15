import { periodicDist, gaspariCohn } from '../math';

export function buildLetkfPrecomputed(N, obsIndices, R_diag, localization) {
  const nobs = obsIndices.length;
  const localObsCount = new Int32Array(N);
  const tempIndices = [];
  const tempRInv = [];
  let maxLocalNobs = 0;

  for (let i = 0; i < N; i++) {
    let count = 0;
    for (let ob = 0; ob < nobs; ob++) {
      const dist = periodicDist(i, obsIndices[ob], N);
      const gloc = gaspariCohn(dist, localization);
      if (gloc > 1e-4) {
        tempIndices.push(ob);
        tempRInv.push(gloc / R_diag);
        count++;
      }
    }
    localObsCount[i] = count;
    if (count > maxLocalNobs) maxLocalNobs = count;
  }

  const localObsIndices = new Int32Array(N * maxLocalNobs);
  const localRInv = new Float64Array(N * maxLocalNobs);
  let srcIdx = 0;

  for (let i = 0; i < N; i++) {
    const count = localObsCount[i];
    for (let k = 0; k < count; k++) {
      localObsIndices[i * maxLocalNobs + k] = tempIndices[srcIdx + k];
      localRInv[i * maxLocalNobs + k] = tempRInv[srcIdx + k];
    }
    srcIdx += count;
  }

  return { localObsCount, localObsIndices, localRInv, maxLocalNobs };
}

export function updateLETKF(state, y, nobs, N, obsIndices, R_diag, localization, precomputed) {
  const M = state.ensembleSize;
  const ens = state.ensemble;
  const x_mean = state.x_mean;

  // Pre-compute perturbation matrix Xb (N x M)
  const Xb = new Array(N);
  for (let i = 0; i < N; i++) {
    const row = new Float64Array(M);
    const xm = x_mean[i];
    for (let j = 0; j < M; j++) row[j] = ens[j][i] - xm;
    Xb[i] = row;
  }

  const ens_new = new Array(M);
  for (let j = 0; j < M; j++) ens_new[j] = new Float64Array(N);
  
  const sqrtM1 = Math.sqrt(M - 1);
  const M1 = M - 1;
  const inv_sqrt_M = 1.0 / Math.sqrt(M);

  // Pre-allocated working buffers
  const Pa_tilde_inv = new Array(M);
  for (let r = 0; r < M; r++) Pa_tilde_inv[r] = new Float64Array(M);
  const L = new Array(M);
  for (let r = 0; r < M; r++) L[r] = new Float64Array(M);
  const b = new Float64Array(M);
  const y_temp = new Float64Array(M);
  const wa_mean = new Float64Array(M);
  const L_inv_T = new Array(M);
  for (let r = 0; r < M; r++) L_inv_T[r] = new Float64Array(M);
  const v_vec = new Float64Array(M);
  const u = new Float64Array(M);
  const y_sol = new Float64Array(M);

  const pre = precomputed || buildLetkfPrecomputed(N, obsIndices, R_diag, localization);
  const maxLoc = pre.maxLocalNobs;

  for (let i = 0; i < N; i++) {
    const l_nobs = pre.localObsCount[i];
    if (l_nobs === 0) {
      for (let j = 0; j < M; j++) ens_new[j][i] = ens[j][i];
      continue;
    }

    const locBase = i * maxLoc;

    // 1. Reset Pa_tilde_inv = (M-1) * I
    for (let r = 0; r < M; r++) {
      Pa_tilde_inv[r].fill(0);
      Pa_tilde_inv[r][r] = M1;
    }
    
    for (let o = 0; o < l_nobs; o++) {
      const oIdx = pre.localObsIndices[locBase + o];
      const obIdx = obsIndices[oIdx];
      const rInv = pre.localRInv[locBase + o];
      const Xb_ob = Xb[obIdx];

      for (let r = 0; r < M; r++) {
        const xr = Xb_ob[r] * rInv;
        const Pa_r = Pa_tilde_inv[r];
        for (let c = 0; c <= r; c++) {
          Pa_r[c] += xr * Xb_ob[c];
        }
      }
    }
    for (let r = 0; r < M; r++) {
      for (let c = 0; c < r; c++) {
        Pa_tilde_inv[c][r] = Pa_tilde_inv[r][c];
      }
    }

    // 2. Cholesky L * L^T = Pa_tilde_inv
    for (let r = 0; r < M; r++) L[r].fill(0);
    for (let r = 0; r < M; r++) {
      let sumDiag = 0;
      const L_r = L[r];
      for (let k = 0; k < r; k++) {
        const l_rk = L_r[k];
        sumDiag += l_rk * l_rk;
      }
      const l_rr = Math.sqrt(Math.max(1e-12, Pa_tilde_inv[r][r] - sumDiag));
      L_r[r] = l_rr;
      const inv_l_rr = 1.0 / l_rr;

      for (let r2 = r + 1; r2 < M; r2++) {
        let sum = 0;
        const L_r2 = L[r2];
        for (let k = 0; k < r; k++) sum += L_r2[k] * L_r[k];
        L_r2[r] = (Pa_tilde_inv[r2][r] - sum) * inv_l_rr;
      }
    }

    // 3. b = Y^T R^-1 (y - Hx_mean)
    b.fill(0);
    for (let o = 0; o < l_nobs; o++) {
      const oIdx = pre.localObsIndices[locBase + o];
      const obIdx = obsIndices[oIdx];
      const innov = (y[oIdx] - x_mean[obIdx]) * pre.localRInv[locBase + o];
      const Xb_ob = Xb[obIdx];
      for (let r = 0; r < M; r++) b[r] += Xb_ob[r] * innov;
    }

    // 4. Solve L * L^T * wa_mean = b
    for (let r = 0; r < M; r++) {
      let sum = 0;
      const L_r = L[r];
      for (let c = 0; c < r; c++) sum += L_r[c] * y_temp[c];
      y_temp[r] = (b[r] - sum) / L_r[r];
    }
    for (let r = M - 1; r >= 0; r--) {
      let sum = 0;
      for (let c = r + 1; c < M; c++) sum += L[c][r] * wa_mean[c];
      wa_mean[r] = (y_temp[r] - sum) / L[r][r];
    }

    // 5. L_inv_T: solve L * y = e_k for each k
    for (let k = 0; k < M; k++) {
      for (let r = 0; r < M; r++) {
        let sum = 0;
        const L_r = L[r];
        for (let c = 0; c < r; c++) sum += L_r[c] * y_sol[c];
        const rhs = r === k ? 1.0 : 0.0;
        y_sol[r] = (rhs - sum) / L_r[r];
      }
      for (let j = 0; j < M; j++) L_inv_T[k][j] = y_sol[j] * sqrtM1;
    }

    // 6. Householder transform
    for (let r = 0; r < M; r++) {
      let sum = 0;
      for (let c = 0; c < M; c++) sum += L_inv_T[c][r];
      v_vec[r] = sum * inv_sqrt_M;
    }
    
    let norm_v_sq = 0;
    for (let r = 0; r < M; r++) norm_v_sq += v_vec[r] * v_vec[r];
    const norm_v = Math.sqrt(norm_v_sq);
    
    for (let idx = 0; idx < M; idx++) u[idx] = v_vec[idx] - norm_v * inv_sqrt_M;
    let norm_u_sq = 0;
    for (let idx = 0; idx < M; idx++) norm_u_sq += u[idx] * u[idx];
    const norm_u = Math.sqrt(norm_u_sq);

    const Xb_i = Xb[i];
    const xm = x_mean[i];

    if (norm_u > 1e-12) {
      const inv_norm_u = 1.0 / norm_u;
      for (let idx = 0; idx < M; idx++) u[idx] *= inv_norm_u;

      for (let j = 0; j < M; j++) {
        let sum = 0;
        const u_j_2 = 2 * u[j];
        for (let k = 0; k < M; k++) {
          let dot_k = 0;
          const L_k = L_inv_T[k];
          for (let l = 0; l < M; l++) dot_k += L_k[l] * u[l];
          const wa_kj = L_k[j] - u_j_2 * dot_k;
          sum += Xb_i[k] * (wa_mean[k] + wa_kj);
        }
        ens_new[j][i] = xm + sum;
      }
    } else {
      for (let j = 0; j < M; j++) {
        let sum = 0;
        for (let k = 0; k < M; k++) {
          sum += Xb_i[k] * (wa_mean[k] + L_inv_T[k][j]);
        }
        ens_new[j][i] = xm + sum;
      }
    }
  }
  state.ensemble = ens_new;
}
