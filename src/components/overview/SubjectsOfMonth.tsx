import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../../store/useUIStore';
import { useProgressStore } from '../../store/useProgressStore';
import { useSessionsStore } from '../../store/useSessionsStore';
import { useRoadmap } from '../../store/useRoadmapStore';
import { focusLabel } from '../../lib/utils';
import { resolveFocusMeta } from '../../lib/subjectMeta';

function formatHours(ms: number): string {
  if (ms < 60_000) return '';
  const totalMinutes = Math.floor(ms / 60_000);
  if (totalMinutes < 60) return `${totalMinutes}min`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h${mins}`;
}

export default function SubjectsOfMonth() {
  const { t } = useTranslation();
  const activeMonthId = useUIStore(s => s.activeMonthId);
  const setActiveMonth = useUIStore(s => s.setActiveMonth);
  const setActiveView = useUIStore(s => s.setActiveView);
  const setActiveFocusType = useUIStore(s => s.setActiveFocusType);
  const setActivePage = useUIStore(s => s.setActivePage);
  const getFocusProgress = useProgressStore(s => s.getFocusProgress);
  const checkedTopics = useProgressStore(s => s.checkedTopics);
  const sessions = useSessionsStore(s => s.sessions);
  const roadmap = useRoadmap();

  const month = useMemo(
    () => roadmap.phases.flatMap(p => p.months).find(m => m.id === activeMonthId),
    [activeMonthId, roadmap],
  );

  if (!month) return null;

  return (
    <section>
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '1.1px',
          textTransform: 'uppercase',
          color: 'var(--text-30)',
          marginBottom: 10,
          display: 'block',
        }}
      >
        {t('overview.subjectsOfMonth.title')}
      </span>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 12,
        }}
      >
        {month.focuses.map(focus => {
          const subject = resolveFocusMeta(focus);
          const SubjectIcon = subject.Icon;
          const progress = getFocusProgress(focus.id, roadmap);
          const timeSpent = sessions
            .filter(s => s.focusId === focus.id)
            .reduce((acc, s) => acc + s.durationMs, 0);
          const timeLabel = formatHours(timeSpent);
          void checkedTopics;

          return (
            <button
              key={focus.id}
              type="button"
              onClick={() => {
                setActiveMonth(month.id);
                setActiveView('day');
                setActiveFocusType(focus.type);
                setActivePage('study');
              }}
              aria-label={t('overview.subjectOpenAria', { name: focus.name, pct: progress.pct })}
              className="flex flex-col"
              style={{
                background: 'transparent',
                border: '1px solid var(--text-08)',
                padding: '12px 14px',
                cursor: 'pointer',
                textAlign: 'left',
                gap: 8,
                transition:
                  'border-color var(--transition-fast), background-color var(--transition-fast)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--text-30)';
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--text-04)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--text-08)';
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
              }}
            >
              {/* Header row — type + pct */}
              <div
                className="flex items-center"
                style={{
                  gap: 6,
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: '0.8px',
                  textTransform: 'uppercase',
                  color: 'var(--text-30)',
                }}
              >
                <SubjectIcon
                  size={11}
                  weight="regular"
                  style={{ color: subject.color, flexShrink: 0 }}
                />
                <span>{focusLabel(focus.type)}</span>
                <span
                  style={{
                    marginLeft: 'auto',
                    color: 'var(--text-50)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {progress.done}/{progress.total}
                </span>
              </div>

              {/* Focus name */}
              <div
                style={{
                  fontSize: 12.5,
                  color: 'var(--text)',
                  lineHeight: 1.3,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  fontWeight: 500,
                }}
              >
                {focus.name}
              </div>

              {/* Progress bar + optional time */}
              <div className="flex items-center" style={{ gap: 8, marginTop: 'auto' }}>
                <div
                  style={{
                    flex: 1,
                    height: 2,
                    backgroundColor: 'var(--text-08)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${progress.pct}%`,
                      height: '100%',
                      backgroundColor: subject.color,
                      transition: 'width var(--transition-base)',
                    }}
                  />
                </div>
                {timeLabel && (
                  <span
                    style={{
                      fontSize: 10,
                      color: 'var(--text-30)',
                      fontVariantNumeric: 'tabular-nums',
                      flexShrink: 0,
                    }}
                  >
                    {timeLabel}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
