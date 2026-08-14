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
  showRmse,
  showSpread,
  selectedStepIdx,
}) {
  const { t, lang } = useLanguage();
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

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
    const timeSteps = results[0].timeSteps;
    const datasets = [];
    let labels = [];
    let xType = 'linear';
    let xTitle = t('visualization.chart.timeStepAxis');
    let yTitle = t('visualization.chart.rmseAxis');
    let showLegend = false;
    let animDuration = 600;

    const surfaceColor = getCssVar('--surface', '#0b1326');
    const errorColor = getCssVar('--error', '#ffb4ab');

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
      xTitle = t('visualization.chart.gridPointAxis');
      yTitle = t('visualization.chart.stateAxis');
      showLegend = true;
      animDuration = 0;

      // 1. True state
      const truthData = results[0].truthHistory[step];
      datasets.push({
        label: t('visualization.chart.truth'),
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
          label: t('visualization.chart.obs'),
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
            label: `${label} (${t('visualization.chart.analysisSuffix')})`,
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
              title: (items) => viewMode === 'timeseries'
                ? `${t('visualization.step')}: ${items[0].label}`
                : `${t('obsActions.gridPoint')}: ${items[0].label}`,
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
              font: { family: 'Inter', size: 12, weight: 600 },
              padding: { top: 8 },
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.05)',
            },
            ticks: {
              color: '#87929a',
              font: { family: 'JetBrains Mono', size: 11 },
              maxRotation: 0,
            },
          },
          y: {
            title: {
              display: true,
              text: yTitle,
              color: '#87929a',
              font: { family: 'Inter', size: 12, weight: 600 },
              padding: { bottom: 8 },
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.05)',
            },
            ticks: {
              color: '#87929a',
              font: { family: 'JetBrains Mono', size: 11 },
            },
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
    methods,
    colors,
    showRmse,
    showSpread,
    selectedStepIdx,
    lang,
    t,
  ]);

  if (viewMode === 'hovmoller') return null;

  return (
    <div className="viz-chart-canvas-container" style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas ref={chartRef} id="viz-chart" />
    </div>
  );
}
