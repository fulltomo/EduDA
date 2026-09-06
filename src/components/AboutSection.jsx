import { useLanguage } from '../context/LanguageContext';
import './AboutSection.css';

// 本文は public/llms.txt および index.html の <noscript> と同一内容。
// クローラがレンダリング後の DOM でも読めるよう、ここで実 DOM に出す。
const CONTENT = {
  ja: {
    summary: 'EduDA について',
    heading: 'EduDA - データ同化学習・シミュレーションプラットフォーム',
    intro:
      'EduDA（エデュ・ディーエー）は、カオス力学系モデル（Lorenz \'96）を用いて、データ同化アルゴリズム（EKF, POEnKF, EnSRF, LETKF, 3DVar, 4DVar, 粒子フィルタ）の理論と挙動をブラウザ上で視覚的に比較・学習できるオープンソースの教育用Webプラットフォームです。インストール不要で、すべての計算はブラウザ内の Web Worker で実行されます。',
    eqHeading: '支配方程式: Lorenz \'96 カオスモデル',
    eqNote:
      '時間積分は4次ルンゲ＝クッタ法 (RK4)、dt = 0.05（大気時間で約6時間に相当）。格子点数 N = 40、外力項 F = 8.0、周期境界条件。',
    algoHeading: '対応するデータ同化アルゴリズム (7手法)',
    algos: [
      ['EKF (拡張カルマンフィルタ)', '接線線形モデルとプロセスノイズ Q による線形化カルマンフィルタ。40×40 の共分散行列を明示的に保持・更新する。'],
      ['POEnKF (観測摂動型アンサンブルカルマンフィルタ)', '観測に摂動を加えた確率的モンテカルロ同化。'],
      ['EnSRF (アンサンブル平方根フィルタ)', '決定論的な観測更新により、観測ノイズのサンプリング誤差を排除する。'],
      ['LETKF (局所アンサンブル変換カルマンフィルタ)', '格子点ごとの局所空間で低次元の変換行列を並列計算する、現代の現業気象予報における標準手法。'],
      ['3DVar (3次元変分法)', 'Gaspari-Cohn 相関関数に基づく静的な背景誤差共分散行列 (B) による変分同化。'],
      ['4DVar (4次元変分法)', '同化ウィンドウ内の時系列観測を、随伴モデル (Adjoint) の勾配を用いて同時に最適化する。'],
      ['PF (粒子フィルタ / SIR)', '有効粒子数に基づく再サンプリングを備えた、非ガウス分布に対応するフィルタ。'],
    ],
    labHeading: '事前設計プリセット実験ラボ (4種)',
    labs: [
      ['実験1: インフレーションの効果', '限られたアンサンブルサイズの下でのスプレッド過小評価とフィルタ発散を抑制する。'],
      ['実験2: 局所化 (Localization) の効果', '少アンサンブル時に生じる遠距離の疑似相関を切り落とす。'],
      ['実験3: 固定共分散 (3DVar) vs 流れ依存共分散 (LETKF)', '疎な観測下で、未観測領域へ誤差共分散がどう伝播するかを比較する。'],
      ['実験4: 高次元空間での粒子フィルタの限界', '次元の呪いと重みの崩壊 (weight collapse) を体験する。'],
    ],
    featHeading: '主な機能',
    feats: [
      '7手法を同一の真値・観測条件下でリアルタイム並列シミュレーション・比較',
      '4つの観測シナリオ: 全観測 / 疎密観測 / 間引き観測 / カスタム観測',
      '3つの可視化モード: RMSE & Spread 時系列、1D 状態空間プロット、Hovmöller 誤差ヒートマップ',
      'Web Worker によるノンブロッキング並列計算',
      '全タイムステップの真値・観測値・解析値・RMSE を CSV エクスポート',
    ],
    repo: 'GitHub リポジトリ (MIT License)',
  },
  en: {
    summary: 'About EduDA',
    heading: 'EduDA - Educational Data Assimilation Platform',
    intro:
      'EduDA is an open-source interactive educational web platform designed to explore, visualize and compare data assimilation algorithms (EKF, POEnKF, EnSRF, LETKF, 3DVar, 4DVar, Particle Filter) on the chaotic Lorenz \'96 model. No installation is required; all computation runs in the browser inside a Web Worker.',
    eqHeading: 'Governing Equations: Lorenz \'96 Chaotic Model',
    eqNote:
      'Integrated with the 4th-order Runge-Kutta method (RK4), dt = 0.05 (roughly 6 atmospheric hours). N = 40 grid points, forcing F = 8.0, periodic boundary conditions.',
    algoHeading: 'Supported Data Assimilation Algorithms (7 methods)',
    algos: [
      ['EKF (Extended Kalman Filter)', 'Linearized tangent-linear covariance update with model process noise Q.'],
      ['POEnKF (Perturbed Observation EnKF)', 'Monte Carlo ensemble sampling with perturbed synthetic observations.'],
      ['EnSRF (Ensemble Square Root Filter)', 'Deterministic square root mean and perturbation update avoiding observation noise sampling error.'],
      ['LETKF (Local Ensemble Transform Kalman Filter)', 'Parallel local grid-space low-dimensional ensemble transforms.'],
      ['3DVar (3D Variational)', 'Static Gaspari-Cohn background error covariance matrix (B).'],
      ['4DVar (4D Variational)', 'Adjoint model gradient optimization over a time assimilation window.'],
      ['PF (Particle Filter / SIR)', 'Sequential Importance Resampling for non-Gaussian distributions.'],
    ],
    labHeading: 'Pre-Designed Educational Preset Labs (4 labs)',
    labs: [
      ['Lab 1: Effects of Inflation', 'Preventing ensemble shrinkage and filter divergence under limited ensemble size.'],
      ['Lab 2: Effects of Localization', 'Cutting spurious distant correlations under small ensemble sizes.'],
      ['Lab 3: Static (3DVar) vs Flow-Dependent (LETKF) Covariance', 'Error propagation into unobserved domains under sparse observation.'],
      ['Lab 4: High-Dimensional Particle Filtering Limits', 'Experiencing weight collapse and the curse of dimensionality.'],
    ],
    featHeading: 'Key Features',
    feats: [
      'Real-time parallel simulation of 7 methods under identical truth and observation conditions',
      'Four observation scenarios: full, sparse, thinned and custom',
      'Three visualization modes: RMSE & Spread time series, 1D state profile, Hovmöller error heatmap',
      'Non-blocking background computation powered by Web Workers',
      'CSV export of truth, observations, analyses and RMSE for every time step',
    ],
    repo: 'GitHub repository (MIT License)',
  },
};

