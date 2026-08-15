use crate::math::{mat_inverse, periodic_dist, gaspari_cohn, Rng};

pub fn update_enkf(
    ensemble: &mut [f64], // M * N flat slice (ensemble[m * N + i])
    x_mean: &[f64],
    y: &[f64],
    obs_indices: &[usize],
    r_diag: f64,
    localization: f64,
    m: usize,
    n: usize,
    rng: &mut Rng,
) {
    let nobs = obs_indices.len();
    if nobs == 0 { return; }

    let inv_m1 = 1.0 / (m - 1) as f64;
    let r_std = r_diag.sqrt();

    // Perturbation matrix X (N x M): X[i, j] = ensemble[j * N + i] - x_mean[i]
    let mut x_pert = vec![0.0; n * m];
    for i in 0..n {
        for j in 0..m {
            x_pert[i * m + j] = ensemble[j * n + i] - x_mean[i];
        }
    }

    // P_loc: N x nobs
    let mut p_loc = vec![0.0; n * nobs];
    for i in 0..n {
        for j in 0..nobs {
            let oj = obs_indices[j];
            let mut sum = 0.0;
            for k in 0..m {
                sum += x_pert[i * m + k] * x_pert[oj * m + k];
            }
            let gloc = gaspari_cohn(periodic_dist(i, oj, n), localization);
            p_loc[i * nobs + j] = sum * inv_m1 * gloc;
        }
    }

    // S: nobs x nobs
    let mut s = vec![0.0; nobs * nobs];
    for i in 0..nobs {
        let oi = obs_indices[i];
        for j in 0..nobs {
            let oj = obs_indices[j];
            let mut sum = 0.0;
            for k in 0..m {
                sum += x_pert[oi * m + k] * x_pert[oj * m + k];
            }
            let gloc = gaspari_cohn(periodic_dist(oi, oj, n), localization);
            s[i * nobs + j] = sum * inv_m1 * gloc;
        }
        s[i * nobs + i] += r_diag + 1e-6;
    }

    let mut s_inv = vec![0.0; nobs * nobs];
    mat_inverse(&s, nobs, &mut s_inv);

    // K = P_loc * S_inv: N x nobs
    let mut k_mat = vec![0.0; n * nobs];
    for i in 0..n {
        for j in 0..nobs {
            let mut sum = 0.0;
            for k in 0..nobs {
                sum += p_loc[i * nobs + k] * s_inv[k * nobs + j];
            }
            k_mat[i * nobs + j] = sum;
        }
    }

    // Update each ensemble member with perturbed observations
    let mut innov = vec![0.0; nobs];
    for j in 0..m {
        for k in 0..nobs {
            let y_pert = y[k] + rng.normal() * r_std;
            let hx = ensemble[j * n + obs_indices[k]];
            innov[k] = y_pert - hx;
        }

        for i in 0..n {
            let mut sum = 0.0;
            for k in 0..nobs {
                sum += k_mat[i * nobs + k] * innov[k];
            }
            ensemble[j * n + i] += sum;
        }
    }
}
