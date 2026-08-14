import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import './ObsTabs.css';

export default function ObsTabs({
  modes,
  activeMode,
  onChangeMode,
  description,
  advancedOptions,
  customObsIndices = [],
  onToggleCustomObsIndex,
  onSelectAllCustomObs,
  onClearAllCustomObs,
  onRandomCustomObs,
}) {
  const { t } = useLanguage();
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
  } else if (activeMode === 'custom') {
    customObsIndices.forEach(idx => {
      if (idx >= 0 && idx < N) {
        observedIndices.add(idx);
      }
    });
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
            {modes.map(mode => {
              const locLabel = t(`obsModes.${mode.id}.label`, mode.label);
              return (
                <button
                  key={mode.id}
                  className={`obs-tab ${activeMode === mode.id ? 'obs-tab--active' : ''}`}
                  onClick={() => onChangeMode(mode.id)}
                  id={`tab-${mode.id}`}
                >
                  {locLabel}
                </button>
              );
            })}
          </div>
          {activeMode === 'custom' && (
            <div className="obs-custom-actions">
              <button className="obs-custom-btn" onClick={onSelectAllCustomObs}>
                {t('obsActions.selectAll')}
              </button>
              <button className="obs-custom-btn" onClick={onClearAllCustomObs}>
                {t('obsActions.clearAll')}
              </button>
              <button className="obs-custom-btn" onClick={() => onRandomCustomObs(10)}>
                {t('obsActions.random10')}
              </button>
            </div>
          )}
          {description && (
            <div className="obs-tabs-desc">{description}</div>
          )}
        </div>

        <div className="obs-tabs-right">
          <span className="obs-count-badge">
            {t('obsActions.pointsCount')}: <strong>{observedIndices.size}</strong> / {N} {t('obsActions.gridUnits')}
          </span>
          <button
            className="obs-grid-toggle-btn"
            onClick={() => setShowGrid(prev => !prev)}
            title={showGrid ? t('obsActions.toggleMapHide') : t('obsActions.toggleMapShow')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
              {showGrid ? 'expand_less' : 'map'}
            </span>
            <span>{showGrid ? t('obsActions.toggleMapHide') : t('obsActions.toggleMapShow')}</span>
          </button>
        </div>
      </div>

      {showGrid && (
        <div className="obs-grid-strip">
          <div className="obs-grid-points custom-scroll">
            {gridPoints.map(pt => {
              const isCustom = activeMode === 'custom';
              const displayIndex = pt.index + 1;
              const gridLabel = t('obsActions.gridPoint');
              const statusText = isCustom
                ? (pt.isObserved ? t('obsActions.obsOn') : t('obsActions.obsOff'))
                : (pt.isObserved ? t('obsActions.observed') : t('obsActions.unobserved'));
              return (
                <button
                  type="button"
                  key={pt.index}
                  className={`obs-grid-point-col ${isCustom ? 'obs-grid-point-col--clickable' : ''}`}
                  onClick={isCustom ? () => onToggleCustomObsIndex(pt.index) : undefined}
                  disabled={!isCustom}
                  aria-pressed={isCustom ? pt.isObserved : undefined}
                  title={`${gridLabel} ${displayIndex}: ${statusText}`}
                >
                  <span
                    className={`obs-grid-point-dot ${pt.isObserved ? 'obs-grid-point-dot--observed' : 'obs-grid-point-dot--unobserved'}`}
                  />
                  <span className="obs-grid-point-label typo-data">{displayIndex}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
