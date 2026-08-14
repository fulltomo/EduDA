export const TOOLTIP_DATA = {
  inflation: {
    title: 'Inflation (アンサンブルインフレーション)',
    titleEn: 'Inflation (Covariance Inflation)',
    description: 'アンサンブル予測では、メンバー数が有限であることやモデルの不完全性により、アンサンブルの分散（Spread）が過小評価され、予測を過信して観測データを無視する「フィルタ発散」が発生しやすくなります。インフレーションは、各ステップでアンサンブル偏差を一定倍（λ > 1）に拡大し、分散の過小評価（共分散縮退）を防ぎます。',
    descriptionEn: 'In ensemble forecasting, finite ensemble size and model errors cause ensemble spread to be underestimated. This leads the filter to overconfidently ignore observations and undergo filter divergence. Inflation expands ensemble deviations by a factor λ > 1 at each assimilation step to prevent covariance shrinkage.',
    formula: 'xᵢ ← x̄ + λ(xᵢ - x̄)\n(x̄: アンサンブル平均, xᵢ: 各メンバー, λ: インフレーション係数)',
    formulaEn: 'xᵢ ← x̄ + λ(xᵢ - x̄)\n(x̄: Ensemble mean, xᵢ: Member state, λ: Inflation factor)',
    guideline: '通常 1.01 〜 1.15。モデル不確実性が高い場合やメンバー数が少ない場合は大きめに設定します。大きすぎると観測ノイズを過剰同化し、解析値が不安定になります。',
    guidelineEn: 'Typically 1.01 – 1.15. Increase when ensemble size is small or model uncertainty is high. Excessive inflation will over-fit observation noise and degrade stability.'
  },
  localization: {
    title: 'Localization Radius (局所化半径)',
    titleEn: 'Localization Radius (Covariance Localization)',
    description: '有限のアンサンブル予測において、空間的に遠く離れた物理的に無関係な地点間で生じる「疑似相関」を排除するためのパラメータです。格子点間の距離に応じて誤差共分散（またはカルマンゲイン）を減衰させ、観測の影響範囲を近傍のみに限定します。',
    descriptionEn: 'Filters out spurious sample correlations that randomly emerge between physically distant points due to limited ensemble size. Decays error covariance or Kalman gain with distance using functions like Gaspari-Cohn to localize observation increments.',
    formula: 'B_localized = ρ ∘ B  または  K_localized = ρ ∘ K\n(ρ: 距離減衰関数 (Gaspari-Cohn等), ∘: アダマール積, B: 共分散, K: ゲイン)',
    formulaEn: 'B_localized = ρ ∘ B  or  K_localized = ρ ∘ K\n(ρ: Distance correlation function, ∘: Schur product, B: Covariance, K: Gain)',
    guideline: '通常 3 〜 10 格子点。メンバー数 M が小さいほど疑似相関が発生しやすいため、半径をより小さく制限して過同化を防ぎます。',
    guidelineEn: 'Typically 3 – 10 grid points. Smaller ensemble sizes M require tighter localization radii to prevent overfitting to spurious correlations.'
  },
  processNoise: {
    title: 'Process Noise Q (プロセスノイズ)',
    titleEn: 'Process Noise Q',
    description: '拡張カルマンフィルタ（EKF）において、予測モデルの不完全性（数値誤差や未表現の物理過程）による予測不確実性の増大を表す分散パラメータです。この値を大きくすると、予測の信頼度が下がり、相対的に観測データを重視した修正を行うようになります。',
    descriptionEn: 'Variance parameter in the Extended Kalman Filter (EKF) representing model error growth (numerical truncation and unresolved physics). Increasing Q lowers confidence in model forecast and increases reliance on observations.',
    formula: 'Pᶠ_k = M_k Pᵃ_{k-1} M_kᵀ + Q\n(Pᶠ: 予測誤差共分散, Pᵃ: 解析誤差共分散, M: 接線線形モデル, Q: プロセスノイズ)',
    formulaEn: 'Pᶠ_k = M_k Pᵃ_{k-1} M_kᵀ + Q\n(Pᶠ: Forecast covariance, Pᵃ: Analysis covariance, M: Tangent linear model, Q: Process noise)',
    guideline: '通常 0.001 〜 0.05。モデルに未表現の物理や外乱が多い場合は大きめに、逆に予測が正確な場合は小さめに設定します。',
    guidelineEn: 'Typically 0.001 – 0.05. Increase if model approximations are coarse; decrease if model dynamics are highly accurate.'
  },
  bgErrorVar: {
    title: 'Background Error Var σb² (背景誤差分散)',
    titleEn: 'Background Error Var σb²',
    description: '3DVarや4DVarなどの変分法において、予測状態（第一推定値・背景状態）の不確実性を表す分散パラメータです。大きく設定するほど予測モデルを信頼せず、観測データに近い解析値へと修正されます。',
    descriptionEn: 'Variance parameter in variational methods (3DVar, 4DVar) representing the uncertainty of the prior/background state. Higher values decrease confidence in the prior, yielding analysis states closer to observations.',
    formula: 'B = σb² ∘ C\n(B: 背景誤差共分散行列, C: 空間相関行列, σb²: 背景誤差分散)',
    formulaEn: 'B = σb² ∘ C\n(B: Background error covariance, C: Spatial correlation matrix, σb²: Background variance)',
    guideline: '通常 0.5 〜 2.0。観測誤差分散（デフォルト 1.0）との相対比率によって、予測（背景）と観測のどちらをどれだけ信じるかのバランスが決まります。',
    guidelineEn: 'Typically 0.5 – 2.0. Balances the relative weight between prior state and new observations.'
  },
  resampleThreshold: {
    title: 'Resample Threshold (リサンプリング閾値)',
    titleEn: 'Resample Threshold (SIR)',
    description: '粒子フィルタ（PF）において、少数の粒子のみに重みが集中する「重みの縮退」を防ぐ基準値です。有効粒子数の割合がこの閾値を下回った際に、重みの大きい粒子を複製し、小さい粒子を消滅させる「再サンプリング」を実行します。',
    descriptionEn: 'Threshold in Particle Filters (PF) to trigger Sequential Importance Resampling (SIR) and prevent weight degeneracy. When effective particle ratio drops below this threshold, high-weight particles are duplicated.',
    formula: 'N_eff = 1 / Σ(w_i²)\n(N_eff < Threshold × M のとき実行 / w_i: 正規化重み, M: 粒子数)',
    formulaEn: 'N_eff = 1 / Σ(w_i²)\n(Trigger when N_eff < Threshold × M | w_i: Normalized weights, M: Particle count)',
    guideline: '通常 0.5 〜 0.8。高すぎるとサンプリングが頻繁に走り粒子の多様性が低下（枯渇）します。低すぎると一部の粒子のみに依存して近似が崩壊します。',
    guidelineEn: 'Typically 0.5 – 0.8. Setting too high causes frequent resampling and particle impoverishment; setting too low risks weight collapse.'
  },
  spread: {
    title: 'Spread (アンサンブル分散・スプレッド)',
    titleEn: 'Spread (Ensemble Spread)',
    description: '複数の予測（メンバーや粒子）が互いにどれだけばらついているかを表す統計量です。予測の「不確実性（確信度）」を示しており、理想的な同化状態では、スプレッドの大きさが実際の解析誤差（RMSE）と同程度になる「Error-Spread関係」が成り立ちます。',
    descriptionEn: 'Standard deviation across ensemble members or particles, quantifying forecast uncertainty. In an optimal filter, ensemble spread closely matches the true Root Mean Square Error (RMSE), satisfying the Error-Spread relationship.',
    formula: 'Spread = √[ 1 / (N(M-1)) × Σ_j Σ_i (x_{i,j} - x̄_j)² ]\n(N: 格子点数, M: メンバー数, x_{i,j}: メンバーiの格子点jの値, x̄_j: 平均値)',
    formulaEn: 'Spread = √[ 1 / (N(M-1)) × Σ_j Σ_i (x_{i,j} - x̄_j)² ]\n(N: Grid dimension, M: Ensemble size, x_{i,j}: Member i grid j, x̄_j: Mean)',
    guideline: '解析のRMSEと同程度の値が最適です。スプレッドがRMSEより大幅に小さい場合はアンサンブルの「過信（収縮）」、大きい場合は「過小評価」を表します。',
    guidelineEn: 'Should ideally match analysis RMSE. If Spread << RMSE, the filter is overconfident; if Spread >> RMSE, it under-relies on model forecast.'
  },
  ensembleSize: {
    title: 'Ensemble Size M (アンサンブル/粒子サイズ)',
    titleEn: 'Ensemble Size M (Members / Particles)',
    description: '状態の確率分布や予測不確実性の時間発展を表現するために、並列にシミュレーションするメンバー（または粒子）の総数です。数が多いほど高次元の分布を正確に表現できますが、計算負荷が高くなります。',
    descriptionEn: 'Total number of parallel realizations used to sample state probability distributions. Larger ensemble sizes improve estimation accuracy at the expense of computational cost.',
    formula: 'M (シミュレーションするパラレル数)',
    formulaEn: 'M (Number of parallel realizations)',
    guideline: '通常 20 〜 100（粒子フィルタでは 100 〜 500 以上を推奨）。ブラウザの計算負荷とRMSEの改善度のトレードオフで決定します。',
    guidelineEn: 'Typically 20 – 100 (100 – 500+ for Particle Filters). Trade-off between accuracy and browser compute latency.'
  },
  corrLength: {
    title: 'Correlation Length L (相関距離)',
    titleEn: 'Correlation Length L',
    description: '3DVarにおいて、第一推定値（背景状態）の誤差が空間的にどの程度の距離まで相関しているかを定義します。値が大きいほど、1つの観測データからの修正情報が周囲の格子点に滑らかに広く伝播します。',
    descriptionEn: 'Spatial scale governing background error correlations in 3DVar. Larger values spread observation increments smoothly across broader spatial regions.',
    formula: 'C_ij = ρ(d_ij / L)\n(C_ij: 格子点i-j間の相関, d_ij: 距離, L: 相関距離, ρ: 相関関数)',
    formulaEn: 'C_ij = ρ(d_ij / L)\n(C_ij: Spatial correlation between grid points i-j, L: Correlation length)',
    guideline: '通常 3 〜 10。現象の空間スケールや観測点の間隔に合わせて調整します。大きすぎると不要な遠方まで修正が及び、不自然な平滑化が起きます。',
    guidelineEn: 'Typically 3 – 10. Tune to match the characteristic physical wave scale and observation network spacing.'
  },
  windowSize: {
    title: 'Assimilation Window (同化ウィンドウ)',
    titleEn: 'Assimilation Window (4DVar)',
    description: '4DVarにおいて、一定期間（タイムスライス）の複数観測データを一度にまとめて処理する時間幅（ステップ数）です。ウィンドウ内のモデル状態推移が、すべての観測値およびモデル物理と最も調和するように初期状態を最適化します。',
    descriptionEn: 'Time duration (number of steps) over which distributed observations are simultaneously assimilated in 4DVar using adjoint gradient descent.',
    formula: 'J(x₀) = 第一推定値の不確実性 + 期間内の観測残差和\n(W: 同化ウィンドウサイズ, x₀: 制御変数となる初期値)',
    formulaEn: 'J(x₀) = Prior Cost + Observation Cost across window W\n(x₀: Initial state optimization control variable)',
    guideline: '通常 3 〜 10。長すぎるとモデルの非線形性により最適化の収束（勾配降下）が極めて難しくなり、短すぎると時間発展の拘束力が弱まります。',
    guidelineEn: 'Typically 3 – 10. If too long, strong nonlinearity creates local minima and non-convex gradient descent; if too short, temporal dynamical constraints weaken.'
  },
  filterDivergence: {
    title: '⚠️ フィルター発散 (Filter Divergence)',
    titleEn: '⚠️ Filter Divergence',
    description: 'データ同化の計算過程において、推定値の誤差（RMSE）が異常に大きくなったり、数値が非数（NaN）や無限大（Infinity）に陥ってシミュレーションが破綻する現象です。「システムのバグ」ではなく、モデルの非線形性や誤差共分散の過小評価などにより、実際の現象とシミュレーションの整合性が取れなくなることで発生します。',
    descriptionEn: 'Occurs when analysis RMSE explodes or numerical divergence (NaN/Infinity) happens. It is a genuine dynamical instability rather than a software bug, caused by covariance collapse, severe sampling errors, or linearization breakdown.',
    formula: '【主な発生理由の例】\n・非線形性の強さに対する線形近似誤差の累積（EKFなど）\n・ヤコビアン計算の誤差蓄積による共分散行列の非正定値化（EKFなど）\n・アンサンブルの過信（スプレッドの過小評価）による観測データの無視（POEnKFなど）\n・高次元空間でのサンプリング不足（「次元の呪い」）による重みの崩壊（PFなど）',
    formulaEn: '[Primary Causes]\n• Accumulation of linearization errors in strongly nonlinear dynamics (EKF)\n• Loss of positive-definiteness in covariance matrices (EKF)\n• Ensemble overconfidence / spread shrinkage ignoring new observations (POEnKF)\n• Curse of dimensionality causing sample weight collapse (PF)',
    guideline: '【主な回避策・対策】\n・インフレーション（共分散膨張）の追加・調整（POEnKF/EnSRF/LETKF）\n・局所化（Localization）の適用（疑似相関の排除）\n・プロセスノイズ（Q）や背景誤差分散の調整・増加\n・粒子数の増加またはリサンプリングの適正化（PF）',
    guidelineEn: '[Prevention & Remedies]\n• Apply or increase covariance inflation (POEnKF, EnSRF, LETKF)\n• Apply spatial localization to cut spurious long-range correlations\n• Increase process noise Q or background error variance\n• Increase particle count or tune SIR resampling threshold (PF)'
  },
  N: {
    title: 'N (変数個数 / 格子点数)',
    titleEn: 'N (Grid Points / Variables)',
    description: 'Lorenz \'96モデルにおける状態変数の総数（格子点数）です。各格子点は大気などの一層における物理量を表しており、円環状（周期境界条件）に接続されています。',
    descriptionEn: 'Total number of coupled state variables (grid points) along the periodic circle in the Lorenz \'96 atmospheric toy model.',
    formula: 'x_i (i = 1, 2, ..., N)',
    formulaEn: 'x_i (i = 1, 2, ..., N)',
    guideline: '標準値は 40。値を大きくするとシミュレーションの次元数が上がり、特に粒子フィルタ（PF）などで同化難易度が急激に上昇します（次元の呪い）。',
    guidelineEn: 'Standard benchmark value is 40. Increasing N exponentially escalates state space volume and the curse of dimensionality.'
  },
  F: {
    title: 'F (強制項)',
    titleEn: 'F (External Forcing)',
    description: 'システムに外部から加わるエネルギー入力を表す強制パラメータです。この値の大きさによって、システムの力学的な挙動が大きく変化します。',
    descriptionEn: 'External constant forcing parameter driving the energy input into the Lorenz \'96 atmospheric system.',
    formula: 'dx_i/dt = (x_{i+1} - x_{i-2})x_{i-1} - x_i + F',
    formulaEn: 'dx_i/dt = (x_{i+1} - x_{i-2})x_{i-1} - x_i + F',
    guideline: '標準値は 8.0。F=8.0 のときは非線形性が強くカオス的な挙動を示し、データ同化のベンチマークとして広く使われます。F=4.0 などの小さい値では周期解や減衰解に落ち着くため、同化は容易になります。',
    guidelineEn: 'Standard value is 8.0 (strong chaotic behavior). Lower values like F=4.0 produce periodic or decaying waves where assimilation is straightforward.'
  },
  obsErrorVar: {
    title: 'σ² (観測誤差分散)',
    titleEn: 'σ² (Observation Error Variance)',
    description: '実際の観測データに含まれるノイズ（測定誤差）の大きさを表す分散パラメータです。この値が大きいほど、観測データの信頼性が低くなります。',
    descriptionEn: 'Variance of the Gaussian instrument noise added to true states when generating synthetic observations.',
    formula: 'R = σ² I\n(R: 観測誤差共分散行列, I: 単位行列)',
    formulaEn: 'R = σ² I\n(R: Observation error covariance matrix, I: Identity matrix)',
    guideline: '標準値は 1.0。観測誤差分散を小さくすると、同化時に観測値がより強く重視され、解析値は観測値に近づきます。ただし、小さすぎると極端な修正による不安定化を招くことがあります。',
    guidelineEn: 'Standard value is 1.0. Smaller σ² increases weighting on observations; larger σ² places greater faith in model background.'
  },
  obsInterval: {
    title: 'Δt_obs (観測間隔)',
    titleEn: 'Δt_obs (Observation Interval)',
    description: '観測データが何タイムステップごとに得られるかという時間的頻度です。観測間隔が大きくなる（間引かれる）ほど、次の観測までの予測期間が長くなり、非線形な誤差成長によって同化が困難になります。',
    descriptionEn: 'Frequency (in simulation steps) at which observation updates are performed.',
    formula: 't_obs = k × Δt_obs × dt',
    formulaEn: 't_obs = k × Δt_obs × dt',
    guideline: '標準値は 1（毎ステップ観測）。カオス的挙動（F=8.0）下では、観測間隔が大きすぎると（例: 4〜8以上）予測誤差が飽和し、どの同化手法でも追従できなくなる「フィルター発散」を引き起こします。',
    guidelineEn: 'Standard is 1 (every step). Larger intervals (e.g. >= 4) allow chaotic nonlinear error growth to saturate between observations.'
  },
  numSteps: {
    title: 'Simulation Steps (シミュレーションステップ数)',
    titleEn: 'Simulation Steps',
    description: 'データ同化シミュレーションを実行する全体のタイムステップ数です。長期間実行することで、初期状態の過渡応答が消えた後の統計的に安定した同化性能（RMSE等）を評価できます。',
    descriptionEn: 'Total number of integration steps to run the simulation.',
    formula: 'Total Time = Steps × dt',
    formulaEn: 'Total Time = Steps × dt',
    guideline: '標準値は 500。ステップ数を増やすと全体の同化傾向を詳細に確認できますが、Webブラウザの計算負荷が増え、シミュレーション完了までの待ち時間が長くなります。',
    guidelineEn: 'Standard value is 500 steps. Higher steps provide smoother asymptotic time series.'
  },
  dt: {
    title: 'dt (積分タイムステップ)',
    titleEn: 'dt (Integration Time Step)',
    description: 'Lorenz \'96モデルをルンゲ・クッタ法等で数値積分する際の時間刻み幅です。状態変化の速さと数値計算の安定性・解像度を決定します。',
    descriptionEn: 'Runge-Kutta numerical integration step size for the Lorenz \'96 equations.',
    formula: 't_{k+1} = t_k + dt',
    formulaEn: 't_{k+1} = t_k + dt',
    guideline: '標準値は 0.05（気象で約6時間相当）。値を小さくする（例: 0.01）と数値解の精度や安定性は向上しますが、一定ステップ数内の物理的な時間変化が小さくなります。大きくしすぎると数値計算が破綻（発散）します。',
    guidelineEn: 'Standard is 0.05 (~6 hours in atmospheric time). Values > 0.1 risk RK4 numerical instability.'
  },
  sparseInterval: {
    title: 'Sparse Interval (疎密観測間隔)',
    titleEn: 'Sparse Interval',
    description: '一部のプリセットや実験設定等で参照される、観測を行う格子点の間隔（スキップ幅）です。',
    descriptionEn: 'Spatial spacing parameter used in certain sparse observation experiments.',
    formula: 'N/A',
    formulaEn: 'N/A',
    guideline: '通常は4。特定の実験プリセットでの空間解像度設計基準値として扱われます。',
    guidelineEn: 'Default is 4.'
  },
  sparseRegionStart: {
    title: 'Sparse Region Start (観測領域開始)',
    titleEn: 'Sparse Region Start',
    description: '「疎密観測」モードにおいて、観測を行う領域の開始位置（格子点番号）を指定します。',
    descriptionEn: 'Start index (1-based grid point) for contiguous observation coverage in sparse mode.',
    formula: 'Start Grid Point',
    formulaEn: 'Start Grid Point',
    guideline: 'デフォルト値は 1。',
    guidelineEn: 'Default is 1.'
  },
  sparseRegionEnd: {
    title: 'Sparse Region End (観測領域終了)',
    titleEn: 'Sparse Region End',
    description: '「疎密観測」モードにおいて、観測を行う領域の終了位置（格子点番号）を指定します。',
    descriptionEn: 'End index (1-based grid point) for contiguous observation coverage in sparse mode.',
    formula: 'End Grid Point',
    formulaEn: 'End Grid Point',
    guideline: 'デフォルト値は 20。',
    guidelineEn: 'Default is 20.'
  },
  thinNumObs: {
    title: 'Thin Num Obs (間引き観測数)',
    titleEn: 'Thin Num Obs',
    description: '「間引き観測」モードにおいて、全格子点の中から空間的に等間隔になるように選択して配置する観測点の総数です。',
    descriptionEn: 'Number of observed grid points uniformly sampled across the full grid.',
    formula: 'Observation interval ≈ N / thinNumObs',
    formulaEn: 'Observation interval ≈ N / thinNumObs',
    guideline: 'デフォルト値は 20。',
    guidelineEn: 'Default is 20.'
  }
};

export function getLocalizedTooltip(paramId, lang = 'ja') {
  const item = TOOLTIP_DATA[paramId];
  if (!item) return null;
  if (lang === 'en') {
    return {
      title: item.titleEn || item.title,
      description: item.descriptionEn || item.description,
      formula: item.formulaEn || item.formula,
      guideline: item.guidelineEn || item.guideline,
    };
  }
  return item;
}
