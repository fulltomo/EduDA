import {
  randomNormal,
  rmse,
  mean,
  periodicDist,
  gaspariCohn,
  matMul,
  matTranspose,
  matAdd,
  matSub,
  matScale,
  identity,
  matInverse,
} from './math';

import { rk4_step, linearize_l96 } from './l96';
import { updateEKF } from './methods/ekf';
import { update3DVar } from './methods/var3d';
import { update4DVar } from './methods/var4d';
import { updateEnKF } from './methods/enkf';
import { updateEnSRF } from './methods/ensrf';
import { updateLETKF } from './methods/letkf';
import { updatePF } from './methods/pf';

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
      sparseRegionStart = 0,
      sparseRegionEnd = 19,
      thinNumObs = 20,
    } = advancedOptions || {};

    const R_diag = obsErrorVar;

    // 1. Setup observation operator and indices
    let obsIndices = [];
    if (observationMode === 'full') {
      for (let i = 0; i < N; i++) obsIndices.push(i);
    } else if (observationMode === 'sparse') {
      const start = Math.min(sparseRegionStart, sparseRegionEnd);
      const end = Math.max(sparseRegionStart, sparseRegionEnd);
      for (let i = start; i <= end; i++) {
        obsIndices.push(i % N);
      }
    } else if (observationMode === 'thinned') {
      const numObs = Math.min(N, Math.max(1, thinNumObs || 20));
      for (let k = 0; k < numObs; k++) {
        const idx = Math.round((k * N) / numObs) % N;
        obsIndices.push(idx);
      }
    } else if (observationMode === 'custom') {
      const rawIndices = payload.customObsIndices || [];
      obsIndices = rawIndices.filter(idx => idx >= 0 && idx < N).sort((a, b) => a - b);
    }

    const nobs = obsIndices.length;
    let H = [], H_T = [], R = [], R_inv = [];
    if (nobs > 0) {
      H = Array(nobs).fill().map(() => Array(N).fill(0));
      for (let i = 0; i < nobs; i++) H[i][obsIndices[i]] = 1.0;
      H_T = matTranspose(H);

      R = matScale(identity(nobs), R_diag);
      R_inv = matScale(identity(nobs), 1.0 / R_diag);
    }

    function applyH(x) {
      if (nobs === 0) return [];
      return obsIndices.map(idx => x[idx]);
    }

    // 2. Spin-up model to reach attractor
    let x_true = Array(N).fill(F);
    for (let i = 0; i < N; i++) x_true[i] += randomNormal() * 0.1;
    for (let i = 0; i < 1000; i++) x_true = rk4_step(x_true, dt, F);

    const truthHistory = [];
    const obsHistory = [];
    let state_true = x_true.slice();

    for (let step = 0; step <= numSteps; step++) {
      truthHistory.push(state_true.slice());

      const isObsTime = (step % obsInterval === 0);

      if (isObsTime && step > 0 && nobs > 0) {
        const y = applyH(state_true).map(val => val + randomNormal() * Math.sqrt(R_diag));
        obsHistory.push(y);
      } else {
        obsHistory.push(null);
      }

      if (step < numSteps) {
        state_true = rk4_step(state_true, dt, F);
      }
    }

    // 3. Initialize Methods
    const methodStates = methods.map(m => {
      const p = m.params || {};
      const state = {
        id: m.id,
        type: m.type,
        params: p,
        rmseTimeSeries: [],
        spreadTimeSeries: [],
        timeSteps: [],
        analysisHistory: [],
      };

      const initialMean = truthHistory[0].map(v => v + randomNormal() * 1.5);

      if (m.type === 'EKF' || m.type === '3DVar' || m.type === '4DVar') {
        state.x = initialMean;
        if (m.type === 'EKF') {
          state.P = matScale(identity(N), 1.0);
        }
      } else if (['POEnKF', 'EnKF', 'EnSRF', 'LETKF', 'PF'].includes(m.type)) {
        const M = p.ensembleSize || 30;
        state.ensembleSize = M;
        state.ensemble = [];
        for (let i = 0; i < M; i++) {
          state.ensemble.push(initialMean.map(v => v + randomNormal() * 1.5));
        }
        if (m.type === 'PF') {
          state.weights = Array(M).fill(1.0 / M);
        }
      }

      // Static B for 3DVar / 4DVar using Gaspari-Cohn spatial correlation
      if (m.type === '3DVar' || m.type === '4DVar') {
        const B = Array(N).fill().map(() => Array(N).fill(0));
        const corrL = p.corrLength || 5;
        const sigma_b2 = p.bgErrorVar || 1.0;
        for (let i = 0; i < N; i++) {
          for (let j = 0; j < N; j++) {
            const dist = periodicDist(i, j, N);
            B[i][j] = gaspariCohn(dist, corrL) * sigma_b2;
          }
          B[i][i] += 0.05; // Ensure positive definite
        }
        state.B = B;
        state.B_inv = matInverse(B);

        if (nobs > 0) {
          const HB = matMul(H, B);
          const HBH = matMul(HB, H_T);
          const S_3d = matAdd(HBH, R);
          state.K_3dvar = matMul(matMul(B, H_T), matInverse(S_3d));

          // Compute Analysis Error Covariance Matrix Pa = (I - K*H) * B for Spread calculation
          const I_KH = matSub(identity(N), matMul(state.K_3dvar, H));
          const Pa = matMul(I_KH, B);
          for (let r = 0; r < N; r++) {
            for (let c = r; c < N; c++) {
              const sym = 0.5 * (Pa[r][c] + Pa[c][r]);
              Pa[r][c] = sym;
              Pa[c][r] = sym;
            }
          }
          state.Pa = Pa;
        } else {
          state.K_3dvar = Array(N).fill().map(() => Array(0).fill(0));
          state.Pa = B;
        }
      }

      if (m.type === '4DVar') {
        state.windowBuffer = [{ step: 0, x_bg: state.x.slice(), y: obsHistory[0] }];
      }

      return state;
    });

    // 4. Main Simulation Loop
    for (let step = 0; step <= numSteps; step++) {
      if (step > 0 && step % Math.max(1, Math.floor(numSteps / 10)) === 0) {
        self.postMessage({ type: 'PROGRESS', progress: Math.round((step / numSteps) * 100) });
      }

      const isObsStep = (step % obsInterval === 0 && step > 0);
      const y = obsHistory[step];
      const hasObs = isObsStep && nobs > 0 && y !== null;

      for (let m = 0; m < methodStates.length; m++) {
        const state = methodStates[m];
        const p = state.params;

        // --- 4.1 Forecast Step ---
        if (step > 0) {
          if (state.type === 'EKF' || state.type === '3DVar') {
            const M_lin = linearize_l96(state.x, F, dt);
            state.x = rk4_step(state.x, dt, F);
            if (state.type === 'EKF') {
              const Q_val = p.processNoise !== undefined ? p.processNoise : 0.01;
              const Q = matScale(identity(N), Q_val);
              state.P = matAdd(matMul(matMul(M_lin, state.P), matTranspose(M_lin)), Q);
            }
          } else if (['POEnKF', 'EnKF', 'EnSRF', 'LETKF', 'PF'].includes(state.type)) {
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

        // --- 4.2 Analysis Step ---
        if (hasObs) {
          if (state.type === 'EKF') {
            updateEKF(state, y, H, H_T, R, N, applyH, obsIndices);
          } else if (state.type === '3DVar') {
            update3DVar(state, y, applyH);
          } else if (state.type === '4DVar') {
            update4DVar(state, step, numSteps, dt, F, N, H_T, R_inv, applyH);
          } else if (['POEnKF', 'EnKF', 'EnSRF', 'LETKF'].includes(state.type)) {
            const M = state.ensembleSize;
            const ens = state.ensemble;
            const inflation = p.inflation || 1.05;
            const localization = p.localization || 5;

            // Inflation (zero-allocation)
            const x_mean = new Float64Array(N);
            for (let i = 0; i < M; i++) {
              for (let j = 0; j < N; j++) x_mean[j] += ens[i][j];
            }
            for (let j = 0; j < N; j++) x_mean[j] /= M;

            for (let i = 0; i < M; i++) {
              for (let j = 0; j < N; j++) {
                ens[i][j] = x_mean[j] + (ens[i][j] - x_mean[j]) * inflation;
              }
            }

            x_mean.fill(0);
            for (let i = 0; i < M; i++) {
              for (let j = 0; j < N; j++) x_mean[j] += ens[i][j];
            }
            for (let j = 0; j < N; j++) x_mean[j] /= M;
            state.x_mean = x_mean;

            if (state.type === 'POEnKF' || state.type === 'EnKF') {
              updateEnKF(state, y, H, nobs, N, obsIndices, R_diag, R, localization, applyH);
            } else if (state.type === 'EnSRF') {
              updateEnSRF(state, y, nobs, N, obsIndices, R_diag, localization);
            } else if (state.type === 'LETKF') {
              updateLETKF(state, y, nobs, N, obsIndices, R_diag, localization);
            }
          } else if (state.type === 'PF') {
            updatePF(state, y, nobs, N, R_diag, applyH);
          }
        }

        // --- 4.3 Record Stats at Observation Steps ---
        if (isObsStep) {
          let analysisMean = new Float64Array(N);
          let analysisSpread = 0;

          if (state.type === 'EKF') {
            analysisMean = state.x.slice();
            let traceP = 0;
            for (let i = 0; i < N; i++) traceP += state.P[i][i];
            analysisSpread = Math.sqrt(Math.max(0, traceP / N));
          } else if (state.type === '3DVar' || state.type === '4DVar') {
            analysisMean = state.x.slice();
            let tracePa = 0;
            if (state.Pa) {
              for (let i = 0; i < N; i++) tracePa += state.Pa[i][i];
            }
            analysisSpread = Math.sqrt(Math.max(0, tracePa / N));
          } else if (state.type === 'PF') {
            for (let i = 0; i < state.ensembleSize; i++) {
              for (let j = 0; j < N; j++) {
                analysisMean[j] += state.ensemble[i][j] * state.weights[i];
              }
            }
            let varSum = 0;
            for (let i = 0; i < state.ensembleSize; i++) {
              for (let j = 0; j < N; j++) {
                const diff = state.ensemble[i][j] - analysisMean[j];
                varSum += state.weights[i] * diff * diff;
              }
            }
            analysisSpread = Math.sqrt(varSum / N);
          } else {
            const M = state.ensembleSize;
            const amean = new Float64Array(N);
            for (let i = 0; i < M; i++) {
              for (let j = 0; j < N; j++) amean[j] += state.ensemble[i][j];
            }
            for (let j = 0; j < N; j++) amean[j] /= M;
            analysisMean = amean;

            let varSum = 0;
            for (let i = 0; i < M; i++) {
              for (let j = 0; j < N; j++) {
                const diff = state.ensemble[i][j] - amean[j];
                varSum += diff * diff;
              }
            }
            analysisSpread = Math.sqrt(varSum / Math.max(1, (M - 1) * N));
          }

          state.analysisHistory.push(analysisMean);
          state.rmseTimeSeries.push(rmse(analysisMean, truthHistory[step]));
          state.spreadTimeSeries.push(analysisSpread);
          state.timeSteps.push(step);
        }
      }
    }

    // 5. Format and Send Results
    const results = methodStates.map(state => {
      const totalSteps = state.rmseTimeSeries.length;
      const burnInCutoff = Math.min(Math.floor(totalSteps * 0.2), 50);
      const evalRmseSeries = state.rmseTimeSeries.slice(burnInCutoff);
      const evalSpreadSeries = state.spreadTimeSeries.slice(burnInCutoff);

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
      payload: { results, obsIndices }
    });

  } catch (error) {
    self.postMessage({ type: 'ERROR', payload: error.message });
  }
}
