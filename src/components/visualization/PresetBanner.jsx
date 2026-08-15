import { getLocalizedPreset } from '../../data/presets';
import { useLanguage } from '../../context/LanguageContext';

export default function PresetBanner({ activePreset }) {
  const { lang } = useLanguage();

  if (!activePreset) return null;

  const locPreset = getLocalizedPreset(activePreset, lang);

  return (
    <div
      className="preset-banner card"
      style={{
        margin: '12px 16px 0 16px',
        borderLeft: '4px solid var(--primary)',
        backgroundColor: 'var(--surface-container-high)',
        flexShrink: 0,
        padding: '10px 14px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: '4px',
        borderRadius: 'var(--rounded-md)',
        minHeight: '68px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '18px' }}>
            school
          </span>
          <span style={{ color: 'var(--primary)', fontSize: '14px', fontWeight: '700' }}>
            {locPreset.title}
          </span>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--secondary)', fontWeight: '600', background: 'var(--surface-container-lowest)', padding: '2px 8px', borderRadius: 'var(--rounded-full)', border: '1px solid var(--outline-variant)' }}>
          {locPreset.theme}
        </span>
      </div>
      <p style={{ color: 'var(--on-surface-variant)', fontSize: '12px', lineHeight: '1.4', margin: 0 }}>
        {locPreset.description}
      </p>
    </div>
  );
}
