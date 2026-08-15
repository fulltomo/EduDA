use crate::math::{periodic_dist, gaspari_cohn};

pub struct LetkfPrecomputed {
    pub local_obs_count: Vec<usize>,       // N
    pub local_obs_indices: Vec<usize>,     // N * max_local_nobs
    pub local_r_inv: Vec<f64>,             // N * max_local_nobs
    pub max_local_nobs: usize,
}

impl LetkfPrecomputed {
    pub fn new(n: usize, obs_indices: &[usize], r_diag: f64, localization: f64) -> Self {
        let nobs = obs_indices.len();
        let mut local_obs_count = vec![0usize; n];
        let mut temp_indices = Vec::with_capacity(n * nobs);
        let mut temp_r_inv = Vec::with_capacity(n * nobs);
        let mut max_local_nobs = 0;

        for i in 0..n {
            let mut count = 0;
            for (ob_pos, &ob_idx) in obs_indices.iter().enumerate() {
                let dist = periodic_dist(i, ob_idx, n);
                let gloc = gaspari_cohn(dist, localization);
                if gloc > 1e-4 {
                    temp_indices.push(ob_pos);
                    temp_r_inv.push(gloc / r_diag);
                    count += 1;
                }
            }
            local_obs_count[i] = count;
            if count > max_local_nobs {
                max_local_nobs = count;
            }
        }

        // Pack into contiguous row-based structure
        let mut local_obs_indices = vec![0usize; n * max_local_nobs];
        let mut local_r_inv = vec![0.0f64; n * max_local_nobs];
        let mut src_idx = 0;

        for i in 0..n {
            let count = local_obs_count[i];
            for k in 0..count {
                local_obs_indices[i * max_local_nobs + k] = temp_indices[src_idx + k];
                local_r_inv[i * max_local_nobs + k] = temp_r_inv[src_idx + k];
            }
            src_idx += count;
        }

        Self {
            local_obs_count,
            local_obs_indices,
            local_r_inv,
            max_local_nobs,
        }
    }
}

