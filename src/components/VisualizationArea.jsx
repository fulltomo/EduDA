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
import EduTooltip from './EduTooltip';
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
            return (
              <div className="viz-summary-card card" key={r.methodId}>
                <div className="viz-summary-left">
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
                    <span className="typo-data">{r.avgSpread?.toFixed(3) ?? '—'}</span>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <label className="viz-legend-item" style={{ marginRight: 0 }}>
            <input
              type="checkbox"
              checked={showSpread}
              onChange={onToggleSpread}
            />
            <div className="viz-legend-line viz-legend-dashed" />
            <span>Spread (Dashed)</span>
          </label>
          <EduTooltip paramId="spread" align="right" position="top" />
        </div>
      </div>
    </section>
  );
}
