// 「EduDA について」の文面。AboutSection.jsx と scripts/prerender.mjs（<noscript>）が読む。
// 詳しい解説は docs/{ja,en}/ に置き、ここは短く保つ。
import { DOCS_URL } from './tooltips.js';

export const CONTENT = {
  ja: {
    summary: 'EduDA について',
    heading: 'EduDA — データ同化シミュレータ',
    intro:
      "カオス力学系 Lorenz '96 の上で 7 つのデータ同化アルゴリズムを動かし、条件を変えて結果を比べられます。計算はすべてブラウザ内で行います。",
    docs: [
      ['methods.md', '7 手法の解説'],
      ['glossary.md', '用語・パラメータ集'],
      ['lorenz96.md', "Lorenz '96 モデル"],
    ],
    repo: 'GitHub（MIT License）',
  },
  en: {
    summary: 'About EduDA',
    heading: 'EduDA — data assimilation simulator',
    intro:
      "Run seven data assimilation algorithms on the chaotic Lorenz '96 model and compare them as you change the conditions. Everything runs in your browser.",
    docs: [
      ['methods.md', 'The 7 methods'],
      ['glossary.md', 'Glossary and parameters'],
      ['lorenz96.md', "The Lorenz '96 model"],
    ],
    repo: 'GitHub (MIT License)',
  },
};

export const docHref = (lang, file) => `${DOCS_URL}/${lang === 'en' ? 'en' : 'ja'}/${file}`;
