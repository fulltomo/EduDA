import { useState, useEffect, useCallback } from 'react';
import EduTooltip from './EduTooltip';
import VisualizationChart from './visualization/VisualizationChart';
import HovmollerDiagram from './visualization/HovmollerDiagram';
import PlaybackControls from './visualization/PlaybackControls';
import { useLanguage } from '../context/LanguageContext';
import './VisualizationArea.css';

/**
 * 上段: ある時刻の状態 (真値と推定) か、時空間の誤差。
 * 下段: 誤差の時間変化。クリック・ドラッグで上段に出す時刻を選ぶタイムラインを兼ねる。
 */
export default function VisualizationArea({
  methods,
  colors,
  simulationResults,
  showSpread,
  onToggleSpread,
  obsErrorStd,
}) {
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState('state1d');
  const [selectedStepIdx, setSelectedStepIdx] = useState(0);
  const [selectedMethodId, setSelectedMethodId] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 1x, 2x, 5x

  const results = simulationResults?.results;
  const timeSteps = results?.[0]?.timeSteps;
  const totalSteps = timeSteps?.length || 0;

  // 新しい結果が来たら、最後の時刻を表示して止める
  useEffect(() => {
    if (!results || results.length === 0) return;
    setSelectedStepIdx(Math.max(0, (results[0].timeSteps?.length || 1) - 1));
    setIsPlaying(false);
    setSelectedMethodId(prev => (
      prev && results.some(r => r.methodId === prev) ? prev : results[0].methodId
    ));
  }, [results]);

  useEffect(() => {
    if (!isPlaying || totalSteps <= 1) return;
    const interval = setInterval(() => {
      setSelectedStepIdx(prev => (prev >= totalSteps - 1 ? 0 : prev + 1));
    }, Math.round(300 / playbackSpeed));
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, totalSteps]);

  const handleSeek = useCallback((idx) => {
    setIsPlaying(false);
    setSelectedStepIdx(idx);
  }, []);

  const stepBy = (delta) => {
    setIsPlaying(false);
    if (totalSteps <= 1) return;
    setSelectedStepIdx(prev => (prev + delta + totalSteps) % totalSteps);
  };

  const hasResults = results && results.length > 0;

  return (
    <section className="viz-area" id="viz-area">
      {/* 上段: 状態 */}
      <div className="viz-sheet viz-sheet--state">
        <div className="viz-chart-header">
          <div className="viz-tab-row" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'state1d'}
              className={`viz-tab-btn ${viewMode === 'state1d' ? 'viz-tab-btn--active' : ''}`}
              onClick={() => setViewMode('state1d')}
            >
              {t('visualization.tabState1d')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === 'hovmoller'}
              className={`viz-tab-btn ${viewMode === 'hovmoller' ? 'viz-tab-btn--active' : ''}`}
              onClick={() => setViewMode('hovmoller')}
            >
              {t('visualization.tabHovmoller')}
            </button>
          </div>

          {viewMode === 'hovmoller' && hasResults && (
            <select
              className="hov-method-select"
              value={selectedMethodId}
              onChange={(e) => setSelectedMethodId(e.target.value)}
              aria-label={t('visualization.methodLabel')}
            >
              {results.map(r => {
                const method = methods.find(m => m.instanceId === r.methodId);
                return (
                  <option key={r.methodId} value={r.methodId}>
                    {method?.label || r.methodId}
                  </option>
                );
              })}
            </select>
          )}

          {viewMode === 'state1d' && hasResults && (
            <span className="viz-step-readout">
              <span className="viz-step-label">{t('visualization.step')}</span>
              <span className="typo-data">{timeSteps[selectedStepIdx]}</span>
            </span>
          )}
        </div>

        <div className="viz-chart-canvas-wrapper">
          {!hasResults && (
            <div className="viz-chart-placeholder">
              {methods.length === 0 ? (
                <p className="viz-placeholder-text">{t('controlPanel.emptyHint')}</p>
              ) : (
                <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
              )}
            </div>
          )}

          {viewMode === 'state1d' && (
            <VisualizationChart
              viewMode="state1d"
              simulationResults={simulationResults}
              methods={methods}
              colors={colors}
              selectedStepIdx={selectedStepIdx}
            />
          )}

          {viewMode === 'hovmoller' && hasResults && (
            <HovmollerDiagram
              simulationResults={simulationResults}
              selectedMethodId={selectedMethodId}
            />
          )}
        </div>
      </div>

      {/* 下段: 誤差の時間変化 = タイムライン */}
      <div className="viz-sheet viz-sheet--error">
        <div className="viz-chart-header">
          <PlaybackControls
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            onTogglePlay={() => setIsPlaying(p => !p)}
            onStepBack={() => stepBy(-1)}
            onStepForward={() => stepBy(1)}
            onSpeedChange={setPlaybackSpeed}
          />

          <div className="viz-legend">
            <span className="viz-legend-item">
              <span className="viz-legend-line viz-legend-solid" />
              <span>{t('visualization.rmseSolid')}</span>
              <EduTooltip paramId="rmse" />
            </span>
            <label className="viz-legend-item">
              <input type="checkbox" checked={showSpread} onChange={onToggleSpread} />
              <span className="viz-legend-line viz-legend-dashed" />
              <span>{t('visualization.spreadDashed')}</span>
            </label>
            <EduTooltip paramId="spread" />
          </div>
        </div>

        <div className="viz-chart-canvas-wrapper">
          <VisualizationChart
            viewMode="timeseries"
            simulationResults={simulationResults}
            methods={methods}
            colors={colors}
            showSpread={showSpread}
            selectedStepIdx={selectedStepIdx}
            obsErrorStd={obsErrorStd}
            onSeek={handleSeek}
          />
        </div>
      </div>
    </section>
  );
}
