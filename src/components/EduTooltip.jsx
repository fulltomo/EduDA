import { useState, useRef } from 'react';
import { getLocalizedTooltip } from '../data/tooltips';
import { useClickOutside } from '../hooks/useClickOutside';
import { useLanguage } from '../context/LanguageContext';
import './EduTooltip.css';

/**
 * Reusable Tooltip Content Sections
 */
function TooltipBody({ data, isDivergence = false, t }) {
  const secTitle1 = isDivergence ? t('tooltipDrawer.explanationDivergence') : t('tooltipDrawer.explanation');
  const secTitle2 = isDivergence ? t('tooltipDrawer.formulaDivergence') : t('tooltipDrawer.formula');
  const secTitle3 = isDivergence ? t('tooltipDrawer.guidelineDivergence') : t('tooltipDrawer.guideline');

  return (
    <div className="edu-tooltip-body">
      <div className="edu-tooltip-section">
        <h4 className="edu-tooltip-sec-title">{secTitle1}</h4>
        <p className="edu-tooltip-sec-text">{data.description}</p>
      </div>
      <div className="edu-tooltip-section">
        <h4 className="edu-tooltip-sec-title">{secTitle2}</h4>
        <pre className="edu-tooltip-sec-formula">{data.formula}</pre>
      </div>
      <div className="edu-tooltip-section">
        <h4 className="edu-tooltip-sec-title">{secTitle3}</h4>
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
function TooltipBox({ data, align, position, onClose, style, isDivergence, t }) {
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
          aria-label={t('tooltipDrawer.close')}
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
      <TooltipBody data={data} isDivergence={isDivergence} t={t} />
    </div>
  );
}

/**
 * Default Floating Tooltip Component
 */
export default function EduTooltip({ paramId, align = 'center', position = 'bottom' }) {
  const { lang, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const data = getLocalizedTooltip(paramId, lang);

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
        aria-label={`${data.title} ${t('methodCard.showExplanation')}`}
        title={t('methodCard.showExplanation')}
      >
        <span className="material-symbols-outlined">info</span>
      </button>

      {isOpen && (
        <TooltipBox
          data={data}
          align={align}
          position={position}
          onClose={() => setIsOpen(false)}
          t={t}
        />
      )}
    </div>
  );
}

/**
 * Divergence Badge with Hover and Click Tooltip Support
 */
export function DivergenceBadge({ align = 'center', position = 'bottom' }) {
  const { lang, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const data = getLocalizedTooltip('filterDivergence', lang);

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
        aria-label={t('methodCard.divergedTooltip')}
        title={t('methodCard.showExplanation')}
      >
        <span>{t('methodCard.diverged')}</span>
      </button>

      {isOpen && (
        <TooltipBox
          data={data}
          align={align}
          position={position}
          onClose={() => setIsOpen(false)}
          style={{ width: '320px', pointerEvents: 'auto', display: 'flex', flexDirection: 'column' }}
          isDivergence={true}
          t={t}
        />
      )}
    </div>
  );
}

/**
 * Inline Accordion Help Drawer Component
 */
export function EduTooltipDrawer({ paramId, onClose }) {
  const { lang, t } = useLanguage();
  const data = getLocalizedTooltip(paramId, lang);
  const containerRef = useRef(null);

  useClickOutside(containerRef, () => {
    if (onClose) onClose();
  }, true, '.edu-tooltip-trigger');

  if (!data) return null;

  const isDivergence = paramId === 'filterDivergence';
  const secTitle1 = isDivergence ? t('tooltipDrawer.explanationDivergence') : t('tooltipDrawer.explanation');
  const secTitle2 = isDivergence ? t('tooltipDrawer.formulaDivergence') : t('tooltipDrawer.formula');
  const secTitle3 = isDivergence ? t('tooltipDrawer.guidelineDivergence') : t('tooltipDrawer.guideline');

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
          aria-label={t('tooltipDrawer.close')}
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
      <div className="edu-help-inline-body">
        <div className="edu-help-inline-section">
          <span className="edu-help-inline-sec-title">{secTitle1}</span>
          <p className="edu-help-inline-text">{data.description}</p>
        </div>
        <div className="edu-help-inline-section">
          <span className="edu-help-inline-sec-title">{secTitle2}</span>
          <pre className="edu-help-inline-formula">{data.formula}</pre>
        </div>
        <div className="edu-help-inline-section">
          <span className="edu-help-inline-sec-title">{secTitle3}</span>
          <p className="edu-help-inline-text" style={isDivergence ? { whiteSpace: 'pre-line' } : undefined}>
            {data.guideline}
          </p>
        </div>
      </div>
    </div>
  );
}
