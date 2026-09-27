# データ同化の 7 手法

[データ同化の 7 手法](methods.md) · [用語・パラメータ集](glossary.md) · [Lorenz '96 モデル](lorenz96.md) · [シミュレータを開く](https://eduda.pages.dev/)

<a id="ekf"></a>
## EKF — 拡張カルマンフィルタ

線形近似により共分散を陽に更新する基本手法。高次元では計算コストが急増する。

接線線形モデルとプロセスノイズ Q による線形化カルマンフィルタ。40×40 の共分散行列を明示的に保持・更新する。

**パラメータ**

- [プロセスノイズ (Q)](glossary.md#processNoise) — 範囲: 0.001 – 0.2（default 0.01）

<a id="poenkf"></a>
## POEnKF — 確率的アンサンブルカルマンフィルタ (観測摂動型)

観測値にランダムな摂動を加える確率的手法。流れ依存の背景誤差共分散を効率的に表現。

観測に摂動を加えた確率的モンテカルロ同化。

**パラメータ**

- [アンサンブルサイズ (M)](glossary.md#ensembleSize) — 範囲: 5 – 200（default 30）
- [インフレーション (λ)](glossary.md#inflation) — 範囲: 1 – 1.5（default 1.05）
- [局所化半径 (L)](glossary.md#localization) — 範囲: 1 – 20（default 5）

<a id="ensrf"></a>
## EnSRF — アンサンブル平方根フィルタ

観測摂動を伴わない決定論的手法。摂動によるサンプリング誤差を回避。

決定論的な観測更新により、観測ノイズのサンプリング誤差を排除する。

**パラメータ**

- [アンサンブルサイズ (M)](glossary.md#ensembleSize) — 範囲: 5 – 200（default 30）
- [インフレーション (λ)](glossary.md#inflation) — 範囲: 1 – 1.5（default 1.05）
- [局所化半径 (L)](glossary.md#localization) — 範囲: 1 – 20（default 5）

<a id="letkf"></a>
## LETKF — 局所アンサンブル変換カルマンフィルタ

局所化と流れ依存共分散を両立した現業気象予報の標準手法。

格子点ごとの局所空間で低次元の変換行列を並列計算する、現代の現業気象予報における標準手法。

**パラメータ**

- [アンサンブルサイズ (M)](glossary.md#ensembleSize) — 範囲: 5 – 200（default 30）
- [インフレーション (λ)](glossary.md#inflation) — 範囲: 1 – 1.5（default 1.05）
- [局所化半径 (L)](glossary.md#localization) — 範囲: 1 – 20（default 5）

<a id="3dvar"></a>
## 3DVar — 3次元変分法

時間変化しない固定共分散行列を用いる。計算が軽いが流れ依存性は表現できない。

Gaspari-Cohn 相関関数に基づく静的な背景誤差共分散行列 (B) による変分同化。

**パラメータ**

- [背景誤差分散 (σb²)](glossary.md#bgErrorVar) — 範囲: 0.05 – 3（default 0.2）
- [相関距離 (L)](glossary.md#corrLength) — 範囲: 0 – 10（default 2）

<a id="4dvar"></a>
## 4DVar — 4次元変分法 (L-BFGS)

同化ウィンドウ内の時系列観測を時間一貫性を保ちL-BFGS準ニュートン法で最適化。

同化ウィンドウ内の時系列観測を、随伴モデル (Adjoint) の勾配を用いて同時に最適化する。

**パラメータ**

- [背景誤差分散 (σb²)](glossary.md#bgErrorVar) — 範囲: 0.02 – 2（default 0.05）
- [相関距離 (L)](glossary.md#corrLength) — 範囲: 0 – 10（default 2）
- [同化ウィンドウ (W)](glossary.md#windowSize) — 範囲: 1 – 15（default 6）

<a id="pf"></a>
## PF — 粒子フィルタ

非線形・非ガウス分布を表現可能。標準SIR型と、高次元の次元の呪いを克服する局所型(LPF)を選択可能。

有効粒子数に基づく再サンプリングを備えた、非ガウス分布に対応するフィルタ。

**パラメータ**

- [アルゴリズム方式](glossary.md#filterType) — 範囲: 局所粒子フィルタ (LPF: 推奨) / 標準SIR (次元の呪いあり)
- [粒子数 (M)](glossary.md#ensembleSize) — 範囲: 10 – 200（default 30）
- [局所化半径 (L: LPF用)](glossary.md#localization) — 範囲: 1 – 10（default 3）
- [リサンプリング閾値比率 (Neff/M)](glossary.md#resampleThreshold) — 範囲: 0.1 – 1（default 0.5）
