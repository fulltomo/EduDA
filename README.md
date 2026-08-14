# EduDA - データ同化学習・シミュレーションプラットフォーム

EduDA は、Lorenz '96 モデルを用いたデータ同化（Data Assimilation: DA）の概念・挙動・手法比較をインタラクティブに学べる教育用 Web アプリケーションです。

拡張カルマンフィルタ (EKF) や各種アンサンブルフィルタ (EnKF, EnSRF, LETKF)、変分法 (3DVar, 4DVar)、粒子フィルタ (PF) を同一条件で簡単にシミュレーションし、同化精度（RMSE）やアンサンブル拡散（Spread）の時間変化をリアルタイムで比較・検証できます。

---

## 🌟 主な特徴

- **7種類の豊富なデータ同化手法に対応**
  - **EKF**（拡張カルマンフィルタ）: 線形化に基づくカルマンフィルタ（プロセスノイズ $Q$）
  - **EnKF**（確率的アンサンブルカルマンフィルタ）: 観測摂動付きアンサンブル手法
  - **EnSRF**（アンサンブル平方根フィルタ）: 決定論的観測更新を行う非摂動アンサンブル手法
  - **LETKF**（局所アンサンブル変換カルマンフィルタ）: 各格子点の局所空間で並列変換行列を計算するアンサンブル手法
  - **3DVar**（3次元変分法）: Gaspari-Cohn 相関関数による静的 $B$ 行列を用いた変分法
  - **4DVar**（4次元変分法）: 同化ウィンドウ内のタイムスライス観測に基づく随伴モデル最適化
  - **PF**（粒子フィルタ）: SIRリサンプリングを備えた非ガウス対応粒子フィルタ

- **フレキシブルな観測実験モード**
  - **全観測 (Full)**: 全格子点を毎ステップ観測
  - **疎密観測 (Sparse)**: 観測領域や空間間隔を任意に設定
  - **間引き観測 (Thinned)**: 観測頻度（時間間隔）を間引いた実験

- **モデルスピンアップ & バーンイン評価**
  - 真値状態は Lorenz '96 アトラクター上に事前にスピンアップ（1,000ステップ積分）済み。
  - 平均性能指標（Avg RMSE / Avg Spread）の算出では、同化開始直後の過渡状態（バーンイン期間：最初の 20% のステップ）を自動除外して評価。

- **Web Worker による高速バックグラウンド計算**
  - 数値計算をバックグラウンドスレッド (`daWorker.js`) で実行し、UI の応答性を確保。

- **時系列可視化 & CSV エクスポート**
  - Chart.js による RMSE（実線）および Spread（破線）の時間変化プロット。
  - シミュレーション結果（真値、観測値、解析値、RMSE）の CSV 一括ダウンロード。

---

## ⚙️ 設定・パラメータ

### 手法別パラメータ
- **EKF**: Process Noise ($Q$)
- **EnKF / EnSRF / LETKF**: Ensemble Size ($M$), Covariance Inflation, Localization Radius ($L$)
- **3DVar**: Background Error Variance ($\sigma_b^2$), Correlation Length ($L$)
- **4DVar**: Background Error Variance ($\sigma_b^2$), Assimilation Window Size
- **PF**: Particle Size ($M$), Resample Threshold

### 高度な設定 (共通モデル・観測条件)
- **格子点数 ($N$)**: デフォルト 40
- **強制項 ($F$)**: デフォルト 8.0 (カオス的挙動)
- **観測誤差分散 ($\sigma^2$)**: デフォルト 1.0
- **観測間隔 ($\Delta t_{obs}$)**: デフォルト 1ステップ
- **シミュレーションステップ数**: デフォルト 500
- **積分タイムステップ ($dt$)**: デフォルト 0.05

---

## 🚀 開発・実行方法

### 必要環境
- Node.js (v18 以上推奨)
- npm

### セットアップ & 起動

```bash
# 依存パッケージのインストール
npm install

# 開発サーバーの起動
npm run dev

# コードチェック (oxlint)
npm run lint

# プロダクション用ビルド
npm run build
```

---

## 📁 ディレクトリ構造

```
EduDA/
├── .github/
│   └── workflows/
│       └── ci.yml        # GitHub Actions CI ワークフロー
├── src/
│   ├── components/       # React コンポーネント (ControlPanel, VisualizationArea, AdvancedModal など)
│   ├── workers/          # Web Worker (daWorker.js: L96積分・各種同化アルゴリズム計算)
│   ├── constants.js      # DA手法・初期設定定数
│   ├── App.jsx           # メインアプリケーション
│   └── index.css         # スタイル定義 (Design System)
├── public/
├── package.json
└── vite.config.js
```

---

## ⚙️ CI (Continuous Integration)

GitHub Actions を用いた CI パイプライン ([`.github/workflows/ci.yml`](file:///.github/workflows/ci.yml)) を備えており、`main` / `master` ブランチへの Push および Pull Request 作成時に自動で以下を実行します：
1. 依存パッケージのキャッシュ＆インストール (`npm ci`)
2. Oxlint による高速コード解析 (`npm run lint`)
3. Vite によるプロダクションビルド検証 (`npm run build`)

---

## 📜 ライセンス

MIT License
