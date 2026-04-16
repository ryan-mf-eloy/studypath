import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Upload, ArrowCounterClockwise, Warning } from '@phosphor-icons/react';
import * as api from '../../lib/api';
import { refreshRoadmap } from '../../lib/serverSync';
import { useRoadmap } from '../../store/useRoadmapStore';
import { confirm } from '../../store/useConfirmStore';
import type { RoadmapData } from '../../types';

const SECTION: React.CSSProperties = {
  padding: '18px 20px',
  border: '1px solid var(--text-08)',
  background: 'var(--bg-surface)',
  marginBottom: 16,
};

const SECTION_TITLE: React.CSSProperties = {
  fontFamily: 'var(--font-serif)',
  fontSize: 17,
  color: 'var(--text)',
  margin: '0 0 6px',
};

const SECTION_BODY: React.CSSProperties = {
  fontSize: 12.5,
  color: 'var(--text-50)',
  lineHeight: 1.55,
  margin: '0 0 14px',
};

const BUTTON: React.CSSProperties = {
  padding: '8px 14px',
  border: '1px solid var(--text-15)',
  background: 'var(--bg-surface)',
  color: 'var(--text)',
  cursor: 'pointer',
  fontFamily: 'var(--font-sans)',
  fontSize: 12,
  fontWeight: 500,
  gap: 6,
};

const DANGER_BUTTON: React.CSSProperties = {
  ...BUTTON,
  border: '1px solid var(--accent-coral)',
  color: 'var(--accent-coral)',
};

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 200);
}

export default function DataSettings() {
  const { t } = useTranslation();
  const roadmap = useRoadmap();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const exportRoadmap = () => {
    setError(null);
    downloadJson(roadmap, `studypath-roadmap-${new Date().toISOString().slice(0, 10)}.json`);
    setStatus(t('common.saved'));
    setTimeout(() => setStatus(null), 3000);
  };

  const importRoadmap = () => {
    setError(null);
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text) as RoadmapData;
        if (!data || !Array.isArray(data.phases)) {
          throw new Error('Invalid roadmap file');
        }
        const ok = await confirm({
          title: t('settings.data.importTitle') + '?',
          message: t('settings.data.importDescription'),
          confirmLabel: t('common.confirm'),
          cancelLabel: t('common.cancel'),
          destructive: true,
        });
        if (!ok) return;
        await api.replaceRoadmap(data);
        await refreshRoadmap();
        setStatus(t('common.saved'));
        setTimeout(() => setStatus(null), 3000);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    };
    input.click();
  };

  const resetRoadmap = async () => {
    setError(null);
    const ok = await confirm({
      title: t('settings.data.restoreConfirmTitle'),
      message: t('settings.data.restoreConfirmMessage'),
      confirmLabel: t('common.restore'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await api.resetRoadmap();
      await refreshRoadmap();
      setStatus(t('common.saved'));
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div>
      {status && (
        <div
          style={{
            padding: '10px 14px',
            border: '1px solid var(--accent-green)',
            background: 'var(--focus-cont-bg)',
            color: 'var(--accent-green)',
            fontSize: 12.5,
            marginBottom: 16,
          }}
        >
          {status}
        </div>
      )}

      {error && (
        <div
          className="flex items-start"
          style={{
            padding: '10px 14px',
            border: '1px solid var(--accent-coral)',
            background: 'var(--focus-main-bg)',
            color: 'var(--accent-coral)',
            fontSize: 12.5,
            marginBottom: 16,
            gap: 8,
          }}
        >
          <Warning size={14} weight="bold" style={{ flexShrink: 0, marginTop: 2 }} />
          <span>{error}</span>
        </div>
      )}

      <div style={SECTION}>
        <h3 style={SECTION_TITLE}>{t('settings.data.exportTitle')}</h3>
        <p style={SECTION_BODY}>{t('settings.data.exportDescription')}</p>
        <button
          type="button"
          onClick={exportRoadmap}
          className="flex items-center"
          style={BUTTON}
        >
          <Download size={14} />
          {t('settings.data.exportButton')}
        </button>
      </div>

      <div style={SECTION}>
        <h3 style={SECTION_TITLE}>{t('settings.data.importTitle')}</h3>
        <p style={SECTION_BODY}>{t('settings.data.importDescription')}</p>
        <button
          type="button"
          onClick={importRoadmap}
          className="flex items-center"
          style={BUTTON}
        >
          <Upload size={14} />
          {t('settings.data.importButton')}
        </button>
      </div>

      <div style={SECTION}>
        <h3 style={SECTION_TITLE}>{t('settings.data.restoreTitle')}</h3>
        <p style={SECTION_BODY}>{t('settings.data.restoreDescription')}</p>
        <button
          type="button"
          onClick={resetRoadmap}
          className="flex items-center"
          style={DANGER_BUTTON}
        >
          <ArrowCounterClockwise size={14} />
          {t('settings.data.restoreButton')}
        </button>
      </div>
    </div>
  );
}
