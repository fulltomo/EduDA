import { useState } from 'react';
import MethodCard from './MethodCard';
import { useLanguage } from '../context/LanguageContext';
import './ControlPanel.css';

export default function ControlPanel({
  methods,
  colors,
  onUpdateMethod,
  onRemoveMethod,
  onDuplicateMethod,
  onAddMethod,
}) {
  const { t } = useLanguage();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={`control-panel ${isCollapsed ? 'is-collapsed' : ''}`}
      id="control-panel"
      aria-label="Methods sidebar"
    >
      {/* Header */}
      <div className="cp-header">
        {!isCollapsed ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="typo-headline-md">{t('controlPanel.title')}</span>
              <span className="badge" style={{ fontSize: '13px', color: 'var(--outline)', fontVariantNumeric: 'tabular-nums' }}>
                {methods.length}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                className="btn-ghost cp-add-btn"
                onClick={onAddMethod}
                id="btn-add-method"
                title={t('controlPanel.addMethod')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }} aria-hidden="true">add</span>
                {t('controlPanel.addMethod')}
              </button>
              <button
                className="btn-ghost cp-collapse-btn"
                onClick={() => setIsCollapsed(true)}
                title={t('controlPanel.sidebarCollapse')}
                aria-label={t('controlPanel.sidebarCollapse')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }} aria-hidden="true">dock_to_left</span>
              </button>
            </div>
          </>
        ) : (
          <div className="cp-collapsed-header">
            <button
              className="btn-ghost cp-expand-btn"
              onClick={() => setIsCollapsed(false)}
              title={t('controlPanel.sidebarExpand')}
              aria-label={t('controlPanel.sidebarExpand')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }} aria-hidden="true">chevron_right</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Content (Expanded vs Collapsed) */}
      {!isCollapsed ? (
        <div className="cp-cards custom-scroll">
          {methods.length === 0 && (
            <div className="cp-empty">
              <span className="material-symbols-outlined" style={{ fontSize: 40, color: 'var(--outline)' }} aria-hidden="true">
                science
              </span>
              <p style={{ color: 'var(--outline)', marginTop: 8 }}>
                {t('controlPanel.emptyHint')}
              </p>
            </div>
          )}
          {methods.map((method, index) => (
            <MethodCard
              key={method.instanceId}
              method={method}
              color={colors[index % colors.length]}
              onUpdate={(updates) => onUpdateMethod(method.instanceId, updates)}
              onRemove={() => onRemoveMethod(method.instanceId)}
              onDuplicate={() => onDuplicateMethod(method.instanceId)}
            />
          ))}
        </div>
      ) : (
        <div className="cp-collapsed-body custom-scroll">
          <button
            className="btn-ghost cp-collapsed-add-btn"
            onClick={onAddMethod}
            title={t('controlPanel.addMethod')}
            aria-label={t('controlPanel.addMethod')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }} aria-hidden="true">add</span>
          </button>

          <div className="cp-collapsed-methods">
            {methods.map((method, index) => {
              const color = colors[index % colors.length];
              const isVisible = method.visible !== false;
              const statusDesc = isVisible ? t('controlPanel.visibleTooltip') : t('controlPanel.hiddenTooltip');
              return (
                <button
                  key={method.instanceId}
                  className={`cp-collapsed-method-item ${!isVisible ? 'is-hidden' : ''}`}
                  onClick={() => onUpdateMethod(method.instanceId, { visible: !isVisible })}
                  title={`${method.label} (${statusDesc})`}
                  aria-label={`${method.label} ${t('controlPanel.toggleVisibility')}`}
                >
                  <div
                    className="color-dot"
                    style={{
                      backgroundColor: color,
                      opacity: isVisible ? 1 : 0.4,
                    }}
                  />
                  <span className="cp-collapsed-label typo-data" style={{ color: isVisible ? color : 'var(--outline)' }}>
                    {method.type}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

    </aside>
  );
}
