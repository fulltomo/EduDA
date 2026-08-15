import { useLanguage } from '../context/LanguageContext';
import './ObsTabs.css';

export default function ObsTabs({
  modes,
  activeMode,
  onChangeMode,
  description,
  advancedOptions,
}) {
  const { t } = useLanguage();
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
      <div className="obs-tabs-inner">
        {/* Left: Mode Buttons */}
        <div className="obs-tabs-left">
          <span className="obs-section-title">{t('obsSectionTitle')}</span>
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
          {description && (
            <span className="obs-tabs-desc">{description}</span>
          )}
        </div>

        {/* Right: Inline Dot Strip Indicator */}
        <div className="obs-tabs-right">
          <div className="obs-mini-strip-wrapper" title={`${t('obsActions.pointsCount')}: ${observedIndices.size} / ${N} ${t('obsActions.gridUnits')}`}>
            <span className="obs-mini-strip-label">
              {t('obsActions.pointsCount')} <strong>{observedIndices.size}</strong>/{N}:
            </span>
            <div className="obs-mini-dots-row">
              {gridPoints.map(pt => (
                <span
                  key={pt.index}
                  className={`obs-mini-dot ${pt.isObserved ? 'obs-mini-dot--on' : 'obs-mini-dot--off'}`}
                  title={`${t('obsActions.gridPoint')} ${pt.index + 1}: ${pt.isObserved ? t('obsActions.observed') : t('obsActions.unobserved')}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
