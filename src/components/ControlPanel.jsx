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
}) {
  return (
    <aside className="control-panel" id="control-panel">
      {/* Header */}
      <div className="cp-header">
        <span className="typo-headline-md">Methods</span>
        <button
          className="btn-ghost cp-add-btn"
          onClick={onAddMethod}
          id="btn-add-method"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
          比較手法を追加
        </button>
      </div>

      {/* Method Cards */}
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

      {/* Footer Actions */}
      <div className="cp-footer">
        <button
          className="btn btn-primary cp-run-btn"
          onClick={onRun}
          disabled={isRunning || methods.length === 0}
          id="btn-run"
        >
          <span className="material-symbols-outlined">play_arrow</span>
          <span>{isRunning ? '計算中...' : '同化を実行'}</span>
          {isRunning && <div className="spinner" />}
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
      </div>
    </aside>
  );
}
