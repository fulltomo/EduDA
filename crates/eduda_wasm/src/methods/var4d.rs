use crate::l96::{rk4_step, linearize_l96};

pub fn update_4dvar(
    x: &mut [f64],
    window_x_bg: &[Vec<f64>], // background states in window
    window_y: &[Option<Vec<f64>>], // observations in window
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
        // Background cost: 0.5 * (x0 - x0_b)^T B^-1 (x0 - x0_b)
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

    for _iter in 0..25 {
        let mut traj = Vec::with_capacity(window_len);
        let mut m_list = Vec::with_capacity(window_len);
        let mut x_curr = x0.clone();
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

        // grad = B_inv * (x0 - x0_b)
        let mut grad = vec![0.0; n];
        for i in 0..n {
            let mut sum = 0.0;
            for j in 0..n {
                sum += b_inv[i * n + j] * (x0[j] - x0_b[j]);
            }
            grad[i] = sum;
        }

        // Adjoint integration backwards in time
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
                        sum += m_mat[j * n + i] * adj[j]; // M^T * adj
                    }
                    tmp[i] = sum;
                }
                adj = tmp;
            }
        }

        for i in 0..n {
            grad[i] += adj[i];
        }

        // Line search
        let mut step_size = 0.05;
        let current_cost = cost_4dvar(&x0);
        let mut found = false;
        for _ls in 0..10 {
            let mut x0_next = vec![0.0; n];
            for i in 0..n {
                x0_next[i] = x0[i] - grad[i] * step_size;
            }
            if cost_4dvar(&x0_next) < current_cost {
                x0 = x0_next;
                found = true;
                break;
            }
            step_size *= 0.5;
        }
        if !found { break; }
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
