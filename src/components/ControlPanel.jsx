import { useState } from 'react';
import MethodCard from './MethodCard';
import './ControlPanel.css';

export default function ControlPanel({
  methods,
  colors,
  onUpdateMethod,
  onRemoveMethod,
  onAddMethod,
  onRun,
  onCsvExport,
  isRunning,
  progress,
  hasResults,
  needsRecalc = false,
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={`control-panel ${isCollapsed ? 'is-collapsed' : ''}`}
      id="control-panel"
      aria-label="Methods サイドバー"
    >
      {/* Header */}
      <div className="cp-header">
        {!isCollapsed ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="typo-headline-md">Methods</span>
              <span className="badge" style={{ fontSize: '11px', background: 'var(--surface-container-high)', color: 'var(--outline)', padding: '2px 6px', borderRadius: 'var(--rounded-full)' }}>
                {methods.length}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                className="btn-ghost cp-add-btn"
                onClick={onAddMethod}
                id="btn-add-method"
                title="比較手法を追加"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
                比較手法を追加
              </button>
              <button
                className="btn-ghost cp-collapse-btn"
                onClick={() => setIsCollapsed(true)}
                title="サイドバーを縮小"
                aria-label="サイドバーを縮小"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>dock_to_left</span>
              </button>
            </div>
          </>
        ) : (
          <div className="cp-collapsed-header">
            <button
              className="btn-ghost cp-expand-btn"
              onClick={() => setIsCollapsed(false)}
              title="サイドバーを展開"
              aria-label="サイドバーを展開"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>chevron_right</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Content (Expanded vs Collapsed) */}
      {!isCollapsed ? (
        <div className="cp-cards custom-scroll">
          {methods.length === 0 && (
            <div className="cp-empty">
              <span className="material-symbols-outlined" style={{ fontSize: 40, color: 'var(--outline)' }}>
                science
              </span>
              <p style={{ color: 'var(--outline)', marginTop: 8 }}>
                「比較手法を追加」から手法を選択してください
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
            />
          ))}
        </div>
      ) : (
        <div className="cp-collapsed-body custom-scroll">
          <button
            className="btn-ghost cp-collapsed-add-btn"
            onClick={onAddMethod}
            title="比較手法を追加"
            aria-label="比較手法を追加"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add</span>
          </button>

          <div className="cp-collapsed-methods">
            {methods.map((method, index) => {
              const color = colors[index % colors.length];
              const isVisible = method.visible !== false;
              return (
                <button
                  key={method.instanceId}
                  className={`cp-collapsed-method-item ${!isVisible ? 'is-hidden' : ''}`}
                  onClick={() => onUpdateMethod(method.instanceId, { visible: !isVisible })}
                  title={`${method.label} (${isVisible ? '表示中 - クリックで非表示' : '非表示 - クリックで表示'})`}
                  aria-label={`${method.label} 表示切り替え`}
                >
                  <div
                    className="color-dot"
                    style={{
                      backgroundColor: color,
                      opacity: isVisible ? 1 : 0.4,
                      boxShadow: isVisible ? `0 0 8px ${color}99` : 'none',
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

      {/* Footer Actions */}
      <div className="cp-footer">
        {!isCollapsed ? (
          <>
            <button
              className={`btn btn-primary cp-run-btn ${needsRecalc && !isRunning && methods.length > 0 ? 'cp-run-btn--pulse' : ''}`}
              onClick={onRun}
              disabled={isRunning || methods.length === 0}
              id="btn-run"
              style={{ position: 'relative' }}
            >
              <span className="material-symbols-outlined">play_arrow</span>
              <span>{isRunning ? '計算中...' : '同化を実行'}</span>
              {isRunning && <div className="spinner" />}
              {needsRecalc && !isRunning && methods.length > 0 && (
                <span className="cp-run-badge" />
              )}
            </button>

            {isRunning && (
              <div className="cp-progress-bar">
                <div
                  className="cp-progress-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}

            <button
              className="btn btn-secondary cp-csv-btn"
              onClick={onCsvExport}
              disabled={!hasResults}
              id="btn-csv"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>download</span>
              CSVダウンロード
            </button>
          </>
        ) : (
          <div className="cp-collapsed-footer">
            <button
              className={`btn btn-primary cp-collapsed-action-btn ${needsRecalc && !isRunning && methods.length > 0 ? 'cp-run-btn--pulse' : ''}`}
              onClick={onRun}
              disabled={isRunning || methods.length === 0}
              id="btn-run-collapsed"
              title="同化を実行"
              aria-label="同化を実行"
            >
              <span className="material-symbols-outlined">play_arrow</span>
              {needsRecalc && !isRunning && methods.length > 0 && (
                <span className="cp-run-badge" />
              )}
            </button>
            <button
              className="btn btn-secondary cp-collapsed-action-btn"
              onClick={onCsvExport}
              disabled={!hasResults}
              id="btn-csv-collapsed"
              title="CSVダウンロード"
              aria-label="CSVダウンロード"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>download</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
