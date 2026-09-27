import { useLanguage } from '../context/LanguageContext';
import './AboutSection.css';
import { CONTENT, EQUATION } from '../data/about';
import { DA_METHODS } from '../constants';

// 静的解説ページ（scripts/prerender.mjs が生成）への導線。
// sitemap だけでなく実 DOM からもリンクしておかないとクローラが辿ってくれない。
const DOC_LINKS = {
  ja: { heading: '各手法・用語の解説', methods: 'データ同化の 7 手法', glossary: 'データ同化 用語集', lorenz: "Lorenz '96 モデルとは" },
  en: { heading: 'Reference pages', methods: 'The 7 data assimilation methods', glossary: 'Data assimilation glossary', lorenz: "The Lorenz '96 model" },
};

export default function AboutSection() {
  const { lang } = useLanguage();
  const c = CONTENT[lang] || CONTENT.ja;
  const d = DOC_LINKS[lang] || DOC_LINKS.ja;
  const base = lang === 'en' ? '/en' : '';

  return (
    <footer className="app-about">
      <details className="about-details">
        <summary className="about-summary">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }} aria-hidden="true">info</span>
          {c.summary}
        </summary>

        <div className="about-body custom-scroll">
          <h2>{c.heading}</h2>
          <p>{c.intro}</p>

          <h3>{c.eqHeading}</h3>
          <p className="about-equation typo-data">{EQUATION}</p>
          <p>{c.eqNote}</p>

          <h3>{c.algoHeading}</h3>
          <ul>
            {c.algos.map(([name, desc]) => (
              <li key={name}><strong>{name}</strong>: {desc}</li>
            ))}
          </ul>

          <h3>{c.featHeading}</h3>
          <ul>
            {c.feats.map((f) => <li key={f}>{f}</li>)}
          </ul>

          <h3>{d.heading}</h3>
          <ul>
            <li><a href={`${base}/methods/`}>{d.methods}</a></li>
            {DA_METHODS.map((m) => (
              <li key={m.id}>
                <a href={`${base}/methods/${m.id.toLowerCase()}/`}>
                  {m.id} — {lang === 'en' ? m.fullNameEn : m.fullName}
                </a>
              </li>
            ))}
            <li><a href={`${base}/glossary/`}>{d.glossary}</a></li>
            <li><a href={`${base}/lorenz96/`}>{d.lorenz}</a></li>
          </ul>

          <p>
            <a href="https://github.com/fulltomo/EduDA" target="_blank" rel="noopener noreferrer">
              {c.repo}
            </a>
          </p>
        </div>
      </details>
    </footer>
  );
}
