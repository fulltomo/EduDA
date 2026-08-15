use crate::math::{periodic_dist, gaspari_cohn};

pub fn update_letkf(
    ensemble: &mut [f64], // M * N flat slice
    x_mean: &[f64],
    y: &[f64],
    obs_indices: &[usize],
    r_diag: f64,
    localization: f64,
    m: usize,
    n: usize,
) {
    let nobs = obs_indices.len();
    if nobs == 0 { return; }

    let sqrt_m1 = ((m - 1) as f64).sqrt();
    let m1_f64 = (m - 1) as f64;
    let inv_sqrt_m = 1.0 / (m as f64).sqrt();

    // Perturbation matrix Xb (N x M): Xb[i, j] = ensemble[j * N + i] - x_mean[i]
    let mut xb = vec![0.0; n * m];
    for i in 0..n {
        for j in 0..m {
            xb[i * m + j] = ensemble[j * n + i] - x_mean[i];
        }
    }

    let mut ens_new = vec![0.0; m * n];

    // Pre-allocated reusable working buffers
    let mut pa_tilde_inv = vec![0.0; m * m];
    let mut l_mat = vec![0.0; m * m];
    let mut b_vec = vec![0.0; m];
    let mut y_temp = vec![0.0; m];
    let mut wa_mean = vec![0.0; m];
    let mut l_inv_t = vec![0.0; m * m];
    let mut v_vec = vec![0.0; m];
    let mut u_vec = vec![0.0; m];
    let mut e_vec = vec![0.0; m];
    let mut y_sol = vec![0.0; m];

    let mut local_obs_idx = vec![0usize; nobs];
    let mut local_gloc = vec![0.0; nobs];

    for i in 0..n {
        let mut l_nobs = 0;
        for ob in 0..nobs {
            let dist = periodic_dist(i, obs_indices[ob], n);
            let gloc = gaspari_cohn(dist, localization);
            if gloc > 1e-4 {
                local_obs_idx[l_nobs] = ob;
                local_gloc[l_nobs] = gloc;
                l_nobs += 1;
            }
        }

        if l_nobs == 0 {
            for j in 0..m {
                ens_new[j * n + i] = ensemble[j * n + i];
            }
            continue;
        }

        // Reset Pa_tilde_inv = (M-1) * I
        pa_tilde_inv.fill(0.0);
        for r in 0..m {
            pa_tilde_inv[r * m + r] = m1_f64;
        }

        for r in 0..m {
            for c in 0..=r {
                let mut sum = 0.0;
                for o in 0..l_nobs {
                    let ob_idx = obs_indices[local_obs_idx[o]];
                    let r_loc_inv = local_gloc[o] / r_diag;
                    sum += xb[ob_idx * m + r] * r_loc_inv * xb[ob_idx * m + c];
                }
                pa_tilde_inv[r * m + c] += sum;
                if r != c {
                    pa_tilde_inv[c * m + r] = pa_tilde_inv[r * m + c];
                }
            }
        }

        // Cholesky L * L^T = Pa_tilde_inv
        l_mat.fill(0.0);
        for r in 0..m {
            for c in 0..=r {
                let mut sum = 0.0;
                for k in 0..c {
                    sum += l_mat[r * m + k] * l_mat[c * m + k];
                }
                if r == c {
                    let val = pa_tilde_inv[r * m + r] - sum;
                    l_mat[r * m + c] = val.max(1e-12).sqrt();
                } else {
                    l_mat[r * m + c] = (pa_tilde_inv[r * m + c] - sum) / l_mat[c * m + c];
                }
            }
        }

        // b = Y^T R^-1 (y - Hx_mean)
        for r in 0..m {
            let mut sum = 0.0;
            for o in 0..l_nobs {
                let o_idx = local_obs_idx[o];
                let ob_idx = obs_indices[o_idx];
                let innov = y[o_idx] - x_mean[ob_idx];
                sum += xb[ob_idx * m + r] * (local_gloc[o] / r_diag) * innov;
            }
            b_vec[r] = sum;
        }

        // Solve L * L^T * wa_mean = b
        for r in 0..m {
            let mut sum = 0.0;
            for c in 0..r {
                sum += l_mat[r * m + c] * y_temp[c];
            }
            y_temp[r] = (b_vec[r] - sum) / l_mat[r * m + r];
        }
        for r in (0..m).rev() {
            let mut sum = 0.0;
            for c in (r + 1)..m {
                sum += l_mat[c * m + r] * wa_mean[c];
            }
            wa_mean[r] = (y_temp[r] - sum) / l_mat[r * m + r];
        }

        // L_inv_T: solve L * y = e_k for each k, scale by sqrtM1
        for k in 0..m {
            e_vec.fill(0.0);
            e_vec[k] = 1.0;
            for r in 0..m {
                let mut sum = 0.0;
                for c in 0..r {
                    sum += l_mat[r * m + c] * y_sol[c];
                }
                y_sol[r] = (e_vec[r] - sum) / l_mat[r * m + r];
            }
            for j in 0..m {
                l_inv_t[k * m + j] = y_sol[j] * sqrt_m1;
            }
        }

        // Householder matrix Q
        for r in 0..m {
            let mut sum = 0.0;
            for c in 0..m {
                sum += l_inv_t[c * m + r] * inv_sqrt_m;
            }
            v_vec[r] = sum;
        }

        let mut norm_v_sq = 0.0;
        for r in 0..m {
            norm_v_sq += v_vec[r] * v_vec[r];
        }
        let norm_v = norm_v_sq.sqrt();

        for idx in 0..m {
            u_vec[idx] = v_vec[idx] - norm_v * inv_sqrt_m;
        }
        let mut norm_u_sq = 0.0;
        for idx in 0..m {
            norm_u_sq += u_vec[idx] * u_vec[idx];
        }
        let norm_u = norm_u_sq.sqrt();

        if norm_u > 1e-12 {
            let inv_norm_u = 1.0 / norm_u;
            for idx in 0..m {
                u_vec[idx] *= inv_norm_u;
            }
            for j in 0..m {
                let mut sum = 0.0;
                for k in 0..m {
                    let mut dot_k = 0.0;
                    for l in 0..m {
                        dot_k += l_inv_t[k * m + l] * u_vec[l];
                    }
                    let wa_kj = l_inv_t[k * m + j] - 2.0 * u_vec[j] * dot_k;
                    sum += xb[i * m + k] * (wa_mean[k] + wa_kj);
                }
                ens_new[j * n + i] = x_mean[i] + sum;
            }
        } else {
            for j in 0..m {
                let mut sum = 0.0;
                for k in 0..m {
                    sum += xb[i * m + k] * (wa_mean[k] + l_inv_t[k * m + j]);
                }
                ens_new[j * n + i] = x_mean[i] + sum;
            }
        }
    }

    ensemble.copy_from_slice(&ens_new);
}
