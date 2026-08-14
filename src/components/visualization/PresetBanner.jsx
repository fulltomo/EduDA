import { useState, useEffect } from 'react';

export default function PresetBanner({ activePreset }) {
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    if (activePreset) {
      setIsExpanded(true);
    }
  }, [activePreset]);

  if (!activePreset) return null;

  return (
    <div
      className="preset-banner card"
      style={{
        margin: '16px 16px 0 16px',
        borderLeft: '4px solid var(--primary)',
        backgroundColor: 'var(--surface-container-high)',
        flexShrink: 0,
      }}
    >
      <div
        className="card-header"
        onClick={() => setIsExpanded(prev => !prev)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--surface-container-highest)',
          borderBottom: isExpanded ? '1px solid var(--outline-variant)' : 'none',
          padding: '10px 16px',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '20px' }}>
            school
          </span>
          <span className="typo-headline-md" style={{ color: 'var(--primary)', fontSize: '15px', fontWeight: '600' }}>
            {activePreset.title}
          </span>
        </div>
        <button
          className="btn-ghost"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(prev => !prev);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 8px',
            fontSize: '12px',
            borderRadius: 'var(--rounded)',
            cursor: 'pointer',
          }}
          id="btn-toggle-preset-details"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
            {isExpanded ? 'expand_less' : 'expand_more'}
          </span>
          {isExpanded ? '説明を隠す' : '説明を表示'}
        </button>
      </div>
      {isExpanded && (
        <div className="card-body" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p className="typo-body-sm" style={{ fontWeight: '600', color: 'var(--secondary)' }}>
            テーマ: {activePreset.theme}
          </p>
          <p className="typo-body-sm" style={{ color: 'var(--on-surface-variant)', lineHeight: '1.5', fontSize: '13px' }}>
            {activePreset.description}
          </p>
        </div>
      )}
    </div>
  );
}
