import { useState, useEffect, useRef } from 'react';
import './EduTooltip.css';

const TOOLTIP_DATA = {
  inflation: {
    title: 'Inflation (アンサンブルインフレーション)',
    description: 'アンサンブル予測では、メンバー数が有限であることやモデルの不完全性により、アンサンブルの分散（Spread）が過小評価され、予測を過信して観測データを無視する「フィルタ発散」が発生しやすくなります。インフレーションは、各ステップでアンサンブル偏差を一定倍（λ > 1）に拡大し、分散の過小評価（共分散縮退）を防ぎます。',
    formula: 'xᵢ ← x̄ + λ(xᵢ - x̄)\n(x̄: アンサンブル平均, xᵢ: 各メンバー, λ: インフレーション係数)',
    guideline: '通常 1.01 〜 1.15。モデル不確実性が高い場合やメンバー数が少ない場合は大きめに設定します。大きすぎると観測ノイズを過剰同化し、解析値が不安定になります。'
  },
  localization: {
    title: 'Localization Radius (局所化半径)',
    description: '有限のアンサンブル予測において、空間的に遠く離れた物理的に無関係な地点間で生じる「疑似相関」を排除するためのパラメータです。格子点間の距離に応じて誤差共分散（またはカルマンゲイン）を減衰させ、観測の影響範囲を近傍のみに限定します。',
    formula: 'B_localized = ρ ∘ B  または  K_localized = ρ ∘ K\n(ρ: 距離減衰関数 (Gaspari-Cohn等), ∘: アダマール積, B: 共分散, K: ゲイン)',
    guideline: '通常 3 〜 10 格子点。メンバー数 M が小さいほど疑似相関が発生しやすいため、半径をより小さく制限して過同化を防ぎます。'
  },
  processNoise: {
    title: 'Process Noise Q (プロセスノイズ)',
    description: '拡張カルマンフィルタ（EKF）において、予測モデルの不完全性（数値誤差や未表現の物理過程）による予測不確実性の増大を表す分散パラメータです。この値を大きくすると、予測の信頼度が下がり、相対的に観測データを重視した修正を行うようになります。',
    formula: 'Pᶠ_k = M_k Pᵃ_{k-1} M_kᵀ + Q\n(Pᶠ: 予測誤差共分散, Pᵃ: 解析誤差共分散, M: 接線線形モデル, Q: プロセスノイズ)',
    guideline: '通常 0.001 〜 0.05。モデルに未表現の物理や外乱が多い場合は大きめに、逆に予測が正確な場合は小さめに設定します。'
  },
  bgErrorVar: {
    title: 'Background Error Var σb² (背景誤差分散)',
    description: '3DVarや4DVarなどの変分法において、予測状態（第一推定値・背景状態）の不確実性を表す分散パラメータです。大きく設定するほど予測モデルを信頼せず、観測データに近い解析値へと修正されます。',
    formula: 'B = σb² ∘ C\n(B: 背景誤差共分散行列, C: 空間相関行列, σb²: 背景誤差分散)',
    guideline: '通常 0.5 〜 2.0。観測誤差分散（デフォルト 1.0）との相対比率によって、予測（背景）と観測のどちらをどれだけ信じるかのバランスが決まります。'
  },
  resampleThreshold: {
    title: 'Resample Threshold (リサンプリング閾値)',
    description: '粒子フィルタ（PF）において、少数の粒子のみに重みが集中する「重みの縮退」を防ぐ基準値です。有効粒子数の割合がこの閾値を下回った際に、重みの大きい粒子を複製し、小さい粒子を消滅させる「再サンプリング」を実行します。',
    formula: 'N_eff = 1 / Σ(w_i²)\n(N_eff < Threshold × M のとき実行 / w_i: 正規化重み, M: 粒子数)',
    guideline: '通常 0.5 〜 0.8。高すぎるとサンプリングが頻繁に走り粒子の多様性が低下（枯渇）します。低すぎると一部の粒子のみに依存して近似が崩壊します。'
  },
  spread: {
    title: 'Spread (アンサンブル分散・スプレッド)',
    description: '複数の予測（メンバーや粒子）が互いにどれだけばらついているかを表す統計量です。予測の「不確実性（確信度）」を示しており、理想的な同化状態では、スプレッドの大きさが実際の解析誤差（RMSE）と同程度になる「Error-Spread関係」が成り立ちます。',
    formula: 'Spread = √[ 1 / (N(M-1)) × Σ_j Σ_i (x_{i,j} - x̄_j)² ]\n(N: 格子点数, M: メンバー数, x_{i,j}: メンバーiの格子点jの値, x̄_j: 平均値)',
    guideline: '解析のRMSEと同程度の値が最適です。スプレッドがRMSEより大幅に小さい場合はアンサンブルの「過信（収縮）」、大きい場合は「過小評価」を表します。'
  },
  ensembleSize: {
    title: 'Ensemble Size M (アンサンブル/粒子サイズ)',
    description: '状態の確率分布や予測不確実性の時間発展を表現するために、並列にシミュレーションするメンバー（または粒子）の総数です。数が多いほど高次元の分布を正確に表現できますが、計算負荷が高くなります。',
    formula: 'M (シミュレーションするパラレル数)',
    guideline: '通常 20 〜 100（粒子フィルタでは 100 〜 500 以上を推奨）。ブラウザの計算負荷とRMSEの改善度のトレードオフで決定します。'
  },
  corrLength: {
    title: 'Correlation Length L (相関距離)',
    description: '3DVarにおいて、第一推定値（背景状態）の誤差が空間的にどの程度の距離まで相関しているかを定義します。値が大きいほど、1つの観測データからの修正情報が周囲の格子点に滑らかに広く伝播します。',
    formula: 'C_ij = ρ(d_ij / L)\n(C_ij: 格子点i-j間の相関, d_ij: 距離, L: 相関距離, ρ: 相関関数)',
    guideline: '通常 3 〜 10。現象の空間スケールや観測点の間隔に合わせて調整します。大きすぎると不要な遠方まで修正が及び、不自然な平滑化が起きます。'
  },
  windowSize: {
    title: 'Assimilation Window (同化ウィンドウ)',
    description: '4DVarにおいて、一定期間（タイムスライス）の複数観測データを一度にまとめて処理する時間幅（ステップ数）です。ウィンドウ内のモデル状態推移が、すべての観測値およびモデル物理と最も調和するように初期状態を最適化します。',
    formula: 'J(x₀) = 第一推定値の不確実性 + 期間内の観測残差和\n(W: 同化ウィンドウサイズ, x₀: 制御変数となる初期値)',
    guideline: '通常 3 〜 10。長すぎるとモデルの非線形性により最適化の収束（勾配降下）が極めて難しくなり、短すぎると時間発展の拘束力が弱まります。'
  },
  filterDivergence: {
    title: '⚠️ フィルター発散 (Filter Divergence)',
    description: 'データ同化の計算過程において、推定値の誤差（RMSE）が異常に大きくなったり、数値が非数（NaN）や無限大（Infinity）に陥ってシミュレーションが破綻する現象です。「システムのバグ」ではなく、モデルの非線形性や誤差共分散の過小評価などにより、実際の現象とシミュレーションの整合性が取れなくなることで発生します。',
    formula: '【主な発生理由の例】\n・非線形性の強さに対する線形近似誤差の累積（EKFなど）\n・ヤコビアン計算の誤差蓄積による共分散行列の非正定値化（EKFなど）\n・アンサンブルの過信（スプレッドの過小評価）による観測データの無視（EnKFなど）\n・高次元空間でのサンプリング不足（「次元の呪い」）による重みの崩壊（PFなど）',
    guideline: '【主な回避策・対策】\n・インフレーション（共分散膨張）の追加・調整（EnKF/EnSRF/LETKF）\n・局所化（Localization）の適用（疑似相関の排除）\n・プロセスノイズ（Q）や背景誤差分散の調整・増加\n・粒子数の増加またはリサンプリングの適正化（PF）'
  }
};

