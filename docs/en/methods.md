# The 7 data assimilation methods

[The 7 data assimilation methods](methods.md) · [Glossary and parameters](glossary.md) · [The Lorenz '96 model](lorenz96.md) · [Open the simulator](https://eduda.pages.dev/en/)

<a id="ekf"></a>
## EKF — Extended Kalman Filter

Explicitly updates covariance via tangent linear approximation. High computational cost in large systems.

Linearized tangent-linear covariance update with model process noise Q.

**Parameters**

- [Process Noise (Q)](glossary.md#processNoise) — Range: 0.001 – 0.2（default 0.01）

<a id="poenkf"></a>
## POEnKF — Perturbed Observation EnKF

Monte Carlo ensemble with perturbed observations. Efficiently captures flow-dependent error covariance.

Monte Carlo ensemble sampling with perturbed synthetic observations.

**Parameters**

- [Ensemble Size (M)](glossary.md#ensembleSize) — Range: 5 – 200（default 30）
- [Inflation (λ)](glossary.md#inflation) — Range: 1 – 1.5（default 1.05）
- [Localization Radius (L)](glossary.md#localization) — Range: 1 – 20（default 5）

<a id="ensrf"></a>
## EnSRF — Ensemble Square Root Filter

Deterministic square root update without observation perturbations, eliminating noise sampling errors.

Deterministic square root mean and perturbation update avoiding observation noise sampling error.

**Parameters**

- [Ensemble Size (M)](glossary.md#ensembleSize) — Range: 5 – 200（default 30）
- [Inflation (λ)](glossary.md#inflation) — Range: 1 – 1.5（default 1.05）
- [Localization Radius (L)](glossary.md#localization) — Range: 1 – 20（default 5）

<a id="letkf"></a>
## LETKF — Local Ensemble Transform Kalman Filter

State-of-the-art operational weather forecasting method combining local parallel transforms and flow-dependent covariance.

Parallel local grid-space low-dimensional ensemble transforms.

**Parameters**

- [Ensemble Size (M)](glossary.md#ensembleSize) — Range: 5 – 200（default 30）
- [Inflation (λ)](glossary.md#inflation) — Range: 1 – 1.5（default 1.05）
- [Localization Radius (L)](glossary.md#localization) — Range: 1 – 20（default 5）

<a id="3dvar"></a>
## 3DVar — 3D Variational Data Assimilation

Uses a static, time-invariant background error covariance matrix (B). Computationally light but lacks flow dependency.

Static Gaspari-Cohn background error covariance matrix (B).

**Parameters**

- [Background Error Var (σb²)](glossary.md#bgErrorVar) — Range: 0.05 – 3（default 0.2）
- [Correlation Length (L)](glossary.md#corrLength) — Range: 0 – 10（default 2）

<a id="4dvar"></a>
## 4DVar — 4D Variational Data Assimilation (L-BFGS)

Optimizes initial states across a time window with dynamical consistency using L-BFGS quasi-Newton adjoint gradient optimization.

Adjoint model gradient optimization over a time assimilation window.

**Parameters**

- [Background Error Var (σb²)](glossary.md#bgErrorVar) — Range: 0.02 – 2（default 0.05）
- [Correlation Length (L)](glossary.md#corrLength) — Range: 0 – 10（default 2）
- [Assimilation Window (W)](glossary.md#windowSize) — Range: 1 – 15（default 6）

<a id="pf"></a>
## PF — Particle Filter (SIR / LPF)

Represents fully nonlinear and non-Gaussian distributions. Supports standard SIR and Local Particle Filter (LPF).

Sequential Importance Resampling for non-Gaussian distributions.

**Parameters**

- [Algorithm Type](glossary.md#filterType) — Range: Local Particle Filter (LPF) / Standard SIR Bootstrap
- [Particle Size (M)](glossary.md#ensembleSize) — Range: 10 – 200（default 30）
- [Localization Radius (LPF)](glossary.md#localization) — Range: 1 – 10（default 3）
- [Resample Threshold Ratio](glossary.md#resampleThreshold) — Range: 0.1 – 1（default 0.5）
