/**
 * Mathematical and Matrix operations for DA Worker
 */

export function randomNormal() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

export function rmse(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += (a[i] - b[i]) * (a[i] - b[i]);
  }
  return Math.sqrt(sum / a.length);
}

export function mean(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function dotProduct(u, v) {
  let s = 0;
  for (let i = 0; i < u.length; i++) s += u[i] * v[i];
  return s;
}

export function periodicDist(i, j, n) {
  let d = Math.abs(i - j);
  return Math.min(d, n - d);
}

export function gaspariCohn(r, c) {
  if (c <= 0) return 1.0;
  let dist = r / c;
  if (dist >= 2.0) return 0.0;
  if (dist <= 1.0) {
    let x = dist;
    return 1.0 - (5.0 / 3.0) * x * x + (5.0 / 8.0) * x * x * x + (1.0 / 2.0) * x * x * x * x - (1.0 / 4.0) * x * x * x * x * x;
  } else {
    let x = dist;
    return 4.0 - 5.0 * x + (5.0 / 3.0) * x * x + (5.0 / 8.0) * x * x * x - (1.0 / 2.0) * x * x * x * x + (1.0 / 12.0) * x * x * x * x * x - 2.0 / (3.0 * x);
  }
}

// Matrix & Vector operations
export function matMul(A, B) {
  const m = A.length, n = B[0].length, p = B.length;
  const C = new Array(m);
  for (let i = 0; i < m; i++) {
    const row = new Float64Array(n);
    const Ai = A[i];
    for (let j = 0; j < n; j++) {
      let sum = 0;
      for (let k = 0; k < p; k++) sum += Ai[k] * B[k][j];
      row[j] = sum;
    }
    C[i] = row;
  }
  return C;
}

export function matVecMul(A, x) {
  const m = A.length, n = x.length;
  const y = new Float64Array(m);
  for (let i = 0; i < m; i++) {
    let sum = 0;
    const Ai = A[i];
    for (let j = 0; j < n; j++) sum += Ai[j] * x[j];
    y[i] = sum;
  }
  return y;
}

export function matTranspose(A) {
  const m = A.length, n = A[0].length;
  const B = new Array(n);
  for (let j = 0; j < n; j++) {
    B[j] = new Float64Array(m);
  }
  for (let i = 0; i < m; i++) {
    const Ai = A[i];
    for (let j = 0; j < n; j++) B[j][i] = Ai[j];
  }
  return B;
}

export function matAdd(A, B) {
  const m = A.length, n = A[0].length;
  const C = new Array(m);
  for (let i = 0; i < m; i++) {
    const row = new Float64Array(n);
    const Ai = A[i], Bi = B[i];
    for (let j = 0; j < n; j++) row[j] = Ai[j] + Bi[j];
    C[i] = row;
  }
  return C;
}

export function matSub(A, B) {
  const m = A.length, n = A[0].length;
  const C = new Array(m);
  for (let i = 0; i < m; i++) {
    const row = new Float64Array(n);
    const Ai = A[i], Bi = B[i];
    for (let j = 0; j < n; j++) row[j] = Ai[j] - Bi[j];
    C[i] = row;
  }
  return C;
}

export function matScale(A, s) {
  const m = A.length, n = A[0].length;
  const C = new Array(m);
  for (let i = 0; i < m; i++) {
    const row = new Float64Array(n);
    const Ai = A[i];
    for (let j = 0; j < n; j++) row[j] = Ai[j] * s;
    C[i] = row;
  }
  return C;
}

export function vecAdd(a, b) {
  const n = a.length;
  const out = new Array(n);
  for (let i = 0; i < n; i++) out[i] = a[i] + b[i];
  return out;
}

export function vecSub(a, b) {
  const n = a.length;
  const out = new Array(n);
  for (let i = 0; i < n; i++) out[i] = a[i] - b[i];
  return out;
}

export function vecScale(a, s) {
  const n = a.length;
  const out = new Array(n);
  for (let i = 0; i < n; i++) out[i] = a[i] * s;
  return out;
}

export function identity(n) {
  const I = new Array(n);
  for (let i = 0; i < n; i++) {
    I[i] = new Float64Array(n);
    I[i][i] = 1.0;
  }
  return I;
}

export function matInverse(A) {
  const n = A.length;
  const M = new Array(n);
  for (let i = 0; i < n; i++) {
    const row = new Float64Array(n);
    const Ai = A[i];
    for (let j = 0; j < n; j++) row[j] = Ai[j];
    M[i] = row;
  }
  const I = identity(n);

  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(M[j][i]) > Math.abs(M[maxRow][i])) maxRow = j;
    }

    let tmp = M[i]; M[i] = M[maxRow]; M[maxRow] = tmp;
    tmp = I[i]; I[i] = I[maxRow]; I[maxRow] = tmp;

    let p = M[i][i];
    if (Math.abs(p) < 1e-12) p = p < 0 ? -1e-12 : 1e-12;

    for (let j = 0; j < n; j++) {
      M[i][j] /= p;
      I[i][j] /= p;
    }

    for (let j = 0; j < n; j++) {
      if (i !== j) {
        let f = M[j][i];
        for (let k = 0; k < n; k++) {
          M[j][k] -= f * M[i][k];
          I[j][k] -= f * I[i][k];
        }
      }
    }
  }
  return I;
}

/**
 * Pre-compute Gaspari-Cohn localization values for all grid point pairs.
 * Returns a Float64Array of size N*nobs with gc[i*nobs+j] = gaspariCohn(periodicDist(i, obsIndices[j], N), locRadius)
 */
export function buildGCTable(N, obsIndices, locRadius) {
  const nobs = obsIndices.length;
  const table = new Float64Array(N * nobs);
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < nobs; j++) {
      table[i * nobs + j] = gaspariCohn(periodicDist(i, obsIndices[j], N), locRadius);
    }
  }
  return table;
}
