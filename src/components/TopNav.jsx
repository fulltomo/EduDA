import { useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import './TopNav.css';

export default function TopNav({ onOpenAdvanced, onCsvExport, hasResults, isRunning }) {
  const { lang, setLang, t } = useLanguage();

  const toggleLanguage = useCallback(() => {
    setLang(lang === 'ja' ? 'en' : 'ja');
  }, [lang, setLang]);

  return (
    <nav className="topnav" id="topnav">
      <div className="topnav-left">
        <h1 className="topnav-brand">{t('appName')}</h1>
        <span className="topnav-model-badge">Lorenz &apos;96</span>
        {isRunning && (
          <span className="spinner topnav-spinner" role="status" aria-label={t('controlPanel.calculating')} />
        )}
      </div>
      <div className="topnav-right">
        <button
          className="btn-ghost topnav-btn"
          onClick={onCsvExport}
          disabled={!hasResults}
          id="btn-topnav-csv"
          title={t('csvTooltip')}
          aria-label={t('csvTooltip')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }} aria-hidden="true">download</span>
          <span className="topnav-btn-label">{t('csvBtn')}</span>
        </button>

        <button
          className="btn-ghost topnav-btn"
          onClick={onOpenAdvanced}
          id="btn-advanced-settings"
          title={t('advancedSettingsBtn')}
          aria-label={t('advancedSettingsBtn')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }} aria-hidden="true">settings</span>
          <span className="topnav-btn-label">{t('advancedSettingsBtn')}</span>
        </button>

        <button
          className="btn-ghost topnav-btn"
          onClick={toggleLanguage}
          id="btn-lang-toggle"
          title={lang === 'ja' ? 'Switch to English' : '日本語に切り替え'}
          aria-label={lang === 'ja' ? 'Switch to English' : '日本語に切り替え'}
        >
          <span className="topnav-btn-label">{lang === 'ja' ? 'EN' : 'JA'}</span>
        </button>
      </div>
    </nav>
  );
}
