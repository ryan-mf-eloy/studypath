import { useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { FocusType } from '../../types';
import { useUIStore } from '../../store/useUIStore';
import { useProgressStore } from '../../store/useProgressStore';
import { useRoadmap } from '../../store/useRoadmapStore';
import { focusLabel } from '../../lib/utils';
import { resolveFocusMeta } from '../../lib/subjectMeta';
import TopicRow from '../ui/TopicRow';

function accentForType(type: FocusType): string {
  if (type === 'main') return 'var(--accent-coral)';
  if (type === 'secondary') return 'var(--accent-blue)';
  if (type === 'continuous') return 'var(--accent-green)';
  return 'var(--text-50)';
}

export default function DayView() {
  const { t } = useTranslation();
  const activeMonthId = useUIStore(s => s.activeMonthId);
  const activeFocusType = useUIStore(s => s.activeFocusType);
  const setActiveFocusType = useUIStore(s => s.setActiveFocusType);
  const checkedTopics = useProgressStore(s => s.checkedTopics);
  const getFocusProgress = useProgressStore(s => s.getFocusProgress);
  const roadmap = useRoadmap();

  const activeMonth = useMemo(
    () => roadmap.phases.flatMap(p => p.months).find(m => m.id === activeMonthId),
    [activeMonthId, roadmap],
  );

  const activeFocus = useMemo(
    () => activeMonth?.focuses.find(f => f.type === activeFocusType),
    [activeMonth, activeFocusType],
  );

  // Keyboard shortcuts [ / ] to cycle through the focuses in the active month.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (e.key !== '[' && e.key !== ']') return;
      if (!activeMonth) return;
      e.preventDefault();
      const order = activeMonth.focuses.map((f) => f.type);
      if (order.length === 0) return;
      const idx = order.indexOf(activeFocusType);
      const delta = e.key === ']' ? 1 : -1;
      const nextIdx = idx === -1 ? 0 : (idx + delta + order.length) % order.length;
      setActiveFocusType(order[nextIdx]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeFocusType, setActiveFocusType, activeMonth]);

  if (!activeMonth) {
    return (
      <div
        className="flex flex-1 items-center justify-center"
        style={{ color: 'var(--text-30)', fontSize: 14 }}
      >
        {t('period.noneSelected')}
      </div>
    );
  }

  if (!activeFocus) {
    return (
      <div
        className="flex flex-1 items-center justify-center"
        style={{ color: 'var(--text-30)', fontSize: 14 }}
      >
        {t('period.focusUnavailable')}
      </div>
    );
  }

  const focusProgress = getFocusProgress(activeFocus.id, roadmap);
  const accent = accentForType(activeFocus.type);
  const subject = resolveFocusMeta(activeFocus);
  const SubjectIcon = subject.Icon;

  // Find the index of the first unchecked topic (the "next" one to highlight)
  const firstUncheckedIdx = activeFocus.topics.findIndex(t => !checkedTopics.includes(t.id));

  return (
    <div
      className="flex flex-col"
      style={{
        maxWidth: 760,
        margin: '0 auto',
        width: '100%',
        height: '100%',
        minHeight: 0,
        gap: 28,
      }}
    >
      {/* Focus type selector pills */}
      <div className="flex items-center" style={{ gap: 8, justifyContent: 'space-between' }}>
        <div className="flex items-center" style={{ gap: 6 }}>
          {activeMonth.focuses.map(f => {
            const isActive = f.type === activeFocusType;
            const a = accentForType(f.type);
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveFocusType(f.type)}
                className="flex items-center"
                style={{
                  padding: '7px 14px',
                  gap: 8,
                  background: isActive ? 'var(--text-08)' : 'transparent',
                  border: `1px solid ${isActive ? 'var(--text-30)' : 'var(--text-15)'}`,
                  borderRadius: 0,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontFamily: 'var(--font-sans)',
                  color: isActive ? 'var(--text)' : 'var(--text-50)',
                  transition: 'border-color var(--transition-fast), background-color var(--transition-fast), color var(--transition-fast)',
                  fontWeight: isActive ? 600 : 500,
                  letterSpacing: '0.3px',
                  textTransform: 'uppercase',
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    backgroundColor: a,
                    flexShrink: 0,
                  }}
                />
                {focusLabel(f.type)}
              </button>
            );
          })}
        </div>

        {/* Keyboard hint */}
        <span
          style={{
            fontSize: 11,
            color: 'var(--text-30)',
            letterSpacing: '0.3px',
          }}
        >
          <kbd
            style={{
              padding: '2px 6px',
              border: '1px solid var(--text-15)',
              fontSize: 10,
              fontFamily: 'var(--font-sans)',
              color: 'var(--text-50)',
              marginRight: 4,
            }}
          >
            [
          </kbd>
          <kbd
            style={{
              padding: '2px 6px',
              border: '1px solid var(--text-15)',
              fontSize: 10,
              fontFamily: 'var(--font-sans)',
              color: 'var(--text-50)',
              marginRight: 6,
            }}
          >
            ]
          </kbd>
          {t('period.toggleFocusHint')}
        </span>
      </div>

      {/* Focus header */}
      <div className="flex flex-col" style={{ gap: 14 }}>
        <div className="flex items-center" style={{ gap: 10 }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: accent,
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: 'var(--text-50)',
            }}
          >
            {focusLabel(activeFocus.type)} · {subject.label} · {activeMonth.label}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <SubjectIcon
            size={34}
            weight="regular"
            style={{ color: subject.color, flexShrink: 0 }}
          />
          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 40,
              color: 'var(--text)',
              lineHeight: 1.15,
              margin: 0,
            }}
          >
            {activeFocus.name}
          </h2>
        </div>

        {activeFocus.masteryNote && (
          <p
            style={{
              fontSize: 15,
              color: 'var(--text-50)',
              lineHeight: 1.6,
              margin: 0,
              maxWidth: 620,
            }}
          >
            {activeFocus.masteryNote}
          </p>
        )}

        {/* Progress bar */}
        <div className="flex items-center" style={{ gap: 14, marginTop: 6 }}>
          <div
            className="flex-1"
            style={{
              height: 4,
              backgroundColor: 'var(--text-08)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${focusProgress.pct}%`,
                height: '100%',
                backgroundColor: accent,
                transition: 'width var(--transition-base)',
              }}
            />
          </div>
          <span
            style={{
              fontSize: 12,
              color: 'var(--text-30)',
              fontVariantNumeric: 'tabular-nums',
              flexShrink: 0,
            }}
          >
            {focusProgress.done} / {focusProgress.total} · {focusProgress.pct}%
          </span>
        </div>
      </div>

      {/* Topic list — scrolls independently */}
      <div
        className="flex flex-col"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          paddingBottom: 24,
          paddingRight: 8,
          marginRight: -8,
        }}
      >
        {activeFocus.topics.map((topic, idx) => {
          const isNext = idx === firstUncheckedIdx;
          return (
            <div
              key={topic.id}
              style={{
                position: 'relative',
                borderBottom: '1px solid var(--text-08)',
              }}
            >
              {isNext && (
                <div
                  aria-hidden
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 3,
                    backgroundColor: accent,
                  }}
                />
              )}
              <div
                style={{
                  paddingLeft: isNext ? 6 : 0,
                }}
              >
                <TopicRow topic={topic} accentColor={accent} index={idx + 1} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
