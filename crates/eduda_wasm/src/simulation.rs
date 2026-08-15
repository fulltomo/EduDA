use serde::{Deserialize, Serialize};
use crate::math::{Rng, rmse, mean, periodic_dist, gaspari_cohn, mat_inverse};
use crate::l96::{rk4_step, linearize_l96};
use crate::methods::{
    ekf::update_ekf,
    enkf::update_enkf,
    ensrf::update_ensrf,
    letkf::update_letkf,
    var3d::update_3dvar,
    var4d::update_4dvar,
    pf::update_pf,
};

#[derive(Deserialize)]
pub struct MethodConfig {
    pub id: String,
    #[serde(rename = "type")]
    pub method_type: String,
    #[serde(default)]
    pub params: serde_json::Value,
}

#[derive(Deserialize)]
pub struct AdvancedOptions {
    #[serde(default = "default_n", rename = "N")]
    pub n: usize,
    #[serde(default = "default_f", rename = "F")]
    pub f: f64,
    #[serde(default = "default_obs_error_var", rename = "obsErrorVar")]
    pub obs_error_var: f64,
    #[serde(default = "default_obs_interval", rename = "obsInterval")]
    pub obs_interval: usize,
    #[serde(default = "default_num_steps", rename = "numSteps")]
    pub num_steps: usize,
    #[serde(default = "default_dt", rename = "dt")]
    pub dt: f64,
    #[serde(default, rename = "sparseRegionStart")]
    pub sparse_region_start: usize,
    #[serde(default = "default_sparse_end", rename = "sparseRegionEnd")]
    pub sparse_region_end: usize,
    #[serde(default = "default_thin_obs", rename = "thinNumObs")]
    pub thin_num_obs: usize,
}

fn default_n() -> usize { 40 }
fn default_f() -> f64 { 8.0 }
fn default_obs_error_var() -> f64 { 1.0 }
fn default_obs_interval() -> usize { 1 }
fn default_num_steps() -> usize { 500 }
fn default_dt() -> f64 { 0.05 }
fn default_sparse_end() -> usize { 19 }
fn default_thin_obs() -> usize { 20 }

impl Default for AdvancedOptions {
    fn default() -> Self {
        Self {
            n: default_n(),
            f: default_f(),
            obs_error_var: default_obs_error_var(),
            obs_interval: default_obs_interval(),
            num_steps: default_num_steps(),
            dt: default_dt(),
            sparse_region_start: 0,
            sparse_region_end: default_sparse_end(),
            thin_num_obs: default_thin_obs(),
        }
    }
}

#[derive(Deserialize)]
pub struct SimPayload {
    pub methods: Vec<MethodConfig>,
    #[serde(rename = "observationMode")]
    pub observation_mode: String,
    #[serde(rename = "advancedOptions")]
    pub advanced_options: Option<AdvancedOptions>,
    #[serde(rename = "customObsIndices")]
    pub custom_obs_indices: Option<Vec<usize>>,
}

#[derive(Serialize)]
pub struct MethodResult {
    #[serde(rename = "methodId")]
    pub method_id: String,
    #[serde(rename = "methodType")]
    pub method_type: String,
    #[serde(rename = "rmseTimeSeries")]
    pub rmse_time_series: Vec<f64>,
    #[serde(rename = "spreadTimeSeries")]
    pub spread_time_series: Vec<f64>,
    #[serde(rename = "avgRmse")]
    pub avg_rmse: f64,
    #[serde(rename = "avgSpread")]
    pub avg_spread: f64,
    #[serde(rename = "timeSteps")]
    pub time_steps: Vec<usize>,
    #[serde(rename = "truthHistory")]
    pub truth_history: Vec<Vec<f64>>,
    #[serde(rename = "obsHistory")]
    pub obs_history: Vec<Option<Vec<f64>>>,
    #[serde(rename = "analysisHistory")]
    pub analysis_history: Vec<Vec<f64>>,
}

#[derive(Serialize)]
pub struct SimOutput {
    pub results: Vec<MethodResult>,
    #[serde(rename = "obsIndices")]
    pub obs_indices: Vec<usize>,
}

