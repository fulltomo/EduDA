# EduDA — データ同化シミュレータ

**Lorenz '96 カオスモデル上で 7 種類のデータ同化手法を、同一条件でリアルタイムに比較・可視化できる教育用 Web アプリケーション**

### ▶ [eduda.pages.dev](https://eduda.pages.dev/) — インストール不要、ブラウザだけで動きます

**解説:** [7 手法](docs/ja/methods.md) · [用語・パラメータ集](docs/ja/glossary.md) · [Lorenz '96](docs/ja/lorenz96.md) ／ English: [methods](docs/en/methods.md) · [glossary](docs/en/glossary.md) · [Lorenz '96](docs/en/lorenz96.md)

[![React](https://img.shields.io/badge/React-19.2-61dafb.svg?style=flat-square&logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.2-646cff.svg?style=flat-square&logo=vite)](https://vite.dev/)
[![Rust](https://img.shields.io/badge/Rust-WASM-dea584.svg?style=flat-square&logo=rust)](https://www.rust-lang.org/)
[![Chart.js](https://img.shields.io/badge/Chart.js-4.5-ff6384.svg?style=flat-square&logo=chartdotjs)](https://www.chartjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)

![EduDA のスクリーンショット: 左に手法のパラメータ、中央上に真値と推定の状態、中央下に誤差の時間変化、右に観測の設定と観測点の円環。疎密観測で格子点 1〜20 だけを観測しており、観測のない 21〜40 で推定が真値から外れている](.github/screenshot.jpg)

> 疎密観測（格子点 1〜20 のみ観測）の例。観測のない右半分で推定（水色）が真値（白）から外れていく様子が、状態図と円環で同時に分かります。下の誤差グラフをクリックすると、その時刻の状態が上に表示されます。

---

## 目次

- [これは何か](#これは何か)
- [主な機能](#主な機能)
- [対応アルゴリズムとパラメータ](#対応アルゴリズムとパラメータ)
- [数理モデルと計算仕様](#数理モデルと計算仕様)
- [アーキテクチャ](#アーキテクチャ)
- [開発](#開発)
- [引用](#引用)
- [ライセンス](#ライセンス)

---

## これは何か

**EduDA (Educational Data Assimilation)** は、気象学・海洋学・地球惑星科学や数理科学で不可欠な **データ同化（Data Assimilation）** の挙動を、ブラウザ上で手を動かしながら理解するためのシミュレータです。

データ同化の教科書は数式で手法を説明しますが、「インフレーションを外すと何が起きるのか」「局所化半径を絞るとなぜ精度が上がるのか」は、実際にパラメータを動かして誤差が発散する様子を見るのが一番早い。EduDA はそのための環境です。

標準テストベッドである **Lorenz '96 モデル**（40 変数）を対象に、古典的なカルマンフィルタからアンサンブル手法、変分法、非線形粒子フィルタまで **7 手法を同一の真値・観測条件下で並列実行**し、リアルタイムに比較できます。

<details>
<summary>English</summary>

**EduDA** is an interactive educational web platform for exploring, visualizing and comparing data assimilation algorithms (EKF, POEnKF, EnSRF, LETKF, 3DVar, 4DVar, Particle Filter) on the chaotic Lorenz '96 model. All seven methods run in parallel under identical truth and observation conditions, entirely in the browser — no installation required. Try it at **[eduda.pages.dev](https://eduda.pages.dev/)**.

</details>

---

## 主な機能

**7 手法の同時比較**
EKF / POEnKF / EnSRF / LETKF / 3DVar / 4DVar / 粒子フィルタを、同じ真値・同じ観測から同時に走らせて並べられます。手法ごとにパラメータを個別調整できるため、「同じ手法でパラメータだけ変えた 2 本」を比較する使い方もできます。

**3 つの観測シナリオ**

| モード | 内容 |
| :--- | :--- |
| 全観測 (Full) | 全 40 格子点を毎ステップ観測する基準シナリオ |
| 疎密観測 (Sparse) | 指定した連続領域のみを集中観測。未観測域への誤差共分散の伝播を見る |
| 間引き観測 (Thinned) | 全格子点を空間的に等間隔でサンプリング観測 |

**状態と誤差の連動表示**

- **真値と推定** — ある時刻における全 40 格子点の真値・観測値・各手法の推定値。再生すると時間発展を追えます
- **時空間の誤差（Hovmöller 図）** — 時間×空間平面の推定誤差ヒートマップ。未観測域での誤差の蓄積が見えます
- **誤差の時間変化** — RMSE とスプレッドの推移。クリック・ドラッグで上の図に出す時刻を選ぶタイムラインを兼ね、観測誤差 σo の線と発散の開始点を自動で描きます

**教育用ツールチップ**
ⓘ で各パラメータの意味を一言で示し、数式と推奨値はリンク先の解説（docs/）で確認できます。

**CSV エクスポート**
全ステップの真値・観測値・各手法の解析値・RMSE を一括ダウンロード。Python / MATLAB / R での追加解析やレポート作成に使えます。

---

## 対応アルゴリズムとパラメータ

| 手法 | 概要 | 主要パラメータ | デフォルト | 範囲 |
| :--- | :--- | :--- | :--- | :--- |
| **EKF**<br>拡張カルマンフィルタ | 接線線形モデルで共分散を更新。40×40 の共分散行列を明示的に保持する | `processNoise` ($Q$) | `0.01` | 0.001 〜 0.20 |
| **POEnKF**<br>観測摂動型 EnKF | 観測に摂動を加えた確率的モンテカルロ同化 | `ensembleSize` ($M$)<br>`inflation` ($\lambda$)<br>`localization` ($L$) | `30`<br>`1.05`<br>`5` | 5 〜 200<br>1.00 〜 1.50<br>1 〜 20 |
| **EnSRF**<br>アンサンブル平方根フィルタ | 決定論的な観測更新で、観測ノイズのサンプリング誤差を排除 | 同上 | `30`<br>`1.05`<br>`5` | 同上 |
| **LETKF**<br>局所アンサンブル変換 KF | 格子点ごとの局所空間で低次元変換行列を並列計算。現業気象予報の標準手法 | 同上 | `30`<br>`1.05`<br>`5` | 同上 |
| **3DVar**<br>3 次元変分法 | Gaspari-Cohn 相関に基づく静的背景誤差共分散 $B$ による変分同化 | `bgErrorVar` ($\sigma_b^2$)<br>`corrLength` ($L$) | `0.2`<br>`2` | 0.05 〜 3.0<br>0 〜 10 |
| **4DVar**<br>4 次元変分法 | 同化ウィンドウ内の時系列観測を随伴モデルの勾配で同時最適化 | `bgErrorVar` ($\sigma_b^2$)<br>`corrLength` ($L$)<br>`windowSize` ($W$) | `0.05`<br>`2`<br>`6` | 0.02 〜 2.0<br>0 〜 10<br>1 〜 15 |
| **PF**<br>粒子フィルタ | 非ガウス対応フィルタ。標準 SIR と、空間局所化で重み崩壊を抑える LPF を選べる | `filterType`<br>`ensembleSize` ($M$)<br>`localization` ($L$)<br>`resampleThreshold` | `LPF`<br>`30`<br>`3`<br>`0.5` | LPF / SIR<br>10 〜 200<br>1 〜 10<br>0.1 〜 1.0 |

---

## 数理モデルと計算仕様

### Lorenz '96

Edward Lorenz (1996) による 1 次元大気波動のトイモデルを支配方程式に採用しています。

$$\frac{dx_j}{dt} = (x_{j+1} - x_{j-2}) x_{j-1} - x_j + F \quad (j = 1, \dots, N)$$

- **格子点数** $N = 40$、**外力項** $F = 8.0$（$F \ge 8$ で強いカオス的挙動）
- **周期境界条件** $x_{-1} = x_{N-1}, \; x_0 = x_N, \; x_{N+1} = x_1$
- **数値積分** 4 次ルンゲ＝クッタ法、$dt = 0.05$（大気時間で約 6 時間に相当）

### スピンアップとバーンイン除外

- **スピンアップ** — 真値は事前に 1,000 ステップ積分し、Lorenz '96 アトラクター上に乗せた状態から開始します。初期値の偏りを排除するためです
- **バーンイン除外** — 同化開始直後の過渡応答（最初の 20% のステップ）を自動的に除外し、定常状態のみで平均性能指標（Avg RMSE / Avg Spread）を算出します

---

## アーキテクチャ

```
UI Layer — React 19 + Chart.js + Canvas 2D
  ├── TopNav             ヘッダー / 言語切替 / CSV 出力 / 詳細設定
  ├── ControlPanel       手法の追加・複製・パラメータ調整
  ├── ObsPanel           観測の方式・範囲・誤差・間隔
  ├── MethodCard         手法ごとのカードとスライダー
  └── VisualizationArea  状態 (1D / Hovmöller) と誤差の時間変化を連動表示

Compute Layer — Web Worker (src/workers/daWorker.js)
  ├── Rust → WebAssembly (crates/eduda_wasm)   ← 主計算経路
  │     l96.rs, math.rs, methods/{ekf,enkf,ensrf,letkf,var3d,var4d,pf}.rs
  └── JavaScript 実装                           ← WASM 読み込み失敗時のフォールバック
```

**計算は Rust/WASM、UI はメインスレッド**
7 手法すべてが Rust で実装され、WebAssembly にコンパイルされています。アンサンブルシミュレーションや随伴モデルの勾配計算はすべて Web Worker 上の WASM で実行されるため、UI の描画や操作性を阻害しません。WASM の読み込みに失敗した場合は、同等の JavaScript 実装に自動でフォールバックします。

**Hovmöller の描画**
Offscreen Canvas の `ImageData` バッファに直接ピクセルを書き込むことで、数千ステップ × 40 格子のヒートマップを滑らかに描画しています。

---

## 開発

### 必要要件

- **Node.js** `^20.19.0 || >=22.12.0`（Vite 8 の要件）
- **npm** v10 以上
- **Rust**（任意）— WASM を再ビルドする場合のみ

### セットアップ

```bash
git clone https://github.com/fulltomo/EduDA.git
cd EduDA
npm install
npm run dev        # http://localhost:5173
```

### スクリプト

| コマンド | 内容 |
| :--- | :--- |
| `npm run dev` | Vite 開発サーバーを起動 |
| `npm run build` | WASM をビルドしてから本番ビルド |
| `npm run preview` | ビルド成果物をローカルで配信 |
| `npm run lint` | Oxlint による静的解析 |

### WASM のビルドについて

ビルド済みの `.wasm` はリポジトリにコミットされているため、**Rust をインストールしていなくても `npm run build` は通ります**（WASM ビルドを自動でスキップします）。

Rust コードを変更して再ビルドする場合は、WASM ターゲットを追加してください。

```bash
rustup target add wasm32-unknown-unknown
npm run build
```

### CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) が `main` への push と Pull Request で `npm run lint` と `npm run build` を実行します。

---

## 引用

研究や教材で利用された場合は、[`CITATION.cff`](CITATION.cff) の情報でご引用ください。GitHub のリポジトリページ右側「Cite this repository」から APA / BibTeX 形式で取得できます。

```
Tomono, Tomoki. EduDA: Educational Data Assimilation Platform with Lorenz '96.
https://github.com/fulltomo/EduDA
```

---

## ライセンス

[MIT License](LICENSE) のもとで公開しています。教育・研究・商用を問わず自由にご利用いただけます。
