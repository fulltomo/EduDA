// vite build の後に走り、dist/ へ静的 HTML を書き出す。
//
// 目的は 3 つ:
//   1. JS を実行しないクローラ（GPTBot / ClaudeBot / PerplexityBot 等）向けに
//      index.html の <body> へ本文を <noscript> で埋め戻す。
//   2. 手法・用語・Lorenz '96 の解説を独立した URL の静的ページとして出す。
//      SPA のままだとインデックス対象の URL が / の 1 本しかなく、
//      ロングテール（「LETKF とは」「フィルタ発散」等）を拾う先が無い。
//   3. 英語版を ?lang=en ではなく /en/ 配下の実 URL にし、hreflang で対にする。
//
// 本文はすべて src/ 配下のデータモジュールが出典。ここには文面を持たない
// （Lorenz '96 解説ページの地の文だけは他に置き場が無いのでここに書いている）。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

import { CONTENT, EQUATION } from '../src/data/about.js';
import { DA_METHODS } from '../src/constants.js';
import { TOOLTIP_DATA } from '../src/data/tooltips.js';
import { TRANSLATIONS } from '../src/i18n/translations.js';

const SITE = 'https://eduda.pages.dev';
const DIST = 'dist';
const LANGS = ['ja', 'en'];

const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** 言語を含まない論理パス（'/', '/methods/letkf/'）から実パス・実 URL を作る */
const href = (lang, path) => `${lang === 'en' ? '/en' : ''}${path}`;
const abs = (lang, path) => `${SITE}${href(lang, path)}`;

/** 置換できなかったら落とす。index.html が変わったときに黙って壊れないように。 */
function mustReplace(html, pattern, replacement, label) {
  if (!pattern.test(html)) {
    throw new Error(`prerender: ${label} にマッチしませんでした（index.html の構造が変わった？）`);
  }
  return html.replace(pattern, replacement);
}

function write(path, contents) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
}

const pick = (obj, lang, key) => (lang === 'en' ? obj[`${key}En`] || obj[key] : obj[key]);

// --- 静的ページの UI 文言 -------------------------------------------------

const UI = {
  ja: {
    home: 'EduDA',
    runApp: 'ブラウザでシミュレータを開く',
    overview: '概要',
    params: 'パラメータ',
    range: '範囲',
    guideline: '目安',
    otherMethods: '他の手法',
    methodsIndex: "データ同化の 7 手法",
    glossary: 'データ同化 用語集',
    lorenz: "Lorenz '96 モデル",
    switchLang: 'English',
    footer: 'EduDA — データ同化シミュレータ（MIT License）',
    runThis: (id) => `${id} をブラウザで実行する`,
  },
  en: {
    home: 'EduDA',
    runApp: 'Open the simulator in your browser',
    overview: 'Overview',
    params: 'Parameters',
    range: 'Range',
    guideline: 'Guideline',
    otherMethods: 'Other methods',
    methodsIndex: 'The 7 data assimilation methods',
    glossary: 'Data assimilation glossary',
    lorenz: "Lorenz '96 model",
    switchLang: '日本語',
    footer: 'EduDA — Data Assimilation Simulator (MIT License)',
    runThis: (id) => `Run ${id} in your browser`,
  },
};

const STYLE = `
:root{color-scheme:light;--bg:#ffffff;--fg:#10222e;--muted:#445763;--card:#eaeef1;--line:#d5dde3;--link:#1c4a63}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font-family:"BIZ UDPGothic","Hiragino Sans","Noto Sans JP",sans-serif;line-height:1.8}
main,header,footer{max-width:820px;margin:0 auto;padding:0 20px}
header{display:flex;gap:16px;align-items:center;justify-content:space-between;padding-top:20px;font-size:14px;flex-wrap:wrap}
a{color:var(--link)}
h1,h2,h3{font-weight:700}
h1{font-size:1.7rem;line-height:1.4;margin:28px 0 8px}
h2{font-size:1.25rem;margin:36px 0 10px;border-bottom:1px solid var(--line);padding-bottom:6px}
h3{font-size:1.05rem;margin:20px 0 6px}
.lead{color:var(--muted);font-size:1.05rem}
pre{background:var(--card);border:1px solid var(--line);border-radius:5px;padding:12px 14px;overflow-x:auto;font-size:.9rem;white-space:pre-wrap;word-break:break-word}
.cta{display:inline-block;margin:24px 0;padding:12px 20px;background:#f5c542;color:#16303f;border-radius:6px;font-weight:700;text-decoration:none}
.meta{color:var(--muted);font-size:.9rem}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:4px 18px;margin:14px 0}
.card h2{border:0;margin-top:14px}
footer{margin:56px 0 40px;padding-top:20px;border-top:1px solid var(--line);color:var(--muted);font-size:.9rem}
`.trim();

