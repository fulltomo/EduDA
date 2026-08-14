import { matVecMul, vecSub, vecAdd } from '../math';

export function update3DVar(state, y, applyH) {
  const xb = state.x.slice();
  const Hxb = applyH(xb);
  const innov = vecSub(y, Hxb);
  state.x = vecAdd(xb, matVecMul(state.K_3dvar, innov));
}