const EQUATION = "dx_j / dt = (x_{j+1} - x_{j-2}) x_{j-1} - x_j + F   (j = 1, ..., 40)";

export default function AboutSection() {
  const { lang } = useLanguage();
  const c = CONTENT[lang] || CONTENT.ja;

  return (
    <footer className="app-about">
      <details className="about-details">
        <summary className="about-summary">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }} aria-hidden="true">info</span>
          {c.summary}
        </summary>

        <div className="about-body custom-scroll">
          <h2>{c.heading}</h2>
          <p>{c.intro}</p>

          <h3>{c.eqHeading}</h3>
          <p className="about-equation typo-data">{EQUATION}</p>
          <p>{c.eqNote}</p>

          <h3>{c.algoHeading}</h3>
          <ul>
            {c.algos.map(([name, desc]) => (
              <li key={name}><strong>{name}</strong>: {desc}</li>
            ))}
          </ul>

          <h3>{c.labHeading}</h3>
          <ol>
            {c.labs.map(([name, desc]) => (
              <li key={name}><strong>{name}</strong> - {desc}</li>
            ))}
          </ol>

          <h3>{c.featHeading}</h3>
          <ul>
            {c.feats.map((f) => <li key={f}>{f}</li>)}
          </ul>

          <p>
            <a href="https://github.com/fulltomo/EduDA" target="_blank" rel="noopener noreferrer">
              {c.repo}
            </a>
          </p>
        </div>
      </details>
    </footer>
  );
}
