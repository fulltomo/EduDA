import { useState, useRef, useEffect, useCallback } from 'react';
import { PRESETS, getLocalizedPreset } from '../constants';
import { useLanguage } from '../context/LanguageContext';
import './TopNav.css';

export default function TopNav({ onSelectPreset, onOpenAdvanced }) {
  const { lang, setLang, t } = useLanguage();
  const [showPresets, setShowPresets] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowPresets(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleShare = useCallback(() => {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard
        .writeText(window.location.href)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(() => {
          // Clipboard write permission denied or unsecure context
        });
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    setLang(lang === 'ja' ? 'en' : 'ja');
  }, [lang, setLang]);

  return (
    <nav className="topnav" id="topnav">
      <div className="topnav-left">
        <span className="topnav-brand">{t('appName')}</span>
        <span className="topnav-subtitle">{t('appSubtitle')}</span>
      </div>
      <div className="topnav-right">
        {/* 🎓 プリセット実験ラボ Dropdown */}
        <div className="preset-dropdown-container" ref={dropdownRef}>
          <button
            className="btn btn-secondary topnav-preset-btn"
            onClick={() => setShowPresets(!showPresets)}
            id="btn-preset-lab"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>school</span>
            <span className="topnav-preset-label">{t('presetLabBtn')}</span>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
              {showPresets ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
            </span>
          </button>

          {showPresets && (
            <div className="preset-dropdown-menu">
              {PRESETS.map((preset) => {
                const locPreset = getLocalizedPreset(preset, lang);
                return (
                  <button
                    key={preset.id}
                    className="preset-dropdown-item"
                    onClick={() => {
                      onSelectPreset(preset);
                      setShowPresets(false);
                    }}
                    id={`preset-item-${preset.id}`}
                  >
                    <span className="preset-item-title">{locPreset.title}</span>
                    <span className="preset-item-theme">{locPreset.theme}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 🌐 言語切り替えボタン */}
        <button
          className="btn-ghost topnav-lang-btn"
          onClick={toggleLanguage}
          id="btn-lang-toggle"
          title={lang === 'ja' ? 'Switch to English' : '日本語に切り替え'}
          aria-label={lang === 'ja' ? 'Switch to English' : '日本語に切り替え'}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>language</span>
          <span className="topnav-lang-label">{t('langToggle')}</span>
        </button>

        {/* 🔗 共有ボタン */}
        <button
          className={`btn-ghost topnav-share-btn ${copied ? 'copied' : ''}`}
          onClick={handleShare}
          id="btn-share-url"
          title={t('shareTooltip')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            {copied ? 'check' : 'share'}
          </span>
          <span className="topnav-share-label">
            {copied ? t('shareCopied') : t('shareBtn')}
          </span>
        </button>

        <button
          className="btn-ghost topnav-settings-btn"
          onClick={onOpenAdvanced}
          id="btn-advanced-settings"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>settings</span>
          <span className="topnav-settings-label">{t('advancedSettingsBtn')}</span>
        </button>
      </div>
    </nav>
  );
}
