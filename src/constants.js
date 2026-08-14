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
  { id: 'sparse',  label: '疎密観測',   desc: '前半領域（例: 格子点0〜19）のみを集中観測' },
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

export function createPresetMethodInstance(methodType, customLabel, customParams) {
  methodCounter++;
  const methodDef = DA_METHODS.find(m => m.id === methodType) || DA_METHODS[1];

  const paramValues = {};
  methodDef.params.forEach(p => {
    paramValues[p.key] = customParams[p.key] !== undefined ? customParams[p.key] : p.default;
  });

  return {
    instanceId: `${methodType}-${String(methodCounter).padStart(2, '0')}`,
    type: methodType,
    label: customLabel || `${methodType}-${String(methodCounter).padStart(2, '0')}`,
    paramDefs: methodDef.params,
    params: paramValues,
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

export const PRESETS = [
  {
    id: 'preset1',
    title: '実験1: インフレーションの効果',
    theme: 'アンサンブル縮小・過信（Filter Divergence）の防止効果を体験。',
    description: '共分散インフレーション（膨張）がない場合（Inflation 1.00）、少アンサンブル（M=20）のサンプリング誤差によってメンバーが真値から離れて互いに縮小し、同化が機能しなくなる「フィルター発散」が発生します。Inflation 1.00ではRMSEが約2.5以上へと著しく悪化・発散しますが、適正インフレーション（Inflation 1.15）を設定することでSpreadが適切に維持され、低RMSE（約0.35）の安定した同化が可能になります。',
    obsMode: 'full',
    methods: [
      {
        type: 'EnKF',
        label: 'EnKF (Inflation 1.00: 膨張なし)',
        params: { ensembleSize: 20, inflation: 1.00, localization: 10 }
      },
      {
        type: 'EnKF',
        label: 'EnKF (Inflation 1.15: 適正膨張)',
        params: { ensembleSize: 20, inflation: 1.15, localization: 10 }
      }
    ],
    advancedOptions: {
      N: 40,
      F: 8.0,
      obsErrorVar: 1.0,
      obsInterval: 2,
      numSteps: 500,
      dt: 0.05,
    }
  },
  {
    id: 'preset2',
    title: '実験2: 局所化 (Localization) の効果',
    theme: '少アンサンブルサイズにおける疑似相関（Spurious Correlation）の影響を比較。',
    description: 'アンサンブル数が少ないとき、物理的に無関係な遠く離れた地点間で偶然に相関が生じる「疑似相関」が発生します。局所化半径を小さく設定する（Localization 5）ことで、不要な遠隔相関をカットし同化精度が向上します。局所化半径が大きすぎる場合（Localization 20）、疑似相関のノイズを拾ってしまい精度が悪化します。',
    obsMode: 'full',
    methods: [
      {
        type: 'EnKF',
        label: 'EnKF (Localization 5)',
        params: { ensembleSize: 15, inflation: 1.05, localization: 5 }
      },
      {
        type: 'EnKF',
        label: 'EnKF (Localization 20)',
        params: { ensembleSize: 15, inflation: 1.05, localization: 20 }
      }
    ],
    advancedOptions: {
      N: 40,
      F: 8.0,
      obsErrorVar: 1.0,
      obsInterval: 1,
      numSteps: 500,
      dt: 0.05,
    }
  },
  {
    id: 'preset3',
    title: '実験3: 固定共分散（3DVar）vs 流れ依存共分散（LETKF）',
    theme: '固定背景誤差共分散（Static B）と時々刻々変化する流れ依存共分散（Flow-dependent P）の未観測領域における補正能力を比較。',
    description: 'データ同化手法の最大の違いの1つは背景誤差共分散の扱い方です。変分法の代表格である3DVarは時間変化しない固定共分散（Static B）を用いるため、未観測領域への修正は空間距離のみに依存した等方的な広がりになります。一方、アンサンブル手法の代表格であるLETKFはアンサンブルのばらつきから「流れ依存の共分散（Flow-dependent P）」をリアルタイムに計算するため、観測がない領域でも物理的な流れや波の伝播に沿った高度な修正が可能です。',
    obsMode: 'sparse',
    methods: [
      {
        type: '3DVar',
        label: '3DVar (固定共分散 B)',
        params: { bgErrorVar: 1.0, corrLength: 5 }
      },
      {
        type: 'LETKF',
        label: 'LETKF (流れ依存共分散 P)',
        params: { ensembleSize: 30, inflation: 1.05, localization: 5 }
      }
    ],
    advancedOptions: {
      N: 40,
      F: 8.0,
      obsErrorVar: 1.0,
      obsInterval: 1,
      numSteps: 500,
      dt: 0.05,
      sparseInterval: 4,
      sparseRegionStart: 0,
      sparseRegionEnd: 39,
    }
  },
  {
    id: 'preset4',
    title: '実験4: 高次元空間での粒子フィルタ (PF) の限界',
    theme: '次元の呪い（Weight Collapse）と粒子数の関係を体験。',
    description: '粒子フィルタ（PF）は非線形・非ガウス分布を表現できますが、システム次元（状態空間の大きさ N=40）が大きくなると、特定の1つの粒子に極端に重みが集中する「重みの崩壊（Weight Collapse）」が発生します。粒子数が少ない場合（PF 50）はすぐに発散し、粒子数を増やしても（PF 500）高次元の呪いにより精度維持には膨大な数の粒子が必要となる限界を体感します。',
    obsMode: 'full',
    methods: [
      {
        type: 'PF',
        label: 'PF (Particle Size 50)',
        params: { ensembleSize: 50, resampleThreshold: 0.5 }
      },
      {
        type: 'PF',
        label: 'PF (Particle Size 500)',
        params: { ensembleSize: 500, resampleThreshold: 0.5 }
      }
    ],
    advancedOptions: {
      N: 40,
      F: 8.0,
      obsErrorVar: 1.0,
      obsInterval: 1,
      numSteps: 500,
      dt: 0.05,
    }
  }
];