// Default Floating Tooltip Component
export default function EduTooltip({ paramId, align = 'center', position = 'bottom' }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const data = TOOLTIP_DATA[paramId];

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  const toggleTooltip = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  if (!data) return null;

  return (
    <div className="edu-tooltip-container mode-floating" ref={containerRef}>
      <button
        type="button"
        className={`edu-tooltip-trigger ${isOpen ? 'active' : ''}`}
        onClick={toggleTooltip}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        aria-label={`${data.title} の説明を表示`}
        title="解説を表示"
      >
        <span className="material-symbols-outlined">info</span>
      </button>

      {isOpen && (
        <div className={`edu-tooltip-box edu-tooltip-align-${align} edu-tooltip-pos-${position} custom-scroll`} onClick={(e) => e.stopPropagation()}>
          <div className="edu-tooltip-header">
            <span className="edu-tooltip-title">{data.title}</span>
            <button
              type="button"
              className="edu-tooltip-close"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsOpen(false);
              }}
              aria-label="閉じる"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <div className="edu-tooltip-body">
            <div className="edu-tooltip-section">
              <h4 className="edu-tooltip-sec-title">📖 直感的な解説</h4>
              <p className="edu-tooltip-sec-text">{data.description}</p>
            </div>
            <div className="edu-tooltip-section">
              <h4 className="edu-tooltip-sec-title">🧮 関連する数式表現</h4>
              <pre className="edu-tooltip-sec-formula">{data.formula}</pre>
            </div>
            <div className="edu-tooltip-section">
              <h4 className="edu-tooltip-sec-title">💡 設定の目安・推奨値</h4>
              <p className="edu-tooltip-sec-text">{data.guideline}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Divergence Badge with Hover and Click Tooltip Support
export function DivergenceBadge({ align = 'center', position = 'bottom' }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const data = TOOLTIP_DATA['filterDivergence'];

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  const toggleTooltip = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleMouseEnter = () => {
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    setIsOpen(false);
  };

  if (!data) return null;

  return (
    <div
      className="edu-tooltip-container mode-floating divergence-badge-container"
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ display: 'inline-block', position: 'relative', marginLeft: '4px', verticalAlign: 'middle' }}
    >
      <button
        type="button"
        className={`divergence-badge ${isOpen ? 'active' : ''}`}
        onClick={toggleTooltip}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        aria-label={`${data.title} の説明を表示`}
        title="解説を表示"
        style={{
          backgroundColor: 'rgba(255, 180, 171, 0.15)',
          color: '#ffb4ab',
          border: '1px solid #ffb4ab',
          borderRadius: '4px',
          padding: '2px 8px',
          fontSize: '11px',
          fontWeight: 'bold',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          whiteSpace: 'nowrap',
          lineHeight: '1.2',
        }}
      >
        <span>⚠️ 発散 (Diverged)</span>
      </button>

      {isOpen && (
        <div
          className={`edu-tooltip-box edu-tooltip-align-${align} edu-tooltip-pos-${position} custom-scroll`}
          onClick={(e) => e.stopPropagation()}
          style={{ width: '320px', pointerEvents: 'auto', display: 'flex', flexDirection: 'column' }}
        >
          <div className="edu-tooltip-header">
            <span className="edu-tooltip-title">{data.title}</span>
            <button
              type="button"
              className="edu-tooltip-close"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsOpen(false);
              }}
              aria-label="閉じる"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <div className="edu-tooltip-body">
            <div className="edu-tooltip-section">
              <h4 className="edu-tooltip-sec-title">📖 フィルター発散とは</h4>
              <p className="edu-tooltip-sec-text">{data.description}</p>
            </div>
            <div className="edu-tooltip-section">
              <h4 className="edu-tooltip-sec-title">🚨 主な発生理由</h4>
              <pre className="edu-tooltip-sec-formula">{data.formula}</pre>
            </div>
            <div className="edu-tooltip-section">
              <h4 className="edu-tooltip-sec-title">💡 回避策・対策</h4>
              <p className="edu-tooltip-sec-text" style={{ fontSize: '11.5px', whiteSpace: 'pre-line' }}>{data.guideline}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Inline Accordion Help Drawer Component
export function EduTooltipDrawer({ paramId, onClose }) {
  const data = TOOLTIP_DATA[paramId];
  if (!data) return null;

  return (
    <div className="edu-help-inline animate-expand" onClick={(e) => e.stopPropagation()}>
      <div className="edu-help-inline-header">
        <span className="edu-help-inline-title">{data.title}</span>
        <button
          type="button"
          className="edu-help-inline-close"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (onClose) onClose(e);
          }}
          aria-label="閉じる"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
      <div className="edu-help-inline-body">
        <div className="edu-help-inline-section">
          <span className="edu-help-inline-sec-title">📖 直感的な解説</span>
          <p className="edu-help-inline-text">{data.description}</p>
        </div>
        <div className="edu-help-inline-section">
          <span className="edu-help-inline-sec-title">🧮 関連する数式表現</span>
          <pre className="edu-help-inline-formula">{data.formula}</pre>
        </div>
        <div className="edu-help-inline-section">
          <span className="edu-help-inline-sec-title">💡 設定の目安・推奨値</span>
          <p className="edu-help-inline-text">{data.guideline}</p>
        </div>
      </div>
    </div>
  );
}
