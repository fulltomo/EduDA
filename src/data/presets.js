export const PRESETS = [
  {
    id: 'preset1',
    title: '実験1: インフレーションの効果',
    titleEn: 'Exp 1: Effects of Inflation',
    theme: 'アンサンブル縮小・過信（Filter Divergence）の防止効果を体験。',
    themeEn: 'Prevent ensemble shrinkage, overconfidence, and filter divergence.',
    description: '共分散インフレーション（膨張）がない場合（Inflation 1.00）、少アンサンブル（M=20）のサンプリング誤差によってメンバーが真値から離れて互いに縮小し、同化が機能しなくなる「フィルター発散」が発生します。Inflation 1.00ではRMSEが約2.5以上へと著しく悪化・発散しますが、適正インフレーション（Inflation 1.15）を設定することでSpreadが適切に維持され、低RMSE（約0.35）の安定した同化が可能になります。',
    descriptionEn: 'Without covariance inflation (Inflation 1.00), sampling errors in small ensembles (M=20) cause members to collapse together away from the truth, causing filter divergence (RMSE >= 2.5). Applying appropriate inflation (Inflation 1.15) maintains adequate spread and achieves stable assimilation (RMSE ~0.35).',
    obsMode: 'full',
    methods: [
      {
        type: 'POEnKF',
        label: 'POEnKF (Inflation 1.00: 膨張なし)',
        labelEn: 'POEnKF (Inflation 1.00: No Inflation)',
        params: { ensembleSize: 20, inflation: 1.00, localization: 10 }
      },
      {
        type: 'POEnKF',
        label: 'POEnKF (Inflation 1.15: 適正膨張)',
        labelEn: 'POEnKF (Inflation 1.15: Tuned Inflation)',
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
    theme: '少アンサンブルサイズにおける疑似相関（Spurious Correlation）の影響を比較。',
    themeEn: 'Mitigate spurious correlations under small ensemble sizes.',
    description: 'アンサンブル数が少ないとき、物理的に無関係な遠く離れた地点間で偶然に相関が生じる「疑似相関」が発生します。局所化半径を小さく設定する（Localization 5）ことで、不要な遠隔相関をカットし同化精度が向上します。局所化半径が大きすぎる場合（Localization 20）、疑似相関のノイズを拾ってしまい精度が悪化します。',
    descriptionEn: 'When the ensemble size is small, spurious correlations arise by chance between physically distant points. Constraining the localization radius (Localization 5) filters out non-physical distant noise and dramatically improves assimilation accuracy compared to an unlocalized or loose setup (Localization 20).',
    obsMode: 'full',
    methods: [
      {
        type: 'POEnKF',
        label: 'POEnKF (Localization 5)',
        labelEn: 'POEnKF (Localization 5)',
        params: { ensembleSize: 15, inflation: 1.05, localization: 5 }
      },
      {
        type: 'POEnKF',
        label: 'POEnKF (Localization 20)',
        labelEn: 'POEnKF (Localization 20)',
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
    theme: '固定背景誤差共分散（Static B）と時々刻々変化する流れ依存共分散（Flow-dependent P）の未観測領域における補正能力を比較。',
    themeEn: 'Compare background error propagation into unobserved regions under sparse observations.',
    description: 'データ同化手法の最大の違いの1つは背景誤差共分散の扱い方です。変分法の代表格である3DVarは時間変化しない固定共分散（Static B）を用いるため、未観測領域への修正は空間距離のみに依存した等方的な広がりになります。一方、アンサンブル手法の代表格であるLETKFはアンサンブルのばらつきから「流れ依存の共分散（Flow-dependent P）」をリアルタイムに計算するため、観測がない領域でも物理的な流れや波の伝播に沿った高度な修正が可能です。',
    descriptionEn: '3DVar uses a static background error covariance matrix (B), propagating observation increments isotropically based solely on distance. In contrast, LETKF dynamically estimates flow-dependent covariance (P) from ensemble deviations, accurately tracking wave propagation and dynamics even across unobserved grid points.',
    obsMode: 'sparse',
    methods: [
      {
        type: '3DVar',
        label: '3DVar (固定共分散 B)',
        labelEn: '3DVar (Static B)',
        params: { bgErrorVar: 0.2, corrLength: 2 }
      },
      {
        type: 'LETKF',
        label: 'LETKF (流れ依存共分散 P)',
        labelEn: 'LETKF (Flow-dependent P)',
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
    theme: '高次元空間における重み縮退の崩壊と、局所化による次元の呪いの克服を体験。',
    themeEn: 'Experience weight collapse in high dimensions and its solution via localization.',
    description: '粒子フィルタ（PF）は非線形・非ガウス分布を表現できますが、システム次元（状態空間の大きさ N=40）が大きくなると、標準的なSIR型では特定の1つの粒子に極端に重みが集中する「重みの縮退（Weight Collapse）」が発生し、粒子数によらずRMSEが約4.9へと発散します。一方、空間局所化と観測引き寄せを導入した「局所粒子フィルタ (LPF)」を用いると、わずか30粒子でも次元の呪いを克服し、RMSE約0.27の安定した同化が可能になります。',
    descriptionEn: 'While Particle Filters (PF) handle nonlinear distributions, standard SIR suffers from severe weight collapse in N=40 dimensions, causing filter divergence (RMSE ~4.9). In contrast, the Local Particle Filter (LPF) applies spatial localization and observation guidance, overcoming the curse of dimensionality to achieve accurate assimilation (RMSE ~0.27) with only 30 particles.',
    obsMode: 'full',
    methods: [
      {
        type: 'PF',
        label: 'PF (標準SIR: 次元の呪い)',
        labelEn: 'PF (Standard SIR: Weight Collapse)',
        params: { filterType: 'SIR', ensembleSize: 50, resampleThreshold: 0.5 }
      },
      {
        type: 'PF',
        label: 'PF (局所型LPF: 呪いを克服)',
        labelEn: 'PF (Local LPF: Overcomes Curse)',
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
