import { useState } from 'react';
import { CaretDown } from '@phosphor-icons/react';
import type { Focus, FocusType } from '../../types';
import { useProgressStore } from '../../store/useProgressStore';
import { focusLabel } from '../../lib/utils';
import { resolveFocusMeta } from '../../lib/subjectMeta';
import TopicRow from './TopicRow';

interface FocusColumnProps {
  focus: Focus;
}

/** Maps focus type to the corresponding CSS variable for accent color */
function accentForType(type: FocusType): string {
  return type === 'main'       ? 'var(--accent-coral)'
       : type === 'secondary'  ? 'var(--accent-blue)'
       :                         'var(--accent-green)';
}

export default function FocusColumn({ focus }: FocusColumnProps) {
  const checkedTopics = useProgressStore(s => s.checkedTopics);
  const [descOpen, setDescOpen] = useState(false);
  const accent = accentForType(focus.type);
  const subject = resolveFocusMeta(focus);
  const SubjectIcon = subject.Icon;

  const total = focus.topics.length;
  const done = focus.topics.filter(t => checkedTopics.includes(t.id)).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const progress = { done, total, pct };

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: `1px solid ${accent}`,
        borderRadius: 0,
      }}
    >
      {/* Colored header */}
      <div
        style={{
          backgroundColor: accent,
          padding: '14px 20px 12px',
        }}
      >
        {/* Type label + subject */}
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            color: 'rgba(255, 255, 255, 0.55)',
            display: 'block',
            marginBottom: 2,
          }}
        >
          {focusLabel(focus.type)} · {subject.label}
        </span>

        {/* Focus name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <SubjectIcon
            size={18}
            weight="regular"
            style={{ color: 'rgba(255, 255, 255, 0.9)', flexShrink: 0 }}
          />
          <h3
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 20,
              color: '#FFFFFF',
              lineHeight: 1.3,
              margin: 0,
            }}
          >
            {focus.name}
          </h3>
        </div>

        {/* Mastery note — collapsible, closed by default */}
        {focus.masteryNote && (
          <div style={{ marginTop: 4 }}>
            <button
              type="button"
              onClick={() => setDescOpen(prev => !prev)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                fontSize: 11,
                color: 'rgba(255, 255, 255, 0.45)',
                transition: 'color var(--transition-fast)',
              }}
            >
              <CaretDown
                size={12}
                weight="bold"
                style={{
                  transform: descOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform var(--transition-fast)',
                }}
              />
              {descOpen ? 'Ocultar descrição' : 'Ver descrição'}
            </button>
            {descOpen && (
              <p
                style={{
                  fontSize: 12,
                  fontStyle: 'italic',
                  color: 'rgba(255, 255, 255, 0.5)',
                  lineHeight: 1.5,
                  marginTop: 6,
                }}
              >
                {focus.masteryNote}
              </p>
            )}
          </div>
        )}

        {/* Progress bar + count — inside header */}
        <div className="flex items-center gap-3" style={{ marginTop: 10 }}>
          <div
            className="flex-1"
            style={{
              height: 3,
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              borderRadius: 0,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${progress.pct}%`,
                height: '100%',
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                transition: 'width var(--transition-base)',
              }}
            />
          </div>
          <span
            style={{
              fontSize: 12,
              color: 'rgba(255, 255, 255, 0.55)',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {progress.done}/{progress.total}
          </span>
        </div>
      </div>

      {/* Body — topic list */}
      <div className="flex flex-col flex-1" style={{ padding: '12px 16px', minHeight: 0 }}>
        <div className="flex flex-col flex-1" style={{ overflowY: 'auto', minHeight: 0 }}>
          {focus.topics.map((topic, idx) => (
            <TopicRow
              key={topic.id}
              topic={topic}
              accentColor={accent}
              index={idx + 1}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
