# EduDA - データ同化学習・シミュレーションプラットフォーム

<div align="center">

![EduDA Logo](public/favicon.svg)

**Lorenz '96 カオス力学系を用いたデータ同化（Data Assimilation: DA）の概念・挙動・手法比較をインタラクティブに学べる教育用 Web アプリケーション**

[![React](https://img.shields.io/badge/React-19.0-61dafb.svg?style=flat-square&logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646cff.svg?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Chart.js](https://img.shields.io/badge/Chart.js-4.4-ff6384.svg?style=flat-square&logo=chartdotjs)](https://www.chartjs.org/)
[![Oxlint](https://img.shields.io/badge/Linter-Oxlint-cyan.svg?style=flat-square)](https://oxc.rs/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)

</div>

---

## 📖 概要

**EduDA (Educational Data Assimilation)** は、気象学・海洋学・地球惑星科学や数理科学分野で不可欠な**データ同化（Data Assimilation）**の基礎理論とアルゴリズムの挙動を、Web ブラウザ上で直感的に比較・学習できるシミュレーションプラットフォームです。

カオス的挙動を示す標準テストベッド **Lorenz '96 モデル**（40変数系）を対象とし、古典的なカルマンフィルタから最新のアンサンブル手法、変分法、非線形粒子フィルタまで、全7種類の手法を同一の真値・観測シナリオ下で並列シミュレーション・リアルタイム比較できます。

---

## 🌟 主な特徴 & 機能

### 1. 豊富な7種類のデータ同化アルゴリズム
- **EKF (拡張カルマンフィルタ)**: 接線線形モデルを用いた線形化カルマンフィルタ（プロセスノイズ $Q$）。
- **POEnKF (確率的アンサンブルカルマンフィルタ / 観測摂動型)**: 観測摂動を加えたモンテカルロ・アンサンブル手法。
- **EnSRF (アンサンブル平方根フィルタ)**: 決定論的観測更新により観測ノイズサンプリング誤差を排除する平方根フィルタ。
- **LETKF (局所アンサンブル変換カルマンフィルタ)**: 各格子点の局所空間で低次元アンサンブル変換行列を並列計算する現代の現業気象予報標準手法。
- **3DVar (3次元変分法)**: Gaspari-Cohn 空間相関関数に基づく静的背景誤差共分散行列（$B$ 行列）を用いた変分法。
- **4DVar (4次元変分法)**: 同化ウィンドウ内のタイムスライス観測データを随伴モデル（Adjoint）を用いて同時最適化する4次元変分法。
- **PF (粒子フィルタ / SIR)**: 有効粒子数に基づく SIR (Sequential Importance Resampling) を備えた非ガウス対応粒子フィルタ。

### 2. 3つのフレキシブルな観測シナリオ
- **全観測 (Full)**: 全40格子点を毎ステップ観測する基準シナリオ。
- **疎密観測 (Sparse)**: 特定領域（例: 格子点 0〜19）のみを集中観測し、未観測領域への誤差共分散伝播（背景誤差相関）の効果を検証。
- **間引き観測 (Thinned)**: 全格子点を空間的等間隔（例: 2格子おき）で間引いてサンプリング観測。

### 3. 多角的な3種のリアルタイム可視化モード
- **📈 時系列プロット (RMSE & Spread)**: 同化ステップごとの二乗平均平方根誤差（RMSE）およびアンサンブル分散（Spread）の時間推移。Error-Spread 関係の良否を即座に判定。
- **📉 1D 状態空間プロット (Grid Profile)**: 任意のタイムステップにおける全40格子点の「真値 (Truth)」「観測値 (Obs)」「各手法の解析値 (Analysis)」およびアンサンブル信頼区間（±1σ）を重ね合わせ表示。
- **🗺️ Hovmöller（ホフメラー）ダイヤグラム**: 時間-空間（縦軸: タイムステップ、横軸: 格子点）平面における解析誤差 $|\hat{x} - x_{true}|$ をカスタムカラーマップでヒートマップ描画。カオス波動の伝播と未観測領域における誤差の蓄積・修正を視覚化。

### 4. 🎓 4つの事前設計された「プリセット実験ラボ」
データ同化の重要トピック（インフレーション、局所化、固定共分散 vs 流れ依存共分散、次元の呪い）をワンクリックで再現・比較できる教育ラボ機能を搭載。

### 5. 教育用数式ガイド & ツールチップ (EduTooltip)
各手法のパラメータ（Inflation, Localization Radius, Process Noise $Q$, Background Error Var $\sigma_b^2$, Resample Threshold など）に数式・物理的意義・推奨設定値のガイドを表示。

### 6. CSV データ一括エクスポート
シミュレーション結果（全ステップの真値、観測値、各手法の解析値および RMSE 時系列）を 1 クリックで CSV ダウンロード。Python / MATLAB / R などを用いた外部での詳細解析・課題レポート作成に対応。

---

## 🔬 数理モデル & 計算仕様

### 1. Lorenz '96 力学系モデル
EduDA で採用している支配方程式は、Edward Lorenz (1996) によって提案された 1 次元大気波動のトイモデルです：

$$\frac{dx_j}{dt} = (x_{j+1} - x_{j-2}) x_{j-1} - x_j + F \quad (j = 1, \dots, N)$$

- 周期境界条件: $x_{-1} = x_{N-1}, \; x_0 = x_N, \; x_{N+1} = x_1$
- **$N = 40$**: 格子点数
- **$F = 8.0$**: 外力項（$F \ge 8$ で強いカオス的挙動を示す）
- **数値積分**: 4次ルンゲ＝クッタ法 (Runge-Kutta 4th order), タイムステップ $dt = 0.05$ (大気時間で約6時間に相当)

### 2. スピンアップ & バーンイン自動除外評価
- **モデルスピンアップ**: 真値状態は、初期値の偏りを排除するために事前に **1,000 ステップ** 積分し、Lorenz '96 アトラクター上に乗せた状態からシミュレーションを開始します。
- **バーンイン期間の自動除外**: 同化開始直後の過渡応答（初期誤差が収束するまでの最初の **20% のステップ**）を自動的に除外し、定常状態に達した期間のみで平均性能指標（Avg RMSE / Avg Spread）を算出します。

---

## ⚙️ サポート手法とパラメータ設定

| 手法 | 主要パラメータ | デフォルト値 | 調整可能範囲 | 物理的意味・調整のポイント |
| :--- | :--- | :--- | :--- | :--- |
| **EKF** | `processNoise` ($Q$) | `0.01` | 0.001 〜 0.20 | 予測誤差共分散の加算項。モデル不完全性を補償。 |
| **POEnKF** | `ensembleSize` ($M$)<br>`inflation` ($\lambda$)<br>`localization` ($L$) | `30`<br>`1.05`<br>`5` | 5 〜 200<br>1.00 〜 1.50<br>1 〜 20 | メンバー数、共分散膨張率、Gaspari-Cohn局所化半径。少メンバー時の疑似相関・過信を防ぐ。 |
| **EnSRF** | `ensembleSize` ($M$)<br>`inflation` ($\lambda$)<br>`localization` ($L$) | `30`<br>`1.05`<br>`5` | 5 〜 200<br>1.00 〜 1.50<br>1 〜 20 | 決定論的平方根更新。POEnKF よりサンプリングノイズに強い。 |
| **LETKF** | `ensembleSize` ($M$)<br>`inflation` ($\lambda$)<br>`localization` ($L$) | `30`<br>`1.05`<br>`5` | 5 〜 200<br>1.00 〜 1.50<br>1 〜 20 | 局所空間での並列アンサンブル変換。高次元系に極めて頑健。 |
| **3DVar** | `bgErrorVar` ($\sigma_b^2$)<br>`corrLength` ($L$) | `1.0`<br>`5` | 0.1 〜 5.0<br>1 〜 20 | 静的背景誤差分散と相関長。未観測域への修正は等方的に伝播。 |
| **4DVar** | `bgErrorVar` ($\sigma_b^2$)<br>`windowSize` ($W$) | `1.0`<br>`5` | 0.1 〜 5.0<br>1 〜 15 | 静的背景誤差分散と同化タイムウィンドウ幅。随伴モデル最適化。 |
| **PF** | `ensembleSize` ($M$)<br>`resampleThreshold` | `50`<br>`0.5` | 10 〜 500<br>0.1 〜 1.0 | 粒子数と有効粒子数リサンプリング閾値。高次元では重み崩壊に注意。 |

---

## 🎓 プリセット実験ラボ詳細

画面右上の **「🎓 プリセット実験ラボ」** ドロップダウンから、以下の教育的検証実験を即座に実行できます：

### 実験1: インフレーションの効果 (Filter Divergence)
- **テーマ**: 有限アンサンブルによる共分散過小評価とフィルタ発散の克服
- **比較**: `POEnKF (Inflation 1.00)` vs `POEnKF (Inflation 1.15)`
- **学習内容**: インフレーションがないとアンサンブルが真値から離れて互いに収縮（過信）し、観測を無視して発散（RMSE 2.5以上）。適正なインフレーション（1.15）で Spread が維持され、安定同化（RMSE 約0.35）が実現される過程を観察。

### 実験2: 局所化 (Localization) の効果 (Spurious Correlation)
- **テーマ**: 少アンサンブルサイズにおける遠隔疑似相関の排除
- **比較**: `POEnKF (Localization 5)` vs `POEnKF (Localization 20)`
- **学習内容**: メンバー数 $M=15$ の少アンサンブル時、物理的に無関係な遠隔格子点間で偶然に相関が生じるノイズを、局所化半径を絞ることでカットし精度が劇的に向上することを検証。

### 実験3: 固定共分散（3DVar）vs 流れ依存共分散（LETKF）
- **テーマ**: 疎密観測シナリオにおける未観測領域への修正能力比較
- **比較**: `3DVar (Static B)` vs `LETKF (Flow-dependent P)`
- **学習内容**: 3DVar の固定共分散は未観測領域で静的な距離減衰修正しか行えないのに対し、LETKF はアンサンブルから動的に波の伝播に沿った「流れ依存共分散」を推定し、未観測地点でも高精度に状態を追従できる違いを Hovmöller 図で確認。

### 実験4: 高次元空間での粒子フィルタ (PF) の限界 (Weight Collapse)
- **テーマ**: 次元の呪い（Curse of Dimensionality）と重みの崩壊
- **比較**: `PF (50 particles)` vs `PF (500 particles)`
- **学習内容**: 40変数の高次元空間では、少数の粒子（$M=50$）では尤度が特定の1粒子に集中して崩壊。粒子数を $M=500$ に増やしても高次元空間をサンプリングしきれない粒子フィルタの構造的課題を体感。

---

## 🏗️ システムアーキテクチャ

```
EduDA/
├── UI Layer (React 19 + Chart.js + Canvas 2D)
│   ├── TopNav.jsx            # ヘッダー・プリセット選択・高度設定トリガー
│   ├── ObsTabs.jsx           # 観測モード（全観測 / 疎密 / 間引き）タブ
│   ├── ControlPanel.jsx      # 手法追加・パラメータ調整・実行・CSV出力
│   ├── MethodCard.jsx        # 手法別カード・スライダー・EduTooltip
│   └── VisualizationArea.jsx # 時系列 / 1Dプロット / Hovmöller (Offscreen Canvas)
│
└── Compute Layer (Web Worker: daWorker.js)
    ├── Lorenz '96 Core       # RK4 積分・スピンアップ・観測生成
    └── Assimilation Engines  # EKF, POEnKF, EnSRF, LETKF, 3DVar, 4DVar, PF
```

- **ノンブロッキング並列計算**: 高負荷なアンサンブルシミュレーションや随伴モデル勾配降下法はすべて Web Worker (`daWorker.js`) にオフロードされ、UI の描画や操作性を一切阻害しません。
- **高速 Canvas レンダリング**: Hovmöller ダイヤグラムは Offscreen Canvas の `ImageData` バッファに直接ピクセルカラーを書き込むことで、数千ステップ×40格子のヒートマップを 60fps で滑らかに描画します。

---

## 🚀 開発 & 実行手順

### 必要要件
- Node.js (v18.0 以上推奨)
- npm (v9.0 以上)

### セットアップ

```bash
# リポジトリのクローン
git clone https://github.com/fulltomo/EduDA.git
cd EduDA

# 依存パッケージのインストール
npm install

# ローカル開発サーバーの起動 (Vite)
npm run dev
```

ブラウザで `http://localhost:5173` にアクセスしてください。

### コード品質チェック & ビルド

```bash
# 高速コード解析 (Oxlint)
npm run lint

# プロダクションビルド
npm run build

# ビルド成果物のプレビュー
npm run preview
```

---

## 📁 ディレクトリ構造

```
EduDA/
├── .github/
│   └── workflows/
│       └── ci.yml             # GitHub Actions CI ワークフロー
├── public/
│   ├── favicon.svg            # アプリケーション SVG ファビコン
│   └── icons.svg              # 共通 SVG アイコンシンボル
├── src/
│   ├── assets/                # 画像・静的アセット
│   ├── components/            # React UI コンポーネント
│   │   ├── AddMethodModal.jsx # 手法追加モーダル
│   │   ├── AdvancedModal.jsx  # 共通モデル・観測高度設定モーダル
│   │   ├── ControlPanel.jsx   # 同化実行・手法管理パネル
│   │   ├── EduTooltip.jsx     # 教育用数式・物理意味ツールチップ
│   │   ├── MethodCard.jsx     # 手法別パラメータ設定カード
│   │   ├── ObsTabs.jsx        # 観測モード切り替えタブ
│   │   ├── TopNav.jsx         # ナビゲーションバー & プリセットラボ
│   │   └── VisualizationArea.jsx # 時系列・1D・Hovmöller 可視化
│   ├── workers/
│   │   └── daWorker.js        # L96 積分 & 7種同化アルゴリズム Web Worker
│   ├── constants.js           # 手法定義・プリセット・カラーパレット定数
│   ├── App.jsx                # メインアプリケーション
│   ├── main.jsx               # React エントリーポイント
│   └── index.css              # グローバル CSS & デザインシステム
├── index.html                 # HTML テンプレート & ファビコン設定
├── package.json               # プロジェクト定義
└── vite.config.js             # Vite 設定ファイル
```

---

## ⚙️ CI (Continuous Integration)

GitHub Actions パイプライン ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) により、`main` / `master` への Push および Pull Request 作成時に自動で以下が検証されます：

1. **環境セットアップ & キャッシュ**: Node.js 20 上で `npm ci`
2. **高速静的解析**: `npm run lint` (Oxlint)
3. **プロダクションビルド検証**: `npm run build` (Vite)

---

## 📜 ライセンス

本プロジェクトは [MIT License](LICENSE) のもとで公開されています。教育目的・研究目的・商用目的を問わず自由にご利用いただけます。
