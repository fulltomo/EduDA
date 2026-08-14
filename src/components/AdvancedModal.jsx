import { useState } from 'react';
import EduTooltip from './EduTooltip';
import { useLanguage } from '../context/LanguageContext';

export default function AdvancedModal({ options, obsMode, onUpdate, onClose }) {
  const { t } = useLanguage();
  const [local, setLocal] = useState({ ...options });

  const handleChange = (key, value) => {
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
  };

  const handleSave = () => {
    const sanitized = { ...local };
    const N = Math.max(4, Math.min(100, Math.round(sanitized.N || 40)));
    sanitized.N = N;
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
    { key: 'N', type: 'number', min: 4, max: 100, step: 1 },
    { key: 'F', type: 'number', min: 1, max: 20, step: 0.5 },
    { key: 'obsErrorVar', type: 'number', min: 0.01, max: 10, step: 0.1 },
    { key: 'obsInterval', type: 'number', min: 1, max: 20, step: 1 },
    { key: 'numSteps', type: 'number', min: 50, max: 2000, step: 50 },
    { key: 'dt', type: 'number', min: 0.005, max: 0.2, step: 0.005 },
  ];

  const sparseFields = [
    { key: 'sparseInterval', type: 'number', min: 2, max: 20, step: 1 },
    { key: 'sparseRegionStart', type: 'number', min: 1, max: local.N, step: 1 },
    { key: 'sparseRegionEnd', type: 'number', min: 1, max: local.N, step: 1 },
  ];

  const thinnedFields = [
    { key: 'thinNumObs', type: 'number', min: 1, max: local.N, step: 1 },
  ];

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
            <h3 className="typo-body-md" style={{ fontWeight: 600, color: 'var(--primary)' }}>
              {t('advancedModal.generalSection')}
            </h3>
            {fields.map(f => {
              const label = t(`advancedModal.fields.${f.key}`, f.key);
              return (
                <div className="field-group" key={f.key}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <label className="field-label" style={{ margin: 0 }}>{label}</label>
                    <EduTooltip paramId={f.key} align="left" position="top" />
                  </div>
                  <input
                    className="field-input"
                    type={f.type}
                    min={f.min}
                    max={f.max}
                    step={f.step}
                    value={local[f.key]}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === '') return;
                      const val = Number(raw);
                      if (!Number.isFinite(val)) return;
                      handleChange(f.key, val);
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* Sparse-specific */}
          {obsMode === 'sparse' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h3 className="typo-body-md" style={{ fontWeight: 600, color: 'var(--secondary)' }}>
                {t('advancedModal.sparseSection')}
              </h3>
              {sparseFields.map(f => {
                const label = t(`advancedModal.fields.${f.key}`, f.key);
                return (
                  <div className="field-group" key={f.key}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <label className="field-label" style={{ margin: 0 }}>{label}</label>
                      <EduTooltip paramId={f.key} align="left" position="top" />
                    </div>
                    <input
                      className="field-input"
                      type={f.type}
                      min={f.min}
                      max={f.max}
                      step={f.step}
                      value={f.key.startsWith('sparseRegion') ? local[f.key] + 1 : local[f.key]}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === '') return;
                        const val = Number(raw);
                        if (!Number.isFinite(val)) return;
                        handleChange(f.key, f.key.startsWith('sparseRegion') ? val - 1 : val);
                      }}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* Thinned-specific */}
          {obsMode === 'thinned' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h3 className="typo-body-md" style={{ fontWeight: 600, color: 'var(--secondary)' }}>
                {t('advancedModal.thinnedSection')}
              </h3>
              {thinnedFields.map(f => {
                const label = t(`advancedModal.fields.${f.key}`, f.key);
                return (
                  <div className="field-group" key={f.key}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <label className="field-label" style={{ margin: 0 }}>{label}</label>
                      <EduTooltip paramId={f.key} align="left" position="top" />
                    </div>
                    <input
                      className="field-input"
                      type={f.type}
                      min={f.min}
                      max={f.max}
                      step={f.step}
                      value={local[f.key]}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === '') return;
                        const val = Number(raw);
                        if (!Number.isFinite(val)) return;
                        handleChange(f.key, val);
                      }}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>
            {t('advancedModal.cancel')}
          </button>
          <button className="btn btn-primary" style={{ fontSize: 16, padding: '8px 24px' }} onClick={handleSave}>
            {t('advancedModal.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
