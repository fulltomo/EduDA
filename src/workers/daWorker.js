self.onmessage = function(e) {
  if (e.data.type === 'RUN_SIMULATION') {
    runSimulation(e.data.payload);
  }
};

function runSimulation(payload) {
  try {
    const { methods, observationMode, advancedOptions } = payload;
    const {
      N = 40,
      F = 8.0,
      obsErrorVar = 1.0,
      obsInterval = 1,
      numSteps = 500,
      dt = 0.05,
      sparseInterval = 4,
      sparseRegionStart = 0,
      sparseRegionEnd = 39,
      thinInterval = 2,
    } = advancedOptions || {};

    const R_diag = obsErrorVar;
    
    // 1. Math and matrix helpers
    function randomNormal() {
      let u = 0, v = 0;
      while (u === 0) u = Math.random();
      while (v === 0) v = Math.random();
      return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }

    function rmse(a, b) {
      let sum = 0;
      for (let i = 0; i < a.length; i++) {
        sum += (a[i] - b[i]) * (a[i] - b[i]);
      }
      return Math.sqrt(sum / a.length);
    }

    function mean(arr) {
      if (!arr || arr.length === 0) return 0;
      return arr.reduce((a, b) => a + b, 0) / arr.length;
    }

    function periodicDist(i, j, n) {
      let d = Math.abs(i - j);
      return Math.min(d, n - d);
    }

    function gaspariCohn(r, c) {
      if (c <= 0) return 1.0;
      let dist = r / c;
      if (dist >= 2.0) return 0.0;
      if (dist <= 1.0) {
        let x = dist;
        return 1.0 - (5.0/3.0)*x*x + (5.0/8.0)*x*x*x + (1.0/2.0)*x*x*x*x - (1.0/4.0)*x*x*x*x*x;
      } else {
        let x = dist;
        return 4.0 - 5.0*x + (5.0/3.0)*x*x + (5.0/8.0)*x*x*x - (1.0/2.0)*x*x*x*x + (1.0/12.0)*x*x*x*x*x - 2.0/(3.0*x);
      }
    }

    // Matrix operations
    function matMul(A, B) {
      let m = A.length, n = B[0].length, p = B.length;
      let C = Array(m).fill().map(() => Array(n).fill(0));
      for (let i = 0; i < m; i++) {
        for (let j = 0; j < n; j++) {
          let sum = 0;
          for (let k = 0; k < p; k++) {
            sum += A[i][k] * B[k][j];
          }
          C[i][j] = sum;
        }
      }
      return C;
    }

    function matVecMul(A, x) {
      let m = A.length, n = x.length;
      let y = Array(m).fill(0);
      for (let i = 0; i < m; i++) {
        let sum = 0;
        for (let j = 0; j < n; j++) sum += A[i][j] * x[j];
        y[i] = sum;
      }
      return y;
    }

    function matTranspose(A) {
      let m = A.length, n = A[0].length;
      let B = Array(n).fill().map(() => Array(m).fill(0));
      for (let i = 0; i < m; i++) {
        for (let j = 0; j < n; j++) B[j][i] = A[i][j];
      }
      return B;
    }

    function matAdd(A, B) {
      let m = A.length, n = A[0].length;
      let C = Array(m).fill().map(() => Array(n).fill(0));
      for(let i=0; i<m; i++) for(let j=0; j<n; j++) C[i][j] = A[i][j] + B[i][j];
      return C;
    }

    function matSub(A, B) {
      let m = A.length, n = A[0].length;
      let C = Array(m).fill().map(() => Array(n).fill(0));
      for(let i=0; i<m; i++) for(let j=0; j<n; j++) C[i][j] = A[i][j] - B[i][j];
      return C;
    }

    function matScale(A, s) {
      let m = A.length, n = A[0].length;
      let C = Array(m).fill().map(() => Array(n).fill(0));
      for(let i=0; i<m; i++) for(let j=0; j<n; j++) C[i][j] = A[i][j] * s;
      return C;
    }

    function vecAdd(a, b) {
      return a.map((val, i) => val + b[i]);
    }

    function vecSub(a, b) {
      return a.map((val, i) => val - b[i]);
    }

    function vecScale(a, s) {
      return a.map(val => val * s);
    }
    
    function identity(n) {
      let I = Array(n).fill().map(() => Array(n).fill(0));
      for(let i=0; i<n; i++) I[i][i] = 1.0;
      return I;
    }

    function matInverse(A) {
      let n = A.length;
      let M = A.map(row => row.slice());
      let I = identity(n);
      
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

    function jacobiEigen(A, iterMax=50) {
      let n = A.length;
      let V = identity(n);
      let D = A.map(row => row.slice());
      for(let it=0; it<iterMax; it++){
        let maxVal = 0, p=0, q=1;
        for(let r=0; r<n-1; r++){
          for(let c=r+1; c<n; c++){
            if(Math.abs(D[r][c]) > maxVal){
              maxVal = Math.abs(D[r][c]); p=r; q=c;
            }
          }
        }
        if(maxVal < 1e-9) break;
        let theta = (D[q][q] - D[p][p]) / (2*D[p][q]);
        let t = Math.sign(theta) / (Math.abs(theta) + Math.sqrt(theta*theta + 1));
        if(theta === 0) t = 1.0; 
        let c_rot = 1.0 / Math.sqrt(t*t + 1);
        let s_rot = c_rot * t;
        
        for(let r=0; r<n; r++){
          if(r !== p && r !== q){
            let Drp = D[r][p], Drq = D[r][q];
            D[r][p] = c_rot*Drp - s_rot*Drq;
            D[p][r] = D[r][p];
            D[r][q] = c_rot*Drq + s_rot*Drp;
            D[q][r] = D[r][q];
          }
          let Vrp = V[r][p], Vrq = V[r][q];
          V[r][p] = c_rot*Vrp - s_rot*Vrq;
          V[r][q] = c_rot*Vrq + s_rot*Vrp;
        }
        let Dpp = D[p][p], Dqq = D[q][q], Dpq = D[p][q];
        D[p][p] = c_rot*c_rot*Dpp - 2*s_rot*c_rot*Dpq + s_rot*s_rot*Dqq;
        D[q][q] = s_rot*s_rot*Dpp + 2*s_rot*c_rot*Dpq + c_rot*c_rot*Dqq;
        D[p][q] = 0; D[q][p] = 0;
      }
      return {V, D};
    }

    // 2. L96 Model Integration (RK4)
    function l96_rhs(x, F) {
      let n = x.length;
      let dxdt = new Array(n);
      for (let i = 0; i < n; i++) {
        let im2 = (i - 2 + n) % n;
        let im1 = (i - 1 + n) % n;
        let ip1 = (i + 1) % n;
        dxdt[i] = (x[ip1] - x[im2]) * x[im1] - x[i] + F;
      }
      return dxdt;
    }

    function rk4_step(x, dt, F) {
      let k1 = l96_rhs(x, F);
      let x2 = vecAdd(x, vecScale(k1, dt / 2));
      let k2 = l96_rhs(x2, F);
      let x3 = vecAdd(x, vecScale(k2, dt / 2));
      let k3 = l96_rhs(x3, F);
      let x4 = vecAdd(x, vecScale(k3, dt));
      let k4 = l96_rhs(x4, F);
      
      let res = new Array(x.length);
      for (let i = 0; i < x.length; i++) {
        res[i] = x[i] + (dt / 6) * (k1[i] + 2*k2[i] + 2*k3[i] + k4[i]);
      }
      return res;
    }

    function linearize_l96(x, F, dt) {
      let n = x.length;
      let M = identity(n);
      let eps = 1e-5;
      for (let j = 0; j < n; j++) {
        let xp = x.slice(); xp[j] += eps;
        let xm = x.slice(); xm[j] -= eps;
        let yp = rk4_step(xp, dt, F);
        let ym = rk4_step(xm, dt, F);
        for (let i = 0; i < n; i++) {
          M[i][j] = (yp[i] - ym[i]) / (2 * eps);
        }
      }
      return M;
    }

    // 3. Setup observation operator and observations
    let obsIndices = [];
    if (observationMode === 'full') {
      for (let i = 0; i < N; i++) obsIndices.push(i);
    } else if (observationMode === 'sparse') {
      let start = Math.min(sparseRegionStart, sparseRegionEnd);
      let end = Math.max(sparseRegionStart, sparseRegionEnd);
      let step = Math.max(1, sparseInterval);
      for (let i = start; i <= end; i += step) {
        obsIndices.push(i % N);
      }
    } else if (observationMode === 'thinned') {
      for (let i = 0; i < N; i++) obsIndices.push(i);
    }
    
    let nobs = obsIndices.length;
    let H = Array(nobs).fill().map(() => Array(N).fill(0));
    for (let i = 0; i < nobs; i++) H[i][obsIndices[i]] = 1.0;
    let H_T = matTranspose(H);
    
    let R = identity(nobs);
    R = matScale(R, R_diag);
    let R_inv = matScale(identity(nobs), 1.0 / R_diag);

    function applyH(x) {
      return obsIndices.map(idx => x[idx]);
    }

    // Spin-up model to reach attractor
    let x_true = Array(N).fill(F);
    for (let i = 0; i < N; i++) x_true[i] += randomNormal() * 0.1;
    for (let i = 0; i < 1000; i++) x_true = rk4_step(x_true, dt, F);

    let truthHistory = [];
    let obsHistory = [];
    let state_true = x_true.slice();

    for (let step = 0; step <= numSteps; step++) {
      truthHistory.push(state_true.slice());
      
      let isObsTime = (step % obsInterval === 0);
      if (observationMode === 'thinned' && (step / obsInterval) % thinInterval !== 0) {
        isObsTime = false;
      }
      
      if (isObsTime && step > 0) {
        let y = applyH(state_true).map(val => val + randomNormal() * Math.sqrt(R_diag));
        obsHistory.push(y);
      } else {
        obsHistory.push(null);
      }
      
      if (step < numSteps) {
        state_true = rk4_step(state_true, dt, F);
      }
    }

    // 4. Initialize Methods
    let methodStates = methods.map(m => {
      let p = m.params || {};
      let state = {
        id: m.id,
        type: m.type,
        params: p,
        rmseTimeSeries: [],
        spreadTimeSeries: [],
        timeSteps: [],
        analysisHistory: [],
      };
      
      // Initialize state estimate with background error
      let initialMean = truthHistory[0].map(v => v + randomNormal() * 1.5);
      
      if (m.type === 'EKF' || m.type === '3DVar' || m.type === '4DVar') {
        state.x = initialMean;
        if (m.type === 'EKF') {
          state.P = matScale(identity(N), 1.0);
        }
      } else if (['EnKF', 'EnSRF', 'LETKF', 'PF'].includes(m.type)) {
        let M = p.ensembleSize || 30;
        state.ensembleSize = M;
        state.ensemble = [];
        for (let i = 0; i < M; i++) {
          state.ensemble.push(initialMean.map(v => v + randomNormal() * 1.5));
        }
        if (m.type === 'PF') {
          state.weights = Array(M).fill(1.0 / M);
        }
      }
      
      // Static B for 3DVar / 4DVar using Gaspari-Cohn spatial correlation (Correlation Length L)
      if (m.type === '3DVar' || m.type === '4DVar') {
        let B = Array(N).fill().map(() => Array(N).fill(0));
        let corrL = p.corrLength || 5;
        let sigma_b2 = p.bgErrorVar || 1.0;
        for (let i = 0; i < N; i++) {
          for (let j = 0; j < N; j++) {
            let dist = periodicDist(i, j, N);
            B[i][j] = gaspariCohn(dist, corrL) * sigma_b2;
          }
          B[i][i] += 0.05; // Ensure positive definite
        }
        state.B = B;
        state.B_inv = matInverse(B);
        
        let HB = matMul(H, B);
        let HBH = matMul(HB, H_T);
        let S_3d = matAdd(HBH, R);
        state.K_3dvar = matMul(matMul(B, H_T), matInverse(S_3d));
      }
      
      if (m.type === '4DVar') {
        state.windowBuffer = [];
      }
      
      return state;
    });

    // 5. Main Simulation Loop
    for (let step = 0; step <= numSteps; step++) {
      if (step > 0 && step % Math.max(1, Math.floor(numSteps / 10)) === 0) {
        self.postMessage({ type: 'PROGRESS', progress: Math.round((step / numSteps) * 100) });
      }

      let y = obsHistory[step];
      let hasObs = y !== null;
      
      for (let m = 0; m < methodStates.length; m++) {
        let state = methodStates[m];
        let p = state.params;
        
        // --- 5.1 Forecast Step ---
        if (step > 0) {
          if (state.type === 'EKF' || state.type === '3DVar') {
            let M_lin = linearize_l96(state.x, F, dt);
            state.x = rk4_step(state.x, dt, F);
            if (state.type === 'EKF') {
              let Q_val = p.processNoise !== undefined ? p.processNoise : 0.01;
              let Q = matScale(identity(N), Q_val);
              state.P = matAdd(matMul(matMul(M_lin, state.P), matTranspose(M_lin)), Q);
            }
          } else if (['EnKF', 'EnSRF', 'LETKF', 'PF'].includes(state.type)) {
            for (let i = 0; i < state.ensembleSize; i++) {
              state.ensemble[i] = rk4_step(state.ensemble[i], dt, F);
              if (state.type === 'PF') {
                for (let j = 0; j < N; j++) {
                  state.ensemble[i][j] += randomNormal() * 0.05;
                }
              }
            }
          } else if (state.type === '4DVar') {
            state.x = rk4_step(state.x, dt, F);
            state.windowBuffer.push({ step, x_bg: state.x.slice(), y });
          }
        }

        // --- 5.2 Analysis Step (Observation Update) ---
        if (hasObs) {
          // A. EKF
          if (state.type === 'EKF') {
            for(let r=0; r<N; r++) {
              for(let c=0; c<N; c++) {
                if (isNaN(state.P[r][c])) state.P[r][c] = r === c ? 1.0 : 0;
                if (state.P[r][c] > 50) state.P[r][c] = 50;
                if (state.P[r][c] < -50) state.P[r][c] = -50;
              }
            }

            let HP = matMul(H, state.P);
            let HPH = matMul(HP, H_T);
            let S = matAdd(HPH, R);
            let S_inv = matInverse(S);
            let K = matMul(matMul(state.P, H_T), S_inv);
            
            let Hx = applyH(state.x);
            let innov = vecSub(y, Hx);
            state.x = vecAdd(state.x, matVecMul(K, innov));
            
            let I_KH = matSub(identity(N), matMul(K, H));
            state.P = matMul(I_KH, state.P);

          // B. 3DVar
          } else if (state.type === '3DVar') {
            let xb = state.x.slice();
            let Hxb = applyH(xb);
            let innov = vecSub(y, Hxb);
            state.x = vecAdd(xb, matVecMul(state.K_3dvar, innov));

          // C. 4DVar
          } else if (state.type === '4DVar') {
            if (state.windowBuffer.length > 0) {
              let window = state.windowBuffer;
              let x0_b = window[0].x_bg.slice();
              let x0 = x0_b.slice();
              
              function cost4DVar(x0_eval) {
                let dx0 = vecSub(x0_eval, x0_b);
                let J = 0.5 * dotProduct(dx0, matVecMul(state.B_inv, dx0));
                let x_curr = x0_eval.slice();
                for (let k = 0; k < window.length; k++) {
                  if (k > 0) x_curr = rk4_step(x_curr, dt, F);
                  let wy = window[k].y;
                  if (wy !== null) {
                    let dy = vecSub(applyH(x_curr), wy);
                    J += 0.5 * dotProduct(dy, matVecMul(R_inv, dy));
                  }
                }
                return J;
              }

              function dotProduct(u, v) {
                let s = 0;
                for (let i = 0; i < u.length; i++) s += u[i] * v[i];
                return s;
              }

              for (let iter = 0; iter < 25; iter++) {
                let traj = [x0];
                let M_list = [];
                let x_curr = x0;
                for (let k = 0; k < window.length - 1; k++) {
                  M_list.push(linearize_l96(x_curr, F, dt));
                  x_curr = rk4_step(x_curr, dt, F);
                  traj.push(x_curr);
                }
                
                let grad = matVecMul(state.B_inv, vecSub(x0, x0_b));
                let adj = Array(N).fill(0);
                for (let k = window.length - 1; k >= 0; k--) {
                  let wy = window[k].y;
                  if (wy !== null) {
                    let Hx = applyH(traj[k]);
                    let diff = vecSub(Hx, wy);
                    let forcing = matVecMul(H_T, matVecMul(R_inv, diff));
                    adj = vecAdd(adj, forcing);
                  }
                  if (k > 0) {
                    let M_T = matTranspose(M_list[k-1]);
                    adj = matVecMul(M_T, adj);
                  }
                }
                grad = vecAdd(grad, adj);
                
                let stepSize = 0.05;
                let currentCost = cost4DVar(x0);
                for (let ls = 0; ls < 10; ls++) {
                  let x0_next = vecSub(x0, vecScale(grad, stepSize));
                  if (cost4DVar(x0_next) < currentCost) {
                    x0 = x0_next;
                    break;
                  }
                  stepSize *= 0.5;
                }
              }
              
              let x_curr = x0;
              for (let k = 0; k < window.length; k++) {
                if (k > 0) x_curr = rk4_step(x_curr, dt, F);
              }
              state.x = x_curr;
              state.windowBuffer = [];
            }

          // D. Ensemble Methods (EnKF, EnSRF, LETKF)
          } else if (state.type === 'EnKF' || state.type === 'EnSRF' || state.type === 'LETKF') {
            let M = state.ensembleSize;
            let ens = state.ensemble;
            let inflation = p.inflation || 1.05;
            let localization = p.localization || 5;
            
            // Inflation
            let x_mean = Array(N).fill(0);
            for (let i = 0; i < M; i++) x_mean = vecAdd(x_mean, ens[i]);
            x_mean = vecScale(x_mean, 1/M);
            
            for (let i = 0; i < M; i++) {
              let dev = vecSub(ens[i], x_mean);
              ens[i] = vecAdd(x_mean, vecScale(dev, inflation));
            }
            
            x_mean = Array(N).fill(0);
            for (let i = 0; i < M; i++) x_mean = vecAdd(x_mean, ens[i]);
            x_mean = vecScale(x_mean, 1/M);

            // D.1 EnKF
            if (state.type === 'EnKF') {
              let X = [];
              for (let i = 0; i < M; i++) X.push(vecSub(ens[i], x_mean));
              X = matTranspose(X); // N x M
              
              let HX = matMul(H, X); // nobs x M
              let HX_T = matTranspose(HX); // M x nobs
              
              let P_e = matScale(matMul(X, HX_T), 1/(M-1)); // N x nobs
              let P_loc = Array(N).fill().map(() => Array(nobs).fill(0));
              for(let i=0; i<N; i++){
                for(let j=0; j<nobs; j++){
                  P_loc[i][j] = P_e[i][j] * gaspariCohn(periodicDist(i, obsIndices[j], N), localization);
                }
              }
              
              let HPH = matScale(matMul(HX, HX_T), 1/(M-1));
              let HPH_loc = Array(nobs).fill().map(() => Array(nobs).fill(0));
              for(let i=0; i<nobs; i++){
                for(let j=0; j<nobs; j++){
                  HPH_loc[i][j] = HPH[i][j] * gaspariCohn(periodicDist(obsIndices[i], obsIndices[j], N), localization);
                }
              }
              
              let S = matAdd(HPH_loc, R);
              for(let i=0; i<nobs; i++) S[i][i] += 1e-6;
              let K = matMul(P_loc, matInverse(S));
              
              for (let i = 0; i < M; i++) {
                let y_pert = y.map(v => v + randomNormal() * Math.sqrt(R_diag));
                let Hx = applyH(ens[i]);
                let innov = vecSub(y_pert, Hx);
                ens[i] = vecAdd(ens[i], matVecMul(K, innov));
              }

            // D.2 EnSRF
            } else if (state.type === 'EnSRF') {
              for (let ob = 0; ob < nobs; ob++) {
                let obsIdx = obsIndices[ob];
                let y_val = y[ob];
                let r_val = R_diag;
                
                let h_mean = 0;
                for(let i=0; i<M; i++) h_mean += ens[i][obsIdx];
                h_mean /= M;
                
                let h_dev = new Array(M);
                for(let i=0; i<M; i++) h_dev[i] = ens[i][obsIdx] - h_mean;
                
                let hph = 0;
                for(let i=0; i<M; i++) hph += h_dev[i]*h_dev[i];
                hph /= (M-1);
                
                let ph = new Array(N).fill(0);
                for(let i=0; i<N; i++){
                  let cov = 0;
                  for(let j=0; j<M; j++){
                    cov += (ens[j][i] - x_mean[i]) * h_dev[j];
                  }
                  cov /= (M-1);
                  ph[i] = cov * gaspariCohn(periodicDist(i, obsIdx, N), localization);
                }
                
                let K = ph.map(v => v / (hph + r_val));
                let alpha = 1.0 / (1.0 + Math.sqrt(r_val / (hph + r_val)));
                let K_tilde = K.map(v => v * alpha);
                
                let innov = y_val - h_mean;
                
                let x_mean_old = x_mean.slice();
                for(let i=0; i<N; i++) x_mean[i] += K[i] * innov;
                
                for(let j=0; j<M; j++){
                  let dev_j = vecSub(ens[j], x_mean_old);
                  for(let i=0; i<N; i++){
                    let dev_updated = dev_j[i] - K_tilde[i] * h_dev[j];
                    ens[j][i] = x_mean[i] + dev_updated;
                  }
                }
              }

            // D.3 LETKF
            } else if (state.type === 'LETKF') {
              let X = [];
              for (let i = 0; i < M; i++) X.push(vecSub(ens[i], x_mean));
              let Xb = matTranspose(X);
              
              let ens_new = Array(M).fill().map(() => Array(N).fill(0));
              
              for (let i = 0; i < N; i++) {
                let localObs = [];
                for (let ob = 0; ob < nobs; ob++) {
                  let dist = periodicDist(i, obsIndices[ob], N);
                  let gloc = gaspariCohn(dist, localization);
                  if (gloc > 1e-4) {
                    localObs.push({ idx: ob, gloc: gloc });
                  }
                }
                
                let l_nobs = localObs.length;
                if (l_nobs === 0) {
                  for(let j=0; j<M; j++) ens_new[j][i] = ens[j][i];
                  continue;
                }
                
                let y_loc = localObs.map(o => y[o.idx]);
                let R_loc_inv = localObs.map(o => o.gloc / R_diag); 
                let Hx_mean_loc = localObs.map(o => x_mean[obsIndices[o.idx]]);
                let HXb_loc = Array(l_nobs).fill().map(() => Array(M).fill(0));
                for(let o=0; o<l_nobs; o++){
                  let obIdx = obsIndices[localObs[o].idx];
                  for(let j=0; j<M; j++) {
                     HXb_loc[o][j] = Xb[obIdx][j];
                  }
                }
                
                let Pa_tilde_inv = matScale(identity(M), M - 1);
                for(let r=0; r<M; r++){
                  for(let c=0; c<M; c++){
                    let sum = 0;
                    for(let o=0; o<l_nobs; o++){
                      sum += HXb_loc[o][r] * R_loc_inv[o] * HXb_loc[o][c];
                    }
                    Pa_tilde_inv[r][c] += sum;
                  }
                }
                let Pa_tilde = matInverse(Pa_tilde_inv);
                
                let innov = vecSub(y_loc, Hx_mean_loc);
                let R_inv_innov = innov.map((v, idx) => v * R_loc_inv[idx]);
                let Y_T_R_inv_innov = Array(M).fill(0);
                for(let r=0; r<M; r++){
                  for(let o=0; o<l_nobs; o++){
                    Y_T_R_inv_innov[r] += HXb_loc[o][r] * R_inv_innov[o];
                  }
                }
                let wa_mean = matVecMul(Pa_tilde, Y_T_R_inv_innov);
                
                let eig = jacobiEigen(Pa_tilde);
                let V = eig.V, D = eig.D;
                let Wa = Array(M).fill().map(() => Array(M).fill(0));
                for(let r=0; r<M; r++){
                  for(let c=0; c<M; c++){
                    let sum = 0;
                    for(let k=0; k<M; k++){
                      let dVal = D[k][k];
                      if (dVal > 1e-12) {
                        sum += V[r][k] * Math.sqrt(dVal * (M - 1)) * V[c][k];
                      }
                    }
                    Wa[r][c] = sum;
                  }
                }
                
                for(let j=0; j<M; j++){
                  let sum = 0;
                  for(let k=0; k<M; k++){
                    let w_jk = wa_mean[k] + Wa[k][j];
                    sum += Xb[i][k] * w_jk;
                  }
                  ens_new[j][i] = x_mean[i] + sum;
                }
              }
              state.ensemble = ens_new;

            // E. Particle Filter (PF)
            } else if (state.type === 'PF') {
              let M = state.ensembleSize;
              let ens = state.ensemble;
              let weights = state.weights;
              let resampleThresh = p.resampleThreshold ?? 0.5;
              
              let maxLogLik = -Infinity;
              let logLik = new Array(M);
              for (let i = 0; i < M; i++) {
                let Hx = applyH(ens[i]);
                let diff = vecSub(y, Hx);
                let nll = 0;
                for(let j=0; j<nobs; j++) nll += diff[j]*diff[j] / R_diag;
                // Temperature scaling to avoid weight collapse in high dimensions
                logLik[i] = -0.5 * (nll / Math.max(1, nobs / 10));
                if (logLik[i] > maxLogLik) maxLogLik = logLik[i];
              }
              
              let sumW = 0;
              for (let i = 0; i < M; i++) {
                weights[i] = Math.exp(logLik[i] - maxLogLik);
                sumW += weights[i];
              }
              
              if (sumW > 0) {
                for (let i = 0; i < M; i++) weights[i] /= sumW;
              } else {
                for (let i = 0; i < M; i++) weights[i] = 1.0 / M;
              }
              
              let ess = 0;
              for (let i = 0; i < M; i++) ess += weights[i] * weights[i];
              ess = 1.0 / ess;
              
              if (ess < resampleThresh * M) {
                let newEns = [];
                let c = new Array(M);
                c[0] = weights[0];
                for(let i=1; i<M; i++) c[i] = c[i-1] + weights[i];
                
                let u = Math.random() / M;
                let idx = 0;
                for (let i = 0; i < M; i++) {
                  let u_i = u + i/M;
                  while(u_i > c[idx] && idx < M-1) idx++;
                  let particle = ens[idx].slice();
                  for(let j=0; j<N; j++) particle[j] += randomNormal() * 0.05;
                  newEns.push(particle);
                }
                state.ensemble = newEns;
                state.weights = Array(M).fill(1.0 / M);
              }
            }
          }
        } // end if (hasObs)
        
        // --- 5.3 Record Stats at Observation Steps ---
        if (hasObs) {
          let analysisMean = Array(N).fill(0);
          let analysisSpread = 0;
          
          if (state.type === 'EKF') {
            analysisMean = state.x.slice();
            let traceP = 0;
            for (let i = 0; i < N; i++) traceP += state.P[i][i];
            analysisSpread = Math.sqrt(Math.max(0, traceP / N));
          } else if (state.type === '3DVar' || state.type === '4DVar') {
            analysisMean = state.x.slice();
            analysisSpread = 0;
          } else if (state.type === 'PF') {
            for(let i=0; i<state.ensembleSize; i++){
              for(let j=0; j<N; j++){
                analysisMean[j] += state.ensemble[i][j] * state.weights[i];
              }
            }
            let varSum = 0;
            for(let i=0; i<state.ensembleSize; i++){
              for(let j=0; j<N; j++){
                let diff = state.ensemble[i][j] - analysisMean[j];
                varSum += state.weights[i] * diff * diff;
              }
            }
            analysisSpread = Math.sqrt(varSum / N);
          } else {
            let M = state.ensembleSize;
            for(let i=0; i<M; i++){
              for(let j=0; j<N; j++){
                analysisMean[j] += state.ensemble[i][j];
              }
            }
            for(let j=0; j<N; j++) analysisMean[j] /= M;
            
            let varSum = 0;
            for(let i=0; i<M; i++){
              for(let j=0; j<N; j++){
                let diff = state.ensemble[i][j] - analysisMean[j];
                varSum += diff * diff;
              }
            }
            analysisSpread = Math.sqrt(varSum / Math.max(1, (M-1)*N));
          }
          
          state.analysisHistory.push(analysisMean);
          state.rmseTimeSeries.push(rmse(analysisMean, truthHistory[step]));
          state.spreadTimeSeries.push(analysisSpread);
          state.timeSteps.push(step);
        }
      }
    }

    // 6. Format and Send Results
    let results = methodStates.map(state => {
      // Exclude initial burn-in / spin-up period (first 20% of observation steps, max 50 steps)
      // from average performance metrics so transient initial errors do not distort avgRmse / avgSpread
      let totalSteps = state.rmseTimeSeries.length;
      let burnInCutoff = Math.min(Math.floor(totalSteps * 0.2), 50);
      let evalRmseSeries = state.rmseTimeSeries.slice(burnInCutoff);
      let evalSpreadSeries = state.spreadTimeSeries.slice(burnInCutoff);

      return {
        methodId: state.id,
        methodType: state.type,
        rmseTimeSeries: state.rmseTimeSeries,
        spreadTimeSeries: state.spreadTimeSeries,
        avgRmse: mean(evalRmseSeries.length > 0 ? evalRmseSeries : state.rmseTimeSeries),
        avgSpread: mean(evalSpreadSeries.length > 0 ? evalSpreadSeries : state.spreadTimeSeries),
        timeSteps: state.timeSteps,
        truthHistory: truthHistory,
        obsHistory: obsHistory,
        analysisHistory: state.analysisHistory,
      };
    });

    self.postMessage({
      type: 'RESULT',
      payload: { results }
    });

  } catch (error) {
    self.postMessage({ type: 'ERROR', payload: error.message });
  }
}
