use crate::math::mat_inverse;

pub fn update_ekf(
    x: &mut [f64],
    p: &mut [f64],
    y: &[f64],
    obs_indices: &[usize],
    r_diag: f64,
    n: usize,
) {
    let nobs = obs_indices.len();
    if nobs == 0 { return; }

    // Clamp P
    for r in 0..n {
        for c in 0..n {
            let idx = r * n + c;
            if p[idx].is_nan() {
                p[idx] = if r == c { 1.0 } else { 0.0 };
            }
            if p[idx] > 50.0 { p[idx] = 50.0; }
            if p[idx] < -50.0 { p[idx] = -50.0; }
        }
    }

    // HPH: nobs x nobs -> HPH[i, j] = P[obs_indices[i], obs_indices[j]]
    // S = HPH + R
    let mut s = vec![0.0; nobs * nobs];
    for i in 0..nobs {
        let pi = obs_indices[i];
        for j in 0..nobs {
            let pj = obs_indices[j];
            s[i * nobs + j] = p[pi * n + pj] + if i == j { r_diag } else { 0.0 };
        }
    }

    let mut s_inv = vec![0.0; nobs * nobs];
    mat_inverse(&s, nobs, &mut s_inv);

    // PH_T: n x nobs -> PH_T[i, j] = P[i, obs_indices[j]]
    // K = PH_T * S_inv: n x nobs
    let mut k_mat = vec![0.0; n * nobs];
    for i in 0..n {
        for j in 0..nobs {
            let mut sum = 0.0;
            for k in 0..nobs {
                let p_ik = p[i * n + obs_indices[k]];
                sum += p_ik * s_inv[k * nobs + j];
            }
            k_mat[i * nobs + j] = sum;
        }
    }

    // State update: x = x + K * (y - Hx)
    let mut innov = vec![0.0; nobs];
    for i in 0..nobs {
        innov[i] = y[i] - x[obs_indices[i]];
    }

    for i in 0..n {
        let mut sum = 0.0;
        for j in 0..nobs {
            sum += k_mat[i * nobs + j] * innov[j];
        }
        x[i] += sum;
    }

    // P_upd[i, j] = P[i, j] - sum_k K[i, k] * P[obs_indices[k], j]
    let mut p_upd = vec![0.0; n * n];
    for i in 0..n {
        for j in 0..n {
            let mut kh_p = 0.0;
            for k in 0..nobs {
                kh_p += k_mat[i * nobs + k] * p[obs_indices[k] * n + j];
            }
            p_upd[i * n + j] = p[i * n + j] - kh_p;
        }
    }

    // Symmetrize P
    for r in 0..n {
        for c in r..n {
            let sym = 0.5 * (p_upd[r * n + c] + p_upd[c * n + r]);
            p[r * n + c] = sym;
            p[c * n + r] = sym;
        }
    }
}
