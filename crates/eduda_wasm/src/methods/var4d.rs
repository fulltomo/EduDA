use crate::l96::{rk4_step, linearize_l96};

/// 4DVar with L-BFGS (Limited-memory BFGS) optimizer
pub fn update_4dvar(
    x: &mut [f64],
    window_x_bg: &[Vec<f64>],
    window_y: &[Option<Vec<f64>>],
    obs_indices: &[usize],
    b_inv: &[f64], // N x N
    r_diag: f64,
    dt: f64,
    f: f64,
    n: usize,
) {
    let window_len = window_x_bg.len();
    if window_len == 0 { return; }

    let x0_b = &window_x_bg[0];
    let mut x0 = x0_b.clone();
    let r_inv_diag = 1.0 / r_diag;

    let cost_4dvar = |x0_eval: &[f64]| -> f64 {
        let mut j_cost = 0.0;
        for i in 0..n {
            let di = x0_eval[i] - x0_b[i];
            let mut bd = 0.0;
            for j in 0..n {
                bd += b_inv[i * n + j] * (x0_eval[j] - x0_b[j]);
            }
            j_cost += di * bd;
        }
        j_cost *= 0.5;

        let mut x_curr = x0_eval.to_vec();
        let mut x_next = vec![0.0; n];
        for k in 0..window_len {
            if k > 0 {
                rk4_step(&x_curr, dt, f, &mut x_next);
                x_curr.copy_from_slice(&x_next);
            }
            if let Some(ref wy) = window_y[k] {
                for (ob_idx, &obs_val) in wy.iter().enumerate() {
                    let hx = x_curr[obs_indices[ob_idx]];
                    let diff = hx - obs_val;
                    j_cost += 0.5 * diff * diff * r_inv_diag;
                }
            }
        }
        j_cost
    };

    let compute_grad = |x0_eval: &[f64]| -> Vec<f64> {
        let mut traj = Vec::with_capacity(window_len);
        let mut m_list = Vec::with_capacity(window_len);
        let mut x_curr = x0_eval.to_vec();
        traj.push(x_curr.clone());

        for _k in 0..(window_len - 1) {
            let mut m_mat = vec![0.0; n * n];
            linearize_l96(&x_curr, f, dt, &mut m_mat);
            m_list.push(m_mat);

            let mut x_next = vec![0.0; n];
            rk4_step(&x_curr, dt, f, &mut x_next);
            x_curr = x_next;
            traj.push(x_curr.clone());
        }

        let mut grad = vec![0.0; n];
        for i in 0..n {
            let mut sum = 0.0;
            for j in 0..n {
                sum += b_inv[i * n + j] * (x0_eval[j] - x0_b[j]);
            }
            grad[i] = sum;
        }

        let mut adj = vec![0.0; n];
        for k in (0..window_len).rev() {
            if let Some(ref wy) = window_y[k] {
                for (ob_idx, &obs_val) in wy.iter().enumerate() {
                    let grid_idx = obs_indices[ob_idx];
                    let hx = traj[k][grid_idx];
                    let diff = hx - obs_val;
                    adj[grid_idx] += diff * r_inv_diag;
                }
            }
            if k > 0 {
                let m_mat = &m_list[k - 1];
                let mut tmp = vec![0.0; n];
                for i in 0..n {
                    let mut sum = 0.0;
                    for j in 0..n {
                        sum += m_mat[j * n + i] * adj[j];
                    }
                    tmp[i] = sum;
                }
                adj = tmp;
            }
        }

        for i in 0..n {
            grad[i] += adj[i];
        }
        grad
    };

    // L-BFGS Two-Loop Recursion
    const M_HIST: usize = 8;
    let mut s_hist: Vec<Vec<f64>> = Vec::with_capacity(M_HIST);
    let mut y_hist: Vec<Vec<f64>> = Vec::with_capacity(M_HIST);
    let mut g = compute_grad(&x0);

    for _iter in 0..25 {
        let g_norm_sq: f64 = g.iter().map(|&v| v * v).sum();
        if g_norm_sq.sqrt() < 1e-4 { break; }

        let k_len = s_hist.len();
        let mut q = g.clone();
        let mut alpha = vec![0.0; k_len];

        for i in (0..k_len).rev() {
            let s_i = &s_hist[i];
            let y_i = &y_hist[i];
            let sy: f64 = s_i.iter().zip(y_i.iter()).map(|(&a, &b)| a * b).sum();
            let sq: f64 = s_i.iter().zip(q.iter()).map(|(&a, &b)| a * b).sum();
            if sy.abs() > 1e-12 {
                alpha[i] = sq / sy;
                for j in 0..n {
                    q[j] -= alpha[i] * y_i[j];
                }
            }
        }

        let mut r_dir = q.clone();
        if k_len > 0 {
            let s_last = &s_hist[k_len - 1];
            let y_last = &y_hist[k_len - 1];
            let sy: f64 = s_last.iter().zip(y_last.iter()).map(|(&a, &b)| a * b).sum();
            let yy: f64 = y_last.iter().map(|&v| v * v).sum();
            let gamma = if yy.abs() > 1e-12 { sy / yy } else { 1.0 };
            for j in 0..n {
                r_dir[j] *= gamma;
            }
        }

        for i in 0..k_len {
            let s_i = &s_hist[i];
            let y_i = &y_hist[i];
            let sy: f64 = s_i.iter().zip(y_i.iter()).map(|(&a, &b)| a * b).sum();
            let yr: f64 = y_i.iter().zip(r_dir.iter()).map(|(&a, &b)| a * b).sum();
            if sy.abs() > 1e-12 {
                let beta = yr / sy;
                for j in 0..n {
                    r_dir[j] += s_i[j] * (alpha[i] - beta);
                }
            }
        }

        let mut dir: Vec<f64> = r_dir.iter().map(|&v| -v).collect();
        let mut dg: f64 = dir.iter().zip(g.iter()).map(|(&a, &b)| a * b).sum();
        if dg > 0.0 {
            for j in 0..n { dir[j] = -g[j]; }
            dg = -g_norm_sq;
        }

        // Armijo Backtracking Line Search
        let mut step_size = 1.0;
        let cur_cost = cost_4dvar(&x0);
        let mut x_next = x0.clone();

        for _ls in 0..12 {
            for j in 0..n {
                x_next[j] = x0[j] + dir[j] * step_size;
            }
            if cost_4dvar(&x_next) <= cur_cost + 1e-4 * step_size * dg {
                break;
            }
            step_size *= 0.5;
        }

        let s_k: Vec<f64> = x_next.iter().zip(x0.iter()).map(|(&a, &b)| a - b).collect();
        let g_next = compute_grad(&x_next);
        let y_k: Vec<f64> = g_next.iter().zip(g.iter()).map(|(&a, &b)| a - b).collect();

        let sy_check: f64 = s_k.iter().zip(y_k.iter()).map(|(&a, &b)| a * b).sum();
        if sy_check > 1e-10 {
            if s_hist.len() >= M_HIST {
                s_hist.remove(0);
                y_hist.remove(0);
            }
            s_hist.push(s_k);
            y_hist.push(y_k);
        }

        x0 = x_next;
        g = g_next;
    }

    let mut x_curr = x0;
    let mut x_next = vec![0.0; n];
    for k in 0..window_len {
        if k > 0 {
            rk4_step(&x_curr, dt, f, &mut x_next);
            x_curr.copy_from_slice(&x_next);
        }
    }
    x.copy_from_slice(&x_curr);
}
