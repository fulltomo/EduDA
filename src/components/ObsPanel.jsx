import EduTooltip from './EduTooltip';
import { useLanguage } from '../context/LanguageContext';
import './ObsPanel.css';

/** どの格子点を観測するか。シミュレーション側 (simulation.rs) と同じ規則 */
function observedIndexSet(mode, options) {
  const N = options?.N ?? 40;
  const set = new Set();
  if (mode === 'full') {
    for (let i = 0; i < N; i++) set.add(i);
  } else if (mode === 'sparse') {
    const start = Math.min(options.sparseRegionStart ?? 0, options.sparseRegionEnd ?? 19);
    const end = Math.max(options.sparseRegionStart ?? 0, options.sparseRegionEnd ?? 19);
    for (let i = start; i <= end; i++) set.add(i % N);
  } else if (mode === 'thinned') {
    const numObs = Math.min(N, Math.max(1, options.thinNumObs ?? 20));
    for (let k = 0; k < numObs; k++) set.add(Math.round(k * N / numObs) % N);
  }
  return set;
}

function Slider({ id, label, value, display, min, max, step, onChange, tooltip }) {
  return (
    <div className="slider-group">
      <div className="slider-header">
        <div className="slider-label-wrapper">
          <label className="slider-label" htmlFor={id}>{label}</label>
          {tooltip && <EduTooltip paramId={tooltip} />}
        </div>
        <span className="slider-value typo-data">{display ?? value}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

/**
 * 観測の設定をまとめたパネル。Lorenz '96 の格子点は円環状につながっているので、
 * 観測点も円環で示し、つまみを動かすとその場で円環が変わる。
 */
export default function ObsPanel({ modes, activeMode, onChangeMode, options, onUpdateOptions }) {
  const { t } = useLanguage();
  const N = options.N ?? 40;
  const observed = observedIndexSet(activeMode, options);
  const set = (key, value) => onUpdateOptions({ ...options, [key]: value });

  const R = 62;
  const dotR = Math.min(4, (Math.PI * R) / N * 0.55);

  return (
    <aside className="obs-panel custom-scroll" id="obs-panel" aria-label={t('obsSectionTitle')}>
      <h2 className="typo-headline-md">{t('obsSectionTitle')}</h2>

      <div className="obs-mode-row" role="radiogroup" aria-label={t('obsSectionTitle')}>
        {modes.map(mode => (
          <button
            key={mode.id}
            type="button"
            role="radio"
            aria-checked={activeMode === mode.id}
            className={`obs-mode ${activeMode === mode.id ? 'obs-mode--active' : ''}`}
            onClick={() => onChangeMode(mode.id)}
            id={`tab-${mode.id}`}
          >
            {t(`obsModes.${mode.id}.label`, mode.label)}
          </button>
        ))}
      </div>

      {/* 格子点 1 を真上に時計回り */}
      <figure className="obs-ring-figure">
        <svg viewBox="-80 -80 160 160" className="obs-ring" role="img"
          aria-label={`${t('obsActions.pointsCount')} ${observed.size} / ${N}`}>
          {Array.from({ length: N }, (_, i) => {
            const a = (i / N) * 2 * Math.PI;
            return (
              <circle
                key={i}
                cx={(R * Math.sin(a)).toFixed(2)}
                cy={(-R * Math.cos(a)).toFixed(2)}
                r={dotR.toFixed(2)}
                className={observed.has(i) ? 'obs-ring-dot--on' : 'obs-ring-dot--off'}
              >
                <title>{`${t('obsActions.gridPoint')} ${i + 1}`}</title>
              </circle>
            );
          })}
          <text className="obs-ring-count" x="0" y="4" textAnchor="middle">
            {observed.size}
            <tspan className="obs-ring-total">/{N}</tspan>
          </text>
          <text className="obs-ring-caption" x="0" y="22" textAnchor="middle">
            {t('obsActions.pointsCount')}
          </text>
        </svg>
      </figure>

      <div className="obs-sliders">
        {activeMode === 'sparse' && (
          <>
            <Slider id="obs-sparse-start" label={t('obsPanel.rangeStart')} tooltip="sparseRegionStart"
              value={(options.sparseRegionStart ?? 0) + 1} min={1} max={N} step={1}
              onChange={(v) => set('sparseRegionStart', v - 1)} />
            <Slider id="obs-sparse-end" label={t('obsPanel.rangeEnd')} tooltip="sparseRegionEnd"
              value={(options.sparseRegionEnd ?? 19) + 1} min={1} max={N} step={1}
              onChange={(v) => set('sparseRegionEnd', v - 1)} />
          </>
        )}
        {activeMode === 'thinned' && (
          <Slider id="obs-thin-count" label={t('obsPanel.count')} tooltip="thinNumObs"
            value={options.thinNumObs ?? 20} min={1} max={N} step={1}
            onChange={(v) => set('thinNumObs', v)} />
        )}
        <Slider id="obs-error" label={t('obsPanel.error')} tooltip="obsErrorVar"
          value={options.obsErrorVar} display={options.obsErrorVar.toFixed(1)}
          min={0.1} max={5} step={0.1}
          onChange={(v) => set('obsErrorVar', v)} />
        <Slider id="obs-interval" label={t('obsPanel.interval')} tooltip="obsInterval"
          value={options.obsInterval} min={1} max={20} step={1}
          onChange={(v) => set('obsInterval', v)} />
      </div>
    </aside>
  );
}
