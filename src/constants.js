/**
 * EduDA Constants & Configuration
 */

export { PRESETS, getLocalizedPreset } from './data/presets';

/** Filter divergence threshold (RMSE above this or NaN is considered diverged) */
export const DIVERGENCE_THRESHOLD = 10.0;

/** Available DA methods with parameter specifications */
export const DA_METHODS = [
  {
    id: 'EKF',
    label: 'EKF',
    fullName: '拡張カルマンフィルタ',
    fullNameEn: 'Extended Kalman Filter',
    category: 'kalman',
    summary: '線形近似により共分散を陽に更新する基本手法。高次元では計算コストが急増する。',
    summaryEn: 'Explicitly updates covariance via tangent linear approximation. High computational cost in large systems.',
    params: [
      {
        key: 'processNoise',
        label: 'プロセスノイズ (Q)',
        labelEn: 'Process Noise (Q)',
        min: 0.001,
        max: 0.20,
        step: 0.005,
        default: 0.01,
      },
    ]
  },
  {
    id: 'POEnKF',
    label: 'POEnKF',
    fullName: '確率的アンサンブルカルマンフィルタ (観測摂動型)',
    fullNameEn: 'Perturbed Observation EnKF',
    category: 'ensemble',
    summary: '観測値にランダムな摂動を加える確率的手法。流れ依存の背景誤差共分散を効率的に表現。',
    summaryEn: 'Monte Carlo ensemble with perturbed observations. Efficiently captures flow-dependent error covariance.',
    params: [
      {
        key: 'ensembleSize',
        label: 'アンサンブルサイズ (M)',
        labelEn: 'Ensemble Size (M)',
        min: 5,
        max: 200,
        step: 5,
        default: 30,
      },
      {
        key: 'inflation',
        label: 'インフレーション (λ)',
        labelEn: 'Inflation (λ)',
        min: 1.00,
        max: 1.50,
        step: 0.01,
        default: 1.05,
      },
      {
        key: 'localization',
        label: '局所化半径 (L)',
        labelEn: 'Localization Radius (L)',
        min: 1,
        max: 20,
        step: 1,
        default: 5,
      }
    ]
  },
  {
    id: 'EnSRF',
    label: 'EnSRF',
    fullName: 'アンサンブル平方根フィルタ',
    fullNameEn: 'Ensemble Square Root Filter',
    category: 'ensemble',
    summary: '観測摂動を伴わない決定論的手法。摂動によるサンプリング誤差を回避。',
    summaryEn: 'Deterministic square root update without observation perturbations, eliminating noise sampling errors.',
    params: [
      {
        key: 'ensembleSize',
        label: 'アンサンブルサイズ (M)',
        labelEn: 'Ensemble Size (M)',
        min: 5,
        max: 200,
        step: 5,
        default: 30,
      },
      {
        key: 'inflation',
        label: 'インフレーション (λ)',
        labelEn: 'Inflation (λ)',
        min: 1.00,
        max: 1.50,
        step: 0.01,
        default: 1.05,
      },
      {
        key: 'localization',
        label: '局所化半径 (L)',
        labelEn: 'Localization Radius (L)',
        min: 1,
        max: 20,
        step: 1,
        default: 5,
      }
    ]
  },
  {
    id: 'LETKF',
    label: 'LETKF',
    fullName: '局所アンサンブル変換カルマンフィルタ',
    fullNameEn: 'Local Ensemble Transform Kalman Filter',
    category: 'ensemble',
    summary: '局所化と流れ依存共分散を両立した現業気象予報の標準手法。',
    summaryEn: 'State-of-the-art operational weather forecasting method combining local parallel transforms and flow-dependent covariance.',
    params: [
      {
        key: 'ensembleSize',
        label: 'アンサンブルサイズ (M)',
        labelEn: 'Ensemble Size (M)',
        min: 5,
        max: 200,
        step: 5,
        default: 30,
      },
      {
        key: 'inflation',
        label: 'インフレーション (λ)',
        labelEn: 'Inflation (λ)',
        min: 1.00,
        max: 1.50,
        step: 0.01,
        default: 1.05,
      },
      {
        key: 'localization',
        label: '局所化半径 (L)',
        labelEn: 'Localization Radius (L)',
        min: 1,
        max: 20,
        step: 1,
        default: 5,
      }
    ]
  },
  {
    id: '3DVar',
    label: '3DVar',
    fullName: '3次元変分法',
    fullNameEn: '3D Variational Data Assimilation',
    category: 'variational',
    summary: '時間変化しない固定共分散行列を用いる。計算が軽いが流れ依存性は表現できない。',
    summaryEn: 'Uses a static, time-invariant background error covariance matrix (B). Computationally light but lacks flow dependency.',
    params: [
      {
        key: 'bgErrorVar',
        label: '背景誤差分散 (σb²)',
        labelEn: 'Background Error Var (σb²)',
        min: 0.1,
        max: 5.0,
        step: 0.1,
        default: 1.0,
      },
      {
        key: 'corrLength',
        label: '相関距離 (L)',
        labelEn: 'Correlation Length (L)',
        min: 1,
        max: 20,
        step: 1,
        default: 5,
      }
    ]
  },
  {
    id: '4DVar',
    label: '4DVar',
    fullName: '4次元変分法',
    fullNameEn: '4D Variational Data Assimilation',
    category: 'variational',
    summary: '同化ウィンドウ内の時系列観測を時間一貫性を保ち最適化。随伴（アジョイント）モデルが必要。',
    summaryEn: 'Optimizes initial states across a time window with dynamical consistency using adjoint model gradient descent.',
    params: [
      {
        key: 'bgErrorVar',
        label: '背景誤差分散 (σb²)',
        labelEn: 'Background Error Var (σb²)',
        min: 0.1,
        max: 5.0,
        step: 0.1,
        default: 1.0,
      },
      {
        key: 'windowSize',
        label: '同化ウィンドウ (W)',
        labelEn: 'Assimilation Window (W)',
        min: 1,
        max: 15,
        step: 1,
        default: 5,
      }
    ]
  },
  {
    id: 'PF',
    label: 'PF',
    fullName: '粒子フィルタ',
    fullNameEn: 'Particle Filter (SIR)',
    category: 'particle',
    summary: '非線形・非ガウス分布を表現可能だが、高次元空間では次元の呪いを受ける。',
    summaryEn: 'Represents fully nonlinear and non-Gaussian distributions, but suffers from the curse of dimensionality in high dimensions.',
    params: [
      {
        key: 'ensembleSize',
        label: '粒子数 (M)',
        labelEn: 'Particle Size (M)',
        min: 10,
        max: 500,
        step: 10,
        default: 50,
      },
      {
        key: 'resampleThreshold',
        label: 'リサンプリング閾値',
        labelEn: 'Resample Threshold',
        min: 0.1,
        max: 1.0,
        step: 0.05,
        default: 0.5,
      }
    ]
  },
];

