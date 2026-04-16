import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  Trophy,
  Check,
  Warning,
} from '@phosphor-icons/react';
import type { Milestone, MilestoneType, MilestoneStatus } from '../../types';
import { BUILT_IN_MILESTONE_TYPES, BUILT_IN_MILESTONE_STATUSES } from '../../types';
import { CategorySelect } from '../ui/CategorySelect';
import { DatePicker } from '../ui/DatePicker';
import AppearanceButton from '../ui/AppearanceButton';
import * as api from '../../lib/api';
import { refreshRoadmap } from '../../lib/serverSync';
import {
  nanoid,
  resolveMilestoneColor,
  milestoneColor,
  milestoneTypeLabel,
  milestoneStatusLabel,
  milestoneStatusColor,
} from '../../lib/utils';
import { useRoadmap } from '../../store/useRoadmapStore';
import { confirm } from '../../store/useConfirmStore';

interface MilestoneDetailPanelProps {
  milestone: Milestone | 'new';
  onClose: () => void;
}

function buildTypeOptions() {
  return BUILT_IN_MILESTONE_TYPES.map((t) => ({
    value: t,
    label: milestoneTypeLabel(t),
    color: milestoneColor(t),
  }));
}
function buildStatusOptions() {
  return BUILT_IN_MILESTONE_STATUSES.map((s) => ({
    value: s,
    label: milestoneStatusLabel(s),
    color: milestoneStatusColor(s),
  }));
}

const EMPTY: Milestone = {
  id: '',
  name: '',
  type: 'certification',
  date: new Date().toISOString().slice(0, 10),
  status: 'pending',
  description: '',
};

/**
 * Slide-over à direita pra criar/editar um marco — nome, tipo, data, status,
 * identidade visual (ícone + cor), descrição. Auto-save on blur pra edição,
 * Create explícito pro modo "new".
 */
