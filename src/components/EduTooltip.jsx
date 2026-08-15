import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
 * Floating Popover Box with Portal
 */
function TooltipBox({ data, triggerRect, onClose, style, isDivergence, t }) {
  // Compute optimal fixed screen position based on trigger element
  const [posStyle, setPosStyle] = useState({});

  useEffect(() => {
    if (!triggerRect) return;

    const tooltipWidth = 300;
    const tooltipMaxHeight = 360;
    const margin = 8;

    let left = triggerRect.right + margin;
    let top = triggerRect.top;

    // If opening to the right goes offscreen, place it on the left of trigger or centered below
    if (left + tooltipWidth > window.innerWidth - 16) {
      if (triggerRect.left - tooltipWidth - margin > 16) {
        left = triggerRect.left - tooltipWidth - margin;
      } else {
        left = Math.max(16, Math.min(window.innerWidth - tooltipWidth - 16, triggerRect.left - tooltipWidth / 2));
        top = triggerRect.bottom + margin;
      }
    }

    // Keep top within viewport
    if (top + tooltipMaxHeight > window.innerHeight - 16) {
      top = Math.max(16, window.innerHeight - tooltipMaxHeight - 16);
    }
    if (top < 16) top = 16;

    setPosStyle({
      position: 'fixed',
      left: `${left}px`,
      top: `${top}px`,
      width: `${tooltipWidth}px`,
      maxHeight: `${tooltipMaxHeight}px`,
      zIndex: 9999,
      ...style,
    });
  }, [triggerRect, style]);

  return createPortal(
    <div
      className="edu-tooltip-box custom-scroll animate-fadeIn"
      onClick={(e) => e.stopPropagation()}
      style={posStyle}
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
    </div>,
    document.body
  );
}

/**
 * Default Floating Tooltip Component
 */
export default function EduTooltip({ paramId, align = 'center', position = 'bottom' }) {
  const { lang, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [triggerRect, setTriggerRect] = useState(null);
  const buttonRef = useRef(null);
  const containerRef = useRef(null);
  const tooltipInstanceIdRef = useRef(`tooltip-${Math.random().toString(36).substring(2, 9)}`);
  const data = getLocalizedTooltip(paramId, lang);

  useClickOutside(containerRef, () => setIsOpen(false), isOpen);

  // Close this tooltip when any other tooltip opens
  useEffect(() => {
    const handleOtherTooltipOpen = (e) => {
      if (e.detail !== tooltipInstanceIdRef.current) {
        setIsOpen(false);
      }
    };
    window.addEventListener('eduda:tooltip-open', handleOtherTooltipOpen);
    return () => window.removeEventListener('eduda:tooltip-open', handleOtherTooltipOpen);
  }, []);

  const toggleTooltip = (e) => {
    e.preventDefault();
    if (!isOpen) {
      if (buttonRef.current) {
        setTriggerRect(buttonRef.current.getBoundingClientRect());
      }
      setIsOpen(true);
      window.dispatchEvent(new CustomEvent('eduda:tooltip-open', { detail: tooltipInstanceIdRef.current }));
    } else {
      setIsOpen(false);
    }
  };

  if (!data) return null;

  return (
    <div className="edu-tooltip-container mode-floating" ref={containerRef}>
      <button
        ref={buttonRef}
        type="button"
        className={`edu-tooltip-trigger ${isOpen ? 'active' : ''}`}
        onClick={toggleTooltip}
        aria-label={`${data.title} ${t('methodCard.showExplanation')}`}
        title={t('methodCard.showExplanation')}
      >
        <span className="material-symbols-outlined">info</span>
      </button>

      {isOpen && (
        <TooltipBox
          data={data}
          triggerRect={triggerRect}
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
  const [triggerRect, setTriggerRect] = useState(null);
  const buttonRef = useRef(null);
  const containerRef = useRef(null);
  const tooltipInstanceIdRef = useRef(`divergence-${Math.random().toString(36).substring(2, 9)}`);
  const data = getLocalizedTooltip('filterDivergence', lang);

  useClickOutside(containerRef, () => setIsOpen(false), isOpen);

  useEffect(() => {
    const handleOtherTooltipOpen = (e) => {
      if (e.detail !== tooltipInstanceIdRef.current) {
        setIsOpen(false);
      }
    };
    window.addEventListener('eduda:tooltip-open', handleOtherTooltipOpen);
    return () => window.removeEventListener('eduda:tooltip-open', handleOtherTooltipOpen);
  }, []);

  const toggleTooltip = (e) => {
    e.preventDefault();
    if (!isOpen) {
      if (buttonRef.current) {
        setTriggerRect(buttonRef.current.getBoundingClientRect());
      }
      setIsOpen(true);
      window.dispatchEvent(new CustomEvent('eduda:tooltip-open', { detail: tooltipInstanceIdRef.current }));
    } else {
      setIsOpen(false);
    }
  };

  if (!data) return null;

  return (
    <div
      className="edu-tooltip-container mode-floating divergence-badge-container"
      ref={containerRef}
    >
      <button
        ref={buttonRef}
        type="button"
        className={`divergence-badge ${isOpen ? 'active' : ''}`}
        onClick={toggleTooltip}
        aria-label={t('methodCard.divergedTooltip')}
        title={t('methodCard.showExplanation')}
      >
        <span>{t('methodCard.diverged')}</span>
      </button>

      {isOpen && (
        <TooltipBox
          data={data}
          triggerRect={triggerRect}
          align={align}
          position={position}
          onClose={() => setIsOpen(false)}
          style={{ width: '320px' }}
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
