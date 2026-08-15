import { rk4_step, linearize_l96 } from '../l96';

export function update4DVar(state, step, numSteps, dt, F, N, H_T, R_inv, applyH) {
  const p = state.params;
  const targetWindow = p.windowSize || 5;

  if (state.windowBuffer.length >= targetWindow || step === numSteps) {
    if (state.windowBuffer.length > 0) {
      const window = state.windowBuffer;
      const x0_b = window[0].x_bg.slice();
      let x0 = x0_b.slice();
      const B_inv = state.B_inv;

      function cost4DVar(x0_eval) {
        // Background cost: 0.5 * (x0-x0_b)^T B^-1 (x0-x0_b)
        let J = 0;
        for (let i = 0; i < N; i++) {
          const di = x0_eval[i] - x0_b[i];
          let Bd = 0;
          const Bi = B_inv[i];
          for (let j = 0; j < N; j++) Bd += Bi[j] * (x0_eval[j] - x0_b[j]);
          J += di * Bd;
        }
        J *= 0.5;
        
        let x_curr = x0_eval.slice();
        for (let k = 0; k < window.length; k++) {
          if (k > 0) x_curr = rk4_step(x_curr, dt, F);
          const wy = window[k].y;
          if (wy !== null) {
            const Hx = applyH(x_curr);
            const nwy = wy.length;
            for (let i = 0; i < nwy; i++) {
              const di = Hx[i] - wy[i];
              let Rd = 0;
              const Ri = R_inv[i];
              for (let j = 0; j < nwy; j++) Rd += Ri[j] * (Hx[j] - wy[j]);
              J += 0.5 * di * Rd;
            }
          }
        }
        return J;
      }

      function computeGrad(x0_eval) {
        const traj = [x0_eval.slice()];
        const M_list = [];
        let x_curr = x0_eval.slice();
        for (let k = 0; k < window.length - 1; k++) {
          M_list.push(linearize_l96(x_curr, F, dt));
          x_curr = rk4_step(x_curr, dt, F);
          traj.push(x_curr.slice());
        }

        const grad = new Float64Array(N);
        for (let i = 0; i < N; i++) {
          let sum = 0;
          const Bi = B_inv[i];
          for (let j = 0; j < N; j++) sum += Bi[j] * (x0_eval[j] - x0_b[j]);
          grad[i] = sum;
        }
        
        const adj = new Float64Array(N);
        for (let k = window.length - 1; k >= 0; k--) {
          const wy = window[k].y;
          if (wy !== null) {
            const Hx = applyH(traj[k]);
            const nwy = wy.length;
            const Rdiff = new Float64Array(nwy);
            for (let i = 0; i < nwy; i++) {
              let sum = 0;
              const Ri = R_inv[i];
              for (let j = 0; j < nwy; j++) sum += Ri[j] * (Hx[j] - wy[j]);
              Rdiff[i] = sum;
            }
            for (let i = 0; i < N; i++) {
              let sum = 0;
              const HTi = H_T[i];
              for (let j = 0; j < nwy; j++) sum += HTi[j] * Rdiff[j];
              adj[i] += sum;
            }
          }
          if (k > 0) {
            const M_mat = M_list[k - 1];
            const tmp = new Float64Array(N);
            for (let i = 0; i < N; i++) {
              let sum = 0;
              for (let j = 0; j < N; j++) sum += M_mat[j][i] * adj[j];
              tmp[i] = sum;
            }
            for (let i = 0; i < N; i++) adj[i] = tmp[i];
          }
        }
        for (let i = 0; i < N; i++) grad[i] += adj[i];
        return grad;
      }

      // L-BFGS Optimization (m_hist = 8)
      const m_hist = 8;
      const s_hist = [];
      const y_hist = [];
      let g = computeGrad(x0);

      for (let iter = 0; iter < 25; iter++) {
        let g_norm_sq = 0;
        for (let i = 0; i < N; i++) g_norm_sq += g[i] * g[i];
        if (Math.sqrt(g_norm_sq) < 1e-4) break;

        const k_len = s_hist.length;
        const q = new Float64Array(g);
        const alpha = new Float64Array(k_len);

        for (let i = k_len - 1; i >= 0; i--) {
          const s_i = s_hist[i];
          const y_i = y_hist[i];
          let sy = 0, sq = 0;
          for (let j = 0; j < N; j++) {
            sy += s_i[j] * y_i[j];
            sq += s_i[j] * q[j];
          }
          if (Math.abs(sy) > 1e-12) {
            alpha[i] = sq / sy;
            for (let j = 0; j < N; j++) q[j] -= alpha[i] * y_i[j];
          }
        }

        const r_dir = new Float64Array(q);
        if (k_len > 0) {
          const s_last = s_hist[k_len - 1];
          const y_last = y_hist[k_len - 1];
          let sy = 0, yy = 0;
          for (let j = 0; j < N; j++) {
            sy += s_last[j] * y_last[j];
            yy += y_last[j] * y_last[j];
          }
          const gamma = Math.abs(yy) > 1e-12 ? sy / yy : 1.0;
          for (let j = 0; j < N; j++) r_dir[j] *= gamma;
        }

        for (let i = 0; i < k_len; i++) {
          const s_i = s_hist[i];
          const y_i = y_hist[i];
          let sy = 0, yr = 0;
          for (let j = 0; j < N; j++) {
            sy += s_i[j] * y_i[j];
            yr += y_i[j] * r_dir[j];
          }
          if (Math.abs(sy) > 1e-12) {
            const beta = yr / sy;
            for (let j = 0; j < N; j++) r_dir[j] += s_i[j] * (alpha[i] - beta);
          }
        }

        const dir = new Float64Array(N);
        let dg = 0;
        for (let j = 0; j < N; j++) {
          dir[j] = -r_dir[j];
          dg += dir[j] * g[j];
        }
        if (dg > 0) {
          for (let j = 0; j < N; j++) dir[j] = -g[j];
          dg = -g_norm_sq;
        }

        // Armijo Line Search
        let stepSize = 1.0;
        const currentCost = cost4DVar(x0);
        const x0_next = new Float64Array(N);

        for (let ls = 0; ls < 12; ls++) {
          for (let i = 0; i < N; i++) x0_next[i] = x0[i] + dir[i] * stepSize;
          if (cost4DVar(x0_next) <= currentCost + 1e-4 * stepSize * dg) {
            break;
          }
          stepSize *= 0.5;
        }

        const s_k = new Float64Array(N);
        for (let i = 0; i < N; i++) s_k[i] = x0_next[i] - x0[i];
        const g_next = computeGrad(x0_next);
        const y_k = new Float64Array(N);
        for (let i = 0; i < N; i++) y_k[i] = g_next[i] - g[i];

        let sy_check = 0;
        for (let i = 0; i < N; i++) sy_check += s_k[i] * y_k[i];
        if (sy_check > 1e-10) {
          if (s_hist.length >= m_hist) {
            s_hist.shift();
            y_hist.shift();
          }
          s_hist.push(s_k);
          y_hist.push(y_k);
        }

        x0 = Array.from(x0_next);
        g = g_next;
      }

      const traj = [x0.slice()];
      let x_curr = x0;
      for (let k = 1; k < window.length; k++) {
        x_curr = rk4_step(x_curr, dt, F);
        traj.push(x_curr.slice());
      }
      state.x = x_curr;
      return traj;
    }
  }
  return null;
}
