# Glossary and parameters

[The 7 data assimilation methods](methods.md) · [Glossary and parameters](glossary.md) · [The Lorenz '96 model](lorenz96.md) · [Open the simulator](https://eduda.pages.dev/en/)

<a id="inflation"></a>
## Inflation (Covariance Inflation)

In ensemble forecasting, finite ensemble size and model errors cause ensemble spread to be underestimated. This leads the filter to overconfidently ignore observations and undergo filter divergence. Inflation expands ensemble deviations by a factor λ > 1 at each assimilation step to prevent covariance shrinkage.

**Formula**

```
xᵢ ← x̄ + λ(xᵢ - x̄)
(x̄: Ensemble mean, xᵢ: Member state, λ: Inflation factor)
```

**Guideline:** Typically 1.01 – 1.15. Increase when ensemble size is small or model uncertainty is high. Excessive inflation will over-fit observation noise and degrade stability.

<a id="localization"></a>
## Localization Radius (Covariance Localization)

Filters out spurious sample correlations that randomly emerge between physically distant points due to limited ensemble size. Decays error covariance or Kalman gain with distance using functions like Gaspari-Cohn to localize observation increments.

**Formula**

```
B_localized = ρ ∘ B  or  K_localized = ρ ∘ K
(ρ: Distance correlation function, ∘: Schur product, B: Covariance, K: Gain)
```

**Guideline:** Typically 3 – 10 grid points. Smaller ensemble sizes M require tighter localization radii to prevent overfitting to spurious correlations.

<a id="processNoise"></a>
## Process Noise Q

Variance parameter in the Extended Kalman Filter (EKF) representing model error growth (numerical truncation and unresolved physics). Increasing Q lowers confidence in model forecast and increases reliance on observations.

**Formula**

```
Pᶠ_k = M_k Pᵃ_{k-1} M_kᵀ + Q
(Pᶠ: Forecast covariance, Pᵃ: Analysis covariance, M: Tangent linear model, Q: Process noise)
```

**Guideline:** Typically 0.001 – 0.05. Increase if model approximations are coarse; decrease if model dynamics are highly accurate.

<a id="bgErrorVar"></a>
## Background Error Var σb²

Variance parameter in variational methods (3DVar, 4DVar) representing the uncertainty of the prior/background state. Higher values decrease confidence in the prior, yielding analysis states closer to observations.

**Formula**

```
B = σb² C
(B: Background error covariance, C: Spatial correlation matrix, σb²: Background variance)
```

**Guideline:** Typically 0.5 – 2.0. Balances the relative weight between prior state and new observations.

<a id="filterType"></a>
## Algorithm Type (LPF vs SIR)

Selects the assimilation algorithm for the Particle Filter. Local Particle Filter (LPF) applies spatial localization and observation-guided proposals, achieving stable convergence (RMSE ≈ 0.27) with only 30 particles in high-dimensional chaos. Standard SIR (Bootstrap) is the classical global likelihood filter, illustrating the curse of dimensionality where weights collapse in 40D (RMSE ≈ 4.5–5.0).

**Formula**

```
• LPF: Localized observation gain and importance weights per grid point
• SIR: Classical global joint likelihood w_i ∝ ∏_j p(y_j | x_i,j)
```

**Guideline:** Choose LPF (Recommended) for standard assimilation in Lorenz '96 (N=40). Choose Standard SIR for educational demonstrations of the curse of dimensionality.

<a id="resampleThreshold"></a>
## Resample Threshold (SIR)

Threshold in Particle Filters (PF) to trigger Sequential Importance Resampling (SIR) and prevent weight degeneracy. When effective particle ratio drops below this threshold, high-weight particles are duplicated.

**Formula**

```
N_eff = 1 / Σ(w_i²)
(Trigger when N_eff < Threshold × M | w_i: Normalized weights, M: Particle count)
```

**Guideline:** Typically 0.5 – 0.8. Setting too high causes frequent resampling and particle impoverishment; setting too low risks weight collapse.

<a id="rmse"></a>
## RMSE (Root Mean Square Error)

How far the estimate is from the truth, averaged over all grid points. Smaller is better. Above the obs. error line σo, the estimate is worse than simply using the observations.

**Formula**

```
RMSE = √[ (1/N) Σ_j (x̂_j - x_j)² ]
(N: Grid dimension, x̂: Estimate, x: Truth)
```

**Guideline:** Assimilation is working when RMSE stays well below σo.

<a id="spread"></a>
## Spread (Ensemble Spread)

Standard deviation across ensemble members or particles, quantifying forecast uncertainty. In an optimal filter, ensemble spread closely matches the true Root Mean Square Error (RMSE), satisfying the Error-Spread relationship.

**Formula**

```
Spread = √[ 1 / (N(M-1)) × Σ_j Σ_i (x_{i,j} - x̄_j)² ]
(N: Grid dimension, M: Ensemble size, x_{i,j}: Member i grid j, x̄_j: Mean)
```

**Guideline:** Should ideally match analysis RMSE. If Spread << RMSE, the filter is overconfident; if Spread >> RMSE, it under-relies on model forecast.

<a id="ensembleSize"></a>
## Ensemble Size M (Members / Particles)

Total number of parallel realizations used to sample state probability distributions. Larger ensemble sizes improve estimation accuracy at the expense of computational cost.

**Formula**

```
M (Number of parallel realizations)
```

**Guideline:** Typically 20 – 100 (100 – 500+ for Particle Filters). Trade-off between accuracy and browser compute latency.

<a id="corrLength"></a>
## Correlation Length L

Spatial scale governing background error correlations in 3DVar and 4DVar. Larger values spread observation increments smoothly across broader spatial regions. Setting L=0 eliminates spatial correlations, making the background error covariance matrix B a diagonal matrix proportional to the identity matrix (σb² I).

**Formula**

```
C_ij = ρ(d_ij / L)
(C_ij: Spatial correlation between grid points i-j, L: Correlation length. When L=0, C_ij = δ_ij)
```

**Guideline:** Typically 1 – 5 (0 – 2 for full observation, 2 – 5 for sparse/thinned observation). Setting L=0 yields an uncorrelated diagonal matrix based on the identity matrix. Excessively large values cause over-smoothing.

<a id="windowSize"></a>
## Assimilation Window (4DVar)

Time duration (number of steps) over which distributed observations are simultaneously assimilated in 4DVar using adjoint gradient descent.

**Formula**

```
J(x₀) = Prior Cost + Observation Cost across window W
(x₀: Initial state optimization control variable)
```

**Guideline:** Typically 3 – 10. If too long, strong nonlinearity creates local minima and non-convex gradient descent; if too short, temporal dynamical constraints weaken.

<a id="filterDivergence"></a>
## ⚠️ Filter Divergence

Occurs when analysis RMSE explodes or numerical divergence (NaN/Infinity) happens. It is a genuine dynamical instability rather than a software bug, caused by covariance collapse, severe sampling errors, or linearization breakdown.

**Formula**

```
[Primary Causes]
• Accumulation of linearization errors in strongly nonlinear dynamics (EKF)
• Loss of positive-definiteness in covariance matrices (EKF)
• Ensemble overconfidence / spread shrinkage ignoring new observations (POEnKF)
• Curse of dimensionality causing sample weight collapse (PF)
```

**Guideline:** [Prevention & Remedies]
• Apply or increase covariance inflation (POEnKF, EnSRF, LETKF)
• Apply spatial localization to cut spurious long-range correlations
• Increase process noise Q or background error variance
• Increase particle count or tune SIR resampling threshold (PF)

<a id="N"></a>
## N (Grid Points / Variables)

Total number of coupled state variables (grid points) along the periodic circle in the Lorenz '96 atmospheric toy model.

**Formula**

```
x_i (i = 1, 2, ..., N)
```

**Guideline:** Standard benchmark value is 40. Increasing N exponentially escalates state space volume and the curse of dimensionality.

<a id="F"></a>
## F (Nature Run Forcing)

External constant forcing parameter driving the energy input into the true Lorenz '96 atmospheric system (Nature Run).

**Formula**

```
dx_i/dt = (x_{i+1} - x_{i-2})x_{i-1} - x_i + F
```

**Guideline:** Standard value is 8.0 (strong chaotic behavior). Lower values like F=4.0 produce periodic or decaying waves where assimilation is straightforward.

<a id="modelF"></a>
## Model Error (Forecast Forcing F_model)

External forcing parameter used by the forecast model in data assimilation. Setting it equal to F models a "perfect model" (no model error), while setting a different value (e.g. F=8 vs F_model=7 or 9) simulates parametric model error and forecast bias.

**Formula**

```
dx_i^f/dt = (x_{i+1}^f - x_{i-2}^f)x_{i-1}^f - x_i^f + F_{model}
```

**Guideline:** Default is 8.0 (zero model error). In the presence of model error, tuning covariance inflation and process noise becomes crucial to prevent filter divergence.

<a id="obsErrorVar"></a>
## σ² (Observation Error Variance)

Variance of the Gaussian instrument noise added to true states when generating synthetic observations.

**Formula**

```
R = σ² I
(R: Observation error covariance matrix, I: Identity matrix)
```

**Guideline:** Standard value is 1.0. Smaller σ² increases weighting on observations; larger σ² places greater faith in model background.

<a id="obsInterval"></a>
## Δt_obs (Observation Interval)

Frequency (in simulation steps) at which observation updates are performed.

**Formula**

```
t_obs = k × Δt_obs × dt
```

**Guideline:** Standard is 1 (every step). Larger intervals (e.g. >= 4) allow chaotic nonlinear error growth to saturate between observations.

<a id="numSteps"></a>
## Simulation Steps

Total number of integration steps to run the simulation.

**Formula**

```
Total Time = Steps × dt
```

**Guideline:** Standard value is 500 steps. Higher steps provide smoother asymptotic time series.

<a id="dt"></a>
## dt (Integration Time Step)

Runge-Kutta numerical integration step size for the Lorenz '96 equations.

**Formula**

```
t_{k+1} = t_k + dt
```

**Guideline:** Standard is 0.05 (~6 hours in atmospheric time). Values > 0.1 risk RK4 numerical instability.

<a id="sparseRegionStart"></a>
## Sparse Region Start

Start index (1-based grid point) for contiguous observation coverage in sparse mode.

**Formula**

```
Start Grid Point
```

**Guideline:** Default is 1.

<a id="sparseRegionEnd"></a>
## Sparse Region End

End index (1-based grid point) for contiguous observation coverage in sparse mode.

**Formula**

```
End Grid Point
```

**Guideline:** Default is 20.

<a id="thinNumObs"></a>
## Thin Num Obs

Number of observed grid points uniformly sampled across the full grid.

**Formula**

```
Observation interval ≈ N / thinNumObs
```

**Guideline:** Default is 20.
