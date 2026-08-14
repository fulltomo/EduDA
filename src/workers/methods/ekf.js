import { matMul, matAdd, matSub, matVecMul, matInverse, vecSub, vecAdd, identity } from '../math';

export function updateEKF(state, y, H, H_T, R, N, applyH) {
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (isNaN(state.P[r][c])) state.P[r][c] = r === c ? 1.0 : 0;
      if (state.P[r][c] > 50) state.P[r][c] = 50;
      if (state.P[r][c] < -50) state.P[r][c] = -50;
    }
  }

  const HP = matMul(H, state.P);
  const HPH = matMul(HP, H_T);
  const S = matAdd(HPH, R);
  const S_inv = matInverse(S);
  const K = matMul(matMul(state.P, H_T), S_inv);

  const Hx = applyH(state.x);
  const innov = vecSub(y, Hx);
  state.x = vecAdd(state.x, matVecMul(K, innov));

  const I_KH = matSub(identity(N), matMul(K, H));
  const P_upd = matMul(I_KH, state.P);
  for (let r = 0; r < N; r++) {
    for (let c = r; c < N; c++) {
      const sym = 0.5 * (P_upd[r][c] + P_upd[c][r]);
      P_upd[r][c] = sym;
      P_upd[c][r] = sym;
    }
  }
  state.P = P_upd;
}