/** 静的ページ 1 枚を組み立てる。path は言語を含まない論理パス。 */
function shell({ lang, path, title, description, body, jsonLd }) {
  const u = UI[lang];
  const other = lang === 'ja' ? 'en' : 'ja';
  const alt = [
    ...LANGS.map((l) => `<link rel="alternate" hreflang="${l}" href="${abs(l, path)}" />`),
    `<link rel="alternate" hreflang="x-default" href="${abs('ja', path)}" />`,
  ].join('\n');

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<meta name="theme-color" content="#16303f" />
<link rel="canonical" href="${abs(lang, path)}" />
${alt}
<meta property="og:type" content="article" />
<meta property="og:url" content="${abs(lang, path)}" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:image" content="${SITE}/og-image.svg" />
<meta property="og:site_name" content="EduDA" />
<meta name="twitter:card" content="summary_large_image" />
<link rel="icon" type="image/x-icon" href="/favicon.ico" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<style>${STYLE}</style>
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>
<header>
<nav><a href="${href(lang, '/')}">${u.home}</a> / <a href="${href(lang, '/methods/')}">${u.methodsIndex}</a> / <a href="${href(lang, '/glossary/')}">${u.glossary}</a> / <a href="${href(lang, '/lorenz96/')}">${u.lorenz}</a></nav>
<a href="${href(other, path)}" hreflang="${other}">${u.switchLang}</a>
</header>
<main>
${body}
<p><a class="cta" href="${href(lang, '/')}">${u.runApp}</a></p>
</main>
<footer>
<p>${u.footer} · <a href="https://github.com/fulltomo/EduDA">GitHub</a></p>
</footer>
</body>
</html>
`;
}

function breadcrumb(lang, path, name) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'EduDA', item: abs(lang, '/') },
      { '@type': 'ListItem', position: 2, name, item: abs(lang, path) },
    ],
  };
}

const methodLinks = (lang, exclude) =>
  DA_METHODS.filter((m) => m.id !== exclude)
    .map(
      (m) =>
        `<li><a href="${href(lang, `/methods/${m.id.toLowerCase()}/`)}">${esc(m.id)} — ${esc(pick(m, lang, 'fullName'))}</a></li>`
    )
    .join('\n');

// --- 手法ページ ----------------------------------------------------------

/** about.js の algos から、その手法の解説行を引く */
function aboutBlurb(lang, id) {
  const hit = CONTENT[lang].algos.find(([name]) => name.startsWith(`${id} `));
  return hit ? hit[1] : '';
}

function paramSection(lang, param) {
  const u = UI[lang];
  const tip = TOOLTIP_DATA[param.key];
  const label = pick(param, lang, 'label');
  if (!tip) return `<div class="card"><h3>${esc(label)}</h3></div>`;

  const range =
    param.type === 'select'
      ? param.options.map((o) => esc(pick(o, lang, 'label'))).join(' / ')
      : `${param.min} – ${param.max}（default ${param.default}）`;

  return `<div class="card">
<h3>${esc(label)}</h3>
<p>${esc(pick(tip, lang, 'description'))}</p>
<pre>${esc(pick(tip, lang, 'formula'))}</pre>
<p class="meta"><strong>${u.range}:</strong> ${range}</p>
<p class="meta"><strong>${u.guideline}:</strong> ${esc(pick(tip, lang, 'guideline'))}</p>
</div>`;
}

function methodPage(lang, method) {
  const u = UI[lang];
  const path = `/methods/${method.id.toLowerCase()}/`;
  const name = pick(method, lang, 'fullName');
  const summary = pick(method, lang, 'summary');
  const title =
    lang === 'en'
      ? `${method.id} (${name}) — data assimilation on Lorenz '96 | EduDA`
      : `${method.id}（${name}）とは — Lorenz '96 で動かすデータ同化 | EduDA`;

  const context =
    lang === 'en'
      ? `EduDA runs ${method.id} on the 40-variable chaotic Lorenz '96 model entirely in your browser and compares it side by side with six other assimilation methods under identical truth and observation conditions.`
      : `EduDA では ${method.id} を 40 変数のカオス力学系 Lorenz '96 上でブラウザ内実行し、同一の真値・観測条件のもとで他の 6 手法と並べて比較できます。`;

  const body = `<h1>${esc(method.id)} — ${esc(name)}</h1>
<p class="lead">${esc(summary)}</p>

<h2>${u.overview}</h2>
<p>${esc(aboutBlurb(lang, method.id))}</p>
<p>${esc(context)}</p>
<p><a href="${href(lang, '/')}">${esc(u.runThis(method.id))}</a></p>

<h2>${u.params}</h2>
${method.params.map((p) => paramSection(lang, p)).join('\n')}

<h2>${u.otherMethods}</h2>
<ul>
${methodLinks(lang, method.id)}
</ul>`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'TechArticle',
        '@id': `${abs(lang, path)}#article`,
        headline: `${method.id} — ${name}`,
        description: summary,
        inLanguage: lang,
        about: { '@type': 'Thing', name },
        isPartOf: { '@id': `${SITE}/#website` },
        author: { '@type': 'Person', name: 'Tomoki Tomono', url: 'https://github.com/fulltomo' },
      },
      breadcrumb(lang, path, method.id),
    ],
  };

  return { path, html: shell({ lang, path, title, description: summary, body, jsonLd }) };
}

