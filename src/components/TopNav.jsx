import { useState, useRef, useEffect, useCallback } from 'react';
import { PRESETS } from '../constants';
import './TopNav.css';

export default function TopNav({ onSelectPreset, onOpenAdvanced }) {
  const [showPresets, setShowPresets] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowPresets(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleShare = useCallback(() => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }, []);

  return (
    <nav className="topnav" id="topnav">
      <div className="topnav-left">
        <span className="topnav-brand">EduDA</span>
        <span className="topnav-subtitle">Educational Data Assimilation</span>
      </div>
      <div className="topnav-right">
        {/* 🎓 プリセット実験ラボ Dropdown */}
        <div className="preset-dropdown-container" ref={dropdownRef}>
          <button
            className="btn btn-secondary topnav-preset-btn"
            onClick={() => setShowPresets(!showPresets)}
            id="btn-preset-lab"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>school</span>
            <span className="topnav-preset-label">🎓 プリセット実験ラボ</span>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
              {showPresets ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
            </span>
          </button>

          {showPresets && (
            <div className="preset-dropdown-menu">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  className="preset-dropdown-item"
                  onClick={() => {
                    onSelectPreset(preset);
                    setShowPresets(false);
                  }}
                  id={`preset-item-${preset.id}`}
                >
                  <span className="preset-item-title">{preset.title}</span>
                  <span className="preset-item-theme">{preset.theme}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 🔗 共有ボタン */}
        <button
          className={`btn-ghost topnav-share-btn ${copied ? 'copied' : ''}`}
          onClick={handleShare}
          id="btn-share-url"
          title="現在の実験・設定URLをクリップボードにコピー"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            {copied ? 'check' : 'share'}
          </span>
          <span className="topnav-share-label">
            {copied ? 'コピー完了!' : '共有'}
          </span>
        </button>

        <button
          className="btn-ghost topnav-settings-btn"
          onClick={onOpenAdvanced}
          id="btn-advanced-settings"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>settings</span>
          <span className="topnav-settings-label">高度な設定</span>
        </button>
      </div>
    </nav>
  );
}
