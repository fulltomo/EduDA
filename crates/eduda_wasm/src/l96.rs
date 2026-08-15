//! Lorenz '96 Model and Tangent Linear propagator

#[inline(always)]
pub fn l96_rhs(x: &[f64], f: f64, out: &mut [f64]) {
    let n = x.len();
    for i in 0..n {
        let im2 = if i >= 2 { i - 2 } else { i + n - 2 };
        let im1 = if i >= 1 { i - 1 } else { i + n - 1 };
        let ip1 = if i + 1 < n { i + 1 } else { 0 };
        out[i] = (x[ip1] - x[im2]) * x[im1] - x[i] + f;
    }
}

pub fn rk4_step(x: &[f64], dt: f64, f: f64, out: &mut [f64]) {
    let n = x.len();
    let dt2 = dt * 0.5;
    let dt6 = dt / 6.0;

    let mut k1 = vec![0.0; n];
    let mut k2 = vec![0.0; n];
    let mut k3 = vec![0.0; n];
    let mut k4 = vec![0.0; n];
    let mut xtmp = vec![0.0; n];

    l96_rhs(x, f, &mut k1);

    for i in 0..n { xtmp[i] = x[i] + k1[i] * dt2; }
    l96_rhs(&xtmp, f, &mut k2);

    for i in 0..n { xtmp[i] = x[i] + k2[i] * dt2; }
    l96_rhs(&xtmp, f, &mut k3);

    for i in 0..n { xtmp[i] = x[i] + k3[i] * dt; }
    l96_rhs(&xtmp, f, &mut k4);

    for i in 0..n {
        out[i] = x[i] + dt6 * (k1[i] + 2.0 * k2[i] + 2.0 * k3[i] + k4[i]);
    }
}

/// Tangent linear model (Jacobian propagator) of Lorenz '96 under RK4
/// M is stored in flat slice of size n*n (row-major: M[i*n + j])
pub fn linearize_l96(x: &[f64], f: f64, dt: f64, m_mat: &mut [f64]) {
    let n = x.len();
    let mut k1_x = vec![0.0; n];
    let mut k2_x = vec![0.0; n];
    let mut k3_x = vec![0.0; n];
    let mut x2 = vec![0.0; n];
    let mut x3 = vec![0.0; n];
    let mut x4 = vec![0.0; n];

    l96_rhs(x, f, &mut k1_x);
    for i in 0..n { x2[i] = x[i] + k1_x[i] * (dt * 0.5); }
    l96_rhs(&x2, f, &mut k2_x);
    for i in 0..n { x3[i] = x[i] + k2_x[i] * (dt * 0.5); }
    l96_rhs(&x3, f, &mut k3_x);
    for i in 0..n { x4[i] = x[i] + k3_x[i] * dt; }

    #[inline(always)]
    fn apply_j(curr_x: &[f64], v: &[f64], out: &mut [f64], n: usize) {
        for i in 0..n {
            let im2 = if i >= 2 { i - 2 } else { i + n - 2 };
            let im1 = if i >= 1 { i - 1 } else { i + n - 1 };
            let ip1 = if i + 1 < n { i + 1 } else { 0 };
            out[i] = -curr_x[im1] * v[im2] + (curr_x[ip1] - curr_x[im2]) * v[im1] - v[i] + curr_x[im1] * v[ip1];
        }
    }

    let mut dk1 = vec![0.0; n];
    let mut dk2 = vec![0.0; n];
    let mut dk3 = vec![0.0; n];
    let mut dk4 = vec![0.0; n];
    let mut v_temp = vec![0.0; n];
    let mut e_j = vec![0.0; n];

    let dt6 = dt / 6.0;

    for j in 0..n {
        e_j.fill(0.0);
        e_j[j] = 1.0;
        apply_j(x, &e_j, &mut dk1, n);

        for i in 0..n {
            v_temp[i] = (if i == j { 1.0 } else { 0.0 }) + 0.5 * dt * dk1[i];
        }
        apply_j(&x2, &v_temp, &mut dk2, n);

        for i in 0..n {
            v_temp[i] = (if i == j { 1.0 } else { 0.0 }) + 0.5 * dt * dk2[i];
        }
        apply_j(&x3, &v_temp, &mut dk3, n);

        for i in 0..n {
            v_temp[i] = (if i == j { 1.0 } else { 0.0 }) + dt * dk3[i];
        }
        apply_j(&x4, &v_temp, &mut dk4, n);

        for i in 0..n {
            m_mat[i * n + j] = (if i == j { 1.0 } else { 0.0 }) + dt6 * (dk1[i] + 2.0 * dk2[i] + 2.0 * dk3[i] + dk4[i]);
        }
    }
}