function methodsIndexPage(lang) {
  const u = UI[lang];
  const path = '/methods/';
  const title =
    lang === 'en'
      ? "The 7 data assimilation methods compared on Lorenz '96 | EduDA"
      : "データ同化の 7 手法を Lorenz '96 で比較する | EduDA";
  const description =
    lang === 'en'
      ? 'EKF, POEnKF, EnSRF, LETKF, 3DVar, 4DVar and the Particle Filter: what each method does, which parameters it exposes, and how it behaves on a chaotic system.'
      : 'EKF・POEnKF・EnSRF・LETKF・3DVar・4DVar・粒子フィルタの 7 手法について、何をする手法か、どのパラメータを持つか、カオス系でどう振る舞うかを解説します。';

  const body = `<h1>${u.methodsIndex}</h1>
<p class="lead">${esc(description)}</p>
${DA_METHODS.map(
    (m) => `<div class="card">
<h3><a href="${href(lang, `/methods/${m.id.toLowerCase()}/`)}">${esc(m.id)} — ${esc(pick(m, lang, 'fullName'))}</a></h3>
<p>${esc(pick(m, lang, 'summary'))}</p>
</div>`
  ).join('\n')}

<h2>${lang === 'en' ? 'See also' : '関連ページ'}</h2>
<ul>
<li><a href="${href(lang, '/lorenz96/')}">${u.lorenz}</a></li>
<li><a href="${href(lang, '/glossary/')}">${u.glossary}</a></li>
</ul>`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${abs(lang, path)}#page`,
        name: u.methodsIndex,
        description,
        inLanguage: lang,
        isPartOf: { '@id': `${SITE}/#website` },
      },
      breadcrumb(lang, path, u.methodsIndex),
    ],
  };

  return { path, html: shell({ lang, path, title, description, body, jsonLd }) };
}

// --- 用語集 --------------------------------------------------------------