pub fn update_letkf_optimized(
    ensemble: &mut [f64], // M * N flat slice
    x_mean: &[f64],
    y: &[f64],
    obs_indices: &[usize],
    precomputed: &LetkfPrecomputed,
    m: usize,
    n: usize,
) {
    let nobs = obs_indices.len();
    if nobs == 0 { return; }

    let sqrt_m1 = ((m - 1) as f64).sqrt();
    let m1_f64 = (m - 1) as f64;
    let inv_sqrt_m = 1.0 / (m as f64).sqrt();

    // Perturbation matrix Xb (N x M) in column-contiguous order
    let mut xb = vec![0.0; n * m];
    for i in 0..n {
        let x_m = x_mean[i];
        for j in 0..m {
            xb[i * m + j] = ensemble[j * n + i] - x_m;
        }
    }

    let mut ens_new = vec![0.0; m * n];

    // Reusable working buffers (stack allocated where possible or single pre-alloc)
    let mut pa_tilde_inv = vec![0.0; m * m];
    let mut l_mat = vec![0.0; m * m];
    let mut b_vec = vec![0.0; m];
    let mut y_temp = vec![0.0; m];
    let mut wa_mean = vec![0.0; m];
    let mut l_inv_t = vec![0.0; m * m];
    let mut v_vec = vec![0.0; m];
    let mut u_vec = vec![0.0; m];
    let mut y_sol = vec![0.0; m];

    let max_loc = precomputed.max_local_nobs;

    for i in 0..n {
        let l_nobs = precomputed.local_obs_count[i];
        if l_nobs == 0 {
            for j in 0..m {
                ens_new[j * n + i] = ensemble[j * n + i];
            }
            continue;
        }

        let loc_idx_base = i * max_loc;
        let loc_obs = &precomputed.local_obs_indices[loc_idx_base..loc_idx_base + l_nobs];
        let loc_r_inv = &precomputed.local_r_inv[loc_idx_base..loc_idx_base + l_nobs];

        // 1. Reset Pa_tilde_inv = (M-1) * I + Y^T R^-1 Y
        pa_tilde_inv.fill(0.0);
        for r in 0..m {
            pa_tilde_inv[r * m + r] = m1_f64;
        }

        for o in 0..l_nobs {
            let o_idx = loc_obs[o];
            let ob_idx = obs_indices[o_idx];
            let r_inv = loc_r_inv[o];
            let xb_ob = &xb[ob_idx * m..(ob_idx + 1) * m];

            for r in 0..m {
                let xr_r = xb_ob[r] * r_inv;
                for c in 0..=r {
                    pa_tilde_inv[r * m + c] += xr_r * xb_ob[c];
                }
            }
        }
        for r in 0..m {
            for c in 0..r {
                pa_tilde_inv[c * m + r] = pa_tilde_inv[r * m + c];
            }
        }

        // 2. Cholesky L * L^T = Pa_tilde_inv
        l_mat.fill(0.0);
        for r in 0..m {
            let mut sum_diag = 0.0;
            for k in 0..r {
                let l_rk = l_mat[r * m + k];
                sum_diag += l_rk * l_rk;
            }
            let l_rr = (pa_tilde_inv[r * m + r] - sum_diag).max(1e-12).sqrt();
            l_mat[r * m + r] = l_rr;
            let inv_l_rr = 1.0 / l_rr;

            for r2 in (r + 1)..m {
                let mut sum = 0.0;
                for k in 0..r {
                    sum += l_mat[r2 * m + k] * l_mat[r * m + k];
                }
                l_mat[r2 * m + r] = (pa_tilde_inv[r2 * m + r] - sum) * inv_l_rr;
            }
        }

        // 3. b = Y^T R^-1 (y - Hx_mean)
        b_vec.fill(0.0);
        for o in 0..l_nobs {
            let o_idx = loc_obs[o];
            let ob_idx = obs_indices[o_idx];
            let innov = (y[o_idx] - x_mean[ob_idx]) * loc_r_inv[o];
            let xb_ob = &xb[ob_idx * m..(ob_idx + 1) * m];
            for r in 0..m {
                b_vec[r] += xb_ob[r] * innov;
            }
        }

        // 4. Solve L * L^T * wa_mean = b
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

        // 5. L_inv_T: solve L * y = e_k for each k
        for k in 0..m {
            for r in 0..m {
                let mut sum = 0.0;
                for c in 0..r {
                    sum += l_mat[r * m + c] * y_sol[c];
                }
                let rhs = if r == k { 1.0 } else { 0.0 };
                y_sol[r] = (rhs - sum) / l_mat[r * m + r];
            }
            for j in 0..m {
                l_inv_t[k * m + j] = y_sol[j] * sqrt_m1;
            }
        }

        // 6. Householder transform to preserve ensemble mean
        for r in 0..m {
            let mut sum = 0.0;
            for c in 0..m {
                sum += l_inv_t[c * m + r];
            }
            v_vec[r] = sum * inv_sqrt_m;
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

        let xb_i = &xb[i * m..(i + 1) * m];
        let x_m = x_mean[i];

        if norm_u > 1e-12 {
            let inv_norm_u = 1.0 / norm_u;
            for idx in 0..m {
                u_vec[idx] *= inv_norm_u;
            }

            for j in 0..m {
                let mut sum = 0.0;
                let u_j_2 = 2.0 * u_vec[j];
                for k in 0..m {
                    let mut dot_k = 0.0;
                    for l in 0..m {
                        dot_k += l_inv_t[k * m + l] * u_vec[l];
                    }
                    let wa_kj = l_inv_t[k * m + j] - u_j_2 * dot_k;
                    sum += xb_i[k] * (wa_mean[k] + wa_kj);
                }
                ens_new[j * n + i] = x_m + sum;
            }
        } else {
            for j in 0..m {
                let mut sum = 0.0;
                for k in 0..m {
                    sum += xb_i[k] * (wa_mean[k] + l_inv_t[k * m + j]);
                }
                ens_new[j * n + i] = x_m + sum;
            }
        }
    }

    ensemble.copy_from_slice(&ens_new);
}
