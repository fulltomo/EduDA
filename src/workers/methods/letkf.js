import { periodicDist, gaspariCohn } from '../math';

export function updateLETKF(state, y, nobs, N, obsIndices, R_diag, localization) {
  const M = state.ensembleSize;
  const ens = state.ensemble;
  const x_mean = state.x_mean;

  // Pre-compute perturbation matrix Xb (N x M)
  const Xb = new Array(N);
  for (let i = 0; i < N; i++) {
    const row = new Float64Array(M);
    for (let j = 0; j < M; j++) row[j] = ens[j][i] - x_mean[i];
    Xb[i] = row;
  }

  const ens_new = new Array(M);
  for (let j = 0; j < M; j++) ens_new[j] = new Float64Array(N);
  
  const sqrtM1 = Math.sqrt(M - 1);
  const M1 = M - 1; // (M-1) scalar for diagonal

  // Pre-allocate working arrays that are reused for each grid point
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
  const e_vec = new Float64Array(M);
  const y_sol = new Float64Array(M);
  const inv_sqrt_M = 1.0 / Math.sqrt(M);

  // Temporary arrays for local obs data (max possible size = nobs)
  const localObsIdx = new Int32Array(nobs);
  const localGloc = new Float64Array(nobs);

  for (let i = 0; i < N; i++) {
    // Find local observations
    let l_nobs = 0;
    for (let ob = 0; ob < nobs; ob++) {
      const dist = periodicDist(i, obsIndices[ob], N);
      const gloc = gaspariCohn(dist, localization);
      if (gloc > 1e-4) {
        localObsIdx[l_nobs] = ob;
        localGloc[l_nobs] = gloc;
        l_nobs++;
      }
    }

    if (l_nobs === 0) {
      for (let j = 0; j < M; j++) ens_new[j][i] = ens[j][i];
      continue;
    }

    // Build HXb_loc (l_nobs x M) - just reference rows of Xb at observed indices
    // y_loc, R_loc_inv, Hx_mean_loc are simple lookups
    
    // Construct Pa_tilde_inv = (M-1)I + Y^T R^-1 Y
    // Reset to (M-1)*I
    for (let r = 0; r < M; r++) {
      Pa_tilde_inv[r].fill(0);
      Pa_tilde_inv[r][r] = M1;
    }
    
    for (let r = 0; r < M; r++) {
      for (let c = 0; c <= r; c++) {
        let sum = 0;
        for (let o = 0; o < l_nobs; o++) {
          const obIdx = obsIndices[localObsIdx[o]];
          sum += Xb[obIdx][r] * (localGloc[o] / R_diag) * Xb[obIdx][c];
        }
        Pa_tilde_inv[r][c] += sum;
        if (r !== c) Pa_tilde_inv[c][r] = Pa_tilde_inv[r][c];
      }
    }

    // Cholesky L*L^T = Pa_tilde_inv
    for (let r = 0; r < M; r++) L[r].fill(0);
    for (let r = 0; r < M; r++) {
      for (let c = 0; c <= r; c++) {
        let sum = 0;
        for (let k = 0; k < c; k++) sum += L[r][k] * L[c][k];
        if (r === c) {
          L[r][c] = Math.sqrt(Math.max(1e-12, Pa_tilde_inv[r][r] - sum));
        } else {
          L[r][c] = (Pa_tilde_inv[r][c] - sum) / L[c][c];
        }
      }
    }

    // b = Y^T R^-1 (y - Hx_mean)
    for (let r = 0; r < M; r++) {
      let sum = 0;
      for (let o = 0; o < l_nobs; o++) {
        const oIdx = localObsIdx[o];
        const obIdx = obsIndices[oIdx];
        const innov = y[oIdx] - x_mean[obIdx];
        sum += Xb[obIdx][r] * (localGloc[o] / R_diag) * innov;
      }
      b[r] = sum;
    }

    // Solve L * L^T * wa_mean = b via forward/back substitution
    for (let r = 0; r < M; r++) {
      let sum = 0;
      for (let c = 0; c < r; c++) sum += L[r][c] * y_temp[c];
      y_temp[r] = (b[r] - sum) / L[r][r];
    }
    for (let r = M - 1; r >= 0; r--) {
      let sum = 0;
      for (let c = r + 1; c < M; c++) sum += L[c][r] * wa_mean[c];
      wa_mean[r] = (y_temp[r] - sum) / L[r][r];
    }

    // L_inv_T: solve L * y = e_k for each k, then scale by sqrtM1
    for (let k = 0; k < M; k++) {
      e_vec.fill(0);
      e_vec[k] = 1.0;
      for (let r = 0; r < M; r++) {
        let sum = 0;
        for (let c = 0; c < r; c++) sum += L[r][c] * y_sol[c];
        y_sol[r] = (e_vec[r] - sum) / L[r][r];
      }
      for (let j = 0; j < M; j++) L_inv_T[k][j] = y_sol[j] * sqrtM1;
    }

    // Householder to make column sums positive
    // v_vec[r] = sum_c L_inv_T[c][r] * (1/sqrt(M))
    for (let r = 0; r < M; r++) {
      let sum = 0;
      for (let c = 0; c < M; c++) sum += L_inv_T[c][r] * inv_sqrt_M;
      v_vec[r] = sum;
    }
    
    // norm_v = ||v_vec||
    let norm_v_sq = 0;
    for (let r = 0; r < M; r++) norm_v_sq += v_vec[r] * v_vec[r];
    const norm_v = Math.sqrt(norm_v_sq);
    
    for (let idx = 0; idx < M; idx++) u[idx] = v_vec[idx] - norm_v * inv_sqrt_M;
    let norm_u_sq = 0;
    for (let idx = 0; idx < M; idx++) norm_u_sq += u[idx] * u[idx];
    const norm_u = Math.sqrt(norm_u_sq);

    // Construct analysis ensemble
    if (norm_u > 1e-12) {
      for (let idx = 0; idx < M; idx++) u[idx] /= norm_u;
      for (let j = 0; j < M; j++) {
        let sum = 0;
        for (let k = 0; k < M; k++) {
          // Wa_final[k][j] = sum_l L_inv_T[k][l] * Q[l][j]
          // Q[l][j] = delta(l,j) - 2*u[l]*u[j]
          // So Wa_final[k][j] = L_inv_T[k][j] - 2*u[j] * sum_l(L_inv_T[k][l]*u[l])
          // For efficiency, compute w_kj = wa_mean[k] + Wa_final[k][j] inline
          let wa_kj = 0;
          let dot_k = 0;
          for (let l = 0; l < M; l++) dot_k += L_inv_T[k][l] * u[l];
          wa_kj = L_inv_T[k][j] - 2 * u[j] * dot_k;
          sum += Xb[i][k] * (wa_mean[k] + wa_kj);
        }
        ens_new[j][i] = x_mean[i] + sum;
      }
    } else {
      for (let j = 0; j < M; j++) {
        let sum = 0;
        for (let k = 0; k < M; k++) {
          sum += Xb[i][k] * (wa_mean[k] + L_inv_T[k][j]);
        }
        ens_new[j][i] = x_mean[i] + sum;
      }
    }
  }
  state.ensemble = ens_new;
}
