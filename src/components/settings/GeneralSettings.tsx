import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRoadmap } from '../../store/useRoadmapStore';
import { refreshRoadmap } from '../../lib/serverSync';
import * as api from '../../lib/api';
import { DatePicker } from '../ui/DatePicker';
import { SUPPORTED_LANGUAGES, setLanguage, type LanguageCode } from '../../i18n';

const LABEL: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.8px',
  textTransform: 'uppercase',
  color: 'var(--text-30)',
  marginBottom: 6,
};

export default function GeneralSettings() {
  const { t, i18n } = useTranslation();
  const roadmap = useRoadmap();
  const [startDate, setStartDate] = useState(roadmap.startDate);
  const [endDate, setEndDate] = useState(roadmap.endDate);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const dirty = startDate !== roadmap.startDate || endDate !== roadmap.endDate;

  const save = async () => {
    setSaving(true);
    try {
      await api.updateRoadmapSettings({ startDate, endDate });
      await refreshRoadmap();
      setSavedAt(Date.now());
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Language */}
      <section style={{ marginBottom: 36 }}>
        <div style={LABEL}>{t('settings.general.language')}</div>
        <p
          style={{
            fontSize: 12.5,
            color: 'var(--text-50)',
            lineHeight: 1.55,
            margin: '0 0 14px',
            maxWidth: 560,
          }}
        >
          {t('settings.general.languageDescription')}
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: 8,
            maxWidth: 560,
          }}
        >
          {SUPPORTED_LANGUAGES.map((lang) => {
            const active = i18n.language === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => setLanguage(lang.code as LanguageCode)}
                className="flex items-center"
                style={{
                  gap: 10,
                  padding: '12px 14px',
                  background: active ? 'var(--text-04)' : 'transparent',
                  border: `1px solid ${active ? 'var(--text-30)' : 'var(--text-15)'}`,
                  color: active ? 'var(--text)' : 'var(--text-50)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                  textAlign: 'left',
                  transition:
                    'background-color var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast)',
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--text-30)';
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--text-15)';
                    (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-50)';
                  }
                }}
              >
                <span style={{ fontSize: 18, lineHeight: 1 }}>{lang.flag}</span>
                <span>{lang.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Dates */}
      <p
        style={{
          fontSize: 12.5,
          color: 'var(--text-50)',
          lineHeight: 1.55,
          margin: '0 0 24px',
          maxWidth: 560,
        }}
      >
        {t('settings.general.description')}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 400 }}>
        <div>
          <div style={LABEL}>{t('settings.general.startDate')}</div>
          <DatePicker
            value={startDate}
            onChange={setStartDate}
            ariaLabel={t('settings.general.startDate')}
          />
        </div>

        <div>
          <div style={LABEL}>{t('settings.general.endDate')}</div>
          <DatePicker
            value={endDate}
            onChange={setEndDate}
            ariaLabel={t('settings.general.endDate')}
          />
        </div>

        <div className="flex items-center" style={{ gap: 12, marginTop: 8 }}>
          <button
            type="button"
            onClick={save}
            disabled={!dirty || saving}
            style={{
              padding: '10px 18px',
              border: '1px solid var(--text)',
              background: 'var(--text)',
              color: 'var(--bg-surface)',
              cursor: dirty && !saving ? 'pointer' : 'not-allowed',
              opacity: dirty && !saving ? 1 : 0.4,
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {saving ? t('common.saving') : t('common.save')}
          </button>
          {savedAt && !dirty && (
            <span style={{ fontSize: 11, color: 'var(--accent-green)' }}>{t('common.saved')}</span>
          )}
        </div>
      </div>
    </div>
  );
}
