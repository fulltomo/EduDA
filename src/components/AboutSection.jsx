import { useLanguage } from '../context/LanguageContext';
import './AboutSection.css';
import { CONTENT, docHref } from '../data/about';

export default function AboutSection() {
  const { lang } = useLanguage();
  const c = CONTENT[lang] || CONTENT.ja;
  const ext = { target: '_blank', rel: 'noopener noreferrer' };

  return (
    <footer className="app-about">
      <details className="about-details">
        <summary className="about-summary">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }} aria-hidden="true">info</span>
          {c.summary}
        </summary>

        <div className="about-body">
          <p>{c.intro}</p>
          <ul className="about-links">
            {c.docs.map(([file, label]) => (
              <li key={file}><a href={docHref(lang, file)} {...ext}>{label}</a></li>
            ))}
            <li><a href="https://github.com/fulltomo/EduDA" {...ext}>{c.repo}</a></li>
          </ul>
        </div>
      </details>
    </footer>
  );
}