export default function MilestoneDetailPanel({ milestone, onClose }: MilestoneDetailPanelProps) {
  const { t } = useTranslation();
  const TYPE_OPTIONS = useMemo(buildTypeOptions, [t]);
  const STATUS_OPTIONS = useMemo(buildStatusOptions, [t]);
  const isNew = milestone === 'new';
  const [draft, setDraft] = useState<Milestone>(isNew ? EMPTY : milestone);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const roadmap = useRoadmap();

  const customTypes = useMemo(() => {
    const set = new Set<string>();
    for (const m of roadmap.milestones) {
      if (m.type && !BUILT_IN_MILESTONE_TYPES.includes(m.type)) set.add(m.type);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [roadmap.milestones]);

  const customStatuses = useMemo(() => {
    const set = new Set<string>();
    for (const m of roadmap.milestones) {
      if (m.status && !BUILT_IN_MILESTONE_STATUSES.includes(m.status)) set.add(m.status);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [roadmap.milestones]);

  useEffect(() => {
    setDraft(isNew ? EMPTY : milestone);
  }, [milestone, isNew]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const previewColor = resolveMilestoneColor(draft);

  const saveField = async <K extends keyof Milestone>(key: K, value: Milestone[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    if (isNew) return;
    setError(null);
    try {
      await api.updateRoadmapMilestone((milestone as Milestone).id, {
        [key]: value as unknown,
      } as Record<string, unknown>);
      await refreshRoadmap();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const createNew = async () => {
    if (!draft.name.trim() || !draft.date) {
      setError(t('milestones.nameRequired'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.createRoadmapMilestone({
        id: nanoid('ms'),
        name: draft.name.trim(),
        type: draft.type,
        date: draft.date,
        status: draft.status,
        description: draft.description || undefined,
        icon: draft.icon ?? null,
        color: draft.color ?? null,
      });
      await refreshRoadmap();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (isNew) return;
    const ok = await confirm({
      title: t('milestones.deleteMilestone'),
      message: t('milestones.deleteConfirm', { name: (milestone as Milestone).name }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    await api.deleteRoadmapMilestone((milestone as Milestone).id);
    await refreshRoadmap();
    onClose();
  };

  const deleteTypeCategory = async (category: string) => {
    const affected = roadmap.milestones.filter((m) => m.type === category);
    const ok = await confirm({
      title: t('settings.milestones.deleteTypeTitle', { name: category }),
      message:
        affected.length === 0
          ? t('settings.milestones.deleteTypeUnused')
          : t('settings.milestones.deleteTypeInUse', { count: affected.length }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    for (const m of affected) {
      await api.updateRoadmapMilestone(m.id, { type: 'certification' });
    }
    await refreshRoadmap();
    if (!isNew && (milestone as Milestone).type === category) {
      setDraft((prev) => ({ ...prev, type: 'certification' }));
    }
  };

  const deleteStatusCategory = async (category: string) => {
    const affected = roadmap.milestones.filter((m) => m.status === category);
    const ok = await confirm({
      title: t('settings.milestones.deleteStatusTitle', { name: category }),
      message:
        affected.length === 0
          ? t('settings.milestones.deleteStatusUnused')
          : t('settings.milestones.deleteStatusInUse', { count: affected.length }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    for (const m of affected) {
      await api.updateRoadmapMilestone(m.id, { status: 'pending' });
    }
    await refreshRoadmap();
    if (!isNew && (milestone as Milestone).status === category) {
      setDraft((prev) => ({ ...prev, status: 'pending' }));
    }
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'var(--bg-backdrop)',
          zIndex: 440,
          animation: 'sp-confirm-backdrop-in 200ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      />
      <aside
        role="dialog"
        aria-label={isNew ? t('milestones.newMilestone') : t('milestones.editMilestone', { name: draft.name })}
        className="sp-glass"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100vh',
          width: 520,
          maxWidth: '100vw',
          borderLeft: '1px solid var(--glass-border)',
          boxShadow: '-16px 0 40px var(--shadow-md)',
          zIndex: 450,
          display: 'flex',
          flexDirection: 'column',
          animation: 'sp-pop-in 280ms cubic-bezier(0.22, 1, 0.36, 1)',
          transformOrigin: 'right center',
        }}
      >
        {/* Header */}
        <header
          className="flex items-center"
          style={{
            padding: '18px 22px 16px',
            gap: 12,
            borderBottom: '1px solid var(--text-08)',
            flexShrink: 0,
          }}
        >
          <AppearanceButton
            icon={draft.icon}
            color={draft.color}
            fallbackIcon={Trophy}
            fallbackColor={previewColor}
            size={28}
            onChangeIcon={(v) => saveField('icon', v ?? undefined)}
            onChangeColor={(v) => saveField('color', v ?? undefined)}
            ariaLabel={t('settings.structure.editAppearanceMilestone')}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '1.2px',
                textTransform: 'uppercase',
                color: 'var(--text-30)',
              }}
            >
              {t('milestones.milestone')}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 18,
                color: 'var(--text)',
                lineHeight: 1.15,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {draft.name || t('milestones.newMilestone')}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            style={{
              padding: 6,
              background: 'transparent',
              border: 'none',
              color: 'var(--text-50)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <X size={16} />
          </button>
        </header>

        {/* Body */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: '22px 22px 36px',
          }}
        >
          {error && (
            <div
              className="flex items-start"
              style={{
                padding: '10px 12px',
                border: '1px solid var(--accent-coral)',
                background: 'var(--focus-main-bg)',
                color: 'var(--accent-coral)',
                fontSize: 12,
                marginBottom: 18,
                gap: 8,
              }}
            >
              <Warning size={13} weight="bold" style={{ marginTop: 2, flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Name */}
          <section style={{ marginBottom: 18 }}>
            <label style={LABEL} htmlFor="ms-name">
              {t('settings.structure.name')}
            </label>
            <input
              id="ms-name"
              autoFocus={isNew}
              value={draft.name}
              onChange={(e) => {
                if (isNew) {
                  setDraft({ ...draft, name: e.target.value });
                } else {
                  setDraft({ ...draft, name: e.target.value });
                }
              }}
              onBlur={() => {
                if (!isNew && draft.name.trim() !== (milestone as Milestone).name) {
                  saveField('name', draft.name.trim());
                }
              }}
              placeholder={t('milestones.namePlaceholder')}
              style={INPUT}
            />
          </section>

          {/* Type + Status + Date */}
          <section style={{ marginBottom: 18 }}>
            <div style={LABEL}>{t('focusDetail.categoryLabel')}</div>
            <div className="flex items-center" style={{ gap: 8, flexWrap: 'wrap' }}>
              <CategorySelect
                value={draft.type}
                builtIn={TYPE_OPTIONS}
                custom={customTypes}
                onChange={(v: MilestoneType) => saveField('type', v)}
                onDelete={deleteTypeCategory}
                ariaLabel={t('focusDetail.categoryLabel')}
              />
              <CategorySelect
                value={draft.status}
                builtIn={STATUS_OPTIONS}
                custom={customStatuses}
                onChange={(v: MilestoneStatus) => saveField('status', v)}
                onDelete={deleteStatusCategory}
                ariaLabel={t('milestones.status.pending')}
              />
              <DatePicker
                value={draft.date}
                onChange={(next) => {
                  setDraft({ ...draft, date: next });
                  if (!isNew && next !== (milestone as Milestone).date) {
                    saveField('date', next);
                  }
                }}
                ariaLabel="Data do marco"
              />
            </div>
          </section>

          {/* Description */}
          <section style={{ marginBottom: 22 }}>
            <label style={LABEL} htmlFor="ms-desc">
              {t('settings.structure.masteryNote')}
            </label>
            <textarea
              id="ms-desc"
              value={draft.description ?? ''}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              onBlur={() => {
                if (!isNew && (draft.description ?? '') !== ((milestone as Milestone).description ?? '')) {
                  saveField('description', draft.description ?? '');
                }
              }}
              rows={3}
              placeholder={t('milestones.descriptionPlaceholder')}
              style={{
                ...INPUT,
                minHeight: 74,
                resize: 'vertical',
                fontFamily: 'var(--font-sans)',
              }}
            />
          </section>

          {/* Footer actions */}
          {isNew ? (
            <div className="flex" style={{ gap: 10 }}>
              <button
                type="button"
                onClick={createNew}
                disabled={saving || !draft.name.trim() || !draft.date}
                className="flex items-center"
                style={{
                  gap: 6,
                  padding: '10px 18px',
                  border: '1px solid var(--text)',
                  background: 'var(--text)',
                  color: 'var(--bg-surface)',
                  cursor:
                    saving || !draft.name.trim() || !draft.date ? 'not-allowed' : 'pointer',
                  opacity: saving || !draft.name.trim() || !draft.date ? 0.4 : 1,
                  fontFamily: 'var(--font-sans)',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <Check size={13} weight="bold" />
                {t('milestones.createMilestone')}
              </button>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '10px 16px',
                  border: '1px solid var(--text-15)',
                  background: 'transparent',
                  color: 'var(--text-50)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 13,
                }}
              >
                {t('common.cancel')}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={remove}
              className="flex items-center"
              style={{
                gap: 6,
                padding: '10px 16px',
                border: '1px solid var(--accent-coral)',
                background: 'transparent',
                color: 'var(--accent-coral)',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                fontSize: 12,
              }}
            >
              <X size={12} weight="bold" />
              {t('common.delete')}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}

const LABEL: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.8px',
  textTransform: 'uppercase',
  color: 'var(--text-30)',
  marginBottom: 8,
};

const INPUT: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid var(--text-15)',
  background: 'transparent',
  color: 'var(--text)',
  fontFamily: 'var(--font-sans)',
  fontSize: 13,
  outline: 'none',
};
