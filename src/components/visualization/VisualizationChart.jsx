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
import { useLanguage } from '../../context/LanguageContext';

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

// RMSE がこのステップ数だけ連続で σo を超えたら「発散」とみなす
const DIVERGENCE_RUN = 20;

/**
 * 一度 σo を下回って追従できた後に、RMSE が σo を DIVERGENCE_RUN ステップ連続で
 * 上回り始めた位置。最初から追従できていない場合は「発散」とは呼ばないので -1
 */
function findDivergenceStart(rmse, threshold) {
  let tracking = false;
  let run = 0;
  for (let i = 0; i < rmse.length; i++) {
    if (!tracking) {
      tracking = rmse[i] <= threshold;
      continue;
    }
    run = rmse[i] > threshold ? run + 1 : 0;
    if (run === DIVERGENCE_RUN) return i - DIVERGENCE_RUN + 1;
  }
  return -1;
}

/**
 * 時系列図の注釈: 観測誤差 σo の水平線、各手法の発散開始の縦線、
 * 上の状態図に出している時刻のカーソル。
 */
const annotationPlugin = {
  id: 'edudaAnnotations',
  afterDatasetsDraw(chart, _args, opts) {
    if (!opts.enabled) return;
    const { ctx, chartArea: area, scales: { x, y } } = chart;
    ctx.save();

    if (opts.cursorStep != null) {
      const xPos = x.getPixelForValue(opts.cursorStep);
      ctx.fillStyle = opts.cursorFill;
      ctx.fillRect(xPos - 1, area.top, 2, area.bottom - area.top);
    }

    ctx.font = `11px ${opts.font}`;
    ctx.textBaseline = 'bottom';

    if (opts.sigma <= y.max) {
      const yPos = y.getPixelForValue(opts.sigma);
      ctx.strokeStyle = opts.ink;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(area.left, yPos);
      ctx.lineTo(area.right, yPos);
      ctx.stroke();
      ctx.fillStyle = opts.ink;
      ctx.textAlign = 'right';
      ctx.fillText(opts.sigmaLabel, area.right, yPos - 3);
    }

    ctx.setLineDash([]);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    opts.divergences.forEach(({ step, color }, i) => {
      const xPos = x.getPixelForValue(step);
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(xPos, area.top);
      ctx.lineTo(xPos, area.bottom);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.fillText(`${opts.divergenceLabel} (${step})`, xPos + 4, area.top + 2 + i * 14);
    });
    ctx.restore();
  },
};

/**
 * 凡例用の白抜き丸。pointStyleWidth (線の凡例を長くする設定) は丸にも効いて
 * 楕円になるので、観測だけは画像にして縦横比を保つ。
 */
function legendCircle(stroke, fill) {
  const dpr = window.devicePixelRatio || 1;
  const size = 10;
  const c = document.createElement('canvas');
  c.width = size * dpr;
  c.height = size * dpr;
  c.style.width = `${size}px`;
  c.style.height = `${size}px`;
  const g = c.getContext('2d');
  g.scale(dpr, dpr);
  g.beginPath();
  g.arc(size / 2, size / 2, 3.5, 0, 2 * Math.PI);
  g.fillStyle = fill;
  g.fill();
  g.lineWidth = 1.25;
  g.strokeStyle = stroke;
  g.stroke();
  return c;
}

function getCssVar(varName, fallback) {
  if (typeof window !== 'undefined') {
    const val = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    if (val) return val;
  }
  return fallback;
}

