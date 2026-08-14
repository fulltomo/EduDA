import { DivergenceBadge } from '../EduTooltip';
import { DIVERGENCE_THRESHOLD } from '../../constants';
import { useLanguage } from '../../context/LanguageContext';

export default function SummaryBar({ results, methods, colors, onUpdateMethod }) {
  const { t } = useLanguage();
  if (!results || results.length === 0) return null;

  return (
    <div className="viz-summary-bar custom-scroll">
      {results.map((r, idx) => {
        const color = colors[idx % colors.length];
        const method = methods.find(m => m.instanceId === r.methodId);
        const label = method?.label || r.methodId;
        const isVisible = method ? method.visible !== false : true;

        return (
          <div
            className={`viz-summary-card card ${!isVisible ? 'is-hidden' : ''}`}
            key={r.methodId}
            style={{
              opacity: isVisible ? 1 : 0.5,
              transition: 'opacity 0.2s ease',
            }}
          >
            <div className="viz-summary-left">
              <button
                className="viz-summary-visibility-btn"
                onClick={() => onUpdateMethod && onUpdateMethod(r.methodId, { visible: !isVisible })}
                aria-label={isVisible ? t('methodCard.visibilityHide') : t('methodCard.visibilityShow')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: isVisible ? 'var(--on-surface-variant)' : 'var(--outline)',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: 'var(--rounded)',
                  display: 'flex',
                  alignItems: 'center',
                  marginRight: '4px',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  {isVisible ? 'visibility' : 'visibility_off'}
                </span>
              </button>
              <div className="color-dot-sm" style={{ backgroundColor: color }} />
              <span className="viz-summary-name" title={label}>{label}</span>
            </div>
            <div className="viz-summary-metrics">
              <div className="viz-summary-metric">
                <span className="typo-label-caps" style={{ color: 'var(--outline)', fontSize: '10px' }}>
                  {t('visualization.summary.avgRmse')}
                </span>
                {!Number.isFinite(r.avgRmse) || r.avgRmse > DIVERGENCE_THRESHOLD ? (
                  <DivergenceBadge align="center" position="bottom" />
                ) : (
                  <span className="typo-data" style={{ color, fontSize: '13px' }}>{r.avgRmse.toFixed(3)}</span>
                )}
              </div>
              <div className="viz-summary-metric">
                <span className="typo-label-caps" style={{ color: 'var(--outline)', fontSize: '10px' }}>
                  {t('visualization.summary.avgSpread')}
                </span>
                <span className="typo-data" style={{ fontSize: '13px' }}>{Number.isFinite(r.avgSpread) ? r.avgSpread.toFixed(3) : '—'}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
