import { useState, useEffect, useCallback } from 'react';
import { TRANSLATIONS } from '../i18n/translations';
import { LanguageContext } from './LanguageContext';

/** /en, /en/ 配下は英語。言語ごとに別 URL を持たせて hreflang で対にしている。 */
const EN_PATH = /^\/en(\/|$)/;

function detectInitialLanguage() {
  if (typeof window === 'undefined') return 'ja';

  // 1. Check the path prefix (/en/ serves the English document)
  if (EN_PATH.test(window.location.pathname)) return 'en';

  // 2. Check URL search param (?lang=en or ?lang=ja) — legacy links
  const params = new URLSearchParams(window.location.search);
  const langParam = params.get('lang');
  if (langParam && (langParam === 'en' || langParam === 'ja')) {
    return langParam;
  }

  // 3. Check localStorage
  try {
    const saved = localStorage.getItem('eduda_lang');
    if (saved && (saved === 'en' || saved === 'ja')) {
      return saved;
    }
  } catch {
    // Storage access blocked; fall through to browser language.
  }

  // 4. Check browser language (default to 'ja' if Japanese, else 'en')
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

      // Move between /... and /en/... without refreshing. リロードするとシミュレーション
      // 結果が飛ぶので履歴だけ差し替える。/en/index.html は実ファイルなので
      // 直接アクセスとクロールでは最初から英語の <head> が返る。
      const url = new URL(window.location.href);
      url.searchParams.delete('lang');
      const bare = url.pathname.replace(EN_PATH, '/');
      url.pathname = newLang === 'en' ? (bare === '/' ? '/en/' : `/en${bare}`) : bare;
      const newSearch = url.searchParams.toString();
      const newUrl = url.pathname + (newSearch ? `?${newSearch}` : '');
      window.history.replaceState(null, '', newUrl);
    } catch {
      // Ignore storage/history exceptions
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;

    const meta = TRANSLATIONS[lang];
    if (!meta) return;
    document.title = meta.pageTitle;
    document.querySelector('meta[name="description"]')?.setAttribute('content', meta.pageDescription);
    // 言語を切り替えると URL も /en/ ⇄ / で入れ替わるので canonical も合わせる
    document
      .querySelector('link[rel="canonical"]')
      ?.setAttribute('href', `${window.location.origin}${lang === 'en' ? '/en/' : '/'}`);
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