export default function VisualizationChart({
  viewMode,
  simulationResults,
  methods,
  colors,
  showSpread,
  selectedStepIdx,
  obsErrorStd,
  onSeek,
}) {
  const { t, lang } = useLanguage();
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const timeSteps = simulationResults?.results?.[0]?.timeSteps;
  // 誤差の時系列は時刻を動かしても作り直さない (カーソルだけ別の effect で描き直す)
  const stateStepIdx = viewMode === 'state1d' ? selectedStepIdx : null;
  // 作り直したときのカーソル初期位置 (effect の依存には入れない)
  const cursorIdxRef = useRef(selectedStepIdx);
  cursorIdxRef.current = selectedStepIdx;

  useEffect(() => {
    const canvas = chartRef.current;
    if (!canvas) return;

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
    const datasets = [];
    let labels = [];
    let xType = 'linear';
    let xTitle = t('visualization.chart.timeStepAxis');
    let yTitle = t('visualization.chart.rmseAxis');
    let showLegend = false;
    let animDuration = 600;
    let yRange = {};
    const divergences = [];

    const surfaceColor = getCssVar('--surface', '#16303f');
    const ink = getCssVar('--on-surface', '#e6eef2');
    const muted = getCssVar('--outline', '#7f98a6');
    const rule = getCssVar('--outline-variant', '#2b4b5c');
    const fontFamily = getCssVar('--font-sans', 'sans-serif');
    const tickFont = { family: getCssVar('--font-num', fontFamily), size: 12 };
    const titleFont = { family: fontFamily, size: 12 };

    if (viewMode === 'timeseries') {
      labels = timeSteps;
      xType = 'linear';
      xTitle = t('visualization.chart.timeStepAxis');
      yTitle = t('visualization.chart.rmseAxis');
      showLegend = false;
      animDuration = 600;

      results.forEach((r, idx) => {
        const method = methods.find(m => m.instanceId === r.methodId);
        if (method && method.visible === false) {
          return;
        }

        const color = colors[idx % colors.length];
        const label = method?.label || r.methodId;

        if (r.rmseTimeSeries) {
          const start = findDivergenceStart(r.rmseTimeSeries, obsErrorStd);
          if (start >= 0) divergences.push({ step: timeSteps[start], color });
          datasets.push({
            label: `${label} RMSE`,
            data: r.rmseTimeSeries,
            borderColor: color,
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHoverBackgroundColor: color,
            pointHoverBorderColor: surfaceColor,
            pointHoverBorderWidth: 2,
            tension: 0,
            borderDash: [],
          });
        }

        if (showSpread && r.spreadTimeSeries) {
          datasets.push({
            label: `${label} Spread`,
            data: r.spreadTimeSeries,
            borderColor: color,
            backgroundColor: 'transparent',
            borderWidth: 1,
            pointRadius: 0,
            pointHoverRadius: 3,
            pointHoverBackgroundColor: color,
            tension: 0,
            borderDash: [4, 3],
          });
        }
      });
    } else if (viewMode === 'state1d') {
      const step = timeSteps[stateStepIdx];
      if (step === undefined) return;

      const N = results[0].truthHistory[step].length;

      // 縦軸は真値の全期間の範囲で固定し、再生中に軸が揺れないようにする
      let lo = Infinity;
      let hi = -Infinity;
      for (const row of results[0].truthHistory) {
        for (const v of row) {
          if (v < lo) lo = v;
          if (v > hi) hi = v;
        }
      }
      const pad = (hi - lo) * 0.15;
      yRange = { min: Math.floor((lo - pad) / 5) * 5, max: Math.ceil((hi + pad) / 5) * 5, ticks: { stepSize: 5 } };
      labels = Array.from({ length: N }, (_, i) => String(i + 1));
      xType = 'category';
      xTitle = t('visualization.chart.gridPointAxis');
      yTitle = t('visualization.chart.stateAxis');
      showLegend = true;
      animDuration = 0;

      // 1. True state
      const truthData = results[0].truthHistory[step];
      datasets.push({
        label: t('visualization.chart.truth'),
        data: truthData,
        borderColor: ink,
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 0,
        pointStyle: 'line',
        tension: 0,
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
          label: t('visualization.chart.obs'),
          data: obsData,
          borderColor: muted,
          backgroundColor: surfaceColor,
          pointRadius: 3.5,
          pointHoverRadius: 5,
          pointBorderWidth: 1.25,
          pointBackgroundColor: surfaceColor,
          pointStyle: 'circle',
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

        const analysisData = r.analysisHistory[stateStepIdx];
        if (analysisData) {
          datasets.push({
            label,
            data: analysisData,
            borderColor: color,
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            pointRadius: 0,
            pointStyle: 'line',
            tension: 0,
          });
        }
      });
    }

    const seekAt = (evt, chart) => {
      if (viewMode !== 'timeseries' || !onSeek) return;
      const v = chart.scales.x.getValueForPixel(evt.x);
      let best = 0;
      for (let i = 1; i < timeSteps.length; i++) {
        if (Math.abs(timeSteps[i] - v) < Math.abs(timeSteps[best] - v)) best = i;
      }
      onSeek(best);
    };

    const ctx = canvas.getContext('2d');
    chartInstance.current = new Chart(ctx, {
      type: 'line',
      plugins: [annotationPlugin],
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
        // 誤差グラフをクリック・ドラッグすると、その時刻の状態を上の図に出す
        onClick: (evt, _els, chart) => seekAt(evt, chart),
        onHover: (evt, _els, chart) => {
          if (evt.native?.buttons === 1) seekAt(evt, chart);
        },
        plugins: {
          edudaAnnotations: {
            enabled: viewMode === 'timeseries' && Number.isFinite(obsErrorStd),
            cursorStep: timeSteps[cursorIdxRef.current],
            cursorFill: getCssVar('--signal', '#f5c542'),
            sigma: obsErrorStd,
            sigmaLabel: t('visualization.chart.obsErrorLine'),
            divergences,
            divergenceLabel: t('visualization.chart.divergenceStart'),
            ink: muted,
            font: fontFamily,
          },
          legend: {
            display: showLegend,
            position: 'top',
            align: 'end',
            labels: {
              color: ink,
              font: titleFont,
              // 凡例の記号をデータの描き方に合わせる (線は線、観測は白抜き丸)
              usePointStyle: true,
              pointStyleWidth: 20,
              boxHeight: 7,
              generateLabels: (chart) => {
                const items = Chart.defaults.plugins.legend.labels.generateLabels(chart);
                const circle = legendCircle(muted, surfaceColor);
                return items.map(item => (
                  chart.data.datasets[item.datasetIndex]?.pointStyle === 'circle'
                    ? { ...item, pointStyle: circle }
                    : item
                ));
              },
            },
          },
          tooltip: {
            backgroundColor: getCssVar('--surface-container-lowest', '#10242f'),
            borderColor: rule,
            borderWidth: 1,
            titleFont: { ...titleFont, weight: 600 },
            bodyFont: titleFont,
            titleColor: muted,
            bodyColor: ink,
            padding: 10,
            cornerRadius: 3,
            displayColors: true,
            boxPadding: 4,
            callbacks: {
              title: (items) => viewMode === 'timeseries'
                ? `${t('visualization.step')}: ${items[0].label}`
                : `${t('obsActions.gridPoint')}: ${items[0].label}`,
            },
          },
        },
        // 論文の図の文法: 下と左の軸だけ、グリッドは y だけ極薄に
        scales: {
          x: {
            type: xType,
            title: { display: true, text: xTitle, color: muted, font: titleFont, padding: { top: 6 } },
            border: { color: ink },
            grid: { display: false, drawTicks: false },
            ticks: { color: muted, font: tickFont, maxRotation: 0, padding: 6 },
          },
          y: {
            min: yRange.min,
            max: yRange.max,
            title: { display: true, text: yTitle, color: muted, font: titleFont, padding: { bottom: 6 } },
            border: { color: ink },
            grid: { color: rule, lineWidth: 0.5, drawTicks: false },
            ticks: { color: muted, font: tickFont, padding: 6, ...yRange.ticks },
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
  }, [
    viewMode,
    simulationResults,
    timeSteps,
    methods,
    colors,
    showSpread,
    stateStepIdx,
    obsErrorStd,
    onSeek,
    lang,
    t,
  ]);

  useEffect(() => {
    const chart = chartInstance.current;
    if (!chart || viewMode !== 'timeseries' || !timeSteps) return;
    chart.options.plugins.edudaAnnotations.cursorStep = timeSteps[selectedStepIdx];
    chart.update('none');
  }, [viewMode, timeSteps, selectedStepIdx]);

  if (viewMode === 'hovmoller') return null;

  return (
    <div
      className={`viz-chart-canvas-container ${viewMode === 'timeseries' ? 'is-seekable' : ''}`}
      style={{ width: '100%', height: '100%', position: 'relative' }}
    >
      <canvas ref={chartRef} />
    </div>
  );
}
