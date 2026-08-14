import { vecAdd, vecScale } from './math';

/**
 * Lorenz '96 Model Right-Hand Side (dx/dt)
 */
export function l96_rhs(x, F) {
  const n = x.length;
  const dxdt = new Array(n);
  for (let i = 0; i < n; i++) {
    const im2 = (i - 2 + n) % n;
    const im1 = (i - 1 + n) % n;
    const ip1 = (i + 1) % n;
    dxdt[i] = (x[ip1] - x[im2]) * x[im1] - x[i] + F;
  }
  return dxdt;
}

/**
 * Runge-Kutta 4th order numerical integration step for Lorenz '96
 */
export function rk4_step(x, dt, F) {
  const k1 = l96_rhs(x, F);
  const x2 = vecAdd(x, vecScale(k1, dt / 2));
  const k2 = l96_rhs(x2, F);
  const x3 = vecAdd(x, vecScale(k2, dt / 2));
  const k3 = l96_rhs(x3, F);
  const x4 = vecAdd(x, vecScale(k3, dt));
  const k4 = l96_rhs(x4, F);

  const res = new Array(x.length);
  for (let i = 0; i < x.length; i++) {
    res[i] = x[i] + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
  }
  return res;
}

/**
 * Tangent linear model (Jacobian propagator) of Lorenz '96 under RK4
 */
export function linearize_l96(x, F, dt) {
  const n = x.length;
  const M = Array(n).fill().map(() => new Float64Array(n));

  const k1_x = l96_rhs(x, F);
  const x2 = vecAdd(x, vecScale(k1_x, dt / 2));
  const k2_x = l96_rhs(x2, F);
  const x3 = vecAdd(x, vecScale(k2_x, dt / 2));
  const k3_x = l96_rhs(x3, F);
  const x4 = vecAdd(x, vecScale(k3_x, dt));

  function applyJ(curr_x, v, out) {
    for (let i = 0; i < n; i++) {
      const im2 = (i - 2 + n) % n;
      const im1 = (i - 1 + n) % n;
      const ip1 = (i + 1) % n;
      out[i] = -curr_x[im1] * v[im2] + (curr_x[ip1] - curr_x[im2]) * v[im1] - v[i] + curr_x[im1] * v[ip1];
    }
  }

  const dk1 = new Float64Array(n);
  const dk2 = new Float64Array(n);
  const dk3 = new Float64Array(n);
  const dk4 = new Float64Array(n);
  const v_temp = new Float64Array(n);
  const e_j = new Float64Array(n);

  for (let j = 0; j < n; j++) {
    e_j.fill(0.0);
    e_j[j] = 1.0;
    applyJ(x, e_j, dk1);

    for (let i = 0; i < n; i++) v_temp[i] = (i === j ? 1.0 : 0.0) + 0.5 * dt * dk1[i];
    applyJ(x2, v_temp, dk2);

    for (let i = 0; i < n; i++) v_temp[i] = (i === j ? 1.0 : 0.0) + 0.5 * dt * dk2[i];
    applyJ(x3, v_temp, dk3);

    for (let i = 0; i < n; i++) v_temp[i] = (i === j ? 1.0 : 0.0) + dt * dk3[i];
    applyJ(x4, v_temp, dk4);

    for (let i = 0; i < n; i++) {
      M[i][j] = (i === j ? 1.0 : 0.0) + (dt / 6.0) * (dk1[i] + 2.0 * dk2[i] + 2.0 * dk3[i] + dk4[i]);
    }
  }
  return M;
}
