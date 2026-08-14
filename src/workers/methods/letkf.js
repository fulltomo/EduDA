import { matTranspose, matScale, identity, vecSub, periodicDist, gaspariCohn } from '../math';

export function updateLETKF(state, y, nobs, N, obsIndices, R_diag, localization) {
  const M = state.ensembleSize;
  const ens = state.ensemble;
  const x_mean = state.x_mean;

  let X = [];
  for (let i = 0; i < M; i++) X.push(vecSub(ens[i], x_mean));
  const Xb = matTranspose(X);
  const ens_new = Array(M).fill().map(() => Array(N).fill(0));
  const sqrtM1 = Math.sqrt(M - 1);

  for (let i = 0; i < N; i++) {
    const localObs = [];
    for (let ob = 0; ob < nobs; ob++) {
      const dist = periodicDist(i, obsIndices[ob], N);
      const gloc = gaspariCohn(dist, localization);
      if (gloc > 1e-4) localObs.push({ idx: ob, gloc });
    }

    const l_nobs = localObs.length;
    if (l_nobs === 0) {
      for (let j = 0; j < M; j++) ens_new[j][i] = ens[j][i];
      continue;
    }

    const y_loc = localObs.map(o => y[o.idx]);
    const R_loc_inv = localObs.map(o => o.gloc / R_diag);
    const Hx_mean_loc = localObs.map(o => x_mean[obsIndices[o.idx]]);
    const HXb_loc = Array(l_nobs).fill().map(() => Array(M).fill(0));
    for (let o = 0; o < l_nobs; o++) {
      const obIdx = obsIndices[localObs[o].idx];
      for (let j = 0; j < M; j++) HXb_loc[o][j] = Xb[obIdx][j];
    }

    // Construct Pa_tilde_inv = (M-1)I + Y^T R^-1 Y (lower triangle + mirror)
    const Pa_tilde_inv = matScale(identity(M), M - 1);
    for (let r = 0; r < M; r++) {
      for (let c = 0; c <= r; c++) {
        let sum = 0;
        for (let o = 0; o < l_nobs; o++) {
          sum += HXb_loc[o][r] * R_loc_inv[o] * HXb_loc[o][c];
        }
        Pa_tilde_inv[r][c] += sum;
        if (r !== c) {
          Pa_tilde_inv[c][r] = Pa_tilde_inv[r][c];
        }
      }
    }

    // Cholesky decomposition: Pa_tilde_inv = L * L^T
    const L = Array(M).fill().map(() => new Float64Array(M));
    let clampEvents = 0;
    for (let r = 0; r < M; r++) {
      for (let c = 0; c <= r; c++) {
        let sum = 0;
        for (let k = 0; k < c; k++) sum += L[r][k] * L[c][k];
        if (r === c) {
          const val = Pa_tilde_inv[r][r] - sum;
          if (val <= 0) clampEvents++;
          L[r][c] = Math.sqrt(Math.max(1e-12, val));
        } else {
          L[r][c] = (Pa_tilde_inv[r][c] - sum) / L[c][c];
        }
      }
    }
    if (clampEvents > 0) {
      console.warn(`[LETKF] Cholesky diagonal clamp needed ${clampEvents} times.`);
    }

    // Compute Y^T R^-1 (y - Hx)
    const innov = vecSub(y_loc, Hx_mean_loc);
    const b = new Float64Array(M);
    for (let r = 0; r < M; r++) {
      let sum = 0;
      for (let o = 0; o < l_nobs; o++) {
        sum += HXb_loc[o][r] * R_loc_inv[o] * innov[o];
      }
      b[r] = sum;
    }

    // Solve L * L^T * wa_mean = b
    const y_temp = new Float64Array(M);
    for (let r = 0; r < M; r++) {
      let sum = 0;
      for (let c = 0; c < r; c++) sum += L[r][c] * y_temp[c];
      y_temp[r] = (b[r] - sum) / L[r][r];
    }
    const wa_mean = new Float64Array(M);
    for (let r = M - 1; r >= 0; r--) {
      let sum = 0;
      for (let c = r + 1; c < M; c++) sum += L[c][r] * wa_mean[c];
      wa_mean[r] = (y_temp[r] - sum) / L[r][r];
    }

    // Compute W_a = sqrt(M-1) * L^-T
    const L_inv_T = Array(M).fill().map(() => new Float64Array(M));
    for (let k = 0; k < M; k++) {
      const e = new Float64Array(M); e[k] = 1.0;
      const y_sol = new Float64Array(M);
      for (let r = 0; r < M; r++) {
        let sum = 0;
        for (let c = 0; c < r; c++) sum += L[r][c] * y_sol[c];
        y_sol[r] = (e[r] - sum) / L[r][r];
      }
      for (let j = 0; j < M; j++) {
        L_inv_T[k][j] = y_sol[j] * sqrtM1;
      }
    }

    // Apply Orthogonal Householder Matrix Q
    const ones = new Float64Array(M).fill(1.0 / Math.sqrt(M));
    const v_vec = new Float64Array(M);
    for (let r = 0; r < M; r++) {
      let sum = 0;
      for (let c = 0; c < M; c++) sum += L_inv_T[c][r] * ones[c];
      v_vec[r] = sum;
    }
    const norm_v = Math.hypot(...v_vec);
    const u = new Float64Array(M);
    for (let idx = 0; idx < M; idx++) u[idx] = v_vec[idx] - norm_v * ones[idx];
    const norm_u = Math.hypot(...u);

    const Wa_final = Array(M).fill().map(() => new Float64Array(M));
    if (norm_u > 1e-12) {
      for (let idx = 0; idx < M; idx++) u[idx] /= norm_u;
      for (let r = 0; r < M; r++) {
        for (let c = 0; c < M; c++) {
          let sum = 0;
          for (let k = 0; k < M; k++) {
            const Q_kc = (k === c ? 1.0 : 0.0) - 2.0 * u[k] * u[c];
            sum += L_inv_T[r][k] * Q_kc;
          }
          Wa_final[r][c] = sum;
        }
      }
    } else {
      for (let r = 0; r < M; r++) {
        for (let c = 0; c < M; c++) Wa_final[r][c] = L_inv_T[r][c];
      }
    }

    // Construct analysis ensemble members
    for (let j = 0; j < M; j++) {
      let sum = 0;
      for (let k = 0; k < M; k++) {
        const w_jk = wa_mean[k] + Wa_final[k][j];
        sum += Xb[i][k] * w_jk;
      }
      ens_new[j][i] = x_mean[i] + sum;
    }
  }
  state.ensemble = ens_new;
}
