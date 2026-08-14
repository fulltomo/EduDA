import { useState, useRef, useEffect } from 'react';
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

function getCssVar(varName, fallback) {
  if (typeof window !== 'undefined') {
    const val = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    if (val) return val;
  }
  return fallback;
}

function getErrorColorRGB(error, maxErr) {
  const t = Math.min(1.0, Math.max(0.0, error / maxErr));
  const stops = [
    { pos: 0.0, r: 11, g: 19, b: 38 },       // Deep Indigo (#0b1326)
    { pos: 0.25, r: 0, g: 102, b: 138 },     // Deep Cyan (#00668a)
    { pos: 0.5, r: 69, g: 223, b: 164 },     // Mint Green (#45dfa4)
    { pos: 0.75, r: 255, g: 180, b: 171 },   // Coral Orange (#ffb4ab)
    { pos: 1.0, r: 255, g: 255, b: 255 }     // White
  ];

  let lower = stops[0];
  let upper = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i].pos && t <= stops[i + 1].pos) {
      lower = stops[i];
      upper = stops[i + 1];
      break;
    }
  }
  const range = upper.pos - lower.pos;
  const factor = range > 0 ? (t - lower.pos) / range : 0;
  return {
    r: Math.round(lower.r + factor * (upper.r - lower.r)),
    g: Math.round(lower.g + factor * (upper.g - lower.g)),
    b: Math.round(lower.b + factor * (upper.b - lower.b)),
  };
}