/** Observation mode tabs */
export const OBS_MODES = [
  { id: 'full',    label: '全観測',     desc: '全40格子点を毎ステップ観測' },
  { id: 'sparse',  label: '疎密観測',   desc: '前半領域（例: 格子点1〜20）のみを集中観測' },
  { id: 'thinned', label: '間引き観測', desc: '全格子点を空間的に等間隔でサンプリング観測' },
  { id: 'custom',  label: 'カスタム観測', desc: '格子点を個別にクリックして観測地点を自由にON/OFF' },
];

/** Chart color palette for up to 7 methods */
export const CHART_COLORS = [
  '#8ed5ff', // sky / primary
  '#ce9bff', // purple / tertiary-container
  '#45dfa4', // emerald / secondary
  '#ffb4ab', // coral / error
  '#7bd0ff', // light sky
  '#e1bfff', // lavender / tertiary
  '#68fcbf', // mint / secondary-fixed
];

/** Default advanced options */
export const DEFAULT_ADVANCED = {
  N: 40,
  F: 8.0,
  obsErrorVar: 1.0,
  obsInterval: 1,
  numSteps: 500,
  dt: 0.05,
  sparseInterval: 4,
  sparseRegionStart: 0,
  sparseRegionEnd: 19,
  thinNumObs: 20,
};

/** Create a new method instance with method-specific defaults or custom overrides */
let methodCounter = 0;
export function createMethodInstance(methodType, customLabel = null, customParams = null) {
  methodCounter++;
  const methodDef = DA_METHODS.find(m => m.id === methodType) || DA_METHODS[1];
  
  const paramValues = {};
  methodDef.params.forEach(p => {
    paramValues[p.key] = (customParams && customParams[p.key] !== undefined) ? customParams[p.key] : p.default;
  });

  const defaultLabel = `${methodType}-${String(methodCounter).padStart(2, '0')}`;

  return {
    instanceId: defaultLabel,
    type: methodType,
    label: customLabel || defaultLabel,
    paramDefs: methodDef.params,
    params: paramValues,
    visible: true,
    // Results (filled after simulation)
    rmseTimeSeries: null,
    spreadTimeSeries: null,
    avgRmse: null,
    avgSpread: null,
    timeSteps: null,
  };
}

export function createPresetMethodInstance(methodType, customLabel, customParams) {
  return createMethodInstance(methodType, customLabel, customParams);
}

/** Reset the counter (for tests) */
export function resetMethodCounter() {
  methodCounter = 0;
}
