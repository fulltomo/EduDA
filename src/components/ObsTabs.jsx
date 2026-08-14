import './ObsTabs.css';

export default function ObsTabs({ modes, activeMode, onChangeMode, description }) {
  return (
    <div className="obs-tabs-container" id="obs-tabs">
      <div className="obs-tabs-row">
        {modes.map(mode => (
          <button
            key={mode.id}
            className={`obs-tab ${activeMode === mode.id ? 'obs-tab--active' : ''}`}
            onClick={() => onChangeMode(mode.id)}
            id={`tab-${mode.id}`}
          >
            {mode.label}
          </button>
        ))}
      </div>
      {description && (
        <div className="obs-tabs-desc">{description}</div>
      )}
    </div>
  );
}
