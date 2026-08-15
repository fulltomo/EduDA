import { useState, useEffect } from 'react';
import EduTooltip from './EduTooltip';
import PresetBanner from './visualization/PresetBanner';
import VisualizationChart from './visualization/VisualizationChart';
import HovmollerDiagram from './visualization/HovmollerDiagram';
import PlaybackControls from './visualization/PlaybackControls';
import { useLanguage } from '../context/LanguageContext';
import './VisualizationArea.css';

export default function VisualizationArea({
  methods,
  colors,
  simulationResults,
  showRmse,
  showSpread,
  onToggleRmse,
  onToggleSpread,
  activePreset,
  isRunning,
}) {
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState('timeseries');
  const [selectedStepIdx, setSelectedStepIdx] = useState(0);
  const [selectedMethodId, setSelectedMethodId] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 1x, 2x, 5x

  // Reset selected step, selected method, and stop playing when new simulation results are loaded
  useEffect(() => {
    if (simulationResults && simulationResults.results && simulationResults.results.length > 0) {
      const results = simulationResults.results;
      const stepsCount = results[0].timeSteps?.length || 0;
      setSelectedStepIdx(stepsCount > 0 ? stepsCount - 1 : 0);
      setIsPlaying(false);
      setSelectedMethodId(prev => {
        if (!prev || !results.some(r => r.methodId === prev)) {
          return results[0].methodId;
        }
        return prev;
      });
    }
  }, [simulationResults]);

  // Pause playback when switching away from state1d view
  useEffect(() => {
    if (viewMode !== 'state1d') {
      setIsPlaying(false);
    }
  }, [viewMode]);

  // Handle auto playback interval
  useEffect(() => {
    if (!isPlaying) return;

    const results = simulationResults?.results;
    const totalSteps = results?.[0]?.timeSteps?.length || 0;
    if (totalSteps <= 1) {
      setIsPlaying(false);
      return;
    }

    const intervalTime = Math.round(300 / playbackSpeed);
    const interval = setInterval(() => {
      setSelectedStepIdx(prev => (prev >= totalSteps - 1 ? 0 : prev + 1));
    }, intervalTime);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, simulationResults]);

  const handleStepBack = () => {
    setIsPlaying(false);
    const results = simulationResults?.results;
    const totalSteps = results?.[0]?.timeSteps?.length || 0;
    if (totalSteps <= 1) return;
    setSelectedStepIdx(prev => (prev - 1 + totalSteps) % totalSteps);
  };

  const handleStepForward = () => {
    setIsPlaying(false);
    const results = simulationResults?.results;
    const totalSteps = results?.[0]?.timeSteps?.length || 0;
    if (totalSteps <= 1) return;
    setSelectedStepIdx(prev => (prev + 1) % totalSteps);
  };

  const handleSliderChange = (e) => {
    setIsPlaying(false);
    setSelectedStepIdx(parseInt(e.target.value, 10));
  };

  const results = simulationResults?.results;

  return (
    <section className="viz-area" id="viz-area">
      {/* Active Preset Banner */}
      <PresetBanner activePreset={activePreset} />

      {/* Chart Area */}
      <div className="viz-chart-wrapper">
        <div className="viz-chart-header">
          <div className="viz-tab-row">
            <button
              type="button"
              className={`viz-tab-btn ${viewMode === 'timeseries' ? 'viz-tab-btn--active' : ''}`}
              onClick={() => setViewMode('timeseries')}
            >
              {t('visualization.tabTimeseries')}
            </button>
            <button
              type="button"
              className={`viz-tab-btn ${viewMode === 'state1d' ? 'viz-tab-btn--active' : ''}`}
              onClick={() => setViewMode('state1d')}
            >
              {t('visualization.tabState1d')}
            </button>
            <button
              type="button"
              className={`viz-tab-btn ${viewMode === 'hovmoller' ? 'viz-tab-btn--active' : ''}`}
              onClick={() => setViewMode('hovmoller')}
            >
              {t('visualization.tabHovmoller')}
            </button>
          </div>

          {/* Hovmöller Method Selector */}
          {viewMode === 'hovmoller' && results && results.length > 0 && (
            <div className="hov-method-selector-container">
              <span className="hov-method-label typo-body-sm">
                {t('visualization.methodLabel')}
              </span>
              <select
                className="hov-method-select"
                value={selectedMethodId}
                onChange={(e) => setSelectedMethodId(e.target.value)}
                aria-label={t('visualization.methodLabel')}
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
          {isRunning && (!results || results.length === 0) ? (
            <div className="viz-chart-placeholder">
              <div className="spinner" style={{ width: 44, height: 44, borderWidth: 3 }} />
              <p style={{ color: 'var(--primary)', marginTop: 14, fontWeight: 600, fontSize: 14 }}>
                {t('controlPanel.calculating')}
              </p>
            </div>
          ) : (!results || results.length === 0) ? (
            <div className="viz-chart-placeholder">
              <span className="material-symbols-outlined" style={{ fontSize: 64, color: 'var(--outline-variant)' }}>
                science
              </span>
              <p style={{ color: 'var(--outline)', marginTop: 12 }}>
                {t('visualization.placeholder')}
              </p>
            </div>
          ) : null}

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

        {/* 1D State Plot Step Slider & Playback Controls */}
        {viewMode === 'state1d' && results && results.length > 0 && results[0].timeSteps && results[0].timeSteps.length > 0 && (
          <div className="viz-slider-container">
            <div className="viz-slider-header">
              <span className="viz-slider-title">{t('visualization.stepSelect')}</span>
              <span className="viz-slider-value">
                {t('visualization.step')} {results[0].timeSteps[selectedStepIdx]}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={results[0].timeSteps.length - 1}
              value={selectedStepIdx}
              onChange={handleSliderChange}
              className="viz-slider"
              aria-label={t('visualization.stepSelect')}
            />

            <PlaybackControls
              isPlaying={isPlaying}
              playbackSpeed={playbackSpeed}
              onTogglePlay={() => setIsPlaying(!isPlaying)}
              onStepBack={handleStepBack}
              onStepForward={handleStepForward}
              onSpeedChange={setPlaybackSpeed}
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
            <span>{t('visualization.rmseSolid')}</span>
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <label className="viz-legend-item" style={{ marginRight: 0 }}>
              <input
                type="checkbox"
                checked={showSpread}
                onChange={onToggleSpread}
              />
              <div className="viz-legend-line viz-legend-dashed" />
              <span>{t('visualization.spreadDashed')}</span>
            </label>
            <EduTooltip paramId="spread" align="right" position="top" />
          </div>
        </div>
      )}
    </section>
  );
}
