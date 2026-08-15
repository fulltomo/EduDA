use crate::math::{periodic_dist, gaspari_cohn, Rng};

pub fn update_pf(
    ensemble: &mut [f64], // M * N flat slice
    weights: &mut [f64],
    y: &[f64],
    obs_indices: &[usize],
    r_diag: f64,
    resample_thresh: f64,
    localization: f64,
    is_lpf: bool,
    m: usize,
    n: usize,
    rng: &mut Rng,
) {
    let nobs = obs_indices.len();
    if nobs == 0 { return; }

    if is_lpf {
        // EnKF-Guided Local Particle Filter (LPF / Hybrid PF)
        // Solves the curse of dimensionality by nudging particles towards observations with localized gain
        let inv_m = 1.0 / m as f64;
        let inv_m1 = 1.0 / (m - 1) as f64;

        let mut x_mean = vec![0.0; n];
        for p in 0..m {
            for i in 0..n {
                x_mean[i] += ensemble[p * n + i];
            }
        }
        for i in 0..n { x_mean[i] *= inv_m; }

        let mut h_dev = vec![0.0; m];
        let mut k_gain = vec![0.0; n];
        let mut x_mean_old = vec![0.0; n];

        for ob in 0..nobs {
            let obs_idx = obs_indices[ob];
            let y_val = y[ob];

            let mut h_mean = 0.0;
            for p in 0..m {
                h_mean += ensemble[p * n + obs_idx];
            }
            h_mean *= inv_m;

            for p in 0..m {
                h_dev[p] = ensemble[p * n + obs_idx] - h_mean;
            }

            let mut hph = 0.0;
            for p in 0..m {
                hph += h_dev[p] * h_dev[p];
            }
            hph *= inv_m1;

            let denom = hph + r_diag;
            let alpha = 1.0 / (1.0 + (r_diag / denom).sqrt());

            for i in 0..n {
                let mut cov = 0.0;
                for p in 0..m {
                    cov += (ensemble[p * n + i] - x_mean[i]) * h_dev[p];
                }
                cov *= inv_m1;
                let gloc = gaspari_cohn(periodic_dist(i, obs_idx, n), localization);
                k_gain[i] = cov * gloc / denom;
            }

            let innov = y_val - h_mean;
            x_mean_old.copy_from_slice(&x_mean);
            for i in 0..n {
                x_mean[i] += k_gain[i] * innov;
            }

            for p in 0..m {
                for i in 0..n {
                    let dev_pi = ensemble[p * n + i] - x_mean_old[i];
                    let jitter = rng.normal() * 0.01;
                    ensemble[p * n + i] = x_mean[i] + dev_pi - k_gain[i] * alpha * h_dev[p] + jitter;
                }
            }
        }
        weights.fill(1.0 / m as f64);
    } else {
        // Standard SIR (Sequential Importance Resampling Bootstrap)
        let mut max_log_lik = f64::NEG_INFINITY;
        let mut log_lik = vec![0.0; m];

        for i in 0..m {
            let mut nll = 0.0;
            for (ob_idx, &obs_val) in y.iter().enumerate() {
                let hx = ensemble[i * n + obs_indices[ob_idx]];
                let diff = obs_val - hx;
                nll += (diff * diff) / r_diag;
            }
            log_lik[i] = -0.5 * nll;
            if log_lik[i] > max_log_lik {
                max_log_lik = log_lik[i];
            }
        }

        let mut sum_w = 0.0;
        for i in 0..m {
            weights[i] = (log_lik[i] - max_log_lik).exp();
            sum_w += weights[i];
        }

        if sum_w > 0.0 {
            let inv_sum = 1.0 / sum_w;
            for i in 0..m {
                weights[i] *= inv_sum;
            }
        } else {
            weights.fill(1.0 / m as f64);
        }

        // Effective Sample Size
        let mut ess = 0.0;
        for i in 0..m {
            ess += weights[i] * weights[i];
        }
        ess = 1.0 / ess;

        if ess < resample_thresh * m as f64 {
            let mut c = vec![0.0; m];
            c[0] = weights[0];
            for i in 1..m {
                c[i] = c[i - 1] + weights[i];
            }

            let u0 = rng.next_f64() / m as f64;
            let mut idx = 0;
            let mut new_ens = vec![0.0; m * n];

            for i in 0..m {
                let u_i = u0 + i as f64 / m as f64;
                while u_i > c[idx] && idx + 1 < m {
                    idx += 1;
                }
                for j in 0..n {
                    let jitter = rng.normal() * 0.05;
                    new_ens[i * n + j] = ensemble[idx * n + j] + jitter;
                }
            }

            ensemble.copy_from_slice(&new_ens);
            weights.fill(1.0 / m as f64);
        }
    }
}