export default function VisualizationArea({
  methods,
  colors,
  simulationResults,
  showRmse,
  showSpread,
  onToggleRmse,
  onToggleSpread,
  onUpdateMethod,
  activePreset,
}) {
  const [viewMode, setViewMode] = useState('timeseries');
  const [selectedStepIdx, setSelectedStepIdx] = useState(0);
  const [selectedMethodId, setSelectedMethodId] = useState('');
  const [isPresetExpanded, setIsPresetExpanded] = useState(true);
  const [displayMaxError, setDisplayMaxError] = useState(4.0);

  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const hovmollerCanvasRef = useRef(null);

  // Auto-expand accordion when a new preset is selected
  useEffect(() => {
    if (activePreset) {
      setIsPresetExpanded(true);
    }
  }, [activePreset]);

  // Reset selected step and selected method when new simulation results are loaded
  useEffect(() => {
    if (simulationResults && simulationResults.results && simulationResults.results.length > 0) {
      const results = simulationResults.results;
      const stepsCount = results[0].timeSteps?.length || 0;
      setSelectedStepIdx(stepsCount > 0 ? stepsCount - 1 : 0);
      setSelectedMethodId(prev => {
        if (!prev || !results.some(r => r.methodId === prev)) {
          return results[0].methodId;
        }
        return prev;
      });
    }
  }, [simulationResults]);

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

    if (viewMode === 'hovmoller') {
      return;
    }

    const results = simulationResults.results;
    const obsIndices = simulationResults.obsIndices || [];
    const timeSteps = results[0].timeSteps;
    const datasets = [];
    let labels = [];
    let xType = 'linear';
    let xTitle = 'Time Step';
    let yTitle = 'RMSE / Spread';
    let showLegend = false;
    let animDuration = 600;

    const surfaceColor = getCssVar('--surface', '#0b1326');
    const errorColor = getCssVar('--error', '#ffb4ab');

    if (viewMode === 'timeseries') {
      labels = timeSteps;
      xType = 'linear';
      xTitle = 'Time Step';
      yTitle = 'RMSE / Spread';
      showLegend = false;
      animDuration = 600;

      results.forEach((r, idx) => {
        const method = methods.find(m => m.instanceId === r.methodId);
        if (method && method.visible === false) {
          return;
        }

        const color = colors[idx % colors.length];
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
            pointHoverBorderColor: surfaceColor,
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
    } else if (viewMode === 'state1d') {
      const step = timeSteps[selectedStepIdx];
      if (step === undefined) return;

      const N = results[0].truthHistory[step].length;
      labels = Array.from({ length: N }, (_, i) => String(i + 1));
      xType = 'category';
      xTitle = 'Grid Point (格子点)';
      yTitle = 'State Value (状態値)';
      showLegend = true;
      animDuration = 0; // Seamless sliding

      // 1. True state
      const truthData = results[0].truthHistory[step];
      datasets.push({
        label: '真値 (True)',
        data: truthData,
        borderColor: 'rgba(255, 255, 255, 0.85)',
        backgroundColor: 'transparent',
        borderWidth: 2.5,
        pointRadius: 3,
        pointBackgroundColor: '#ffffff',
        tension: 0.2,
      });

      // 2. Observations
      const obsAtStep = results[0].obsHistory[step];
      if (obsAtStep) {
        const obsData = Array(N).fill(null);
        obsIndices.forEach((gridIdx, obsIdx) => {
          if (gridIdx < N) {
            obsData[gridIdx] = obsAtStep[obsIdx];
          }
        });

        datasets.push({
          label: '観測値 (Obs)',
          data: obsData,
          borderColor: 'transparent',
          backgroundColor: errorColor,
          pointRadius: 6,
          pointHoverRadius: 8,
          pointBackgroundColor: errorColor,
          pointStyle: 'rectRot',
          showLine: false,
        });
      }

      // 3. Methods' analysis states
      results.forEach((r, idx) => {
        const method = methods.find(m => m.instanceId === r.methodId);
        if (method && method.visible === false) {
          return;
        }

        const color = colors[idx % colors.length];
        const label = method?.label || r.methodId;

        const analysisData = r.analysisHistory[selectedStepIdx];
        if (analysisData) {
          datasets.push({
            label: `${label} 解析値`,
            data: analysisData,
            borderColor: color,
            backgroundColor: 'transparent',
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: color,
            tension: 0.2,
          });
        }
      });
    }

    const ctx = canvas.getContext('2d');
    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: animDuration,
          easing: 'easeOutCubic',
        },
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            display: showLegend,
            position: 'top',
            labels: {
              color: '#87929a',
              font: { family: 'Inter', size: 12 },
              boxWidth: 15,
            },
          },
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
              title: (items) => viewMode === 'timeseries' ? `Step: ${items[0].label}` : `Grid Point: ${items[0].label}`,
            },
          },
        },
        scales: {
          x: {
            type: xType,
            title: {
              display: true,
              text: xTitle,
              color: '#87929a',
              font: { family: 'Inter', size: 12, weight: 700 },
            },
            ticks: {
              color: '#87929a',
              font: { family: 'Inter', size: 12 },
              maxTicksLimit: viewMode === 'timeseries' ? 8 : undefined,
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
              text: yTitle,
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
  }, [simulationResults, showRmse, showSpread, methods, colors, viewMode, selectedStepIdx]);

  // Hovmöller Diagram Rendering Effect
  useEffect(() => {
    if (viewMode !== 'hovmoller' || !simulationResults || !simulationResults.results || simulationResults.results.length === 0) {
      return;
    }

    const canvas = hovmollerCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const results = simulationResults.results;
    const r = results.find(item => item.methodId === selectedMethodId) || results[0];
    if (!r) return;

    const timeSteps = r.timeSteps;
    const analysisHistory = r.analysisHistory;
    const truthHistory = r.truthHistory;
    if (!timeSteps || !analysisHistory || !truthHistory) return;

    const N = truthHistory[0]?.length || 40;
    const HovSteps = timeSteps.length;
    if (HovSteps === 0) return;

    // Determine max error for colormap scale
    let maxError = 0.1;
    for (let t = 0; t < HovSteps; t++) {
      const step = timeSteps[t];
      const truth = truthHistory[step];
      const analysis = analysisHistory[t];
      if (truth && analysis) {
        for (let j = 0; j < N; j++) {
          const err = Math.abs(analysis[j] - truth[j]);
          if (err > maxError) maxError = err;
        }
      }
    }
    // Round maxError up to a nice value for display
    const computedMaxError = Math.ceil(maxError * 2) / 2 || 4.0;
    setDisplayMaxError(computedMaxError);

    let animationFrameId;

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const logicalWidth = rect.width;
      const logicalHeight = rect.height;

      if (canvas.width !== Math.floor(logicalWidth * dpr) || canvas.height !== Math.floor(logicalHeight * dpr)) {
        canvas.width = Math.floor(logicalWidth * dpr);
        canvas.height = Math.floor(logicalHeight * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Dimensions in logical pixels
      const width = logicalWidth;
      const height = logicalHeight;

      // Clear
      ctx.fillStyle = '#0b1326';
      ctx.fillRect(0, 0, width, height);

      // Paddings
      const paddingLeft = 55;
      const paddingRight = 15;
      const paddingTop = 15;
      const paddingBottom = 40;

      const graphWidth = width - paddingLeft - paddingRight;
      const graphHeight = height - paddingTop - paddingBottom;

      if (graphWidth <= 0 || graphHeight <= 0) {
        ctx.restore();
        return;
      }

      // Render heatmap via offscreen ImageData buffer
      const offCanvas = document.createElement('canvas');
      offCanvas.width = N;
      offCanvas.height = HovSteps;
      const offCtx = offCanvas.getContext('2d');
      if (offCtx) {
        const imgData = offCtx.createImageData(N, HovSteps);
        for (let t = 0; t < HovSteps; t++) {
          const step = timeSteps[t];
          const truth = truthHistory[step];
          const analysis = analysisHistory[t];
          if (!truth || !analysis) continue;

          for (let j = 0; j < N; j++) {
            const err = Math.abs(analysis[j] - truth[j]);
            const rgb = getErrorColorRGB(err, computedMaxError);
            const pixelIdx = (t * N + j) * 4;
            imgData.data[pixelIdx] = rgb.r;
            imgData.data[pixelIdx + 1] = rgb.g;
            imgData.data[pixelIdx + 2] = rgb.b;
            imgData.data[pixelIdx + 3] = 255;
          }
        }
        offCtx.putImageData(imgData, 0, 0);

        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(offCanvas, paddingLeft, paddingTop, graphWidth, graphHeight);
      }

      const cellWidth = graphWidth / N;
      const cellHeight = graphHeight / HovSteps;

      // Draw axes lines
      ctx.strokeStyle = '#3e484f';
      ctx.lineWidth = 1;
      ctx.beginPath();
      // Y-axis (left)
      ctx.moveTo(paddingLeft, paddingTop);
      ctx.lineTo(paddingLeft, paddingTop + graphHeight);
      // X-axis (bottom)
      ctx.moveTo(paddingLeft, paddingTop + graphHeight);
      ctx.lineTo(paddingLeft + graphWidth, paddingTop + graphHeight);
      ctx.stroke();

      // Labels styling
      ctx.fillStyle = '#87929a';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      // X-axis (Grid Points) Ticks & Labels
      const xLabelInterval = N <= 20 ? 2 : (N <= 40 ? 5 : 10);
      for (let j = 0; j < N; j++) {
        const gridNum = j + 1;
        if (gridNum === 1 || gridNum === N || gridNum % xLabelInterval === 0) {
          const xPos = paddingLeft + (j + 0.5) * cellWidth;
          // Tick line
          ctx.beginPath();
          ctx.moveTo(xPos, paddingTop + graphHeight);
          ctx.lineTo(xPos, paddingTop + graphHeight + 4);
          ctx.stroke();
          // Text
          ctx.fillText(String(gridNum), xPos, paddingTop + graphHeight + 6);
        }
      }

      // X-axis Title
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillText('Grid Point (格子点)', paddingLeft + graphWidth / 2, paddingTop + graphHeight + 22);

      // Y-axis (Time Steps) Ticks & Labels
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      const yLabelCount = 6;
      for (let i = 0; i < yLabelCount; i++) {
        const idx = Math.min(HovSteps - 1, Math.round((i / (yLabelCount - 1)) * (HovSteps - 1)));
        const yPos = paddingTop + idx * cellHeight;
        const stepNum = timeSteps[idx];

        // Tick line
        ctx.beginPath();
        ctx.moveTo(paddingLeft - 4, yPos);
        ctx.lineTo(paddingLeft, yPos);
        ctx.stroke();
        // Text
        ctx.fillText(String(stepNum), paddingLeft - 8, yPos);
      }

      // Y-axis Title
      ctx.save();
      ctx.translate(15, paddingTop + graphHeight / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = '#87929a';
      ctx.fillText('Time Step (タイムステップ)', 0, 0);
      ctx.restore();

      ctx.restore();
    };

    const handleResize = () => {
      animationFrameId = requestAnimationFrame(render);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(canvas.parentElement || canvas);

    render();

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(animationFrameId);
    };
  }, [viewMode, selectedMethodId, simulationResults]);

  const results = simulationResults?.results;

  return (
    <section className="viz-area" id="viz-area">
      {/* Active Preset Banner (Accordion) */}
      {activePreset && (
        <div className="preset-banner card" style={{ margin: '16px 16px 0 16px', borderLeft: '4px solid var(--primary)', backgroundColor: 'var(--surface-container-high)', flexShrink: 0 }}>
          <div
            className="card-header"
            onClick={() => setIsPresetExpanded(prev => !prev)}
            style={{
              display: 'flex',
              justify: 'space-between',
              alignItems: 'center',
              background: 'var(--surface-container-highest)',
              borderBottom: isPresetExpanded ? '1px solid var(--outline-variant)' : 'none',
              padding: '10px 16px',
              cursor: 'pointer',
              userSelect: 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '20px' }}>school</span>
              <span className="typo-headline-md" style={{ color: 'var(--primary)', fontSize: '15px', fontWeight: '600' }}>
                {activePreset.title}
              </span>
            </div>
            <button
              className="btn-ghost"
              onClick={(e) => {
                e.stopPropagation();
                setIsPresetExpanded(prev => !prev);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                fontSize: '12px',
                borderRadius: 'var(--rounded)',
                cursor: 'pointer'
              }}
              id="btn-toggle-preset-details"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                {isPresetExpanded ? 'expand_less' : 'expand_more'}
              </span>
              {isPresetExpanded ? '説明を隠す' : '説明を表示'}
            </button>
          </div>
          {isPresetExpanded && (
            <div className="card-body" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p className="typo-body-sm" style={{ fontWeight: '600', color: 'var(--secondary)' }}>
                テーマ: {activePreset.theme}
              </p>
              <p className="typo-body-sm" style={{ color: 'var(--on-surface-variant)', lineHeight: '1.5', fontSize: '13px' }}>
                {activePreset.description}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Summary Bar */}
      {results && results.length > 0 && (
        <div className="viz-summary-bar no-scrollbar">
          {results.map((r, idx) => {
            const color = colors[idx % colors.length];
            const method = methods.find(m => m.instanceId === r.methodId);
            const label = method?.label || r.methodId;
            const isVisible = method ? method.visible !== false : true;

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
          <div className="viz-tab-row">
            <button
              className={`viz-tab-btn ${viewMode === 'timeseries' ? 'viz-tab-btn--active' : ''}`}
              onClick={() => setViewMode('timeseries')}
            >
              時系列 (RMSE/Spread)
            </button>
            <button
              className={`viz-tab-btn ${viewMode === 'state1d' ? 'viz-tab-btn--active' : ''}`}
              onClick={() => setViewMode('state1d')}
            >
              1D 状態プロット
            </button>
            <button
              className={`viz-tab-btn ${viewMode === 'hovmoller' ? 'viz-tab-btn--active' : ''}`}
              onClick={() => setViewMode('hovmoller')}
            >
              Hovmöller ダイヤグラム
            </button>
          </div>

          {/* Hovmöller Method Selector */}
          {viewMode === 'hovmoller' && results && results.length > 0 && (
            <div className="hov-method-selector-container">
              <span className="typo-body-sm" style={{ color: 'var(--on-surface-variant)' }}>手法:</span>
              <select
                className="hov-method-select"
                value={selectedMethodId}
                onChange={(e) => setSelectedMethodId(e.target.value)}
                aria-label="表示手法選択"
              >
                {results.map(r => {
                  const method = methods.find(m => m.instanceId === r.methodId);
                  const label = method?.label || r.methodId;
                  return (
                    <option key={r.methodId} value={r.methodId}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>
          )}
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
          <canvas
            ref={chartRef}
            id="rmse-chart"
            style={{ display: (results && results.length > 0 && viewMode !== 'hovmoller') ? 'block' : 'none' }}
          />

          {/* Hovmöller View */}
          {viewMode === 'hovmoller' && results && results.length > 0 && (
            <div className="hovmoller-view-container">
              <div className="hovmoller-canvas-wrapper">
                <canvas ref={hovmollerCanvasRef} />
              </div>
              <div className="hovmoller-legend-container">
                <span className="hovmoller-legend-text">低誤差 (0.0)</span>
                <div className="hovmoller-gradient-bar" />
                <span className="hovmoller-legend-text">高誤差 ({displayMaxError.toFixed(1)})</span>
              </div>
            </div>
          )}
        </div>

        {/* 1D State Plot Step Slider */}
        {viewMode === 'state1d' && results && results.length > 0 && results[0].timeSteps && results[0].timeSteps.length > 0 && (
          <div className="viz-slider-container">
            <div className="viz-slider-header">
              <span className="viz-slider-title">タイムステップ選択:</span>
              <span className="viz-slider-value">Step {results[0].timeSteps[selectedStepIdx]}</span>
            </div>
            <input
              type="range"
              min={0}
              max={results[0].timeSteps.length - 1}
              value={selectedStepIdx}
              onChange={(e) => setSelectedStepIdx(parseInt(e.target.value, 10))}
              className="viz-slider"
              aria-label="タイムステップ選択"
            />
          </div>
        )}
      </div>

      {/* Legend Toggle */}
      {viewMode === 'timeseries' && (
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
      )}
    </section>
  );
}
