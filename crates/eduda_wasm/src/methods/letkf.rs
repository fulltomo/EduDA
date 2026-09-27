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

/// Cyclic Jacobi eigenvalue decomposition for a symmetric matrix A (p x p).
/// Computes eigenvalues into `d` and eigenvectors into columns of `v`.
fn jacobi_eigenvalues(a: &[f64], p: usize, d: &mut [f64], v: &mut [f64], mat_buf: &mut [f64]) {
    v.fill(0.0);
    for i in 0..p {
        v[i * p + i] = 1.0;
    }
    mat_buf[..p * p].copy_from_slice(&a[..p * p]);

    if p <= 1 {
        if p == 1 {
            d[0] = mat_buf[0];
        }
        return;
    }

    // Cyclic Jacobi sweeps (typically converges in 5-10 sweeps, max 30)
    for _sweep in 0..30 {
        // Sum of absolute off-diagonal elements
        let mut off_diag_sum = 0.0;
        for i in 0..p {
            let row = i * p;
            for j in (i + 1)..p {
                off_diag_sum += mat_buf[row + j].abs();
            }
        }

        // Relative threshold against diagonal magnitude
        let mut diag_sum = 0.0;
        for i in 0..p {
            diag_sum += mat_buf[i * p + i].abs();
        }

        if off_diag_sum <= 1e-12 * diag_sum || off_diag_sum < 1e-14 {
            break;
        }

        // Sweep over all pairs (i, j)
        for i in 0..(p - 1) {
            let i_row = i * p;
            for j in (i + 1)..p {
                let j_row = j * p;
                let apq = mat_buf[i_row + j];
                let thresh = 1e-14 * (mat_buf[i_row + i].abs() + mat_buf[j_row + j].abs());
                if apq.abs() <= thresh {
                    continue;
                }

                let app = mat_buf[i_row + i];
                let aqq = mat_buf[j_row + j];

                let phi = 0.5 * (2.0 * apq).atan2(aqq - app);
                let c = phi.cos();
                let s = phi.sin();

                // Update eigenvector matrix V
                for k in 0..p {
                    let k_row = k * p;
                    let v_ki = v[k_row + i];
                    let v_kj = v[k_row + j];
                    v[k_row + i] = c * v_ki - s * v_kj;
                    v[k_row + j] = s * v_ki + c * v_kj;
                }

                // Update matrix A
                for k in 0..p {
                    if k != i && k != j {
                        let k_row = k * p;
                        let a_ki = mat_buf[k_row + i];
                        let a_kj = mat_buf[k_row + j];
                        let new_ki = c * a_ki - s * a_kj;
                        let new_kj = s * a_ki + c * a_kj;
                        mat_buf[k_row + i] = new_ki;
                        mat_buf[i_row + k] = new_ki;
                        mat_buf[k_row + j] = new_kj;
                        mat_buf[j_row + k] = new_kj;
                    }
                }
                let new_app = c * c * app - 2.0 * s * c * apq + s * s * aqq;
                let new_aqq = s * s * app + 2.0 * s * c * apq + c * c * aqq;
                mat_buf[i_row + i] = new_app;
                mat_buf[j_row + j] = new_aqq;
                mat_buf[i_row + j] = 0.0;
                mat_buf[j_row + i] = 0.0;
            }
        }
    }

    for i in 0..p {
        d[i] = mat_buf[i * p + i];
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

    let m1_f64 = (m - 1) as f64;

    // Perturbation matrix Xb (N x M) in column-contiguous order
    let mut xb = vec![0.0; n * m];
    for i in 0..n {
        let x_m = x_mean[i];
        for j in 0..m {
            xb[i * m + j] = ensemble[j * n + i] - x_m;
        }
    }

    let mut ens_new = vec![0.0; m * n];
    let max_loc = precomputed.max_local_nobs;
    if max_loc == 0 {
        return;
    }

    // Stack/pre-allocated working buffers in local observation space (p x p where p <= max_loc <= 20)
    let p_sq = max_loc * max_loc;
    let mut s_p = vec![0.0; p_sq];
    let mut l_s = vec![0.0; p_sq];
    let mut u_p = vec![0.0; max_loc];
    let mut v_p = vec![0.0; max_loc];
    let mut z_mat = vec![0.0; max_loc * m];
    let mut c_mat = vec![0.0; p_sq];
    let mut mat_buf = vec![0.0; p_sq];
    let mut v_eig = vec![0.0; p_sq];
    let mut d_eig = vec![0.0; max_loc];
    let mut factor = vec![0.0; max_loc];
    let mut h_p = vec![0.0; p_sq];
    let mut q_vec = vec![0.0; max_loc];
    let mut h_vec = vec![0.0; max_loc];
    let mut d_innov = vec![0.0; max_loc];

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

        for o in 0..l_nobs {
            let o_idx = loc_obs[o];
            let ob_idx = obs_indices[o_idx];
            d_innov[o] = y[o_idx] - x_mean[ob_idx];
        }

        // 1. S_p = (M-1) * diag(loc_r_inv^-1) + Y_b * Y_b^T (p x p)
        for o in 0..l_nobs {
            let o_idx = loc_obs[o];
            let ob_idx = obs_indices[o_idx];
            let r_inv = loc_r_inv[o];
            let yo = &xb[ob_idx * m..(ob_idx + 1) * m];

            for o2 in 0..=o {
                let o2_idx = loc_obs[o2];
                let ob2_idx = obs_indices[o2_idx];
                let yo2 = &xb[ob2_idx * m..(ob2_idx + 1) * m];
                let mut dot = 0.0;
                for k in 0..m {
                    dot += yo[k] * yo2[k];
                }
                let val = dot + if o == o2 { m1_f64 / r_inv } else { 0.0 };
                s_p[o * l_nobs + o2] = val;
                s_p[o2 * l_nobs + o] = val;
            }
        }

        // 2. Cholesky L_s L_s^T = S_p (p x p)
        for r in 0..l_nobs {
            let mut sum = 0.0;
            let r_row = r * l_nobs;
            for k in 0..r {
                let val = l_s[r_row + k];
                sum += val * val;
            }
            let l_rr = (s_p[r_row + r] - sum).max(1e-12).sqrt();
            l_s[r_row + r] = l_rr;
            let inv_l_rr = 1.0 / l_rr;
            for r2 in (r + 1)..l_nobs {
                let mut sum2 = 0.0;
                let r2_row = r2 * l_nobs;
                for k in 0..r {
                    sum2 += l_s[r2_row + k] * l_s[r_row + k];
                }
                l_s[r2_row + r] = (s_p[r2_row + r] - sum2) * inv_l_rr;
            }
        }

        // 3. wa_mean = Y_b^T * (L_s^-T * L_s^-1 * d_innov)
        for r in 0..l_nobs {
            let mut sum = 0.0;
            let r_row = r * l_nobs;
            for c in 0..r {
                sum += l_s[r_row + c] * u_p[c];
            }
            u_p[r] = (d_innov[r] - sum) / l_s[r_row + r];
        }
        for r in (0..l_nobs).rev() {
            let mut sum = 0.0;
            for c in (r + 1)..l_nobs {
                sum += l_s[c * l_nobs + r] * v_p[c];
            }
            v_p[r] = (u_p[r] - sum) / l_s[r * l_nobs + r];
        }

        // delta_mean = xb_i * wa_mean = sum_o v_p[o] * sum_k xb_i[k] * Y_b[o, k]
        let xb_i = &xb[i * m..(i + 1) * m];
        let mut delta_mean = 0.0;
        for o in 0..l_nobs {
            let o_idx = loc_obs[o];
            let ob_idx = obs_indices[o_idx];
            let yo = &xb[ob_idx * m..(ob_idx + 1) * m];
            let mut dot = 0.0;
            for k in 0..m {
                dot += xb_i[k] * yo[k];
            }
            delta_mean += dot * v_p[o];
        }

        // 4. Z = L_s^-1 Y_b (p x m)
        for j in 0..m {
            for r in 0..l_nobs {
                let mut sum = 0.0;
                let r_row = r * l_nobs;
                for c in 0..r {
                    sum += l_s[r_row + c] * z_mat[c * m + j];
                }
                let o_idx = loc_obs[r];
                let ob_idx = obs_indices[o_idx];
                let y_val = xb[ob_idx * m + j];
                z_mat[r * m + j] = (y_val - sum) / l_s[r_row + r];
            }
        }

        // 5. C = Z Z^T (p x p)
        for r in 0..l_nobs {
            let zr = &z_mat[r * m..(r + 1) * m];
            for c in 0..=r {
                let zc = &z_mat[c * m..(c + 1) * m];
                let mut dot = 0.0;
                for k in 0..m {
                    dot += zr[k] * zc[k];
                }
                c_mat[r * l_nobs + c] = dot;
                if r != c {
                    c_mat[c * l_nobs + r] = dot;
                }
            }
        }

        // 6. Jacobi Eigenvalues of C (p x p)
        jacobi_eigenvalues(&c_mat, l_nobs, &mut d_eig, &mut v_eig, &mut mat_buf);

        // 7. H_p = V * diag((1 - sqrt(1 - lambda)) / lambda) * V^T (p x p)
        for k in 0..l_nobs {
            let lam = d_eig[k].clamp(0.0, 0.99999999);
            factor[k] = if lam > 1e-12 {
                (1.0 - (1.0 - lam).sqrt()) / lam
            } else {
                0.5
            };
        }
        for r in 0..l_nobs {
            for c in 0..l_nobs {
                let mut sum = 0.0;
                for k in 0..l_nobs {
                    sum += v_eig[r * l_nobs + k] * factor[k] * v_eig[c * l_nobs + k];
                }
                h_p[r * l_nobs + c] = sum;
            }
        }

        // 8. q = xb_i * Z^T (p)
        for r in 0..l_nobs {
            let zr = &z_mat[r * m..(r + 1) * m];
            let mut sum = 0.0;
            for k in 0..m {
                sum += xb_i[k] * zr[k];
            }
            q_vec[r] = sum;
        }

        // 9. h = q * H_p (p)
        for c in 0..l_nobs {
            let mut sum = 0.0;
            for r in 0..l_nobs {
                sum += q_vec[r] * h_p[r * l_nobs + c];
            }
            h_vec[c] = sum;
        }

        // 10. Update ensemble: x_mean + delta_mean + xb_i[j] - sum_r h[r] * Z[r, j]
        let base_x = x_mean[i] + delta_mean;
        for j in 0..m {
            let mut sum_hz = 0.0;
            for r in 0..l_nobs {
                sum_hz += h_vec[r] * z_mat[r * m + j];
            }
            ens_new[j * n + i] = base_x + xb_i[j] - sum_hz;
        }
    }

    ensemble.copy_from_slice(&ens_new);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_jacobi_eigenvalues_reconstruction() {
        // Test for p = 19 (L=5) and p = 39 (L=20)
        for &p in &[4, 19, 39] {
            // Create a symmetric positive semi-definite matrix A = Z * Z^T
            let m = 30;
            let mut z = vec![0.0; p * m];
            for r in 0..p {
                for c in 0..m {
                    z[r * m + c] = ((r * 13 + c * 7 + 3) % 100) as f64 / 100.0 - 0.5;
                }
            }
            let mut a = vec![0.0; p * p];
            for r in 0..p {
                for c in 0..p {
                    let mut dot = 0.0;
                    for k in 0..m {
                        dot += z[r * m + k] * z[c * m + k];
                    }
                    a[r * p + c] = dot;
                }
            }

            let mut d = vec![0.0; p];
            let mut v = vec![0.0; p * p];
            let mut buf = vec![0.0; p * p];
            jacobi_eigenvalues(&a, p, &mut d, &mut v, &mut buf);

            // 1. Check orthogonality: V * V^T = I
            for r in 0..p {
                for c in 0..p {
                    let mut dot = 0.0;
                    for k in 0..p {
                        dot += v[r * p + k] * v[c * p + k];
                    }
                    let expected = if r == c { 1.0 } else { 0.0 };
                    assert!((dot - expected).abs() < 1e-11, "V orthogonality failed at ({}, {}) for p={}", r, c, p);
                }
            }

            // 2. Check reconstruction: V * diag(d) * V^T = A
            for r in 0..p {
                for c in 0..p {
                    let mut recon = 0.0;
                    for k in 0..p {
                        recon += v[r * p + k] * d[k] * v[c * p + k];
                    }
                    let diff = (recon - a[r * p + c]).abs();
                    let scale = a[r * p + r].abs() + a[c * p + c].abs() + 1e-12;
                    assert!(diff / scale < 1e-11, "A reconstruction failed at ({}, {}) for p={}: recon={}, orig={}", r, c, p, recon, a[r * p + c]);
                }
            }
        }
    }
}
