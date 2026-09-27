import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getLocalizedTooltip } from '../data/tooltips';
import { useClickOutside } from '../hooks/useClickOutside';
import { useLanguage } from '../context/LanguageContext';
import './EduTooltip.css';

// 一言だけ。式や目安は GitHub の解説へ。
function TooltipBody({ data, t }) {
  return (
    <div className="edu-tooltip-body">
      <p className="edu-tooltip-text">{data.text}</p>
      <a className="edu-tooltip-more" href={data.href} target="_blank" rel="noopener noreferrer">
        {t('tooltipDrawer.more')}
      </a>
    </div>
  );
}

/**
 * Floating Popover Box with Portal
 */
function TooltipBox({ data, triggerRect, onClose, t }) {
  // Compute optimal fixed screen position based on trigger element
  const [posStyle, setPosStyle] = useState({});

  useEffect(() => {
    if (!triggerRect) return;

    const tooltipWidth = 300;
    const tooltipMaxHeight = 200;
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
    });
  }, [triggerRect]);

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
          <span className="material-symbols-outlined" aria-hidden="true">close</span>
        </button>
      </div>
      <TooltipBody data={data} t={t} />
    </div>,
    document.body
  );
}

/**
 * Default Floating Tooltip Component
 */
export default function EduTooltip({ paramId }) {
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
        <span className="material-symbols-outlined" aria-hidden="true">info</span>
      </button>

      {isOpen && (
        <TooltipBox
          data={data}
          triggerRect={triggerRect}
          onClose={() => setIsOpen(false)}
          t={t}
        />
      )}
    </div>
  );
}
