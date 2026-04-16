import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../../store/useUIStore';
import { useProgressStore } from '../../store/useProgressStore';
import { useSessionsStore } from '../../store/useSessionsStore';
import { useRoadmap } from '../../store/useRoadmapStore';
import {
  getGreeting,
  findPhaseForMonth,
  monthIndexInRoadmap,
  phaseShortName,
  getPaceDelta,
} from '../../lib/utils';

export default function HeroBlock() {
  const { t, i18n } = useTranslation();
  const activeMonthId = useUIStore(s => s.activeMonthId);
  const getTotalProgress = useProgressStore(s => s.getTotalProgress);
  const checkedTopics = useProgressStore(s => s.checkedTopics);
  const sessions = useSessionsStore(s => s.sessions);
  const roadmap = useRoadmap();

  const formatWeekTime = (ms: number): string => {
    if (ms < 60_000) return '';
    const totalMinutes = Math.floor(ms / 60_000);
    if (totalMinutes < 60) return t('overview.minutesThisWeek', { count: totalMinutes });
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return mins === 0
      ? t('overview.hoursThisWeek', { hours })
      : t('overview.hoursMinsThisWeek', { hours, mins });
  };

  const formatLongDate = (date: Date): string => {
    const raw = new Intl.DateTimeFormat(i18n.language, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(date);
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  };

  const greeting = getGreeting();
  const today = useMemo(() => formatLongDate(new Date()), [i18n.language]);
  const totalPct = getTotalProgress(roadmap);

  const deltaPct = useMemo(() => {
    if (!activeMonthId) return 0;
    const pace = getPaceDelta(activeMonthId, roadmap, checkedTopics);
    return Math.round(pace.delta * 100);
  }, [activeMonthId, checkedTopics, roadmap]);

  const weekTime = useMemo(() => {
    const weekAgo = Date.now() - 7 * 86_400_000;
    return sessions
      .filter(s => new Date(s.startedAt).getTime() >= weekAgo)
      .reduce((acc, s) => acc + s.durationMs, 0);
  }, [sessions]);
  const weekTimeLabel = formatWeekTime(weekTime);

  const context = useMemo(() => {
    if (!activeMonthId) return null;
    const phase = findPhaseForMonth(roadmap, activeMonthId);
    const { index, total } = monthIndexInRoadmap(roadmap, activeMonthId);
    return { phase, monthIndex: index, monthTotal: total };
  }, [activeMonthId, roadmap]);

  return (
    <header
      className="flex"
      style={{
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        gap: 24,
        flexWrap: 'wrap',
      }}
    >
      <div className="flex flex-col" style={{ gap: 6 }}>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '1.3px',
            textTransform: 'uppercase',
            color: 'var(--text-50)',
          }}
        >
          {t('overview.greetingName', { greeting, name: 'Ryan' })}
        </span>
        <div className="flex items-baseline" style={{ gap: 14, flexWrap: 'wrap' }}>
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 36,
              lineHeight: 1.05,
              color: 'var(--text)',
              margin: 0,
            }}
          >
            {today}
          </h1>
          {deltaPct !== 0 && (
            <span
              style={{
                fontSize: 12,
                color: deltaPct < 0 ? 'var(--accent-coral)' : 'var(--accent-green)',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '0.2px',
              }}
            >
              {deltaPct < 0
                ? t('overview.behind', { pct: Math.abs(deltaPct) })
                : t('overview.ahead', { pct: deltaPct })}
            </span>
          )}
        </div>
      </div>

      {context?.phase && (
        <span
          style={{
            fontSize: 14,
            color: 'var(--text-50)',
            fontVariantNumeric: 'tabular-nums',
            paddingBottom: 10,
          }}
        >
          {t('overview.monthContext', {
            index: context.monthIndex,
            total: context.monthTotal,
            phase: phaseShortName(context.phase.label),
            pct: totalPct,
          })}
          {weekTimeLabel && ` · ${weekTimeLabel}`}
        </span>
      )}
    </header>
  );
}
