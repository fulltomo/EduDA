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

      for (let iter = 0; iter < 25; iter++) {
        const traj = [x0];
        const M_list = [];
        let x_curr = x0;
        for (let k = 0; k < window.length - 1; k++) {
          M_list.push(linearize_l96(x_curr, F, dt));
          x_curr = rk4_step(x_curr, dt, F);
          traj.push(x_curr);
        }

        // grad = B_inv * (x0 - x0_b)
        const grad = new Float64Array(N);
        for (let i = 0; i < N; i++) {
          let sum = 0;
          const Bi = B_inv[i];
          for (let j = 0; j < N; j++) sum += Bi[j] * (x0[j] - x0_b[j]);
          grad[i] = sum;
        }
        
        // Adjoint computation
        const adj = new Float64Array(N);
        for (let k = window.length - 1; k >= 0; k--) {
          const wy = window[k].y;
          if (wy !== null) {
            const Hx = applyH(traj[k]);
            const nwy = wy.length;
            // forcing = H^T * R_inv * (Hx - y)
            // First compute R_inv * diff
            const Rdiff = new Float64Array(nwy);
            for (let i = 0; i < nwy; i++) {
              let sum = 0;
              const Ri = R_inv[i];
              for (let j = 0; j < nwy; j++) sum += Ri[j] * (Hx[j] - wy[j]);
              Rdiff[i] = sum;
            }
            // Then H^T * Rdiff
            for (let i = 0; i < N; i++) {
              let sum = 0;
              const HTi = H_T[i];
              for (let j = 0; j < nwy; j++) sum += HTi[j] * Rdiff[j];
              adj[i] += sum;
            }
          }
          if (k > 0) {
            // adj = M_T * adj (in-place via temp)
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

        // Line search
        let stepSize = 0.05;
        const currentCost = cost4DVar(x0);
        let found = false;
        for (let ls = 0; ls < 10; ls++) {
          const x0_next = new Array(N);
          for (let i = 0; i < N; i++) x0_next[i] = x0[i] - grad[i] * stepSize;
          if (cost4DVar(x0_next) < currentCost) {
            x0 = x0_next;
            found = true;
            break;
          }
          stepSize *= 0.5;
        }
        if (!found) break; // No improvement found, stop early
      }

      let x_curr = x0;
      for (let k = 0; k < window.length; k++) {
        if (k > 0) x_curr = rk4_step(x_curr, dt, F);
      }
      state.x = x_curr;
      state.windowBuffer = [{ step, x_bg: state.x.slice(), y: null }];
    }
  }
}
