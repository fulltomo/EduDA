import { matVecMul, matTranspose, vecSub, vecAdd, vecScale, dotProduct } from '../math';
import { rk4_step, linearize_l96 } from '../l96';

export function update4DVar(state, step, numSteps, dt, F, N, H_T, R_inv, applyH) {
  const p = state.params;
  const targetWindow = p.windowSize || 5;

  if (state.windowBuffer.length >= targetWindow || step === numSteps) {
    if (state.windowBuffer.length > 0) {
      const window = state.windowBuffer;
      const x0_b = window[0].x_bg.slice();
      let x0 = x0_b.slice();

      function cost4DVar(x0_eval) {
        const dx0 = vecSub(x0_eval, x0_b);
        let J = 0.5 * dotProduct(dx0, matVecMul(state.B_inv, dx0));
        let x_curr = x0_eval.slice();
        for (let k = 0; k < window.length; k++) {
          if (k > 0) x_curr = rk4_step(x_curr, dt, F);
          const wy = window[k].y;
          if (wy !== null) {
            const dy = vecSub(applyH(x_curr), wy);
            J += 0.5 * dotProduct(dy, matVecMul(R_inv, dy));
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

        let grad = matVecMul(state.B_inv, vecSub(x0, x0_b));
        let adj = Array(N).fill(0);
        for (let k = window.length - 1; k >= 0; k--) {
          const wy = window[k].y;
          if (wy !== null) {
            const Hx = applyH(traj[k]);
            const diff = vecSub(Hx, wy);
            const forcing = matVecMul(H_T, matVecMul(R_inv, diff));
            adj = vecAdd(adj, forcing);
          }
          if (k > 0) {
            const M_T = matTranspose(M_list[k - 1]);
            adj = matVecMul(M_T, adj);
          }
        }
        grad = vecAdd(grad, adj);

        let stepSize = 0.05;
        const currentCost = cost4DVar(x0);
        for (let ls = 0; ls < 10; ls++) {
          const x0_next = vecSub(x0, vecScale(grad, stepSize));
          if (cost4DVar(x0_next) < currentCost) {
            x0 = x0_next;
            break;
          }
          stepSize *= 0.5;
        }
      }

      let x_curr = x0;
      for (let k = 0; k < window.length; k++) {
        if (k > 0) x_curr = rk4_step(x_curr, dt, F);
      }
      state.x = x_curr;
      // Re-initialize windowBuffer with the latest state for the next window.
      state.windowBuffer = [{ step, x_bg: state.x.slice(), y: null }];
    }
  }
}
