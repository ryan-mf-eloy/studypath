import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarCheck } from '@phosphor-icons/react';
import type { Focus, FocusType, Topic } from '../../types';
import { BUILT_IN_FOCUS_TYPES } from '../../types';
import { useUIStore } from '../../store/useUIStore';
import { useProgressStore } from '../../store/useProgressStore';
import { useMilestonesStore } from '../../store/useMilestonesStore';
import { useRoadmap } from '../../store/useRoadmapStore';
import {
  focusLabel,
  getPaceDelta,
  daysUntil,
  formatDateShort,
  resolveMilestoneColor,
  parseLocalDate,
  currentWeekRange,
} from '../../lib/utils';
import { resolveFocusMeta } from '../../lib/subjectMeta';

function accentForType(type: FocusType): string {
  if (type === 'main') return 'var(--accent-coral)';
  if (type === 'secondary') return 'var(--accent-blue)';
  if (type === 'continuous') return 'var(--accent-green)';
  return 'var(--text-50)';
}

export default function WeekView() {
  const { t } = useTranslation();
  const weekRange = useMemo(() => currentWeekRange(), []);
  const activeMonthId = useUIStore(s => s.activeMonthId);
  const checkedTopics = useProgressStore(s => s.checkedTopics);
  const toggleTopic = useProgressStore(s => s.toggleTopic);
  const getMonthProgress = useProgressStore(s => s.getMonthProgress);
  const getFocusProgress = useProgressStore(s => s.getFocusProgress);
  const isMilestoneDone = useMilestonesStore(s => s.isDone);
  const roadmap = useRoadmap();

  const activeMonth = useMemo(
    () => roadmap.phases.flatMap(p => p.months).find(m => m.id === activeMonthId),
    [activeMonthId, roadmap],
  );

  const monthProgress = useMemo(
    () => (activeMonthId ? getMonthProgress(activeMonthId, roadmap) : null),
    [activeMonthId, checkedTopics, getMonthProgress, roadmap],
  );

  const pace = useMemo(
    () => (activeMonthId ? getPaceDelta(activeMonthId, roadmap, checkedTopics) : null),
    [activeMonthId, checkedTopics, roadmap],
  );

  // Next 5 unchecked topics — built-ins primeiro (main/sec/cont) e depois
  // categorias custom, para qualquer cadência de período.
  const nextTopics = useMemo(() => {
    if (!activeMonth) return [] as Array<{ topic: Topic; focus: Focus }>;
    const out: Array<{ topic: Topic; focus: Focus }> = [];
    const ordered = [...activeMonth.focuses].sort((a, b) => {
      const aIdx = BUILT_IN_FOCUS_TYPES.indexOf(a.type);
      const bIdx = BUILT_IN_FOCUS_TYPES.indexOf(b.type);
      return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
    });
    for (const focus of ordered) {
      for (const topic of focus.topics) {
        if (!checkedTopics.includes(topic.id)) {
          out.push({ topic, focus });
          if (out.length >= 5) return out;
        }
      }
    }
    return out;
  }, [activeMonth, checkedTopics]);

  // Milestones in the next 60 days (upcoming, not yet done)
  const upcomingMilestones = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return roadmap.milestones
      .filter(ms => {
        if (isMilestoneDone(ms.id)) return false;
        const msDate = parseLocalDate(ms.date);
        const diff = msDate.getTime() - today.getTime();
        const days = diff / 86_400_000;
        return days >= 0 && days <= 60;
      })
      .sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime());
  }, [isMilestoneDone, roadmap.milestones]);

  if (!activeMonth || !monthProgress || !pace) {
    return (
      <div
        className="flex flex-1 items-center justify-center"
        style={{ color: 'var(--text-30)', fontSize: 14 }}
      >
        {t('period.noneSelected')}
      </div>
    );
  }

  // Pace indicator styling
  const deltaPct = Math.round(pace.delta * 100);
  const paceLabel =
    deltaPct >= 5 ? t('week.ahead', { pct: deltaPct }) :
    deltaPct <= -5 ? t('week.behind', { pct: deltaPct }) :
    t('week.onPace');
  const paceColor =
    deltaPct >= 5 ? 'var(--accent-green)' :
    deltaPct <= -5 ? 'var(--accent-coral)' :
    'var(--text-50)';

  return (
    <div
      className="flex flex-col"
      style={{
        maxWidth: 960,
        margin: '0 auto',
        width: '100%',
        gap: 36,
      }}
    >
      {/* ── Header: month pulse ──────────────────────── */}
      <section className="flex flex-col" style={{ gap: 20 }}>
        <div>
          <div
            className="flex items-center"
            style={{ gap: 10 }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: 'var(--text-30)',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
              }}
            >
              {t('week.pulseTitle')}
            </span>
            <span style={{ color: 'var(--text-15)' }}>·</span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: 'var(--text-50)',
                letterSpacing: '0.3px',
                textTransform: 'uppercase',
              }}
            >
              {t('week.weekOf', { range: weekRange })}
            </span>
          </div>
          <div
            className="flex items-baseline"
            style={{ gap: 14, marginTop: 6 }}
          >
            <h2
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 32,
                color: 'var(--text)',
                lineHeight: 1.1,
                margin: 0,
              }}
            >
              {activeMonth.label}
            </h2>
            <span
              style={{
                fontSize: 16,
                color: 'var(--text-50)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {t('week.topicsCount', { done: monthProgress.done, total: monthProgress.total })}
            </span>
            <span
              style={{
                fontSize: 13,
                color: paceColor,
                fontWeight: 500,
                marginLeft: 'auto',
              }}
            >
              {paceLabel}
            </span>
          </div>
        </div>

        {/* Pace bar — shows calendar position + actual progress */}
        <div className="flex flex-col" style={{ gap: 8 }}>
          <div
            className="relative"
            style={{
              height: 6,
              backgroundColor: 'var(--text-08)',
              borderRadius: 0,
              overflow: 'visible',
            }}
          >
            {/* Actual progress fill */}
            <div
              style={{
                width: `${Math.round(pace.progressPct * 100)}%`,
                height: '100%',
                backgroundColor: 'var(--text)',
                transition: 'width var(--transition-base)',
              }}
            />
            {/* Expected (calendar) marker */}
            <div
              style={{
                position: 'absolute',
                top: -4,
                bottom: -4,
                left: `${Math.round(pace.calendarPct * 100)}%`,
                width: 2,
                backgroundColor: 'var(--accent-coral)',
                pointerEvents: 'none',
              }}
            />
          </div>
          <div
            className="flex items-center"
            style={{
              fontSize: 11,
              color: 'var(--text-30)',
              gap: 16,
            }}
          >
            <span>{t('week.pctDone', { pct: Math.round(pace.progressPct * 100) })}</span>
            <span style={{ color: 'var(--text-15)' }}>·</span>
            <span>
              <span
                style={{
                  display: 'inline-block',
                  width: 2,
                  height: 10,
                  backgroundColor: 'var(--accent-coral)',
                  verticalAlign: 'middle',
                  marginRight: 6,
                }}
              />
              {t('week.pctElapsed', { pct: Math.round(pace.calendarPct * 100) })}
            </span>
          </div>
        </div>

        {/* Per-focus bars */}
        <div className="flex flex-col" style={{ gap: 12 }}>
          {activeMonth.focuses.map(focus => {
            const fp = getFocusProgress(focus.id, roadmap);
            const accent = accentForType(focus.type);
            const subject = resolveFocusMeta(focus);
            const SubjectIcon = subject.Icon;
            return (
              <div
                key={focus.id}
                className="flex items-center"
                style={{ gap: 16 }}
              >
                {/* Label column */}
                <div className="flex items-center" style={{ gap: 8, width: 120, flexShrink: 0 }}>
                  <SubjectIcon
                    size={14}
                    weight="regular"
                    style={{ color: subject.color, flexShrink: 0 }}
                  />
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.8px',
                      color: 'var(--text-50)',
                    }}
                  >
                    {focusLabel(focus.type)}
                  </span>
                </div>

                {/* Focus name */}
                <div className="flex-1" style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      color: 'var(--text)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {focus.name}
                  </div>
                  <div
                    style={{
                      height: 3,
                      backgroundColor: 'var(--text-08)',
                      marginTop: 5,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${fp.pct}%`,
                        height: '100%',
                        backgroundColor: accent,
                        transition: 'width var(--transition-base)',
                      }}
                    />
                  </div>
                </div>

                {/* Count */}
                <span
                  style={{
                    fontSize: 12,
                    color: 'var(--text-30)',
                    fontVariantNumeric: 'tabular-nums',
                    minWidth: 50,
                    textAlign: 'right',
                    flexShrink: 0,
                  }}
                >
                  {fp.done}/{fp.total} · {fp.pct}%
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Two-column: next actions + upcoming milestones ───────── */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)',
          gap: 36,
        }}
      >
        {/* Next 5 topics */}
        <div className="flex flex-col" style={{ gap: 12 }}>
          <div className="flex items-baseline" style={{ gap: 10 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: 'var(--text-30)',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
              }}
            >
              {t('week.nextActions')}
            </span>
            <span
              style={{
                fontSize: 11,
                color: 'var(--text-30)',
              }}
            >
              {nextTopics.length === 0
                ? t('week.allDone')
                : t('week.topicsToAttack', { count: nextTopics.length })}
            </span>
          </div>

          {nextTopics.length === 0 ? (
            <div
              className="flex items-center justify-center"
              style={{
                padding: '32px 20px',
                border: '1px dashed var(--text-15)',
                color: 'var(--text-30)',
                fontSize: 13,
              }}
            >
              {t('week.periodCompleted')}
            </div>
          ) : (
            <div className="flex flex-col">
              {nextTopics.map(({ topic, focus }, idx) => {
                const accent = accentForType(focus.type);
                const subject = resolveFocusMeta(focus);
                const SubjectIcon = subject.Icon;
                const focusName = focus.name;
                const isFirst = idx === 0;
                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => toggleTopic(topic.id)}
                    className="flex items-center"
                    style={{
                      padding: '12px 14px',
                      gap: 14,
                      background: isFirst ? 'var(--text-04)' : 'transparent',
                      border: '1px solid transparent',
                      borderBottom: '1px solid var(--text-08)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                      transition: 'background-color var(--transition-fast)',
                    }}
                    onMouseEnter={e => {
                      if (!isFirst) {
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--text-08)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isFirst) {
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    {/* Empty checkbox */}
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        border: `1.5px solid ${isFirst ? accent : 'var(--text-15)'}`,
                        flexShrink: 0,
                      }}
                    />
                    {/* Topic label + focus context */}
                    <div className="flex-1" style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 14,
                          color: 'var(--text)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {topic.label}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: 'var(--text-30)',
                          marginTop: 2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <SubjectIcon
                          size={12}
                          weight="regular"
                          style={{ color: subject.color, flexShrink: 0 }}
                        />
                        {focusName}
                      </div>
                    </div>
                    {isFirst && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: accent,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          flexShrink: 0,
                        }}
                      >
                        próximo
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming milestones */}
        <div className="flex flex-col" style={{ gap: 12 }}>
          <div className="flex items-baseline" style={{ gap: 10 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: 'var(--text-30)',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
              }}
            >
              {t('week.upcomingMilestones')}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-30)' }}>
              {t('week.next60Days')}
            </span>
          </div>

          {upcomingMilestones.length === 0 ? (
            <div
              className="flex items-center justify-center"
              style={{
                padding: '32px 20px',
                border: '1px dashed var(--text-15)',
                color: 'var(--text-30)',
                fontSize: 13,
                gap: 10,
                flexDirection: 'column',
              }}
            >
              <CalendarCheck size={24} />
              <span>{t('week.noUpcomingMilestones')}</span>
            </div>
          ) : (
            <div className="flex flex-col" style={{ gap: 10 }}>
              {upcomingMilestones.map(ms => {
                const days = daysUntil(ms.date);
                return (
                  <div
                    key={ms.id}
                    className="flex flex-col"
                    style={{
                      padding: '12px 14px',
                      border: '1px solid var(--text-08)',
                      background: 'var(--bg-surface)',
                      gap: 6,
                    }}
                  >
                    <div className="flex items-center" style={{ gap: 8 }}>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: resolveMilestoneColor(ms),
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 13,
                          color: 'var(--text)',
                          lineHeight: 1.3,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {ms.name}
                      </span>
                    </div>
                    <div
                      className="flex items-center"
                      style={{ gap: 8, fontSize: 11, color: 'var(--text-30)' }}
                    >
                      <span>{formatDateShort(ms.date)}</span>
                      <span style={{ color: 'var(--text-15)' }}>·</span>
                      <span
                        style={{
                          color: days <= 14 ? 'var(--accent-coral)' : 'var(--text-30)',
                          fontWeight: days <= 14 ? 500 : 400,
                        }}
                      >
                        {days === 0 ? 'hoje' : `em ${days} dias`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
