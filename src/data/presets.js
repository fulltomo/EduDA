export const PRESETS = [
  {
    id: 'preset1',
    title: '実験1: インフレーションの効果',
    titleEn: 'Exp 1: Effects of Inflation',
    theme: 'アンサンブル過信（フィルター発散）の防止',
    themeEn: 'Prevent ensemble overconfidence and filter divergence',
    description: 'インフレーション（λ）がないと少アンサンブルは誤差を過小評価して発散（青線：RMSE急増）しますが、適正値（λ=1.15）を入れると安定して高精度（紫線：低RMSE）を保ちます。',
    descriptionEn: 'Without inflation (λ=1.00), small ensembles become overconfident and diverge (Blue: high RMSE). Tuning inflation (λ=1.15) stabilizes tracking (Purple: low RMSE).',
    obsMode: 'full',
    methods: [
      {
        type: 'POEnKF',
        label: 'POEnKF (λ=1.0 膨張なし)',
        labelEn: 'POEnKF (λ=1.0 None)',
        params: { ensembleSize: 20, inflation: 1.00, localization: 10 }
      },
      {
        type: 'POEnKF',
        label: 'POEnKF (λ=1.15 適正)',
        labelEn: 'POEnKF (λ=1.15 Tuned)',
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
    titleEn: 'Exp 2: Effects of Localization',
    theme: '少アンサンブルにおける疑似相関ノイズの除去',
    themeEn: 'Cut distant spurious correlation noise in small ensembles',
    description: 'アンサンブル数が少ないと遠く離れた地点間で偶然の相関（疑似相関）が発生します。局所化半径を絞る（L=5）ことで不要なノイズをカットし、精度が劇的に改善します。',
    descriptionEn: 'Small ensembles create fake correlations between distant points. Tight localization (L=5) filters out this noise, outperforming loose localization (L=20).',
    obsMode: 'full',
    methods: [
      {
        type: 'POEnKF',
        label: 'POEnKF (L=5 局所化あり)',
        labelEn: 'POEnKF (L=5 Tuned)',
        params: { ensembleSize: 15, inflation: 1.05, localization: 5 }
      },
      {
        type: 'POEnKF',
        label: 'POEnKF (L=20 広すぎ)',
        labelEn: 'POEnKF (L=20 Wide)',
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
    titleEn: 'Exp 3: Static (3DVar) vs Flow-Dependent (LETKF) Covariance',
    theme: '未観測領域における物理的な波の伝播と補正能力の差',
    themeEn: 'Error propagation into unobserved zones under sparse observations',
    description: '固定共分散（3DVar）は未観測領域を距離だけで一様に補正しますが、LETKFはリアルタイムな大気の流れ（波の動き）に沿って未観測領域まで正確に修正します。',
    descriptionEn: 'Static 3DVar spreads corrections uniformly by distance, whereas LETKF dynamically captures wave propagation across unobserved grid points.',
    obsMode: 'sparse',
    methods: [
      {
        type: '3DVar',
        label: '3DVar (固定共分散)',
        labelEn: '3DVar (Static B)',
        params: { bgErrorVar: 0.2, corrLength: 2 }
      },
      {
        type: 'LETKF',
        label: 'LETKF (流れ依存)',
        labelEn: 'LETKF (Flow P)',
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
    title: '実験4: 次元の呪い（標準SIR）vs 局所粒子フィルタ（LPF）',
    titleEn: 'Exp 4: Curse of Dimensionality (Standard SIR) vs Local Particle Filter (LPF)',
    theme: '高次元での重み縮退の崩壊と局所化による克服',
    themeEn: 'Overcoming weight collapse in high dimensions via spatial localization',
    description: '標準粒子フィルタ（SIR）は高次元（N=40）で1つの粒子に重みが偏って破綻（青線：発散）しますが、局所化（LPF）によりわずか30粒子でも安定して真値を捉え続けます。',
    descriptionEn: 'Standard SIR particle filters collapse in high dimensions (N=40), while localized particle filters (LPF) accurately track the truth with just 30 particles.',
    obsMode: 'full',
    methods: [
      {
        type: 'PF',
        label: 'PF (標準SIR)',
        labelEn: 'PF (Standard SIR)',
        params: { filterType: 'SIR', ensembleSize: 50, resampleThreshold: 0.5 }
      },
      {
        type: 'PF',
        label: 'PF (局所型LPF)',
        labelEn: 'PF (Local LPF)',
        params: { filterType: 'LPF', ensembleSize: 30, localization: 3, resampleThreshold: 0.5 }
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

export function getLocalizedPreset(preset, lang = 'ja') {
  if (!preset) return null;
  if (lang === 'en') {
    return {
      ...preset,
      title: preset.titleEn || preset.title,
      theme: preset.themeEn || preset.theme,
      description: preset.descriptionEn || preset.description,
      methods: preset.methods.map(m => ({
        ...m,
        label: m.labelEn || m.label
      }))
    };
  }
  return preset;
}