struct MethodState {
    id: String,
    method_type: String,
    x: Vec<f64>,
    p_mat: Vec<f64>,
    ensemble: Vec<f64>, // M * N flat slice
    weights: Vec<f64>,
    ensemble_size: usize,
    inflation: f64,
    localization: f64,
    b_inv: Vec<f64>,
    pa_mat: Vec<f64>,
    k_3dvar: Vec<f64>,
    process_noise: f64,
    resample_thresh: f64,
    is_lpf: bool,
    window_size: usize,
    window_start_step: usize,
    window_x_bg: Vec<Vec<f64>>,
    window_y: Vec<Option<Vec<f64>>>,
    rmse_series: Vec<f64>,
    spread_series: Vec<f64>,
    time_steps: Vec<usize>,
    analysis_history: Vec<Vec<f64>>,
}

pub fn run_simulation(payload: SimPayload) -> Result<SimOutput, String> {
    let adv = payload.advanced_options.unwrap_or_default();
    let n = adv.n;
    let f = adv.f;
    let r_diag = adv.obs_error_var;
    let obs_interval = adv.obs_interval;
    let num_steps = adv.num_steps;
    let dt = adv.dt;

    // 1. Setup observation indices
    let mut obs_indices: Vec<usize> = match payload.observation_mode.as_str() {
        "full" => (0..n).collect(),
        "sparse" => {
            let start = adv.sparse_region_start.min(adv.sparse_region_end);
            let end = adv.sparse_region_start.max(adv.sparse_region_end);
            (start..=end).map(|i| i % n).collect()
        }
        "thinned" => {
            let num_obs = adv.thin_num_obs.clamp(1, n);
            let mut indices = Vec::with_capacity(num_obs);
            for k in 0..num_obs {
                let idx = ((k as f64 * n as f64 / num_obs as f64).round() as usize) % n;
                indices.push(idx);
            }
            indices
        }
        "custom" => {
            let mut indices = payload.custom_obs_indices.unwrap_or_default();
            indices.retain(|&idx| idx < n);
            indices.sort_unstable();
            indices
        }
        _ => (0..n).collect(),
    };
    obs_indices.dedup();
    let nobs = obs_indices.len();

    let mut rng = Rng::new(42);

    // 2. Spin-up Lorenz '96
    let mut x_true = vec![f; n];
    for i in 0..n {
        x_true[i] += rng.normal() * 0.1;
    }
    let mut tmp = vec![0.0; n];
    for _ in 0..1000 {
        rk4_step(&x_true, dt, f, &mut tmp);
        x_true.copy_from_slice(&tmp);
    }

    let mut truth_history = Vec::with_capacity(num_steps + 1);
    let mut obs_history = Vec::with_capacity(num_steps + 1);
    let mut state_true = x_true.clone();

    let r_std = r_diag.sqrt();

    for step in 0..=num_steps {
        truth_history.push(state_true.clone());

        let is_obs_time = step % obs_interval == 0;
        if is_obs_time && step > 0 && nobs > 0 {
            let mut y = Vec::with_capacity(nobs);
            for &idx in &obs_indices {
                y.push(state_true[idx] + rng.normal() * r_std);
            }
            obs_history.push(Some(y));
        } else {
            obs_history.push(None);
        }

        if step < num_steps {
            rk4_step(&state_true, dt, f, &mut tmp);
            state_true.copy_from_slice(&tmp);
        }
    }

    // 3. Initialize Methods
    let mut method_states = Vec::with_capacity(payload.methods.len());
    let initial_mean: Vec<f64> = truth_history[0].iter().map(|&v| v + rng.normal() * 1.5).collect();

    for m in &payload.methods {
        let p = &m.params;
        let mut state = MethodState {
            id: m.id.clone(),
            method_type: m.method_type.clone(),
            x: initial_mean.clone(),
            p_mat: vec![0.0; n * n],
            ensemble: Vec::new(),
            weights: Vec::new(),
            ensemble_size: 30,
            inflation: 1.05,
            localization: 5.0,
            b_inv: vec![0.0; n * n],
            pa_mat: vec![0.0; n * n],
            k_3dvar: vec![0.0; n * nobs],
            process_noise: 0.01,
            resample_thresh: 0.5,
            is_lpf: true,
            window_size: 5,
            window_start_step: 0,
            window_x_bg: Vec::new(),
            window_y: Vec::new(),
            rmse_series: Vec::with_capacity(num_steps + 1),
            spread_series: Vec::with_capacity(num_steps + 1),
            time_steps: Vec::with_capacity(num_steps + 1),
            analysis_history: Vec::with_capacity(num_steps + 1),
        };

        if state.method_type == "EKF" {
            state.process_noise = p.get("processNoise").and_then(|v| v.as_f64()).unwrap_or(0.01);
            for i in 0..n {
                state.p_mat[i * n + i] = 1.0;
            }
        } else if ["POEnKF", "EnKF", "EnSRF", "LETKF", "PF"].contains(&state.method_type.as_str()) {
            let ens_size = p.get("ensembleSize").and_then(|v| v.as_u64()).unwrap_or(30) as usize;
            state.ensemble_size = ens_size;
            state.inflation = p.get("inflation").and_then(|v| v.as_f64()).unwrap_or(1.05);
            state.localization = p.get("localization").and_then(|v| v.as_f64()).unwrap_or(if state.method_type == "PF" { 3.0 } else { 5.0 });
            state.resample_thresh = p.get("resampleThreshold").and_then(|v| v.as_f64()).unwrap_or(0.5);

            if state.method_type == "PF" {
                let filter_type = p.get("filterType").and_then(|v| v.as_str()).unwrap_or("LPF");
                state.is_lpf = filter_type == "LPF";
            }

            state.ensemble = vec![0.0; ens_size * n];
            for i in 0..ens_size {
                for j in 0..n {
                    state.ensemble[i * n + j] = initial_mean[j] + rng.normal() * 1.5;
                }
            }
            if state.method_type == "PF" {
                state.weights = vec![1.0 / ens_size as f64; ens_size];
            }
        }

        if state.method_type == "3DVar" || state.method_type == "4DVar" {
            let corr_l = p.get("corrLength").and_then(|v| v.as_f64()).unwrap_or(5.0);
            let sigma_b2 = p.get("bgErrorVar").and_then(|v| v.as_f64()).unwrap_or(1.0);
            state.window_size = p.get("windowSize").and_then(|v| v.as_u64()).unwrap_or(5) as usize;

            let mut b_mat = vec![0.0; n * n];
            for i in 0..n {
                for j in 0..n {
                    let dist = periodic_dist(i, j, n);
                    b_mat[i * n + j] = gaspari_cohn(dist, corr_l) * sigma_b2;
                }
                b_mat[i * n + i] += 0.05;
            }
            mat_inverse(&b_mat, n, &mut state.b_inv);

            if nobs > 0 {
                // S_3d = H*B*H^T + R: nobs x nobs
                let mut s_3d = vec![0.0; nobs * nobs];
                for i in 0..nobs {
                    let oi = obs_indices[i];
                    for j in 0..nobs {
                        let oj = obs_indices[j];
                        s_3d[i * nobs + j] = b_mat[oi * n + oj] + if i == j { r_diag } else { 0.0 };
                    }
                }
                let mut s_3d_inv = vec![0.0; nobs * nobs];
                mat_inverse(&s_3d, nobs, &mut s_3d_inv);

                // K_3d = B*H^T * S_3d_inv: N x nobs
                for i in 0..n {
                    for j in 0..nobs {
                        let mut sum = 0.0;
                        for k in 0..nobs {
                            sum += b_mat[i * n + obs_indices[k]] * s_3d_inv[k * nobs + j];
                        }
                        state.k_3dvar[i * nobs + j] = sum;
                    }
                }

                // Pa = (I - K*H) * B: N x N
                for i in 0..n {
                    for j in 0..n {
                        let mut kh_b = 0.0;
                        for k in 0..nobs {
                            kh_b += state.k_3dvar[i * nobs + k] * b_mat[obs_indices[k] * n + j];
                        }
                        state.pa_mat[i * n + j] = b_mat[i * n + j] - kh_b;
                    }
                }
            } else {
                state.pa_mat = b_mat;
            }

            if state.method_type == "4DVar" {
                state.window_x_bg.push(state.x.clone());
                state.window_y.push(obs_history[0].clone());
            }
        }

        method_states.push(state);
    }

    // 4. Main Simulation Loop
    let mut x_tmp = vec![0.0; n];
    let mut m_lin = vec![0.0; n * n];

    for step in 0..=num_steps {
        let is_obs_step = step % obs_interval == 0 && step > 0;
        let y_obs = obs_history[step].as_deref();
        let has_obs = is_obs_step && nobs > 0 && y_obs.is_some();

        for state in &mut method_states {
            // 4.1 Forecast Step
            if step > 0 {
                if state.method_type == "EKF" || state.method_type == "3DVar" {
                    if state.method_type == "EKF" {
                        linearize_l96(&state.x, f, dt, &mut m_lin);
                    }
                    rk4_step(&state.x, dt, f, &mut x_tmp);
                    state.x.copy_from_slice(&x_tmp);

                    if state.method_type == "EKF" {
                        // P = M * P * M^T + Q
                        let mut mp = vec![0.0; n * n];
                        for i in 0..n {
                            for j in 0..n {
                                let mut sum = 0.0;
                                for k in 0..n {
                                    sum += m_lin[i * n + k] * state.p_mat[k * n + j];
                                }
                                mp[i * n + j] = sum;
                            }
                        }
                        for i in 0..n {
                            for j in 0..n {
                                let mut sum = 0.0;
                                for k in 0..n {
                                    sum += mp[i * n + k] * m_lin[j * n + k]; // M^T[k, j] = M[j, k]
                                }
                                state.p_mat[i * n + j] = sum + if i == j { state.process_noise } else { 0.0 };
                            }
                        }
                    }
                } else if ["POEnKF", "EnKF", "EnSRF", "LETKF", "PF"].contains(&state.method_type.as_str()) {
                    let m = state.ensemble_size;
                    let mut ens_i = vec![0.0; n];
                    for i in 0..m {
                        ens_i.copy_from_slice(&state.ensemble[(i * n)..((i + 1) * n)]);
                        rk4_step(&ens_i, dt, f, &mut x_tmp);
                        if state.method_type == "PF" {
                            for j in 0..n {
                                x_tmp[j] += rng.normal() * 0.05;
                            }
                        }
                        state.ensemble[(i * n)..((i + 1) * n)].copy_from_slice(&x_tmp);
                    }
                } else if state.method_type == "4DVar" {
                    rk4_step(&state.x, dt, f, &mut x_tmp);
                    state.x.copy_from_slice(&x_tmp);
                    state.window_x_bg.push(state.x.clone());
                    state.window_y.push(obs_history[step].clone());
                }
            }

            // 4.2 Analysis Step
            if has_obs {
                let y = y_obs.unwrap();
                if state.method_type == "EKF" {
                    update_ekf(&mut state.x, &mut state.p_mat, y, &obs_indices, r_diag, n);
                } else if state.method_type == "3DVar" {
                    update_3dvar(&mut state.x, y, &obs_indices, &state.k_3dvar, n);
                } else if state.method_type == "4DVar" {
                    if state.window_x_bg.len() >= state.window_size || step == num_steps {
                        let traj = update_4dvar(
                            &mut state.x,
                            &state.window_x_bg,
                            &state.window_y,
                            &obs_indices,
                            &state.b_inv,
                            r_diag,
                            dt,
                            f,
                            n,
                        );
                        for (k, state_k) in traj.into_iter().enumerate() {
                            let cur_step = state.window_start_step + k;
                            if cur_step > 0 && cur_step <= num_steps {
                                let idx = cur_step - 1;
                                if idx < state.rmse_series.len() {
                                    state.analysis_history[idx] = state_k.clone();
                                    state.rmse_series[idx] = rmse(&state_k, &truth_history[cur_step]);
                                }
                            }
                        }
                        state.window_x_bg.clear();
                        state.window_y.clear();
                        state.window_x_bg.push(state.x.clone());
                        state.window_y.push(None);
                        state.window_start_step = step;
                    }
                } else if ["POEnKF", "EnKF", "EnSRF", "LETKF"].contains(&state.method_type.as_str()) {
                    let m = state.ensemble_size;
                    let inflation = state.inflation;
                    let localization = state.localization;

                    // Ensemble mean and inflation
                    let mut x_mean = vec![0.0; n];
                    for i in 0..m {
                        for j in 0..n {
                            x_mean[j] += state.ensemble[i * n + j];
                        }
                    }
                    let inv_m = 1.0 / m as f64;
                    for j in 0..n { x_mean[j] *= inv_m; }

                    for i in 0..m {
                        for j in 0..n {
                            let val = state.ensemble[i * n + j];
                            state.ensemble[i * n + j] = x_mean[j] + (val - x_mean[j]) * inflation;
                        }
                    }

                    x_mean.fill(0.0);
                    for i in 0..m {
                        for j in 0..n {
                            x_mean[j] += state.ensemble[i * n + j];
                        }
                    }
                    for j in 0..n { x_mean[j] *= inv_m; }

                    if state.method_type == "POEnKF" || state.method_type == "EnKF" {
                        update_enkf(
                            &mut state.ensemble,
                            &x_mean,
                            y,
                            &obs_indices,
                            r_diag,
                            localization,
                            m,
                            n,
                            &mut rng,
                        );
                    } else if state.method_type == "EnSRF" {
                        update_ensrf(
                            &mut state.ensemble,
                            &mut x_mean,
                            y,
                            &obs_indices,
                            r_diag,
                            localization,
                            m,
                            n,
                        );
                    } else if state.method_type == "LETKF" {
                        update_letkf(
                            &mut state.ensemble,
                            &x_mean,
                            y,
                            &obs_indices,
                            r_diag,
                            localization,
                            m,
                            n,
                        );
                    }
                } else if state.method_type == "PF" {
                    update_pf(
                        &mut state.ensemble,
                        &mut state.weights,
                        y,
                        &obs_indices,
                        r_diag,
                        state.resample_thresh,
                        state.localization,
                        state.is_lpf,
                        state.ensemble_size,
                        n,
                        &mut rng,
                    );
                }
            }

            // 4.3 Record Stats
            if is_obs_step {
                let mut analysis_mean = vec![0.0; n];
                let analysis_spread = if state.method_type == "EKF" {
                    analysis_mean.copy_from_slice(&state.x);
                    let mut trace_p = 0.0;
                    for i in 0..n { trace_p += state.p_mat[i * n + i]; }
                    (trace_p / n as f64).max(0.0).sqrt()
                } else if state.method_type == "3DVar" || state.method_type == "4DVar" {
                    analysis_mean.copy_from_slice(&state.x);
                    let mut trace_pa = 0.0;
                    for i in 0..n { trace_pa += state.pa_mat[i * n + i]; }
                    (trace_pa / n as f64).max(0.0).sqrt()
                } else if state.method_type == "PF" {
                    let m = state.ensemble_size;
                    for i in 0..m {
                        let w = state.weights[i];
                        for j in 0..n {
                            analysis_mean[j] += state.ensemble[i * n + j] * w;
                        }
                    }
                    let mut var_sum = 0.0;
                    for i in 0..m {
                        let w = state.weights[i];
                        for j in 0..n {
                            let diff = state.ensemble[i * n + j] - analysis_mean[j];
                            var_sum += w * diff * diff;
                        }
                    }
                    (var_sum / n as f64).sqrt()
                } else {
                    let m = state.ensemble_size;
                    let inv_m = 1.0 / m as f64;
                    for i in 0..m {
                        for j in 0..n {
                            analysis_mean[j] += state.ensemble[i * n + j];
                        }
                    }
                    for j in 0..n { analysis_mean[j] *= inv_m; }

                    let mut var_sum = 0.0;
                    for i in 0..m {
                        for j in 0..n {
                            let diff = state.ensemble[i * n + j] - analysis_mean[j];
                            var_sum += diff * diff;
                        }
                    }
                    let denom = (m.saturating_sub(1) * n).max(1) as f64;
                    (var_sum / denom).sqrt()
                };

                let step_rmse = rmse(&analysis_mean, &truth_history[step]);
                state.analysis_history.push(analysis_mean);
                state.rmse_series.push(step_rmse);
                state.spread_series.push(analysis_spread);
                state.time_steps.push(step);
            }
        }
    }

    // 5. Format Output
    let results: Vec<MethodResult> = method_states
        .into_iter()
        .map(|state| {
            let total = state.rmse_series.len();
            let burn_in = (total / 5).min(50);
            let eval_rmse = if total > burn_in { &state.rmse_series[burn_in..] } else { &state.rmse_series[..] };
            let eval_spread = if total > burn_in { &state.spread_series[burn_in..] } else { &state.spread_series[..] };

            MethodResult {
                method_id: state.id,
                method_type: state.method_type,
                rmse_time_series: state.rmse_series.clone(),
                spread_time_series: state.spread_series.clone(),
                avg_rmse: mean(eval_rmse),
                avg_spread: mean(eval_spread),
                time_steps: state.time_steps,
                truth_history: truth_history.clone(),
                obs_history: obs_history.clone(),
                analysis_history: state.analysis_history,
            }
        })
        .collect();

    Ok(SimOutput {
        results,
        obs_indices,
    })
}
