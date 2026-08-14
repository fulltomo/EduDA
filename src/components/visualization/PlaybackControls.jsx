import { useLanguage } from '../../context/LanguageContext';

export default function PlaybackControls({
  isPlaying,
  playbackSpeed,
  onTogglePlay,
  onStepBack,
  onStepForward,
  onSpeedChange,
}) {
  const { t } = useLanguage();

  return (
    <div className="viz-playback-controls">
      <div className="viz-playback-buttons">
        <button
          type="button"
          className="viz-playback-btn"
          onClick={onStepBack}
          title={t('visualization.stepBack')}
          aria-label={t('visualization.stepBack')}
        >
          <span className="material-symbols-outlined">skip_previous</span>
        </button>

        <button
          type="button"
          className="viz-playback-btn viz-play-pause-btn"
          onClick={onTogglePlay}
          title={isPlaying ? t('visualization.pause') : t('visualization.play')}
          aria-label={isPlaying ? t('visualization.pause') : t('visualization.play')}
        >
          <span className="material-symbols-outlined">
            {isPlaying ? 'pause' : 'play_arrow'}
          </span>
        </button>

        <button
          type="button"
          className="viz-playback-btn"
          onClick={onStepForward}
          title={t('visualization.stepForward')}
          aria-label={t('visualization.stepForward')}
        >
          <span className="material-symbols-outlined">skip_next</span>
        </button>
      </div>

      <div className="viz-speed-group">
        {[1, 2, 5].map((speed) => (
          <button
            key={speed}
            type="button"
            className={`viz-speed-btn ${playbackSpeed === speed ? 'viz-speed-btn--active' : ''}`}
            onClick={() => onSpeedChange(speed)}
            title={`${t('visualization.playbackSpeed')} ${speed}x`}
            aria-label={`${t('visualization.playbackSpeed')} ${speed}x`}
          >
            {speed}x
          </button>
        ))}
      </div>
    </div>
  );
}
