use crate::math::{periodic_dist, gaspari_cohn};

pub fn update_ensrf(
    ensemble: &mut [f64], // M * N flat slice
    x_mean: &mut [f64],
    y: &[f64],
    obs_indices: &[usize],
    r_diag: f64,
    localization: f64,
    m: usize,
    n: usize,
) {
    let nobs = obs_indices.len();
    if nobs == 0 { return; }

    let inv_m = 1.0 / m as f64;
    let inv_m1 = 1.0 / (m - 1) as f64;

    let mut h_dev = vec![0.0; m];
    let mut k_gain = vec![0.0; n];
    let mut x_mean_old = vec![0.0; n];

    for ob in 0..nobs {
        let obs_idx = obs_indices[ob];
        let y_val = y[ob];

        let mut h_mean = 0.0;
        for j in 0..m {
            h_mean += ensemble[j * n + obs_idx];
        }
        h_mean *= inv_m;

        for j in 0..m {
            h_dev[j] = ensemble[j * n + obs_idx] - h_mean;
        }

        let mut hph = 0.0;
        for j in 0..m {
            hph += h_dev[j] * h_dev[j];
        }
        hph *= inv_m1;

        let denom = hph + r_diag;
        let alpha = 1.0 / (1.0 + (r_diag / denom).sqrt());

        for i in 0..n {
            let mut cov = 0.0;
            for j in 0..m {
                cov += (ensemble[j * n + i] - x_mean[i]) * h_dev[j];
            }
            cov *= inv_m1;
            let gloc = gaspari_cohn(periodic_dist(i, obs_idx, n), localization);
            k_gain[i] = cov * gloc / denom;
        }

        let innov = y_val - h_mean;
        x_mean_old.copy_from_slice(x_mean);
        for i in 0..n {
            x_mean[i] += k_gain[i] * innov;
        }

        for j in 0..m {
            for i in 0..n {
                let dev_ji = ensemble[j * n + i] - x_mean_old[i];
                ensemble[j * n + i] = x_mean[i] + dev_ji - k_gain[i] * alpha * h_dev[j];
            }
        }
    }
}
