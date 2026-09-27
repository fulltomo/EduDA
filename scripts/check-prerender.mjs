// prerender の出力を検査する。npm run build に組み込んである。
// エスケープ漏れ（本文に λ > 1 や N_eff < Threshold が入る）と、
// canonical / hreflang / noscript の取り違えが一番壊れやすいのでそこを見る。
import { readFileSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';

const SITE = 'https://eduda.pages.dev';
const LANGS = ['ja', 'en'];
const PATHS = ['/'];

const pages = LANGS.flatMap((lang) =>
  PATHS.map((path) => ({
    lang,
    path,
    file: `dist${lang === 'en' ? '/en' : ''}${path}index.html`,
    url: `${SITE}${lang === 'en' ? '/en' : ''}${path}`,
  }))
);

for (const { lang, file, url } of pages) {
  assert.ok(existsSync(file), `${file} が生成されていない`);
  const html = readFileSync(file, 'utf8');
  const where = (msg) => `${file}: ${msg}`;

  // タグを剥がした後に裸の < が残っていたら本文のエスケープ漏れ
  const text = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<\/?[a-zA-Z!][^>]*>/g, '');
  assert.ok(!text.includes('<'), where('本文にエスケープされていない < がある'));

  assert.match(html, new RegExp(`<html lang="${lang}"`), where('html lang が違う'));
  assert.ok(html.includes(`<link rel="canonical" href="${url}" />`), where(`canonical が ${url} でない`));

  // hreflang は ja / en / x-default の 3 本そろっていること
  for (const tag of ['hreflang="ja"', 'hreflang="en"', 'hreflang="x-default"']) {
    assert.ok(html.includes(tag), where(`${tag} が無い`));
  }

  // JSON-LD が壊れていないこと
  for (const [, json] of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    JSON.parse(json);
  }
}

// SPA の index.html には JS なしクローラ向けの本文が入っていること
for (const [file, marker] of [
  ['dist/index.html', 'データ同化アルゴリズム'],
  ['dist/en/index.html', 'data assimilation algorithms'],
]) {
  const html = readFileSync(file, 'utf8');
  const noscript = html.match(/<noscript>([\s\S]*?)<\/noscript>/);
  assert.ok(noscript, `${file}: <noscript> が無い`);
  assert.ok(noscript[1].includes(marker), `${file}: <noscript> の言語が違う`);
  assert.ok(noscript[1].includes('/docs/'), `${file}: <noscript> から解説（GitHub docs）へのリンクが無い`);
}

// sitemap に全 URL が載っていること
const sitemap = readFileSync('dist/sitemap.xml', 'utf8');
assert.equal(
  (sitemap.match(/<loc>/g) || []).length,
  pages.length,
  `sitemap の URL 数が ${pages.length} でない`
);
for (const { url } of pages) {
  assert.ok(sitemap.includes(`<loc>${url}</loc>`), `sitemap に ${url} が無い`);
}

console.log(`check-prerender: OK (${pages.length} pages, sitemap ${pages.length} urls)`);
