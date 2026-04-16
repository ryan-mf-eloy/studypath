import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  Brain,
  Lightning,
  NotePencil,
  CheckCircle,
  Clock,
} from '@phosphor-icons/react';
import { useRoadmap } from '../../store/useRoadmapStore';
import { useUIStore } from '../../store/useUIStore';
import { useProgressStore } from '../../store/useProgressStore';
import { useReviewStore } from '../../store/useReviewStore';
import { useNotesStore } from '../../store/useNotesStore';
import { useRoutineStore } from '../../store/useRoutineStore';
import { useTimerStore } from '../../store/useTimerStore';
import { findNextUpcoming, formatTime } from '../../lib/routineCalendar';
import {
  findNextTopic,
  findTopicContext,
  nextMonthAfter,
  daysLeftInMonth,
  computeDailyGoal,
  focusLabel,
  timeAgo,
} from '../../lib/utils';
import { resolveFocusMeta } from '../../lib/subjectMeta';

/* ─── Section label ─────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
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
      {children}
    </span>
  );
}

/* ─── Plan item row ─────────────────────────────────────── */

interface PlanItemProps {
  icon: React.ReactNode;
  label: string;
  title: string;
  subtitle?: string;
  onClick: () => void;
}

function PlanItem({ icon, label, title, subtitle, onClick }: PlanItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center"
      style={{
        width: '100%',
        gap: 10,
        padding: '8px 10px',
        background: 'transparent',
        border: '1px solid var(--text-08)',
        cursor: 'pointer',
        textAlign: 'left',
        transition:
          'border-color var(--transition-fast), background-color var(--transition-fast)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--text-30)';
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--text-04)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--text-08)';
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
      }}
    >
      <span
        style={{
          width: 18,
          height: 18,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: '0.8px',
            textTransform: 'uppercase',
            color: 'var(--text-30)',
            lineHeight: 1,
            marginBottom: 3,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 13,
            color: 'var(--text)',
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontWeight: 500,
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            style={{
              fontSize: 10.5,
              color: 'var(--text-30)',
              marginTop: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
      <ArrowRight size={13} style={{ color: 'var(--text-30)', flexShrink: 0 }} />
    </button>
  );
}

/* ─── Root ──────────────────────────────────────────────── */

export default function DailyPlanCard() {
  const { t, i18n } = useTranslation();
  const activeMonthId = useUIStore(s => s.activeMonthId);
  const setActiveMonth = useUIStore(s => s.setActiveMonth);
  const setActiveView = useUIStore(s => s.setActiveView);
  const setActiveFocusType = useUIStore(s => s.setActiveFocusType);
  const setActivePage = useUIStore(s => s.setActivePage);
  const openNotePanelWithNote = useUIStore(s => s.openNotePanelWithNote);
  const openReviewModal = useUIStore(s => s.openReviewModal);

  const checkedTopics = useProgressStore(s => s.checkedTopics);
  const getMonthProgress = useProgressStore(s => s.getMonthProgress);

  const reviews = useReviewStore(s => s.reviews);
  const notes = useNotesStore(s => s.notes);
  const roadmap = useRoadmap();
  const routineSlots = useRoutineStore(s => s.slots);
  const routineOverrides = useRoutineStore(s => s.overrides);
  const startTimerFromSlot = useTimerStore(s => s.startFromSlot);

  // Next upcoming routine slot (today or within a week)
  const nextRoutineSlot = useMemo(
    () => findNextUpcoming(routineSlots, routineOverrides, new Date(), 7),
    [routineSlots, routineOverrides],
  );

  const nextRoutineFocus = useMemo(() => {
    if (!nextRoutineSlot?.focusId) return null;
    return (
      roadmap.phases
        .flatMap(p => p.months)
        .flatMap(m => m.focuses)
        .find(f => f.id === nextRoutineSlot.focusId) ?? null
    );
  }, [nextRoutineSlot, roadmap]);

  // Next topic to study
  const next = useMemo(
    () => (activeMonthId ? findNextTopic(roadmap, checkedTopics, activeMonthId) : null),
    [activeMonthId, checkedTopics, roadmap],
  );

  // Next month (for empty state navigation)
  const nextMonth = useMemo(
    () => (activeMonthId ? nextMonthAfter(roadmap, activeMonthId) : null),
    [activeMonthId, roadmap],
  );

  // Due reviews count
  const dueReviewCount = useMemo(() => {
    const now = Date.now();
    return Object.values(reviews).filter(
      (r) => new Date(r.nextReviewAt).getTime() <= now,
    ).length;
  }, [reviews]);

  // Daily goal — topics/day to keep pace this month
  const { dailyGoal, remaining, monthPct } = useMemo(() => {
    if (!activeMonthId) return { dailyGoal: 0, remaining: 0, monthPct: 0 };
    const p = getMonthProgress(activeMonthId, roadmap);
    const left = daysLeftInMonth(activeMonthId);
    const remainingTopics = p.total - p.done;
    return {
      dailyGoal: computeDailyGoal(remainingTopics, left),
      remaining: remainingTopics,
      monthPct: p.pct,
    };
  }, [activeMonthId, getMonthProgress, checkedTopics, roadmap]);

  // Recent active note (updated in last 3 days, has topicId)
  const recentNote = useMemo(() => {
    const threshold = Date.now() - 3 * 86_400_000;
    return (
      notes
        .filter((n) => n.topicId && new Date(n.updatedAt).getTime() > threshold)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null
    );
  }, [notes]);

  const navigateToNext = () => {
    if (!next) return;
    setActiveMonth(next.month.id);
    setActiveView('day');
    setActiveFocusType(next.focus.type);
    setActivePage('study');
  };

  const handleOpenReviews = () => {
    openReviewModal();
  };

  const openRecentNote = () => {
    if (!recentNote || !recentNote.topicId) return;
    openNotePanelWithNote(recentNote.topicId, recentNote.id);
    setActivePage('study');
  };

  const startNextRoutineSlot = () => {
    if (!nextRoutineSlot) return;
    startTimerFromSlot({
      durationMin: nextRoutineSlot.durationMin,
      label: nextRoutineSlot.label ?? nextRoutineFocus?.name,
      focusId: nextRoutineSlot.focusId,
      topicId: nextRoutineSlot.topicId,
    });
    // If the slot has a meeting link, open it in a new window alongside starting
    // the timer so the user can join the class right away.
    if (nextRoutineSlot.meetingUrl) {
      window.open(nextRoutineSlot.meetingUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const locale = i18n.language || 'pt-BR';
  const nextSlotIsToday = (() => {
    if (!nextRoutineSlot) return false;
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return nextRoutineSlot.date === today;
  })();

  /* ── Empty state: month complete ────────────────────────── */
  if (!next) {
    return (
      <section>
        <SectionLabel>{t('common.today')}</SectionLabel>
        <div
          style={{
            border: '1px solid var(--text-15)',
            padding: '22px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            alignItems: 'flex-start',
          }}
        >
          <CheckCircle size={28} weight="regular" style={{ color: 'var(--accent-green)' }} />
          <div>
            <h2
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 22,
                color: 'var(--text)',
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              {t('overview.dailyPlan.monthComplete')}
            </h2>
            <p
              style={{
                fontSize: 13,
                color: 'var(--text-50)',
                margin: '6px 0 0',
                lineHeight: 1.5,
              }}
            >
              {t('overview.dailyPlan.monthCompleteDescription')}
            </p>
          </div>
          {nextMonth && (
            <button
              type="button"
              onClick={() => {
                setActiveMonth(nextMonth.id);
                setActiveView('day');
                setActivePage('study');
              }}
              className="flex items-center"
              style={{
                gap: 8,
                padding: '10px 16px',
                border: '1px solid var(--text)',
                background: 'transparent',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                fontSize: 12,
                color: 'var(--text)',
                transition: 'background-color var(--transition-fast)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--text-08)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
              }}
            >
              {t('overview.dailyPlan.advanceTo', { label: nextMonth.label })}
              <ArrowRight size={12} />
            </button>
          )}
        </div>
      </section>
    );
  }

  const subject = resolveFocusMeta(next.focus);
  const SubjectIcon = subject.Icon;
  const ctx = recentNote?.topicId ? findTopicContext(roadmap, recentNote.topicId) : null;

  /* ── Normal state ─────────────────────────────────────── */
  return (
    <section>
      <SectionLabel>{t('common.today')}</SectionLabel>

      <div
        style={{
          border: '1px solid var(--text-15)',
          padding: '14px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {/* Goal summary line */}
        <div
          className="flex items-baseline"
          style={{
            gap: 8,
            flexWrap: 'wrap',
            paddingBottom: 8,
            borderBottom: '1px solid var(--text-08)',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 18,
              color: 'var(--text)',
              lineHeight: 1,
            }}
          >
            {dailyGoal > 0 ? dailyGoal : '—'}
          </span>
          <span
            style={{
              fontSize: 13,
              color: 'var(--text-50)',
              lineHeight: 1.4,
            }}
          >
            {dailyGoal > 0
              ? t('overview.dailyPlan.keepPace', { count: dailyGoal })
              : t('overview.dailyPlan.allSetForToday')}
          </span>
          <span
            style={{
              marginLeft: 'auto',
              fontSize: 11,
              color: 'var(--text-30)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {t('overview.dailyPlan.remaining', { remaining, pct: monthPct })}
          </span>
        </div>

        {/* Priority action rows */}
        <div className="flex flex-col" style={{ gap: 8 }}>
          {nextRoutineSlot && (
            <PlanItem
              icon={
                <Clock
                  size={16}
                  weight="regular"
                  style={{
                    color: nextRoutineSlot.color ?? 'var(--accent-coral)',
                  }}
                />
              }
              label={
                nextSlotIsToday
                  ? t('routine.nextSessionToday')
                  : t('routine.nextSessionSoon')
              }
              title={
                nextRoutineSlot.label ??
                nextRoutineFocus?.name ??
                t('routine.freeBlockLabel')
              }
              subtitle={`${formatTime(nextRoutineSlot.startTime, locale)} · ${t('routine.durationMinutes', { count: nextRoutineSlot.durationMin })}`}
              onClick={startNextRoutineSlot}
            />
          )}

          {dueReviewCount > 0 && (
            <PlanItem
              icon={
                <Brain
                  size={18}
                  weight="regular"
                  style={{ color: 'var(--accent-coral)' }}
                />
              }
              label={t('overview.dailyPlan.review')}
              title={t('overview.dailyPlan.reviewPending', { count: dueReviewCount })}
              subtitle={t('overview.dailyPlan.reviewSubtitle')}
              onClick={handleOpenReviews}
            />
          )}

          <PlanItem
            icon={
              <SubjectIcon
                size={18}
                weight="regular"
                style={{ color: subject.color }}
              />
            }
            label={t('overview.nextAction.title')}
            title={next.topic.label}
            subtitle={`${next.focus.name} · ${focusLabel(next.focus.type)}`}
            onClick={navigateToNext}
          />

          {recentNote && ctx && (
            <PlanItem
              icon={
                <NotePencil
                  size={16}
                  weight="regular"
                  style={{ color: 'var(--text-50)' }}
                />
              }
              label={t('overview.dailyPlan.continueNote')}
              title={recentNote.title || t('notes.untitled')}
              subtitle={`${ctx.focus.name} · ${t('notes.lastEdited', { time: timeAgo(recentNote.updatedAt) })}`}
              onClick={openRecentNote}
            />
          )}
        </div>

        {/* Primary CTA */}
        <button
          type="button"
          onClick={navigateToNext}
          aria-label={t('overview.dailyPlan.startOn', { label: next.topic.label })}
          className="flex items-center justify-center sp-next-cta"
          style={{
            width: '100%',
            padding: '11px 18px',
            gap: 10,
            backgroundColor: 'var(--accent-coral)',
            color: '#FFFFFF',
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '0.3px',
            border: 'none',
            cursor: 'pointer',
            transition: 'background-color var(--transition-fast)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--accent-coral-hover)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--accent-coral)';
          }}
        >
          <Lightning size={15} weight="bold" />
          {t('overview.nextAction.continueStudying')}
          <ArrowRight size={15} weight="bold" />
        </button>
      </div>
    </section>
  );
}
