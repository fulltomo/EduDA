/**
 * EduDA Constants & Configuration
 */

/** Available DA methods with parameter specifications */
export const DA_METHODS = [
  {
    id: 'EKF',
    label: 'EKF',
    fullName: '拡張カルマンフィルタ',
    params: [
      { key: 'processNoise', label: 'Process Noise (Q)', min: 0.001, max: 0.20, step: 0.005, default: 0.01 },
    ]
  },
  {
    id: 'EnKF',
    label: 'EnKF',
    fullName: '確率的アンサンブルカルマンフィルタ',
    params: [
      { key: 'ensembleSize', label: 'Ensemble Size (M)', min: 5, max: 200, step: 5, default: 30 },
      { key: 'inflation', label: 'Inflation', min: 1.00, max: 1.50, step: 0.01, default: 1.05 },
      { key: 'localization', label: 'Localization Radius', min: 1, max: 20, step: 1, default: 5 }
    ]
  },
  {
    id: 'EnSRF',
    label: 'EnSRF',
    fullName: 'アンサンブル平方根フィルタ',
    params: [
      { key: 'ensembleSize', label: 'Ensemble Size (M)', min: 5, max: 200, step: 5, default: 30 },
      { key: 'inflation', label: 'Inflation', min: 1.00, max: 1.50, step: 0.01, default: 1.05 },
      { key: 'localization', label: 'Localization Radius', min: 1, max: 20, step: 1, default: 5 }
    ]
  },
  {
    id: 'LETKF',
    label: 'LETKF',
    fullName: '局所アンサンブル変換カルマンフィルタ',
    params: [
      { key: 'ensembleSize', label: 'Ensemble Size (M)', min: 5, max: 200, step: 5, default: 30 },
      { key: 'inflation', label: 'Inflation', min: 1.00, max: 1.50, step: 0.01, default: 1.05 },
      { key: 'localization', label: 'Localization Radius', min: 1, max: 20, step: 1, default: 5 }
    ]
  },
  {
    id: '3DVar',
    label: '3DVar',
    fullName: '3次元変分法',
    params: [
      { key: 'bgErrorVar', label: 'Background Error Var (σb²)', min: 0.1, max: 5.0, step: 0.1, default: 1.0 },
      { key: 'corrLength', label: 'Correlation Length (L)', min: 1, max: 20, step: 1, default: 5 }
    ]
  },
  {
    id: '4DVar',
    label: '4DVar',
    fullName: '4次元変分法',
    params: [
      { key: 'bgErrorVar', label: 'Background Error Var (σb²)', min: 0.1, max: 5.0, step: 0.1, default: 1.0 },
      { key: 'windowSize', label: 'Assimilation Window', min: 1, max: 15, step: 1, default: 5 }
    ]
  },
  {
    id: 'PF',
    label: 'PF',
    fullName: '粒子フィルタ',
    params: [
      { key: 'ensembleSize', label: 'Particle Size (M)', min: 10, max: 500, step: 10, default: 50 },
      { key: 'resampleThreshold', label: 'Resample Threshold', min: 0.1, max: 1.0, step: 0.05, default: 0.5 }
    ]
  },
];

/** Observation mode tabs */
export const OBS_MODES = [
  { id: 'full',    label: '全観測',     desc: '全40格子点を毎ステップ観測' },
  { id: 'sparse',  label: '疎密観測',   desc: '特定の間隔・一部の領域のみを観測' },
  { id: 'thinned', label: '間引き観測', desc: '観測頻度を間引いて同化' },
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
  sparseRegionEnd: 39,
  thinInterval: 2,
};

/** Create a new method instance with method-specific defaults */
let methodCounter = 0;
export function createMethodInstance(methodType) {
  methodCounter++;
  const methodDef = DA_METHODS.find(m => m.id === methodType) || DA_METHODS[1];
  
  const paramValues = {};
  methodDef.params.forEach(p => {
    paramValues[p.key] = p.default;
  });

  return {
    instanceId: `${methodType}-${String(methodCounter).padStart(2, '0')}`,
    type: methodType,
    label: `${methodType}-${String(methodCounter).padStart(2, '0')}`,
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

/** Reset the counter (for tests) */
export function resetMethodCounter() {
  methodCounter = 0;
}
