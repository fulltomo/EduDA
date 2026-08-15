import EduTooltip from './EduTooltip';
import { DIVERGENCE_THRESHOLD } from '../constants';
import { useLanguage } from '../context/LanguageContext';
import './MethodCard.css';

export default function MethodCard({ method, color, onUpdate, onRemove }) {
  const { lang, t } = useLanguage();

  const glowColor = color + '99'; // ~60% opacity

  const handleParamChange = (key, val) => {
    const newParams = { ...method.params, [key]: val };
    onUpdate({ params: newParams });
  };

  return (
    <div className={`method-card card ${method.visible === false ? 'is-hidden' : ''}`} id={`card-${method.instanceId}`}>
      {/* Card Header */}
      <div className="card-header method-card-header">
        <div className="method-card-title">
          <div
            className="color-dot"
            style={{ backgroundColor: color, boxShadow: `0 0 8px ${glowColor}` }}
          />
          <span className="method-card-name typo-body-md" style={{ fontWeight: 600 }}>
            {method.label}
          </span>
        </div>
        <div className="method-card-actions" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            className="method-card-visibility-btn"
            onClick={() => onUpdate({ visible: method.visible !== false ? false : true })}
            title={method.visible !== false ? t('methodCard.visibilityHide') : t('methodCard.visibilityShow')}
            aria-label={method.visible !== false ? t('methodCard.visibilityHide') : t('methodCard.visibilityShow')}
            style={{
              background: 'none',
              border: 'none',
              color: method.visible !== false ? 'var(--on-surface-variant)' : 'var(--outline)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: 'var(--rounded)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
              {method.visible !== false ? 'visibility' : 'visibility_off'}
            </span>
          </button>
          <button
            className="method-card-delete-btn"
            onClick={onRemove}
            title={t('methodCard.delete')}
            aria-label={t('methodCard.delete')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>delete</span>
          </button>
        </div>
      </div>

      {/* Card Body: Sliders for method-specific parameters */}
      <div className="card-body method-card-body">
        {method.paramDefs && method.paramDefs.map((p) => {
          // If PF and filterType is SIR, hide localization radius slider
          if (p.key === 'localization' && method.type === 'PF' && method.params?.filterType === 'SIR') {
            return null;
          }

          const val = method.params?.[p.key] ?? p.default;
          const paramLabel = lang === 'en' ? (p.labelEn || p.label) : p.label;

          if (p.type === 'select') {
            return (
              <div className="slider-group" key={p.key}>
                <div className="slider-header">
                  <div className="slider-label-wrapper">
                    <span className="slider-label">{paramLabel}</span>
                    <EduTooltip paramId={p.key} align="left" position="bottom" />
                  </div>
                </div>

                <select
                  className="input-select method-param-select"
                  value={val}
                  onChange={(e) => handleParamChange(p.key, e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: 'var(--rounded)',
                    background: 'var(--surface-container-high)',
                    color: 'var(--on-surface)',
                    border: '1px solid var(--outline-variant)',
                    fontSize: '13px',
                    marginTop: '4px',
                  }}
                >
                  {p.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {lang === 'en' ? (opt.labelEn || opt.label) : opt.label}
                    </option>
                  ))}
                </select>
              </div>
            );
          }

          return (
            <div className="slider-group" key={p.key}>
              <div className="slider-header">
                <div className="slider-label-wrapper">
                  <span className="slider-label">{paramLabel}</span>
                  <EduTooltip paramId={p.key} align="left" position="bottom" />
                </div>
                <span className="slider-value typo-data" style={{ color }}>
                  {typeof val === 'number' && !Number.isInteger(val) ? val.toFixed(2) : val}
                </span>
              </div>

              <input
                type="range"
                min={p.min}
                max={p.max}
                step={p.step}
                value={val}
                onChange={(e) => handleParamChange(p.key, Number(e.target.value))}
                style={{ accentColor: color }}
              />
            </div>
          );
        })}

        {/* Inline Stats */}
        {method.avgRmse != null && (
          <div className="method-card-stats-wrapper">
            <div className="method-card-stats">
              <div className="stat-item">
                <span className="stat-label typo-label-caps">{t('methodCard.rmse')}:</span>
                {!Number.isFinite(method.avgRmse) || method.avgRmse > DIVERGENCE_THRESHOLD ? (
                  <span className="stat-value typo-data" style={{ color: 'var(--error)', fontWeight: 600 }}>
                    —
                  </span>
                ) : (
                  <span className="stat-value typo-data">{method.avgRmse.toFixed(3)}</span>
                )}
              </div>
              <div className="stat-item">
                <div className="stat-label-wrapper">
                  <span className="stat-label typo-label-caps">{t('methodCard.spread')}</span>
                  <EduTooltip paramId="spread" align="left" position="top" />
                  <span className="stat-label typo-label-caps">:</span>
                </div>
                <span className="stat-value typo-data">
                  {method.avgSpread != null ? method.avgSpread.toFixed(3) : '—'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
