// prerender の出力を検査する。npm run build の後に実行する想定。
// エスケープ漏れ（本文に λ > 1 や N_eff < Threshold が入る）と、
// canonical / hreflang / noscript の取り違えが一番壊れやすいのでそこを見る。
import { readFileSync, globSync } from 'node:fs';

import assert from 'node:assert/strict';

const files = globSync('dist/**/index.html').map((f) => f.replace(/\\/g, '/'));
assert.equal(files.length, 22, `期待 22 ページ、実際 ${files.length}`);

for (const file of files) {
  const html = readFileSync(file, 'utf8');
  const where = (msg) => `${file}: ${msg}`;

  // タグを剥がした後に裸の < が残っていたら本文のエスケープ漏れ
  const text = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<\/?[a-zA-Z!][^>]*>/g, '');
  assert.ok(!text.includes('<'), where('本文にエスケープされていない < がある'));

  // 言語と URL の対応
  const isEn = file.startsWith('dist/en/');
  const path = `/${file.slice(isEn ? 'dist/en/'.length : 'dist/'.length).replace(/index\.html$/, '')}`;
  const expected = `https://eduda.pages.dev${isEn ? '/en' : ''}${path}`;

  assert.match(html, new RegExp(`<html lang="${isEn ? 'en' : 'ja'}"`), where('html lang が違う'));
  assert.ok(html.includes(`<link rel="canonical" href="${expected}" />`), where(`canonical が ${expected} でない`));

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
  assert.ok(noscript[1].includes('/methods/'), `${file}: <noscript> から解説ページへのリンクが無い`);
}

// sitemap に全 URL が載っていること
const sitemap = readFileSync('dist/sitemap.xml', 'utf8');
assert.equal((sitemap.match(/<loc>/g) || []).length, 22, 'sitemap の URL 数が 22 でない');
for (const file of files) {
  const isEn = file.startsWith('dist/en/');
  const path = `/${file.slice(isEn ? 'dist/en/'.length : 'dist/'.length).replace(/index\.html$/, '')}`;
  const loc = `<loc>https://eduda.pages.dev${isEn ? '/en' : ''}${path}</loc>`;
  assert.ok(sitemap.includes(loc), `sitemap に ${loc} が無い`);
}

console.log(`check-prerender: OK (${files.length} pages, sitemap 22 urls)`);
