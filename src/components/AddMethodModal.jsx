import { DA_METHODS } from '../constants';
import { useLanguage } from '../context/LanguageContext';
import './AddMethodModal.css';

export default function AddMethodModal({ onSelect, onClose }) {
  const { lang, t } = useLanguage();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="typo-headline-md">{t('addMethodModal.title')}</h2>
          <button
            className="method-card-menu-btn"
            onClick={onClose}
            aria-label={t('addMethodModal.close')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 24 }}>close</span>
          </button>
        </div>
        <div className="modal-body" style={{ gap: 8 }}>
          {DA_METHODS.map((method) => {
            const fullName = lang === 'en' ? (method.fullNameEn || method.fullName) : method.fullName;
            const summary = lang === 'en' ? (method.summaryEn || method.summary) : method.summary;
            const categoryLabel = t(`addMethodModal.categories.${method.category}`, method.category);

            return (
              <button
                key={method.id}
                className="add-method-option"
                onClick={() => onSelect(method.id)}
                id={`add-method-${method.id}`}
              >
                <div className="add-method-option-left">
                  <div className="add-method-option-header">
                    <span className="add-method-option-id typo-data">{method.label}</span>
                    <span className="add-method-option-name">{fullName}</span>
                    <span className={`category-badge category-${method.category}`}>
                      {categoryLabel}
                    </span>
                  </div>
                  <div className="add-method-option-summary">
                    {summary}
                  </div>
                </div>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--outline)' }}>
                  add_circle
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
