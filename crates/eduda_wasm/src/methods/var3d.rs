pub fn update_3dvar(
    x: &mut [f64],
    y: &[f64],
    obs_indices: &[usize],
    k_3dvar: &[f64], // N x nobs
    n: usize,
) {
    let nobs = obs_indices.len();
    if nobs == 0 { return; }

    let mut innov = vec![0.0; nobs];
    for i in 0..nobs {
        innov[i] = y[i] - x[obs_indices[i]];
    }

    for i in 0..n {
        let mut sum = 0.0;
        for j in 0..nobs {
            sum += k_3dvar[i * nobs + j] * innov[j];
        }
        x[i] += sum;
    }
}
