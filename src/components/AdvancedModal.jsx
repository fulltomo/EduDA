import { useState } from 'react';

export default function AdvancedModal({ options, obsMode, onUpdate, onClose }) {
  const [local, setLocal] = useState({ ...options });

  const handleChange = (key, value) => {
    setLocal(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onUpdate(local);
    onClose();
  };

  const fields = [
    { key: 'N', label: '変数個数 (N)', type: 'number', min: 4, max: 100, step: 1 },
    { key: 'F', label: '強制項 (F)', type: 'number', min: 1, max: 20, step: 0.5 },
    { key: 'obsErrorVar', label: '観測誤差分散 (σ²)', type: 'number', min: 0.01, max: 10, step: 0.1 },
    { key: 'obsInterval', label: '観測間隔 (Δt_obs)', type: 'number', min: 1, max: 20, step: 1 },
    { key: 'numSteps', label: 'シミュレーションステップ数', type: 'number', min: 50, max: 2000, step: 50 },
    { key: 'dt', label: '積分タイムステップ (dt)', type: 'number', min: 0.005, max: 0.2, step: 0.005 },
  ];

  const sparseFields = [
    { key: 'sparseInterval', label: '疎密観測間隔', type: 'number', min: 2, max: 20, step: 1 },
    { key: 'sparseRegionStart', label: '観測領域開始', type: 'number', min: 0, max: options.N - 1, step: 1 },
    { key: 'sparseRegionEnd', label: '観測領域終了', type: 'number', min: 0, max: options.N - 1, step: 1 },
  ];

  const thinnedFields = [
    { key: 'thinInterval', label: '間引き間隔', type: 'number', min: 2, max: 10, step: 1 },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content custom-scroll" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="typo-headline-md">高度な設定</h2>
          <button
            className="method-card-menu-btn"
            onClick={onClose}
            aria-label="閉じる"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 24 }}>close</span>
          </button>
        </div>
        <div className="modal-body">
          {/* Common fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 className="typo-body-md" style={{ fontWeight: 600, color: 'var(--primary)' }}>
              一般設定
            </h3>
            {fields.map(f => (
              <div className="field-group" key={f.key}>
                <label className="field-label">{f.label}</label>
                <input
                  className="field-input"
                  type={f.type}
                  min={f.min}
                  max={f.max}
                  step={f.step}
                  value={local[f.key]}
                  onChange={(e) => handleChange(f.key, Number(e.target.value))}
                />
              </div>
            ))}
          </div>

          {/* Sparse-specific */}
          {obsMode === 'sparse' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h3 className="typo-body-md" style={{ fontWeight: 600, color: 'var(--secondary)' }}>
                疎密観測設定
              </h3>
              {sparseFields.map(f => (
                <div className="field-group" key={f.key}>
                  <label className="field-label">{f.label}</label>
                  <input
                    className="field-input"
                    type={f.type}
                    min={f.min}
                    max={f.max}
                    step={f.step}
                    value={local[f.key]}
                    onChange={(e) => handleChange(f.key, Number(e.target.value))}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Thinned-specific */}
          {obsMode === 'thinned' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h3 className="typo-body-md" style={{ fontWeight: 600, color: 'var(--secondary)' }}>
                間引き観測設定
              </h3>
              {thinnedFields.map(f => (
                <div className="field-group" key={f.key}>
                  <label className="field-label">{f.label}</label>
                  <input
                    className="field-input"
                    type={f.type}
                    min={f.min}
                    max={f.max}
                    step={f.step}
                    value={local[f.key]}
                    onChange={(e) => handleChange(f.key, Number(e.target.value))}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>キャンセル</button>
          <button className="btn btn-primary" style={{ fontSize: 16, padding: '8px 24px' }} onClick={handleSave}>
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
