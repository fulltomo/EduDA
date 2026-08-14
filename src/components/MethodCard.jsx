import { useState, useRef } from 'react';
import { EduTooltipDrawer } from './EduTooltip';
import { DIVERGENCE_THRESHOLD } from '../constants';
import { useClickOutside } from '../hooks/useClickOutside';
import './MethodCard.css';

export default function MethodCard({ method, color, onUpdate, onRemove }) {
  const [showMenu, setShowMenu] = useState(false);
  const [openDrawers, setOpenDrawers] = useState({});
  const menuRef = useRef(null);

  useClickOutside(menuRef, () => setShowMenu(false), showMenu);

  const glowColor = color + '99'; // ~60% opacity

  const handleParamChange = (key, val) => {
    const newParams = { ...method.params, [key]: val };
    onUpdate({ params: newParams });
  };

  const toggleDrawer = (key, e) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenDrawers((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const closeDrawer = (key) => {
    setOpenDrawers((prev) => ({
      ...prev,
      [key]: false,
    }));
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
          <div className="method-card-menu-wrapper" ref={menuRef} style={{ position: 'relative' }}>
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
      </div>

      {/* Card Body: Sliders for method-specific parameters */}
      <div className="card-body method-card-body">
        {method.paramDefs && method.paramDefs.map((p) => {
          const val = method.params?.[p.key] ?? p.default;
          const isDrawerOpen = !!openDrawers[p.key];
          return (
            <div className="slider-group" key={p.key}>
              <div className="slider-header">
                <div className="slider-label-wrapper">
                  <span className="slider-label">{p.label}</span>
                  <button
                    type="button"
                    className={`edu-tooltip-trigger ${isDrawerOpen ? 'active' : ''}`}
                    onClick={(e) => toggleDrawer(p.key, e)}
                    aria-label={`${p.label} の説明を表示`}
                    title="解説を表示"
                  >
                    <span className="material-symbols-outlined">info</span>
                  </button>
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

              {isDrawerOpen && (
                <EduTooltipDrawer
                  paramId={p.key}
                  onClose={() => closeDrawer(p.key)}
                />
              )}
            </div>
          );
        })}

        {/* Inline Stats */}
        {method.avgRmse != null && (
          <div className="method-card-stats-wrapper">
            <div className="method-card-stats">
              <div className="stat-item">
                <span className="stat-label typo-label-caps">RMSE:</span>
                {!Number.isFinite(method.avgRmse) || method.avgRmse > DIVERGENCE_THRESHOLD ? (
                  <button
                    type="button"
                    className={`divergence-badge ${openDrawers['filterDivergence'] ? 'active' : ''}`}
                    onClick={(e) => toggleDrawer('filterDivergence', e)}
                    aria-label="フィルター発散の説明を表示"
                    title="解説を表示"
                  >
                    <span>⚠️ 発散 (Diverged)</span>
                  </button>
                ) : (
                  <span className="stat-value typo-data">{method.avgRmse.toFixed(3)}</span>
                )}
              </div>
              <div className="stat-item">
                <div className="stat-label-wrapper">
                  <span className="stat-label typo-label-caps">Spread</span>
                  <button
                    type="button"
                    className={`edu-tooltip-trigger ${openDrawers['spread'] ? 'active' : ''}`}
                    onClick={(e) => toggleDrawer('spread', e)}
                    aria-label="Spread の説明を表示"
                    title="解説を表示"
                  >
                    <span className="material-symbols-outlined">info</span>
                  </button>
                  <span className="stat-label typo-label-caps">:</span>
                </div>
                <span className="stat-value typo-data">
                  {method.avgSpread != null ? method.avgSpread.toFixed(3) : '—'}
                </span>
              </div>
            </div>

            {openDrawers['spread'] && (
              <EduTooltipDrawer
                paramId="spread"
                onClose={() => closeDrawer('spread')}
              />
            )}

            {openDrawers['filterDivergence'] && (
              <EduTooltipDrawer
                paramId="filterDivergence"
                onClose={() => closeDrawer('filterDivergence')}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
