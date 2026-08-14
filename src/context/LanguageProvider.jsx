import { useState, useEffect, useCallback } from 'react';
import { TRANSLATIONS } from '../i18n/translations';
import { LanguageContext } from './LanguageContext';

function detectInitialLanguage() {
  if (typeof window === 'undefined') return 'ja';

  // 1. Check URL search param (?lang=en or ?lang=ja)
  const params = new URLSearchParams(window.location.search);
  const langParam = params.get('lang');
  if (langParam && (langParam === 'en' || langParam === 'ja')) {
    return langParam;
  }

  // 2. Check localStorage
  try {
    const saved = localStorage.getItem('eduda_lang');
    if (saved && (saved === 'en' || saved === 'ja')) {
      return saved;
    }
  } catch {
    // Storage access blocked; fall through to browser language.
  }

  // 3. Check browser language (default to 'ja' if Japanese, else 'en')
  if (navigator.language && !navigator.language.toLowerCase().startsWith('ja')) {
    return 'en';
  }

  return 'ja';
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(detectInitialLanguage);

  const setLang = useCallback((newLang) => {
    if (newLang !== 'ja' && newLang !== 'en') return;
    setLangState(newLang);
    try {
      localStorage.setItem('eduda_lang', newLang);
      document.documentElement.lang = newLang;

      // Update URL param without refreshing
      const url = new URL(window.location.href);
      if (newLang === 'en') {
        url.searchParams.set('lang', 'en');
      } else {
        url.searchParams.delete('lang');
      }
      const newSearch = url.searchParams.toString();
      const newUrl = url.pathname + (newSearch ? `?${newSearch}` : '');
      window.history.replaceState(null, '', newUrl);
    } catch {
      // Ignore storage/history exceptions
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // Nested translation helper t('controlPanel.addMethod')
  const t = useCallback((path, fallback = '') => {
    const keys = path.split('.');
    let current = TRANSLATIONS[lang];
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        // Fallback to Japanese or fallback string
        let jaCurrent = TRANSLATIONS.ja;
        for (const k of keys) {
          if (jaCurrent && typeof jaCurrent === 'object' && k in jaCurrent) {
            jaCurrent = jaCurrent[k];
          } else {
            return fallback || path;
          }
        }
        return jaCurrent || fallback || path;
      }
    }
    return current || fallback || path;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}
