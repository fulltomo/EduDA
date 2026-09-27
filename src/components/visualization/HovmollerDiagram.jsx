import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';

/**
 * 誤差の順序尺度カラーマップ (inferno 系)。誤差 0 はシートの海色に溶け、
 * 大きいほど明るくなる。凡例のグラデーションもこの配列から作る。
 */
const ERROR_STOPS = [
  { pos: 0.0, r: 22, g: 48, b: 63 },     // sheet (#16303f)
  { pos: 0.25, r: 91, g: 42, b: 110 },   // #5b2a6e
  { pos: 0.5, r: 184, g: 64, b: 94 },    // #b8405e
  { pos: 0.75, r: 240, g: 138, b: 60 },  // #f08a3c
  { pos: 1.0, r: 251, g: 226, b: 138 },  // #fbe28a
];

const ERROR_GRADIENT = `linear-gradient(to right, ${ERROR_STOPS
  .map(({ pos, r, g, b }) => `rgb(${r}, ${g}, ${b}) ${pos * 100}%`)
  .join(', ')})`;

function getErrorColorRGB(error, maxErr) {
  const t = Math.min(1.0, Math.max(0.0, error / maxErr));
  const stops = ERROR_STOPS;

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

export default function HovmollerDiagram({ simulationResults, selectedMethodId }) {
  const { t, lang } = useLanguage();
  const canvasRef = useRef(null);
  const [displayMaxError, setDisplayMaxError] = useState(4.0);

  useEffect(() => {
    if (!simulationResults || !simulationResults.results || simulationResults.results.length === 0) {
      return;
    }

    const canvas = canvasRef.current;
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

    // 1. Calculate Absolute Error Grid: [stepIdx][gridIdx]
    let maxErrorObserved = 0;
    const errorGrid = [];

    for (let i = 0; i < HovSteps; i++) {
      const row = new Float32Array(N);
      const analysis = analysisHistory[i];
      const truth = truthHistory[i];
      if (analysis && truth) {
        for (let j = 0; j < N; j++) {
          const err = Math.abs(analysis[j] - truth[j]);
          row[j] = err;
          if (err > maxErrorObserved) {
            maxErrorObserved = err;
          }
        }
      }
      errorGrid.push(row);
    }

    // Dynamic Max Error Cap (at least 2.0, rounded up to nice decimal)
    const dynamicMax = Math.max(2.0, Math.min(10.0, Math.ceil(maxErrorObserved * 2) / 2));
    setDisplayMaxError(dynamicMax);

    // 2. Offscreen Canvas for Pixel-Perfect Fast Rendering
    const offscreen = document.createElement('canvas');
    offscreen.width = N;
    offscreen.height = HovSteps;
    const offCtx = offscreen.getContext('2d');
    const imgData = offCtx.createImageData(N, HovSteps);
    const data = imgData.data;

    for (let i = 0; i < HovSteps; i++) {
      const row = errorGrid[i];
      for (let j = 0; j < N; j++) {
        const err = row[j];
        const { r: cr, g: cg, b: cb } = getErrorColorRGB(err, dynamicMax);
        const pixelIdx = (i * N + j) * 4;
        data[pixelIdx] = cr;
        data[pixelIdx + 1] = cg;
        data[pixelIdx + 2] = cb;
        data[pixelIdx + 3] = 255;
      }
    }
    offCtx.putImageData(imgData, 0, 0);

    // 3. Render onto Main Display Canvas with Padding & Axes
    let animationFrameId;

    const render = () => {
      const width = canvas.parentElement?.clientWidth || 800;
      const height = canvas.parentElement?.clientHeight || 450;

      // Handle HiDPI displays
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.save();
      ctx.scale(dpr, dpr);

      // Margins
      const paddingLeft = 55;
      const paddingRight = 20;
      const paddingTop = 20;
      const paddingBottom = 45;

      const graphWidth = width - paddingLeft - paddingRight;
      const graphHeight = height - paddingTop - paddingBottom;

      const css = getComputedStyle(document.documentElement);
      const paper = css.getPropertyValue('--surface').trim();
      const ink = css.getPropertyValue('--on-surface').trim();
      const muted = css.getPropertyValue('--outline').trim();
      const font = css.getPropertyValue('--font-sans').trim();

      // Clear Canvas Background
      ctx.fillStyle = paper;
      ctx.fillRect(0, 0, width, height);

      // Draw Heatmap (Scale Offscreen Canvas into Graph Box)
      ctx.imageSmoothingEnabled = false; // Keep crisp pixel grid
      ctx.drawImage(
        offscreen,
        0, 0, N, HovSteps,
        paddingLeft, paddingTop, graphWidth, graphHeight
      );

      // Draw Coordinate Frame & Ticks
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1;
      ctx.strokeRect(paddingLeft, paddingTop, graphWidth, graphHeight);

      // X-axis (Grid Points) Ticks & Labels
      ctx.fillStyle = muted;
      ctx.font = `11px ${font}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      const cellWidth = graphWidth / N;
      const cellHeight = graphHeight / HovSteps;

      const xLabelInterval = N >= 40 ? 5 : (N >= 20 ? 2 : 1);
      for (let j = 0; j < N; j++) {
        const gridNum = j + 1;
        if (gridNum === 1 || gridNum === N || gridNum % xLabelInterval === 0) {
          const xPos = paddingLeft + (j + 0.5) * cellWidth;
          ctx.beginPath();
          ctx.moveTo(xPos, paddingTop + graphHeight);
          ctx.lineTo(xPos, paddingTop + graphHeight + 4);
          ctx.stroke();
          ctx.fillText(String(gridNum), xPos, paddingTop + graphHeight + 6);
        }
      }

      // X-axis Title
      ctx.font = `12px ${font}`;
      ctx.fillText(t('visualization.hovmoller.gridAxis'), paddingLeft + graphWidth / 2, paddingTop + graphHeight + 22);

      // Y-axis (Time Steps) Ticks & Labels
      ctx.font = `11px ${font}`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      const yLabelCount = 6;
      for (let i = 0; i < yLabelCount; i++) {
        const idx = Math.min(HovSteps - 1, Math.round((i / (yLabelCount - 1)) * (HovSteps - 1)));
        const yPos = paddingTop + idx * cellHeight;
        const stepNum = timeSteps[idx];

        ctx.beginPath();
        ctx.moveTo(paddingLeft - 4, yPos);
        ctx.lineTo(paddingLeft, yPos);
        ctx.stroke();
        ctx.fillText(String(stepNum), paddingLeft - 8, yPos);
      }

      // Y-axis Title
      ctx.save();
      ctx.translate(15, paddingTop + graphHeight / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.font = `12px ${font}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = muted;
      ctx.fillText(t('visualization.hovmoller.timeAxis'), 0, 0);
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
  }, [selectedMethodId, simulationResults, lang, t]);

  return (
    <div className="hovmoller-view-container">
      <div className="hovmoller-canvas-wrapper">
        <canvas ref={canvasRef} />
      </div>
      <div className="hovmoller-legend-container">
        <span className="hovmoller-legend-text">{t('visualization.hovmoller.lowError')}</span>
        <div className="hovmoller-gradient-bar" style={{ background: ERROR_GRADIENT }} />
        <span className="hovmoller-legend-text">
          {t('visualization.hovmoller.highError')} ({displayMaxError.toFixed(1)})
        </span>
      </div>
    </div>
  );
}
