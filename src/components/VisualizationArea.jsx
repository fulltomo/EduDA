import { useRef, useEffect } from 'react';
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import './VisualizationArea.css';

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
);

export default function VisualizationArea({
  methods,
  colors,
  simulationResults,
  showRmse,
  showSpread,
  onToggleRmse,
  onToggleSpread,
  onUpdateMethod,
}) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  // Build or update chart when results change
  useEffect(() => {
    const canvas = chartRef.current;
    if (!canvas) return;

    // Destroy old chart
    if (chartInstance.current) {
      chartInstance.current.destroy();
      chartInstance.current = null;
    }

    if (!simulationResults || !simulationResults.results || simulationResults.results.length === 0) {
      return;
    }

    const results = simulationResults.results;
    const timeSteps = results[0].timeSteps;
    const datasets = [];

    results.forEach((r, idx) => {
      const color = colors[idx % colors.length];
      const method = methods.find(m => m.instanceId === r.methodId);
      const label = method?.label || r.methodId;

      // Skip rendering dataset if visible is explicitly false
      if (method && method.visible === false) {
        return;
      }

      if (showRmse && r.rmseTimeSeries) {
        datasets.push({
          label: `${label} RMSE`,
          data: r.rmseTimeSeries,
          borderColor: color,
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: color,
          pointHoverBorderColor: 'var(--surface)',
          pointHoverBorderWidth: 2,
          tension: 0.3,
          borderDash: [],
        });
      }

      if (showSpread && r.spreadTimeSeries) {
        datasets.push({
          label: `${label} Spread`,
          data: r.spreadTimeSeries,
          borderColor: color,
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: color,
          tension: 0.3,
          borderDash: [4, 4],
        });
      }
    });

    const ctx = canvas.getContext('2d');
    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: timeSteps,
        datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 600,
          easing: 'easeOutCubic',
        },
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#171f33',
            borderColor: '#3e484f',
            borderWidth: 1,
            titleFont: { family: 'Inter', size: 12, weight: 700 },
            bodyFont: { family: 'JetBrains Mono', size: 12 },
            titleColor: '#87929a',
            bodyColor: '#dae2fd',
            padding: 12,
            cornerRadius: 4,
            displayColors: true,
            boxPadding: 4,
            callbacks: {
              title: (items) => `Step: ${items[0].label}`,
            },
          },
        },
        scales: {
          x: {
            type: 'linear',
            title: {
              display: true,
              text: 'Time Step',
              color: '#87929a',
              font: { family: 'Inter', size: 12, weight: 700 },
            },
            ticks: {
              color: '#87929a',
              font: { family: 'Inter', size: 12 },
              maxTicksLimit: 8,
            },
            grid: {
              color: 'rgba(62, 72, 79, 0.3)',
              drawTicks: false,
            },
            border: {
              color: 'rgba(62, 72, 79, 0.3)',
            },
          },
          y: {
            title: {
              display: true,
              text: 'RMSE',
              color: '#87929a',
              font: { family: 'Inter', size: 12, weight: 700 },
            },
            ticks: {
              color: '#87929a',
              font: { family: 'JetBrains Mono', size: 12 },
              maxTicksLimit: 6,
            },
            grid: {
              color: 'rgba(62, 72, 79, 0.3)',
              drawTicks: false,
            },
            border: {
              color: 'rgba(62, 72, 79, 0.3)',
            },
            beginAtZero: true,
          },
        },
      },
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [simulationResults, showRmse, showSpread, methods, colors]);

  const results = simulationResults?.results;

  return (
    <section className="viz-area" id="viz-area">
      {/* Summary Bar */}
      {results && results.length > 0 && (
        <div className="viz-summary-bar no-scrollbar">
          {results.map((r, idx) => {
            const color = colors[idx % colors.length];
            const method = methods.find(m => m.instanceId === r.methodId);
            const label = method?.label || r.methodId;
            const isVisible = method ? method.visible !== false : true;
            const isDeterministic = r.methodType === '3DVar' || r.methodType === '4DVar';

            return (
              <div
                className={`viz-summary-card card ${!isVisible ? 'is-hidden' : ''}`}
                key={r.methodId}
                style={{
                  opacity: isVisible ? 1 : 0.5,
                  transition: 'opacity 0.2s ease',
                }}
              >
                <div className="viz-summary-left">
                  <button
                    className="viz-summary-visibility-btn"
                    onClick={() => onUpdateMethod && onUpdateMethod(r.methodId, { visible: !isVisible })}
                    aria-label={isVisible ? "非表示にする" : "表示する"}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: isVisible ? 'var(--on-surface-variant)' : 'var(--outline)',
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: 'var(--rounded)',
                      display: 'flex',
                      alignItems: 'center',
                      marginRight: '4px',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                      {isVisible ? 'visibility' : 'visibility_off'}
                    </span>
                  </button>
                  <div className="color-dot-sm" style={{ backgroundColor: color }} />
                  <span className="viz-summary-name">{label}</span>
                </div>
                <div className="viz-summary-metrics">
                  <div className="viz-summary-metric">
                    <span className="typo-label-caps" style={{ color: 'var(--outline)' }}>Avg RMSE</span>
                    <span className="typo-data" style={{ color }}>{r.avgRmse.toFixed(3)}</span>
                  </div>
                  <div className="viz-summary-metric">
                    <span className="typo-label-caps" style={{ color: 'var(--outline)' }}>Avg Spread</span>
                    <span className="typo-data">
                      {isDeterministic ? 'N/A' : (r.avgSpread?.toFixed(3) ?? '—')}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Chart Area */}
      <div className="viz-chart-wrapper">
        <div className="viz-chart-header">
          <h2 className="typo-headline-md">Time Series Analysis</h2>
        </div>
        <div className="viz-chart-canvas-wrapper chart-dot-grid">
          {(!results || results.length === 0) && (
            <div className="viz-chart-placeholder">
              <span className="material-symbols-outlined" style={{ fontSize: 64, color: 'var(--outline-variant)' }}>
                show_chart
              </span>
              <p style={{ color: 'var(--outline)', marginTop: 12 }}>
                手法を追加して「同化を実行」を押してください
              </p>
            </div>
          )}
          <canvas ref={chartRef} id="rmse-chart" />
        </div>
      </div>

      {/* Legend Toggle */}
      <div className="viz-legend">
        <label className="viz-legend-item">
          <input
            type="checkbox"
            checked={showRmse}
            onChange={onToggleRmse}
          />
          <div className="viz-legend-line viz-legend-solid" />
          <span>RMSE (Solid)</span>
        </label>
        <label className="viz-legend-item">
          <input
            type="checkbox"
            checked={showSpread}
            onChange={onToggleSpread}
          />
          <div className="viz-legend-line viz-legend-dashed" />
          <span>Spread (Dashed)</span>
        </label>
      </div>
    </section>
  );
}
