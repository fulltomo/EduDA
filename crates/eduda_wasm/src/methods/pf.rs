use crate::math::Rng;

pub fn update_pf(
    ensemble: &mut [f64], // M * N flat slice
    weights: &mut [f64],
    y: &[f64],
    obs_indices: &[usize],
    r_diag: f64,
    resample_thresh: f64,
    m: usize,
    n: usize,
    rng: &mut Rng,
) {
    let nobs = obs_indices.len();
    if nobs == 0 { return; }

    let mut max_log_lik = f64::NEG_INFINITY;
    let mut log_lik = vec![0.0; m];

    let temp_scale = (nobs as f64 / 10.0).max(1.0);

    for i in 0..m {
        let mut nll = 0.0;
        for (ob_idx, &obs_val) in y.iter().enumerate() {
            let hx = ensemble[i * n + obs_indices[ob_idx]];
            let diff = obs_val - hx;
            nll += (diff * diff) / r_diag;
        }
        log_lik[i] = -0.5 * (nll / temp_scale);
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
        let inv_m = 1.0 / m as f64;
        for i in 0..m {
            weights[i] = inv_m;
        }
    }

    // Effective Sample Size
    let mut ess = 0.0;
    for i in 0..m {
        ess += weights[i] * weights[i];
    }
    ess = 1.0 / ess;

    if ess < resample_thresh * m as f64 {
        // Systematic resampling
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