function glossaryPage(lang) {
  const u = UI[lang];
  const path = '/glossary/';
  const terms = Object.entries(TOOLTIP_DATA);
  const title =
    lang === 'en'
      ? 'Data assimilation glossary — inflation, localization, filter divergence | EduDA'
      : 'データ同化 用語集 — インフレーション・局所化・フィルタ発散 | EduDA';
  const description =
    lang === 'en'
      ? `Definitions, formulas and practical tuning guidelines for ${terms.length} data assimilation terms, as used in the EduDA simulator.`
      : `インフレーション、局所化半径、フィルタ発散、スプレッドなど、データ同化の用語 ${terms.length} 件を定義・式・チューニングの目安つきで解説します。`;

  const body = `<h1>${u.glossary}</h1>
<p class="lead">${esc(description)}</p>
${terms
    .map(
      ([key, tip]) => `<div class="card">
<h2 id="${esc(key)}">${esc(pick(tip, lang, 'title'))}</h2>
<p>${esc(pick(tip, lang, 'description'))}</p>
<pre>${esc(pick(tip, lang, 'formula'))}</pre>
<p class="meta"><strong>${u.guideline}:</strong> ${esc(pick(tip, lang, 'guideline'))}</p>
</div>`
    )
    .join('\n')}

<h2>${u.methodsIndex}</h2>
<ul>
${methodLinks(lang, null)}
</ul>`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'DefinedTermSet',
        '@id': `${abs(lang, path)}#glossary`,
        name: u.glossary,
        description,
        inLanguage: lang,
        hasDefinedTerm: terms.map(([key, tip]) => ({
          '@type': 'DefinedTerm',
          '@id': `${abs(lang, path)}#${key}`,
          name: pick(tip, lang, 'title'),
          description: pick(tip, lang, 'description'),
          inDefinedTermSet: `${abs(lang, path)}#glossary`,
        })),
      },
      breadcrumb(lang, path, u.glossary),
    ],
  };

  return { path, html: shell({ lang, path, title, description, body, jsonLd }) };
}

// --- Lorenz '96 ----------------------------------------------------------

// このページの地の文だけは既存のデータモジュールに出典が無いのでここに持つ。
const LORENZ = {
  ja: {
    title: "Lorenz '96 モデルとは — データ同化の標準テストベッド | EduDA",
    description:
      "Lorenz '96 は Edward Lorenz が 1996 年に提案した、周期境界を持つ 40 変数のカオス力学系です。データ同化手法のベンチマークとして定番になった理由と、その挙動を解説します。",
    intro:
      "Lorenz '96 は Edward N. Lorenz が 1996 年の予測可能性ワークショップで提案した力学系です。緯度円に沿って等間隔に並んだ N 個の格子点上の大気を、移流・散逸・一定の外力という最小限の要素だけで表現します。",
    eq: '右辺の二次結合の項が移流に、線形項が散逸に、F が外力に対応します。格子点は周期境界で環状につながっており、添字は N を法として循環します。',
    chaosHeading: 'カオス性と予測可能性',
    chaos:
      "F = 8.0、N = 40 のときこの系はカオス的になり、最大リアプノフ指数はおよそ 1.7（時間単位あたり）、誤差の倍加時間はおよそ 0.42 時間単位です。dt = 0.05 を大気のおよそ 6 時間とみなす慣習に従うと、誤差が倍になるのに約 2 日かかる計算になり、実際の中緯度大気の予測可能性とよく似たスケールになります。これが Lorenz '96 がデータ同化のテストベッドとして定番になった理由です。",
    whyHeading: 'データ同化のテストベッドとして使われる理由',
    why: '実大気の数値予報モデルと同じ性質 — 非線形、カオス的、誤差が指数的に成長する — を持ちながら、状態ベクトルがわずか 40 次元で済むため、EKF のように共分散行列を陽に保持する手法まで含めてノート PC やブラウザ上で走らせられます。アンサンブル数を減らしたときの疑似相関、インフレーションを外したときのフィルタ発散、粒子フィルタにおける次元の呪いといった現象が、そのまま再現されます。',
    eduda:
      'EduDA は N = 40、F = 8.0、4 次ルンゲ＝クッタ法、dt = 0.05 でこの系を積分し、そこに観測誤差を加えた擬似観測を作って 7 種類のデータ同化手法に同時に与えています。',
  },
  en: {
    title: "The Lorenz '96 model — the standard testbed for data assimilation | EduDA",
    description:
      "Lorenz '96 is a 40-variable chaotic system with periodic boundaries, proposed by Edward Lorenz in 1996. Why it became the standard benchmark for data assimilation methods, and how it behaves.",
    intro:
      "Lorenz '96 was introduced by Edward N. Lorenz at a 1996 predictability workshop. It represents the atmosphere on N equally spaced grid points around a latitude circle using only advection, dissipation and a constant forcing.",
    eq: 'The quadratic term on the right-hand side plays the role of advection, the linear term that of dissipation, and F that of external forcing. Grid points form a ring under periodic boundary conditions, so indices wrap modulo N.',
    chaosHeading: 'Chaos and predictability',
    chaos:
      "With F = 8.0 and N = 40 the system is chaotic, with a leading Lyapunov exponent of roughly 1.7 per time unit and an error doubling time of about 0.42 time units. Under the usual convention that dt = 0.05 corresponds to roughly 6 atmospheric hours, errors double in about two days — close to the predictability of the real mid-latitude atmosphere. That correspondence is why Lorenz '96 became the standard data assimilation testbed.",
    whyHeading: 'Why data assimilation research uses it',
    why: 'It shares the properties that make operational forecasting hard — nonlinearity, chaos, exponential error growth — while keeping the state vector at just 40 dimensions, small enough to run methods that carry an explicit covariance matrix (such as the EKF) on a laptop or inside a browser. Spurious correlations under small ensembles, filter divergence without inflation, and the curse of dimensionality in particle filters all reproduce faithfully.',
    eduda:
      "EduDA integrates the system with N = 40, F = 8.0, 4th-order Runge-Kutta and dt = 0.05, then builds synthetic observations with added noise and feeds them to all seven assimilation methods at once.",
  },
};

