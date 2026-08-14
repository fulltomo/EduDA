import { useState } from 'react';
import './MethodCard.css';

export default function MethodCard({ method, color, onUpdate, onRemove }) {
  const [showMenu, setShowMenu] = useState(false);

  const glowColor = color + '99'; // ~60% opacity

  const handleParamChange = (key, val) => {
    const newParams = { ...method.params, [key]: val };
    onUpdate({ params: newParams });
  };

  const ensembleSize = method.params?.ensembleSize;

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
            {method.label} {ensembleSize ? `(M=${ensembleSize})` : ''}
          </span>
        </div>
        <div className="method-card-actions" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            className="method-card-visibility-btn"
            onClick={() => onUpdate({ visible: method.visible !== false ? false : true })}
            aria-label={method.visible !== false ? "非表示にする" : "表示する"}
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
            className="method-card-menu-btn"
            onClick={() => setShowMenu(!showMenu)}
            aria-label="メニュー"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>more_vert</span>
          </button>
          {showMenu && (
            <div className="method-card-dropdown">
              <button onClick={() => { onRemove(); setShowMenu(false); }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                削除
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Card Body: Sliders for method-specific parameters */}
      <div className="card-body method-card-body">
        {method.paramDefs && method.paramDefs.map((p) => {
          const val = method.params?.[p.key] ?? p.default;
          return (
            <div className="slider-group" key={p.key}>
              <div className="slider-header">
                <label className="slider-label">{p.label}</label>
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
          <div className="method-card-stats">
            <div className="stat-item">
              <span className="stat-label typo-label-caps">RMSE:</span>
              <span className="stat-value typo-data">{method.avgRmse.toFixed(3)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label typo-label-caps">Spread:</span>
              <span className="stat-value typo-data">
                {method.type === '3DVar' || method.type === '4DVar'
                  ? 'N/A'
                  : method.avgSpread != null
                    ? method.avgSpread.toFixed(3)
                    : '—'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
