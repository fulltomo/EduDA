export const PRESETS = [
  {
    id: 'preset1',
    title: '実験1: インフレーションの効果',
    theme: 'アンサンブル縮小・過信（Filter Divergence）の防止効果を体験。',
    description: '共分散インフレーション（膨張）がない場合（Inflation 1.00）、少アンサンブル（M=20）のサンプリング誤差によってメンバーが真値から離れて互いに縮小し、同化が機能しなくなる「フィルター発散」が発生します。Inflation 1.00ではRMSEが約2.5以上へと著しく悪化・発散しますが、適正インフレーション（Inflation 1.15）を設定することでSpreadが適切に維持され、低RMSE（約0.35）の安定した同化が可能になります。',
    obsMode: 'full',
    methods: [
      {
        type: 'POEnKF',
        label: 'POEnKF (Inflation 1.00: 膨張なし)',
        params: { ensembleSize: 20, inflation: 1.00, localization: 10 }
      },
      {
        type: 'POEnKF',
        label: 'POEnKF (Inflation 1.15: 適正膨張)',
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
        type: 'POEnKF',
        label: 'POEnKF (Localization 5)',
        params: { ensembleSize: 15, inflation: 1.05, localization: 5 }
      },
      {
        type: 'POEnKF',
        label: 'POEnKF (Localization 20)',
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