function lorenzPage(lang) {
  const u = UI[lang];
  const path = '/lorenz96/';
  const c = LORENZ[lang];

  const body = `<h1>${u.lorenz}</h1>
<p class="lead">${esc(c.intro)}</p>

<h2>${esc(CONTENT[lang].eqHeading)}</h2>
<pre>${esc(EQUATION)}</pre>
<p>${esc(c.eq)}</p>
<p>${esc(CONTENT[lang].eqNote)}</p>

<h2>${esc(c.chaosHeading)}</h2>
<p>${esc(c.chaos)}</p>

<h2>${esc(c.whyHeading)}</h2>
<p>${esc(c.why)}</p>
<p>${esc(c.eduda)}</p>

<h2>${u.methodsIndex}</h2>
<ul>
${methodLinks(lang, null)}
</ul>`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'TechArticle',
        '@id': `${abs(lang, path)}#article`,
        headline: u.lorenz,
        description: c.description,
        inLanguage: lang,
        about: { '@type': 'Thing', name: "Lorenz '96 model" },
        isPartOf: { '@id': `${SITE}/#website` },
        author: { '@type': 'Person', name: 'Tomoki Tomono', url: 'https://github.com/fulltomo' },
      },
      breadcrumb(lang, path, u.lorenz),
    ],
  };

  return { path, html: shell({ lang, path, title: c.title, description: c.description, body, jsonLd }) };
}

// --- SPA の index.html ---------------------------------------------------

/** JS を実行しないクローラが読む本文。AboutSection と同じ出典を使う。 */
function noscriptBody(lang) {
  const c = CONTENT[lang];
  const u = UI[lang];
  const slug = (name) => name.split(' ')[0].toLowerCase();

  return `<noscript>
<main style="max-width:820px;margin:40px auto;padding:20px;font-family:sans-serif;line-height:1.8">
<h1>${esc(c.heading)}</h1>
<p>${esc(c.intro)}</p>

<h2>${esc(c.eqHeading)}</h2>
<p>${esc(EQUATION)}</p>
<p>${esc(c.eqNote)} <a href="${href(lang, '/lorenz96/')}">${esc(u.lorenz)}</a></p>

<h2>${esc(c.algoHeading)}</h2>
<ul>
${c.algos
    .map(
      ([n, d]) =>
        `<li><a href="${href(lang, `/methods/${slug(n)}/`)}"><strong>${esc(n)}</strong></a>: ${esc(d)}</li>`
    )
    .join('\n')}
</ul>

<h2>${esc(c.featHeading)}</h2>
<ul>
${c.feats.map((f) => `<li>${esc(f)}</li>`).join('\n')}
</ul>

<ul>
<li><a href="${href(lang, '/methods/')}">${esc(u.methodsIndex)}</a></li>
<li><a href="${href(lang, '/glossary/')}">${esc(u.glossary)}</a></li>
<li><a href="https://github.com/fulltomo/EduDA">${esc(c.repo)}</a></li>
</ul>
</main>
</noscript>`;
}

