import { useState } from 'react';
import './ObsTabs.css';

export default function ObsTabs({ modes, activeMode, onChangeMode, description, advancedOptions }) {
  const [showGrid, setShowGrid] = useState(true);
  const N = advancedOptions?.N ?? 40;

  // Calculate which indices are observed
  const observedIndices = new Set();
  if (activeMode === 'full') {
    for (let i = 0; i < N; i++) {
      observedIndices.add(i);
    }
  } else if (activeMode === 'sparse') {
    const start = Math.min(advancedOptions?.sparseRegionStart ?? 0, advancedOptions?.sparseRegionEnd ?? 19);
    const end = Math.max(advancedOptions?.sparseRegionStart ?? 0, advancedOptions?.sparseRegionEnd ?? 19);
    for (let i = start; i <= end; i++) {
      observedIndices.add(i % N);
    }
  } else if (activeMode === 'thinned') {
    const numObs = Math.min(N, Math.max(1, advancedOptions?.thinNumObs ?? 20));
    for (let k = 0; k < numObs; k++) {
      const idx = Math.round(k * N / numObs) % N;
      observedIndices.add(idx);
    }
  }

  const gridPoints = Array.from({ length: N }, (_, i) => ({
    index: i,
    isObserved: observedIndices.has(i),
  }));

  return (
    <div className="obs-tabs-container" id="obs-tabs">
      <div className="obs-tabs-main-row">
        <div className="obs-tabs-left">
          <div className="obs-tabs-row">
            {modes.map(mode => (
              <button
                key={mode.id}
                className={`obs-tab ${activeMode === mode.id ? 'obs-tab--active' : ''}`}
                onClick={() => onChangeMode(mode.id)}
                id={`tab-${mode.id}`}
              >
                {mode.label}
              </button>
            ))}
          </div>
          {description && (
            <div className="obs-tabs-desc">{description}</div>
          )}
        </div>

        <div className="obs-tabs-right">
          <span className="obs-count-badge">
            観測点: <strong>{observedIndices.size}</strong> / {N} 格子点
          </span>
          <button
            className="obs-grid-toggle-btn"
            onClick={() => setShowGrid(prev => !prev)}
            title={showGrid ? "1Dマップを隠す" : "1Dマップを表示"}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
              {showGrid ? 'expand_less' : 'map'}
            </span>
            <span>{showGrid ? '非表示' : '1Dマップ'}</span>
          </button>
        </div>
      </div>

      {showGrid && (
        <div className="obs-grid-strip">
          <div className="obs-grid-points custom-scroll">
            {gridPoints.map(pt => (
              <div key={pt.index} className="obs-grid-point-col">
                <span
                  className={`obs-grid-point-dot ${pt.isObserved ? 'obs-grid-point-dot--observed' : 'obs-grid-point-dot--unobserved'}`}
                  title={pt.isObserved ? `格子点 ${pt.index + 1}: 観測点` : `格子点 ${pt.index + 1}: 未観測点`}
                />
                <span className="obs-grid-point-label typo-data">{pt.index + 1}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
