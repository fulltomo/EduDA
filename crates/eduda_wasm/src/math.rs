//! Mathematical utilities for Lorenz '96 and Data Assimilation

/// Fast PRNG (Xoshiro256**) for reproducible, zero-allocation random numbers
pub struct Rng {
    s: [u64; 4],
}

impl Rng {
    pub fn new(seed: u64) -> Self {
        let mut s = [0u64; 4];
        let mut z = seed.wrapping_add(0x9e3779b97f4a7c15);
        for item in s.iter_mut() {
            z = (z ^ (z >> 30)).wrapping_mul(0xbf58476d1ce4e5b9);
            z = (z ^ (z >> 27)).wrapping_mul(0x94d049bb133111eb);
            *item = z ^ (z >> 31);
        }
        Self { s }
    }

    #[inline(always)]
    pub fn next_u64(&mut self) -> u64 {
        let result = self.s[1].wrapping_mul(5).rotate_left(7).wrapping_mul(9);
        let t = self.s[1] << 17;
        self.s[2] ^= self.s[0];
        self.s[3] ^= self.s[1];
        self.s[1] ^= self.s[2];
        self.s[0] ^= self.s[3];
        self.s[2] ^= t;
        self.s[3] = self.s[3].rotate_left(45);
        result
    }

    #[inline(always)]
    pub fn next_f64(&mut self) -> f64 {
        // Generate uniform random float in (0, 1)
        let v = (self.next_u64() >> 11) as f64 * (1.0 / 9007199254740992.0);
        if v == 0.0 { 1e-15 } else { v }
    }

    #[inline(always)]
    pub fn normal(&mut self) -> f64 {
        let u1 = self.next_f64();
        let u2 = self.next_f64();
        (-2.0 * u1.ln()).sqrt() * (2.0 * std::f64::consts::PI * u2).cos()
    }
}

#[inline(always)]
pub fn rmse(a: &[f64], b: &[f64]) -> f64 {
    let n = a.len();
    if n == 0 { return 0.0; }
    let mut sum = 0.0;
    for i in 0..n {
        let diff = a[i] - b[i];
        sum += diff * diff;
    }
    (sum / n as f64).sqrt()
}

#[inline(always)]
pub fn mean(arr: &[f64]) -> f64 {
    if arr.is_empty() { return 0.0; }
    arr.iter().sum::<f64>() / arr.len() as f64
}

#[inline(always)]
pub fn periodic_dist(i: usize, j: usize, n: usize) -> f64 {
    let d = (i as isize - j as isize).abs() as usize;
    (d.min(n - d)) as f64
}

#[inline(always)]
pub fn gaspari_cohn(r: f64, c: f64) -> f64 {
    if c <= 0.0 { return 1.0; }
    let dist = r / c;
    if dist >= 2.0 {
        0.0
    } else if dist <= 1.0 {
        let x = dist;
        1.0 - (5.0 / 3.0) * x * x + (5.0 / 8.0) * x * x * x + (1.0 / 2.0) * x * x * x * x - (1.0 / 4.0) * x * x * x * x * x
    } else {
        let x = dist;
        4.0 - 5.0 * x + (5.0 / 3.0) * x * x + (5.0 / 8.0) * x * x * x - (1.0 / 2.0) * x * x * x * x + (1.0 / 12.0) * x * x * x * x * x - 2.0 / (3.0 * x)
    }
}

/// Gauss-Jordan matrix inversion for N x N matrix stored row-major in flat slice
pub fn mat_inverse(a: &[f64], n: usize, out: &mut [f64]) -> bool {
    let mut m = vec![0.0f64; n * n];
    m.copy_from_slice(a);
    
    // Initialize out as identity matrix
    out.fill(0.0);
    for i in 0..n {
        out[i * n + i] = 1.0;
    }

    for i in 0..n {
        let mut max_row = i;
        let mut max_val = m[i * n + i].abs();
        for j in (i + 1)..n {
            let val = m[j * n + i].abs();
            if val > max_val {
                max_val = val;
                max_row = j;
            }
        }

        if max_row != i {
            for k in 0..n {
                m.swap(i * n + k, max_row * n + k);
                out.swap(i * n + k, max_row * n + k);
            }
        }

        let mut p = m[i * n + i];
        if p.abs() < 1e-12 {
            p = if p < 0.0 { -1e-12 } else { 1e-12 };
        }
        let inv_p = 1.0 / p;

        for j in 0..n {
            m[i * n + j] *= inv_p;
            out[i * n + j] *= inv_p;
        }

        for j in 0..n {
            if i != j {
                let f = m[j * n + i];
                for k in 0..n {
                    m[j * n + k] -= f * m[i * n + k];
                    out[j * n + k] -= f * out[i * n + k];
                }
            }
        }
    }
    true
}
