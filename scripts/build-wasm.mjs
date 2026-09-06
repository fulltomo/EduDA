// cargo があれば WASM をビルドして public/wasm へ配置する。cargo が無ければ黙ってスキップ。
//
// npm scripts は Windows では cmd.exe で実行されるため、POSIX シェル前提の
// `command -v` / `mkdir -p` / `cp` は使えない（Windows ローカルで npm run build が失敗する）。
// Node の標準ライブラリだけで書き直して、どの OS でも同じ挙動にしている。
import { spawnSync } from 'node:child_process';
import { mkdirSync, copyFileSync } from 'node:fs';

const MANIFEST = 'crates/eduda_wasm/Cargo.toml';
const ARTIFACT = 'crates/eduda_wasm/target/wasm32-unknown-unknown/release/eduda_wasm.wasm';
const DEST_DIR = 'public/wasm';

const TARGET = 'wasm32-unknown-unknown';

// shell: true は Windows で cargo.exe / cargo.bat を PATH から解決するために必要
const probe = spawnSync('cargo', ['--version'], { shell: true, stdio: 'ignore' });
if (probe.status !== 0) {
  console.log('Cargo not found; skipping WASM build');
  process.exit(0);
}

// cargo はあっても wasm ターゲットが未導入なことがある（開発機でよくある）。
// ビルド済みの .wasm はリポジトリにコミットされているのでスキップして問題ない。
// CI はターゲットを明示インストールするため、本物のコンパイルエラーはここを素通りしない。
const targets = spawnSync('rustup', ['target', 'list', '--installed'], { shell: true, encoding: 'utf8' });
if (targets.status === 0 && !targets.stdout.split(/\r?\n/).includes(TARGET)) {
  console.log(`Rust target ${TARGET} not installed; skipping WASM build`);
  console.log(`  (install it with: rustup target add ${TARGET})`);
  process.exit(0);
}

const build = spawnSync(
  'cargo',
  ['build', '--manifest-path', MANIFEST, '--release', '--target', TARGET],
  { shell: true, stdio: 'inherit' },
);
if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

mkdirSync(DEST_DIR, { recursive: true });
copyFileSync(ARTIFACT, `${DEST_DIR}/eduda_wasm.wasm`);
console.log(`WASM -> ${DEST_DIR}/eduda_wasm.wasm`);
