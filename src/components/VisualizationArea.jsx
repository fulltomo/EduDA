import { useState, useEffect } from 'react';
import EduTooltip from './EduTooltip';
import PresetBanner from './visualization/PresetBanner';
import SummaryBar from './visualization/SummaryBar';
import VisualizationChart from './visualization/VisualizationChart';
import HovmollerDiagram from './visualization/HovmollerDiagram';
import './VisualizationArea.css';

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

  const results = simulationResults?.results;

  return (
    <section className="viz-area" id="viz-area">
      {/* Active Preset Banner */}
      <PresetBanner activePreset={activePreset} />

      {/* Summary Bar */}
      <SummaryBar
        results={results}
        methods={methods}
        colors={colors}
        onUpdateMethod={onUpdateMethod}
      />

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

          {/* Chart.js Line Chart (Timeseries & 1D State) */}
          <VisualizationChart
            viewMode={viewMode}
            simulationResults={simulationResults}
            methods={methods}
            colors={colors}
            showRmse={showRmse}
            showSpread={showSpread}
            selectedStepIdx={selectedStepIdx}
          />

          {/* Hovmöller View */}
          {viewMode === 'hovmoller' && results && results.length > 0 && (
            <HovmollerDiagram
              simulationResults={simulationResults}
              selectedMethodId={selectedMethodId}
            />
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
      )}
    </section>
  );
}
