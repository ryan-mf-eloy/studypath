import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import TopBar from '../components/layout/TopBar';
import StructureEditor from '../components/settings/StructureEditor';
import MilestonesEditor from '../components/settings/MilestonesEditor';
import GeneralSettings from '../components/settings/GeneralSettings';
import DataSettings from '../components/settings/DataSettings';

type Tab = 'structure' | 'milestones' | 'general' | 'data';

const TABS: { id: Tab; labelKey: string }[] = [
  { id: 'structure', labelKey: 'settings.tabs.structure' },
  { id: 'milestones', labelKey: 'settings.tabs.milestones' },
  { id: 'general', labelKey: 'settings.tabs.general' },
  { id: 'data', labelKey: 'settings.tabs.data' },
];

export default function Settings() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('structure');

  return (
    <div
      style={{
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg)',
      }}
    >
      <TopBar />

      <div
        style={{
          maxWidth: 1100,
          width: '100%',
          margin: '0 auto',
          padding: '20px var(--page-pad-x) 12px',
          flexShrink: 0,
        }}
      >
        <div style={{ marginBottom: 18 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '1.3px',
              textTransform: 'uppercase',
              color: 'var(--text-50)',
              marginBottom: 6,
            }}
          >
            {t('settings.sectionTitle')}
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 36,
              lineHeight: 1.05,
              color: 'var(--text)',
              margin: 0,
            }}
          >
            {t('settings.title')}
          </h1>
        </div>

        {/* Tabs */}
        <div
          className="flex"
          style={{
            gap: 4,
            borderBottom: '1px solid var(--text-08)',
          }}
        >
          {TABS.map((tabItem) => {
            const active = tab === tabItem.id;
            return (
              <button
                key={tabItem.id}
                type="button"
                onClick={() => setTab(tabItem.id)}
                style={{
                  padding: '10px 16px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: `2px solid ${active ? 'var(--accent-coral)' : 'transparent'}`,
                  color: active ? 'var(--text)' : 'var(--text-50)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                  marginBottom: -1,
                }}
              >
                {t(tabItem.labelKey)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content — scrollable */}
      <main
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          maxWidth: 1100,
          width: '100%',
          margin: '0 auto',
          padding: '18px var(--page-pad-x) 48px',
        }}
      >
        {tab === 'structure' && <StructureEditor />}
        {tab === 'milestones' && <MilestonesEditor />}
        {tab === 'general' && <GeneralSettings />}
        {tab === 'data' && <DataSettings />}
      </main>
    </div>
  );
}
