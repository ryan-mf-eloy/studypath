import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trophy, CaretRight } from '@phosphor-icons/react';
import { useRoadmap } from '../../store/useRoadmapStore';
import type { Milestone } from '../../types';
import {
  resolveMilestoneColor,
  milestoneTypeLabel,
  milestoneStatusLabel,
} from '../../lib/utils';
import { ICONS } from '../../lib/iconRegistry';
import MilestoneDetailPanel from './MilestoneDetailPanel';

function MilestoneCard({
  milestone,
  onOpen,
}: {
  milestone: Milestone;
  onOpen: () => void;
}) {
  const color = resolveMilestoneColor(milestone);
  const Icon =
    milestone.icon && ICONS[milestone.icon] ? ICONS[milestone.icon] : Trophy;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex items-center"
      style={{
        width: '100%',
        gap: 14,
        padding: '14px 16px',
        border: '1px solid var(--text-08)',
        background: 'var(--bg-surface)',
        marginBottom: 8,
        cursor: 'pointer',
        textAlign: 'left',
        transition:
          'background-color var(--transition-fast), border-color var(--transition-fast)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--text-04)';
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--text-15)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--bg-surface)';
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--text-08)';
      }}
    >
      <span
        className="flex items-center justify-center"
        style={{
          width: 36,
          height: 36,
          color,
          flexShrink: 0,
        }}
      >
        <Icon size={22} weight="regular" />
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13.5,
            fontWeight: 500,
            color: 'var(--text)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {milestone.name}
        </div>
        <div
          style={{
            fontSize: 11,
            color: 'var(--text-50)',
            marginTop: 2,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {milestoneTypeLabel(milestone.type)} · {milestone.date} ·{' '}
          {milestoneStatusLabel(milestone.status)}
        </div>
      </div>

      <CaretRight size={13} style={{ color: 'var(--text-30)', flexShrink: 0 }} />
    </button>
  );
}

export default function MilestonesEditor() {
  const { t } = useTranslation();
  const roadmap = useRoadmap();
  const [detail, setDetail] = useState<Milestone | 'new' | null>(null);

  // Resolve current milestone from the store to get fresh data after refresh.
  const resolvedDetail: Milestone | 'new' | null =
    detail === 'new'
      ? 'new'
      : detail
      ? roadmap.milestones.find((m) => m.id === detail.id) ?? null
      : null;

  return (
    <div>
      <p
        style={{
          fontSize: 12.5,
          color: 'var(--text-50)',
          lineHeight: 1.55,
          margin: '0 0 20px',
        }}
      >
        {t('milestones.contextDescription')}
      </p>

      {roadmap.milestones.map((ms) => (
        <MilestoneCard
          key={ms.id}
          milestone={ms}
          onOpen={() => setDetail(ms)}
        />
      ))}

      <button
        type="button"
        onClick={() => setDetail('new')}
        className="flex items-center"
        style={{
          marginTop: 8,
          gap: 6,
          padding: '12px 16px',
          background: 'transparent',
          border: '1px dashed var(--text-15)',
          color: 'var(--text-50)',
          cursor: 'pointer',
          fontFamily: 'var(--font-sans)',
          fontSize: 13,
          width: '100%',
        }}
      >
        <Plus size={14} />
        {t('milestones.addMilestone')}
      </button>

      {resolvedDetail && (
        <MilestoneDetailPanel
          milestone={resolvedDetail}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  );
}
