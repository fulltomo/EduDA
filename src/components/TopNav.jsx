import './TopNav.css';

export default function TopNav({ onOpenAdvanced }) {
  return (
    <nav className="topnav" id="topnav">
      <div className="topnav-left">
        <span className="topnav-brand">EduDA</span>
        <span className="topnav-subtitle">Educational Data Assimilation</span>
      </div>
      <div className="topnav-right">
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
