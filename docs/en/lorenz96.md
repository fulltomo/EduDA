# The Lorenz '96 model

[The 7 data assimilation methods](methods.md) · [Glossary and parameters](glossary.md) · [The Lorenz '96 model](lorenz96.md) · [Open the simulator](https://eduda.pages.dev/en/)

Lorenz '96 was introduced by Edward N. Lorenz at a 1996 predictability workshop. It represents the atmosphere on N equally spaced grid points around a latitude circle using only advection, dissipation and a constant forcing.

```
dx_j / dt = (x_{j+1} - x_{j-2}) x_{j-1} - x_j + F   (j = 1, ..., 40)
```

The quadratic term on the right-hand side plays the role of advection, the linear term that of dissipation, and F that of external forcing. Grid points form a ring under periodic boundary conditions, so indices wrap modulo N.

Integrated with the 4th-order Runge-Kutta method (RK4), dt = 0.05 (roughly 6 atmospheric hours). N = 40 grid points, forcing F = 8.0, periodic boundary conditions.

## Chaos and predictability

With F = 8.0 and N = 40 the system is chaotic, with a leading Lyapunov exponent of roughly 1.7 per time unit and an error doubling time of about 0.42 time units. Under the usual convention that dt = 0.05 corresponds to roughly 6 atmospheric hours, errors double in about two days — close to the predictability of the real mid-latitude atmosphere. That correspondence is why Lorenz '96 became the standard data assimilation testbed.

## Why data assimilation research uses it

It shares the properties that make operational forecasting hard — nonlinearity, chaos, exponential error growth — while keeping the state vector at just 40 dimensions, small enough to run methods that carry an explicit covariance matrix (such as the EKF) on a laptop or inside a browser. Spurious correlations under small ensembles, filter divergence without inflation, and the curse of dimensionality in particle filters all reproduce faithfully.

EduDA integrates the system with N = 40, F = 8.0, 4th-order Runge-Kutta and dt = 0.05, then builds synthetic observations with added noise and feeds them to all seven assimilation methods at once.