function buildIndex(lang, src) {
  let html = src;

  if (lang === 'en') {
    const en = TRANSLATIONS.en;

    // 先に URL を /en/ へ寄せる。canonical・og:url・JSON-LD の @id がまとめて直る。
    // og:image のようにファイル名で終わる URL は閉じ引用符が続かないので掛からない。
    html = html.split(`"${SITE}/"`).join(`"${SITE}/en/"`);
    html = html.split(`"${SITE}/#`).join(`"${SITE}/en/#`);

    html = mustReplace(html, /<html lang="ja">/, '<html lang="en">', 'html lang');
    html = mustReplace(html, /<title>[\s\S]*?<\/title>/, `<title>${esc(en.pageTitle)}</title>`, 'title');
    html = mustReplace(
      html,
      /(<meta name="description" content=")[^"]*(")/,
      `$1${esc(en.pageDescription)}$2`,
      'meta description'
    );

    const metas = [
      ['property', 'og:title', en.pageTitle],
      ['property', 'og:description', en.pageDescription],
      ['property', 'og:locale', 'en_US'],
      ['property', 'og:locale:alternate', 'ja_JP'],
      ['name', 'twitter:title', en.pageTitle],
      ['name', 'twitter:description', en.pageDescription],
    ];
    for (const [attr, key, value] of metas) {
      html = mustReplace(
        html,
        new RegExp(`(<meta ${attr}="${key}" content=")[^"]*(")`),
        `$1${esc(value)}$2`,
        `meta ${key}`
      );
    }
  }

  const alt = [
    ...LANGS.map((l) => `  <link rel="alternate" hreflang="${l}" href="${abs(l, '/')}" />`),
    `  <link rel="alternate" hreflang="x-default" href="${abs('ja', '/')}" />`,
  ].join('\n');
  html = mustReplace(html, /(<link rel="canonical"[^>]*>)/, `$1\n${alt}`, 'canonical（hreflang の挿入位置）');
  html = mustReplace(html, /<\/body>/, `${noscriptBody(lang)}\n</body>`, '</body>（noscript の挿入位置）');

  return html;
}

// --- sitemap -------------------------------------------------------------

function sitemap(paths) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = LANGS.flatMap((lang) =>
    paths.map((path) => {
      const alts = [
        ...LANGS.map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${abs(l, path)}" />`),
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${abs('ja', path)}" />`,
      ].join('\n');
      return `  <url>
    <loc>${abs(lang, path)}</loc>
${alts}
    <lastmod>${today}</lastmod>
    <priority>${path === '/' ? '1.0' : '0.8'}</priority>
  </url>`;
    })
  ).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- scripts/prerender.mjs が生成している。手で編集しないこと。 -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`;
}

// --- 実行 ----------------------------------------------------------------

const srcIndex = readFileSync(`${DIST}/index.html`, 'utf8');
const paths = ['/'];

for (const lang of LANGS) {
  const pages = [
    methodsIndexPage(lang),
    ...DA_METHODS.map((m) => methodPage(lang, m)),
    glossaryPage(lang),
    lorenzPage(lang),
  ];
  for (const { path, html } of pages) {
    write(`${DIST}${href(lang, path)}index.html`, html);
    if (lang === 'ja') paths.push(path);
  }
  write(`${DIST}${href(lang, '/')}index.html`, buildIndex(lang, srcIndex));
}

write(`${DIST}/sitemap.xml`, sitemap(paths));
console.log(`prerender -> ${paths.length * LANGS.length} pages + sitemap.xml`);
