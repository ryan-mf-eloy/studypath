import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Trophy, ArrowRight } from '@phosphor-icons/react';
import { useUIStore } from '../../store/useUIStore';
import { useMilestonesStore } from '../../store/useMilestonesStore';
import { useRoadmap } from '../../store/useRoadmapStore';
import {
  daysUntil,
  formatDateShort,
  resolveMilestoneColor,
  parseLocalDate,
} from '../../lib/utils';

export default function NextMilestoneCard() {
  const { t } = useTranslation();
  const setActiveView = useUIStore(s => s.setActiveView);
  const setActivePage = useUIStore(s => s.setActivePage);
  const doneIds = useMilestonesStore(s => s.doneIds);
  const roadmap = useRoadmap();

  const nextMs = useMemo(() => {
    const pending = roadmap.milestones
      .filter(ms => !doneIds.includes(ms.id))
      .sort(
        (a, b) =>
          parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime(),
      );
    return pending[0] ?? null;
  }, [doneIds, roadmap]);

  if (!nextMs) return null;

  const days = daysUntil(nextMs.date);
  const color = resolveMilestoneColor(nextMs);
  const urgent = days <= 30;

  const typeLabel =
    nextMs.type === 'certification' ? t('milestones.types.certification')
    : nextMs.type === 'career'      ? t('milestones.types.career')
    : nextMs.type === 'personal'    ? t('milestones.types.personal')
    :                                 t('milestones.types.product');

  return (
    <section>
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '1.1px',
          textTransform: 'uppercase',
          color: 'var(--text-30)',
          marginBottom: 14,
          display: 'block',
        }}
      >
        {t('overview.nextMilestone.title')}
      </span>

      <button
        type="button"
        onClick={() => {
          setActiveView('year');
          setActivePage('study');
        }}
        aria-label={`${t('overview.nextMilestone.title')}: ${nextMs.name} ${t('overview.nextMilestone.daysAway', { count: days })}`}
        className="flex items-start"
        style={{
          width: '100%',
          border: '1px solid var(--text-15)',
          background: 'transparent',
          padding: '22px 24px',
          gap: 18,
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'border-color var(--transition-fast)',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--text)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--text-15)';
        }}
      >
        <Trophy
          size={26}
          weight="regular"
          style={{ color, flexShrink: 0, marginTop: 2 }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 20,
              color: 'var(--text)',
              lineHeight: 1.25,
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {nextMs.name}
          </h3>
          <div
            style={{
              fontSize: 12,
              color: 'var(--text-50)',
              marginTop: 6,
            }}
          >
            {typeLabel} · {formatDateShort(nextMs.date)}
          </div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: urgent ? 'var(--accent-coral)' : 'var(--text-50)',
              marginTop: 10,
            }}
          >
            {days === 0 ? t('overview.nextMilestone.today') : days === 1 ? t('common.tomorrow') : t('overview.nextMilestone.daysAway', { count: days })}
          </div>
        </div>
        <ArrowRight size={16} style={{ color: 'var(--text-30)', flexShrink: 0, marginTop: 4 }} />
      </button>
    </section>
  );
}
