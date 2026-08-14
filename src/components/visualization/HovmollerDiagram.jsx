import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';

/**
 * Maps error value to RGB color in the colormap:
 * 0.0 (Indigo) -> 0.25 (Cyan) -> 0.5 (Mint) -> 0.75 (Coral) -> 1.0 (White)
 */
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

      // Clear Canvas Background
      ctx.fillStyle = '#0b1326';
      ctx.fillRect(0, 0, width, height);

      // Draw Heatmap (Scale Offscreen Canvas into Graph Box)
      ctx.imageSmoothingEnabled = false; // Keep crisp pixel grid
      ctx.drawImage(
        offscreen,
        0, 0, N, HovSteps,
        paddingLeft, paddingTop, graphWidth, graphHeight
      );

      // Draw Coordinate Frame & Ticks
      ctx.strokeStyle = '#3e484f';
      ctx.lineWidth = 1;
      ctx.strokeRect(paddingLeft, paddingTop, graphWidth, graphHeight);

      // X-axis (Grid Points) Ticks & Labels
      ctx.fillStyle = '#87929a';
      ctx.font = '10px Inter, sans-serif';
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
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillText(t('visualization.hovmoller.gridAxis'), paddingLeft + graphWidth / 2, paddingTop + graphHeight + 22);

      // Y-axis (Time Steps) Ticks & Labels
      ctx.font = '10px Inter, sans-serif';
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
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = '#87929a';
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
        <div className="hovmoller-gradient-bar" />
        <span className="hovmoller-legend-text">
          {t('visualization.hovmoller.highError')} ({displayMaxError.toFixed(1)})
        </span>
      </div>
    </div>
  );
}
