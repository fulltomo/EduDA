import { useState, useRef, useEffect } from 'react';

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

      const width = logicalWidth;
      const height = logicalHeight;

      // Clear background
      ctx.fillStyle = '#0b1326';
      ctx.fillRect(0, 0, width, height);

      // Margins / Paddings
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
          ctx.beginPath();
          ctx.moveTo(xPos, paddingTop + graphHeight);
          ctx.lineTo(xPos, paddingTop + graphHeight + 4);
          ctx.stroke();
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
  }, [selectedMethodId, simulationResults]);

  return (
    <div className="hovmoller-view-container">
      <div className="hovmoller-canvas-wrapper">
        <canvas ref={canvasRef} />
      </div>
      <div className="hovmoller-legend-container">
        <span className="hovmoller-legend-text">低誤差 (0.0)</span>
        <div className="hovmoller-gradient-bar" />
        <span className="hovmoller-legend-text">高誤差 ({displayMaxError.toFixed(1)})</span>
      </div>
    </div>
  );
}
