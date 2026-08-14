import { useState, useRef } from 'react';
import { TOOLTIP_DATA } from '../data/tooltips';
import { useClickOutside } from '../hooks/useClickOutside';
import './EduTooltip.css';

/**
 * Reusable Tooltip Content Sections
 */
function TooltipBody({ data, isDivergence = false }) {
  return (
    <div className="edu-tooltip-body">
      <div className="edu-tooltip-section">
        <h4 className="edu-tooltip-sec-title">{isDivergence ? '📖 フィルター発散とは' : '📖 直感的な解説'}</h4>
        <p className="edu-tooltip-sec-text">{data.description}</p>
      </div>
      <div className="edu-tooltip-section">
        <h4 className="edu-tooltip-sec-title">{isDivergence ? '🚨 主な発生理由' : '🧮 関連する数式表現'}</h4>
        <pre className="edu-tooltip-sec-formula">{data.formula}</pre>
      </div>
      <div className="edu-tooltip-section">
        <h4 className="edu-tooltip-sec-title">{isDivergence ? '💡 回避策・対策' : '💡 設定の目安・推奨値'}</h4>
        <p className="edu-tooltip-sec-text" style={isDivergence ? { fontSize: '11.5px', whiteSpace: 'pre-line' } : undefined}>
          {data.guideline}
        </p>
      </div>
    </div>
  );
}

/**
 * Floating Popover Box
 */
function TooltipBox({ data, align, position, onClose, style, isDivergence }) {
  return (
    <div
      className={`edu-tooltip-box edu-tooltip-align-${align} edu-tooltip-pos-${position} custom-scroll`}
      onClick={(e) => e.stopPropagation()}
      style={style}
    >
      <div className="edu-tooltip-header">
        <span className="edu-tooltip-title">{data.title}</span>
        <button
          type="button"
          className="edu-tooltip-close"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }}
          aria-label="閉じる"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
      <TooltipBody data={data} isDivergence={isDivergence} />
    </div>
  );
}

/**
 * Default Floating Tooltip Component
 */
export default function EduTooltip({ paramId, align = 'center', position = 'bottom' }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const data = TOOLTIP_DATA[paramId];

  useClickOutside(containerRef, () => setIsOpen(false), isOpen);

  const toggleTooltip = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  if (!data) return null;

  return (
    <div className="edu-tooltip-container mode-floating" ref={containerRef}>
      <button
        type="button"
        className={`edu-tooltip-trigger ${isOpen ? 'active' : ''}`}
        onClick={toggleTooltip}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        aria-label={`${data.title} の説明を表示`}
        title="解説を表示"
      >
        <span className="material-symbols-outlined">info</span>
      </button>

      {isOpen && (
        <TooltipBox
          data={data}
          align={align}
          position={position}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

/**
 * Divergence Badge with Hover and Click Tooltip Support
 */
export function DivergenceBadge({ align = 'center', position = 'bottom' }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const data = TOOLTIP_DATA['filterDivergence'];

  useClickOutside(containerRef, () => setIsOpen(false), isOpen);

  const toggleTooltip = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  if (!data) return null;

  return (
    <div
      className="edu-tooltip-container mode-floating divergence-badge-container"
      ref={containerRef}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        type="button"
        className={`divergence-badge ${isOpen ? 'active' : ''}`}
        onClick={toggleTooltip}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        aria-label={`${data.title} の説明を表示`}
        title="解説を表示"
      >
        <span>⚠️ 発散 (Diverged)</span>
      </button>

      {isOpen && (
        <TooltipBox
          data={data}
          align={align}
          position={position}
          onClose={() => setIsOpen(false)}
          style={{ width: '320px', pointerEvents: 'auto', display: 'flex', flexDirection: 'column' }}
          isDivergence={true}
        />
      )}
    </div>
  );
}

/**
 * Inline Accordion Help Drawer Component
 */
export function EduTooltipDrawer({ paramId, onClose }) {
  const data = TOOLTIP_DATA[paramId];
  const containerRef = useRef(null);

  useClickOutside(containerRef, () => {
    if (onClose) onClose();
  }, true, '.edu-tooltip-trigger');

  if (!data) return null;

  return (
    <div ref={containerRef} className="edu-help-inline animate-expand" onClick={(e) => e.stopPropagation()}>
      <div className="edu-help-inline-header">
        <span className="edu-help-inline-title">{data.title}</span>
        <button
          type="button"
          className="edu-help-inline-close"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (onClose) onClose(e);
          }}
          aria-label="閉じる"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
      <div className="edu-help-inline-body">
        <div className="edu-help-inline-section">
          <span className="edu-help-inline-sec-title">📖 直感的な解説</span>
          <p className="edu-help-inline-text">{data.description}</p>
        </div>
        <div className="edu-help-inline-section">
          <span className="edu-help-inline-sec-title">🧮 関連する数式表現</span>
          <pre className="edu-help-inline-formula">{data.formula}</pre>
        </div>
        <div className="edu-help-inline-section">
          <span className="edu-help-inline-sec-title">💡 設定の目安・推奨値</span>
          <p className="edu-help-inline-text">{data.guideline}</p>
        </div>
      </div>
    </div>
  );
}
