import { ArrowRight } from '@phosphor-icons/react';
import type { Focus, FocusType } from '../../types';
import { useProgressStore } from '../../store/useProgressStore';
import { focusLabel } from '../../lib/utils';
import { resolveFocusMeta } from '../../lib/subjectMeta';

interface FocusCardProps {
  focus: Focus;
  /** Optional month label to show in the eyebrow (e.g. "Abril 2026") */
  monthLabel?: string;
  /** When true, adds a subtle indicator that this is the active month's focus */
  isActive?: boolean;
  onOpen: () => void;
}

function accentForType(type: FocusType): string {
  return type === 'main'       ? 'var(--accent-coral)'
       : type === 'secondary'  ? 'var(--accent-blue)'
       :                         'var(--accent-green)';
}

export default function FocusCard({
  focus,
  monthLabel,
  isActive = false,
  onOpen,
}: FocusCardProps) {
  const checkedTopics = useProgressStore(s => s.checkedTopics);

  const accent = accentForType(focus.type);
  const subject = resolveFocusMeta(focus);
  const SubjectIcon = subject.Icon;

  const total = focus.topics.length;
  const done = focus.topics.filter(t => checkedTopics.includes(t.id)).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Abrir ${focus.name}`}
      style={{
        width: '100%',
        backgroundColor: accent,
        border: 'none',
        outline: isActive ? `2px solid ${accent}` : 'none',
        outlineOffset: 3,
        padding: '18px 20px 16px',
        cursor: 'pointer',
        textAlign: 'left',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        transition: 'filter var(--transition-fast), transform var(--transition-fast)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.06)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1)';
      }}
    >
      {/* Eyebrow: type · subject · month */}
      <div
        className="flex items-center"
        style={{
          gap: 8,
          fontSize: 10,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '1px',
          color: 'rgba(255, 255, 255, 0.72)',
        }}
      >
        <span>{focusLabel(focus.type)}</span>
        <span style={{ color: 'rgba(255, 255, 255, 0.38)' }}>·</span>
        <span>{subject.label}</span>
        {monthLabel && (
          <>
            <span style={{ color: 'rgba(255, 255, 255, 0.38)' }}>·</span>
            <span>{monthLabel}</span>
          </>
        )}
      </div>

      {/* Name row: icon + focus name + arrow */}
      <div className="flex items-start" style={{ gap: 12 }}>
        <SubjectIcon
          size={22}
          weight="regular"
          style={{
            color: '#FFFFFF',
            flexShrink: 0,
            marginTop: 2,
            opacity: 0.95,
          }}
        />
        <h3
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 20,
            color: '#FFFFFF',
            lineHeight: 1.25,
            margin: 0,
            flex: 1,
            minWidth: 0,
          }}
        >
          {focus.name}
        </h3>
        <ArrowRight
          size={16}
          weight="bold"
          style={{
            color: 'rgba(255, 255, 255, 0.75)',
            flexShrink: 0,
            marginTop: 5,
          }}
        />
      </div>

      {/* Progress bar + count */}
      <div className="flex items-center" style={{ gap: 12 }}>
        <div
          className="flex-1"
          style={{
            height: 3,
            backgroundColor: 'rgba(255, 255, 255, 0.22)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: '100%',
              backgroundColor: 'rgba(255, 255, 255, 0.85)',
              transition: 'width var(--transition-base)',
            }}
          />
        </div>
        <span
          style={{
            fontSize: 11,
            color: 'rgba(255, 255, 255, 0.75)',
            whiteSpace: 'nowrap',
            fontVariantNumeric: 'tabular-nums',
            flexShrink: 0,
            fontWeight: 500,
          }}
        >
          {done}/{total} · {pct}%
        </span>
      </div>
    </button>
  );
}
