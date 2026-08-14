import './ObsTabs.css';

export default function ObsTabs({ modes, activeMode, onChangeMode, description, advancedOptions }) {
  const N = advancedOptions?.N ?? 40;

  // Calculate which indices are observed
  const observedIndices = new Set();
  if (activeMode === 'full') {
    for (let i = 0; i < N; i++) {
      observedIndices.add(i);
    }
  } else if (activeMode === 'sparse') {
    const start = Math.min(advancedOptions?.sparseRegionStart ?? 0, advancedOptions?.sparseRegionEnd ?? 39);
    const end = Math.max(advancedOptions?.sparseRegionStart ?? 0, advancedOptions?.sparseRegionEnd ?? 39);
    const step = Math.max(1, advancedOptions?.sparseInterval ?? 4);
    for (let i = start; i <= end; i += step) {
      observedIndices.add(i % N);
    }
  } else if (activeMode === 'thinned') {
    // Spatial observation is full (all points are observed, but temporally thinned)
    for (let i = 0; i < N; i++) {
      observedIndices.add(i);
    }
  }

  const gridPoints = Array.from({ length: N }, (_, i) => ({
    index: i,
    isObserved: observedIndices.has(i),
  }));

  return (
    <div className="obs-tabs-container" id="obs-tabs">
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

      {/* 1D Grid Map */}
      <div className="obs-grid-map">
        <div className="obs-grid-map-header">
          <span className="typo-label-caps obs-grid-map-title">観測格子点アレイ (1Dマップ)</span>
          <div className="obs-grid-map-legend">
            <span className="legend-item">
              <span className="legend-dot legend-dot--observed" />
              観測点
            </span>
            <span className="legend-item">
              <span className="legend-dot legend-dot--unobserved" />
              未観測点
            </span>
          </div>
        </div>
        <div className="obs-grid-points custom-scroll">
          {gridPoints.map(pt => (
            <div key={pt.index} className="obs-grid-point-col">
              <span
                className={`obs-grid-point-dot ${pt.isObserved ? 'obs-grid-point-dot--observed' : 'obs-grid-point-dot--unobserved'}`}
                title={pt.isObserved ? `格子点 ${pt.index}: 観測点` : `格子点 ${pt.index}: 未観測点`}
              />
              <span className="obs-grid-point-label typo-data">{pt.index}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
