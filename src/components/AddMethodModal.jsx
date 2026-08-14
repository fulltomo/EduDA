import { DA_METHODS } from '../constants';
import './AddMethodModal.css';

const CATEGORY_LABELS = {
  kalman: 'カルマン系',
  ensemble: 'アンサンブル',
  variational: '変分法',
  particle: '粒子フィルタ',
};

export default function AddMethodModal({ onSelect, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="typo-headline-md">比較手法を追加</h2>
          <button
            className="method-card-menu-btn"
            onClick={onClose}
            aria-label="閉じる"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 24 }}>close</span>
          </button>
        </div>
        <div className="modal-body" style={{ gap: 8 }}>
          {DA_METHODS.map((method) => (
            <button
              key={method.id}
              className="add-method-option"
              onClick={() => onSelect(method.id)}
              id={`add-method-${method.id}`}
            >
              <div className="add-method-option-left">
                <div className="add-method-option-header">
                  <span className="add-method-option-id typo-data">{method.label}</span>
                  <span className="add-method-option-name">{method.fullName}</span>
                  <span className={`category-badge category-${method.category}`}>
                    {CATEGORY_LABELS[method.category]}
                  </span>
                </div>
                <div className="add-method-option-summary">
                  {method.summary}
                </div>
              </div>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--outline)' }}>
                add_circle
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
