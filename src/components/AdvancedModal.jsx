import { useState, useCallback } from 'react';
import EduTooltip from './EduTooltip';
import { DEFAULT_ADVANCED } from '../constants';
import { useLanguage } from '../context/LanguageContext';

export default function AdvancedModal({ options, obsMode, onUpdate, onClose }) {
  const { t } = useLanguage();
  const [local, setLocal] = useState({ ...options });
  // Local string representation for forgiving number typing
  const [inputStrings, setInputStrings] = useState({});

  const updateLocalValue = useCallback((key, value) => {
    setLocal(prev => {
      const next = { ...prev, [key]: value };
      if (key === 'N') {
        const maxIdx = Math.max(0, value - 1);
        if (next.sparseRegionStart != null && next.sparseRegionStart > maxIdx) {
          next.sparseRegionStart = maxIdx;
        }
        if (next.sparseRegionEnd != null && next.sparseRegionEnd > maxIdx) {
          next.sparseRegionEnd = maxIdx;
        }
        if (next.thinNumObs != null && next.thinNumObs > value) {
          next.thinNumObs = Math.max(1, value);
        }
      }
      return next;
    });
  }, []);

  const handleSliderChange = (key, value) => {
    updateLocalValue(key, value);
    setInputStrings(prev => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  const handleInputChange = (key, rawStr, min, max, isFloat = false, offset = 0) => {
    setInputStrings(prev => ({ ...prev, [key]: rawStr }));
    if (rawStr.trim() === '' || rawStr === '-' || rawStr === '.') {
      return;
    }
    const val = Number(rawStr);
    if (Number.isFinite(val)) {
      const parsed = isFloat ? val : Math.round(val);
      updateLocalValue(key, parsed - offset);
    }
  };

  const handleInputBlur = (key, min, max, isFloat = false, offset = 0) => {
    const raw = inputStrings[key];
    if (raw !== undefined) {
      const num = Number(raw);
      if (!Number.isFinite(num) || raw.trim() === '') {
        updateLocalValue(key, DEFAULT_ADVANCED[key] ?? (min - offset));
      } else {
        const clamped = Math.max(min, Math.min(max, isFloat ? num : Math.round(num)));
        updateLocalValue(key, clamped - offset);
      }
      setInputStrings(prev => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
  };

  const handlePerFieldReset = (key, defaultVal) => {
    updateLocalValue(key, defaultVal);
    setInputStrings(prev => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  const handleResetDefaults = () => {
    setLocal({ ...DEFAULT_ADVANCED });
    setInputStrings({});
  };

  const handleSave = () => {
    const sanitized = { ...local };
    const N = Math.max(4, Math.min(100, Math.round(sanitized.N || 40)));
    sanitized.N = N;
    sanitized.F = Math.max(1, Math.min(20, sanitized.F || 8.0));
    sanitized.modelF = Math.max(1, Math.min(20, sanitized.modelF ?? sanitized.F ?? 8.0));
    sanitized.obsErrorVar = Math.max(0.01, Math.min(10.0, sanitized.obsErrorVar || 1.0));
    sanitized.obsInterval = Math.max(1, Math.min(20, Math.round(sanitized.obsInterval || 1)));
    sanitized.numSteps = Math.max(50, Math.min(2000, Math.round(sanitized.numSteps || 500)));
    sanitized.dt = Math.max(0.005, Math.min(0.2, sanitized.dt || 0.05));

    if (sanitized.sparseRegionStart != null) {
      sanitized.sparseRegionStart = Math.max(0, Math.min(N - 1, Math.round(sanitized.sparseRegionStart)));
    }
    if (sanitized.sparseRegionEnd != null) {
      sanitized.sparseRegionEnd = Math.max(0, Math.min(N - 1, Math.round(sanitized.sparseRegionEnd)));
    }
    if (sanitized.thinNumObs != null) {
      sanitized.thinNumObs = Math.max(1, Math.min(N, Math.round(sanitized.thinNumObs)));
    }
    onUpdate(sanitized);
    onClose();
  };

  const fields = [
    { key: 'N', min: 4, max: 100, step: 1, defaultVal: 40, isFloat: false },
    { key: 'F', min: 1, max: 20, step: 0.5, defaultVal: 8.0, isFloat: true },
    { key: 'modelF', min: 1, max: 20, step: 0.5, defaultVal: 8.0, isFloat: true },
    { key: 'obsErrorVar', min: 0.01, max: 10, step: 0.1, defaultVal: 1.0, isFloat: true },
    { key: 'obsInterval', min: 1, max: 20, step: 1, defaultVal: 1, isFloat: false },
    { key: 'numSteps', min: 50, max: 2000, step: 50, defaultVal: 500, isFloat: false },
    { key: 'dt', min: 0.005, max: 0.2, step: 0.005, defaultVal: 0.05, isFloat: true },
  ];

  const sparseFields = [
    { key: 'sparseRegionStart', min: 1, max: local.N, step: 1, defaultVal: 1, isFloat: false, offset: 1 },
    { key: 'sparseRegionEnd', min: 1, max: local.N, step: 1, defaultVal: 20, isFloat: false, offset: 1 },
    { key: 'sparseInterval', min: 2, max: 20, step: 1, defaultVal: 4, isFloat: false },
  ];

  const thinnedFields = [
    { key: 'thinNumObs', min: 1, max: local.N, step: 1, defaultVal: 20, isFloat: false },
  ];

  const renderFieldRow = (f) => {
    const label = t(`advancedModal.fields.${f.key}`, f.key);
    const offset = f.offset || 0;
    const currentVal = (local[f.key] ?? f.defaultVal) + offset;
    const displayStr = inputStrings[f.key] !== undefined ? inputStrings[f.key] : currentVal;

    return (
      <div className="advanced-field-group" key={f.key}>
        <div className="advanced-field-header">
          <div className="advanced-field-label-wrap">
            <label className="field-label" style={{ margin: 0, fontWeight: 500 }}>{label}</label>
            <EduTooltip paramId={f.key} align="left" position="top" />
          </div>
          <button
            type="button"
            className="advanced-default-btn"
            onClick={() => handlePerFieldReset(f.key, f.defaultVal - offset)}
            title={`${t('advancedModal.defaultHint')}: ${f.defaultVal}`}
          >
            {t('advancedModal.defaultHint')}: {f.defaultVal}
          </button>
        </div>

        <div className="advanced-field-controls">
          <input
            type="range"
            className="advanced-slider"
            min={f.min}
            max={f.max}
            step={f.step}
            value={currentVal}
            onChange={(e) => {
              const val = Number(e.target.value);
              handleSliderChange(f.key, val - offset);
            }}
          />
          <input
            type="number"
            className="advanced-number-input"
            min={f.min}
            max={f.max}
            step={f.step}
            value={displayStr}
            onFocus={(e) => e.target.select()}
            onChange={(e) => handleInputChange(f.key, e.target.value, f.min, f.max, f.isFloat, offset)}
            onBlur={() => handleInputBlur(f.key, f.min, f.max, f.isFloat, offset)}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content custom-scroll" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="typo-headline-md">{t('advancedModal.title')}</h2>
          <button
            className="method-card-menu-btn"
            onClick={onClose}
            aria-label={t('advancedModal.close')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 24 }}>close</span>
          </button>
        </div>

        <div className="modal-body">
          {/* Common fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="typo-body-md" style={{ fontWeight: 600, color: 'var(--primary)' }}>
                {t('advancedModal.generalSection')}
              </h3>
              <button
                type="button"
                className="btn-ghost"
                onClick={handleResetDefaults}
                style={{ fontSize: '12px', padding: '4px 8px', color: 'var(--outline)' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>restart_alt</span>
                {t('advancedModal.resetDefaults')}
              </button>
            </div>

            {fields.map(renderFieldRow)}
          </div>

          {/* Sparse-specific */}
          {obsMode === 'sparse' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, borderTop: '1px solid var(--outline-variant)', paddingTop: 16 }}>
              <h3 className="typo-body-md" style={{ fontWeight: 600, color: 'var(--secondary)' }}>
                {t('advancedModal.sparseSection')}
              </h3>
              {sparseFields.map(renderFieldRow)}
            </div>
          )}

          {/* Thinned-specific */}
          {obsMode === 'thinned' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, borderTop: '1px solid var(--outline-variant)', paddingTop: 16 }}>
              <h3 className="typo-body-md" style={{ fontWeight: 600, color: 'var(--secondary)' }}>
                {t('advancedModal.thinnedSection')}
              </h3>
              {thinnedFields.map(renderFieldRow)}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>
            {t('advancedModal.cancel')}
          </button>
          <button className="btn btn-primary" style={{ fontSize: 15, padding: '8px 24px' }} onClick={handleSave}>
            {t('advancedModal.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
