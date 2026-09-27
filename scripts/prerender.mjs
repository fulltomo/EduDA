// vite build の後に走り、dist/ へ静的 HTML を書き出す。
//
//   1. JS を実行しないクローラ（GPTBot / ClaudeBot / PerplexityBot 等）向けに
//      index.html の <body> へ本文を <noscript> で埋め戻す。
//   2. 英語版を ?lang=en ではなく /en/ の実 URL にし、hreflang で対にする。
//
// 手法・用語の解説は GitHub の docs/ に置いている（サイト側には持たない）。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

import { CONTENT, docHref } from '../src/data/about.js';
import { DA_METHODS } from '../src/constants.js';
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

/** JS を実行しないクローラが読む本文。AboutSection と同じ出典を使う。 */
function noscriptBody(lang) {
  const c = CONTENT[lang];
  const li = (h, text) => `<li><a href="${h}">${esc(text)}</a></li>`;

  return `<noscript>
<main style="max-width:820px;margin:40px auto;padding:20px;font-family:sans-serif;line-height:1.8">
<h1>${esc(c.heading)}</h1>
<p>${esc(c.intro)}</p>
<ul>
${DA_METHODS.map((m) => `<li><strong>${esc(m.id)} — ${esc(pick(m, lang, 'fullName'))}</strong>: ${esc(pick(m, lang, 'summary'))}</li>`).join('\n')}
</ul>
<ul>
${c.docs.map(([file, label]) => li(docHref(lang, file), label)).join('\n')}
${li('https://github.com/fulltomo/EduDA', c.repo)}
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
    <priority>1.0</priority>
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
for (const lang of LANGS) {
  write(`${DIST}${href(lang, '/')}index.html`, buildIndex(lang, srcIndex));
}
write(`${DIST}/sitemap.xml`, sitemap(['/']));
console.log(`prerender -> ${LANGS.length} pages + sitemap.xml`);
