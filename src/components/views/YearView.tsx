import { useMemo, useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, ArrowUpRight } from '@phosphor-icons/react';
import { useProgressStore } from '../../store/useProgressStore';
import { useUIStore } from '../../store/useUIStore';
import { useMilestonesStore } from '../../store/useMilestonesStore';
import { useRoadmap } from '../../store/useRoadmapStore';
import {
  phaseShortName,
  phaseDateRange,
  parseLocalDate,
  currentRoadmapPosition,
  findFocusByName,
  formatDateShort,
  daysUntil,
  resolveMilestoneColor,
  getActiveMonth,
  periodShortLabel,
  inferPeriodRange,
} from '../../lib/utils';
import type { Milestone } from '../../types';

/** Phase bar colors at 20% opacity, indexed by position */
const PHASE_BAR_COLORS = [
  'rgba(232, 79, 60, 0.18)',   // coral
  'rgba(43, 108, 176, 0.18)',  // blue
  'rgba(232, 79, 60, 0.18)',   // coral
  'rgba(61, 158, 107, 0.18)',  // green
  'rgba(168, 85, 247, 0.18)',  // lilac
];

/** Solid phase colors — used in the trajectory chart */
const PHASE_SOLID_COLORS = [
  'var(--accent-coral)',
  'var(--accent-blue)',
  'var(--accent-coral)',
  'var(--accent-green)',
  'var(--accent-lilac)',
];

/**
 * Compute a milestone's horizontal position (0–1) within its phase's bar,
 * based on date relative to the phase's month range.
 */
function milestonePosition(
  milestoneDate: string,
  phaseStartId: string,
  phaseEndId: string,
): number {
  const startRange = inferPeriodRange(phaseStartId);
  const endRange = inferPeriodRange(phaseEndId);
  if (!startRange || !endRange) return 0.5;
  const start = new Date(startRange.start);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endRange.end);
  end.setHours(23, 59, 59, 999);
  const msDate = parseLocalDate(milestoneDate);
  const totalSpan = end.getTime() - start.getTime();
  if (totalSpan <= 0) return 0.5;
  const pos = (msDate.getTime() - start.getTime()) / totalSpan;
  return Math.max(0, Math.min(1, pos));
}

/**
 * Position (0–1) of "now" inside a specific phase's date range. Works for
 * any period cadence (monthly, weekly, quarter, etc). End is normalized to
 * end-of-day so the last day counts as fully elapsed.
 */
function currentPositionInPhase(phaseStartId: string, phaseEndId: string): number | null {
  const startRange = inferPeriodRange(phaseStartId);
  const endRange = inferPeriodRange(phaseEndId);
  if (!startRange || !endRange) return null;
  const startDate = new Date(startRange.start);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(endRange.end);
  endDate.setHours(23, 59, 59, 999);
  const start = startDate.getTime();
  const end = endDate.getTime();
  const now = Date.now();
  if (now < start || now > end) return null;
  return (now - start) / (end - start);
}

export default function YearView() {
  const { t } = useTranslation();
  const checkedTopics = useProgressStore(s => s.checkedTopics);
  const getPhaseProgress = useProgressStore(s => s.getPhaseProgress);
  const getMonthProgress = useProgressStore(s => s.getMonthProgress);
  const setActiveMonth = useUIStore(s => s.setActiveMonth);
  const setActiveView = useUIStore(s => s.setActiveView);
  const getMilestoneStatus = useMilestonesStore(s => s.getStatus);
  const roadmap = useRoadmap();

  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click / Escape
  useEffect(() => {
    if (!selectedMilestone) return;
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setSelectedMilestone(null);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedMilestone(null);
    };
    // Delay mousedown listener by one tick so the triggering click doesn't immediately close
    const t = setTimeout(() => document.addEventListener('mousedown', handleClick), 0);
    window.addEventListener('keydown', handleKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', handleClick);
      window.removeEventListener('keydown', handleKey);
    };
  }, [selectedMilestone]);

  // Total topics
  const { totalDone, totalTopics, totalPct } = useMemo(() => {
    const allTopics = roadmap.phases
      .flatMap(p => p.months)
      .flatMap(m => m.focuses)
      .flatMap(f => f.topics);
    const total = allTopics.length;
    const done = allTopics.filter(t => checkedTopics.includes(t.id)).length;
    return {
      totalTopics: total,
      totalDone: done,
      totalPct: total ? Math.round((done / total) * 100) : 0,
    };
  }, [checkedTopics, roadmap]);

  // Phase status counts
  const phaseStatus = useMemo(() => {
    let done = 0;
    let active = 0;
    let pending = 0;
    for (const phase of roadmap.phases) {
      const p = getPhaseProgress(phase.id, roadmap);
      if (p.pct === 100) done++;
      else if (p.done > 0) active++;
      else pending++;
    }
    return { done, active, pending };
  }, [checkedTopics, getPhaseProgress, roadmap]);

  // Group milestones by phase (cadence-agnostic — uses inferPeriodRange).
  const milestonesByPhase = useMemo(() => {
    const map = new Map<string, Milestone[]>();
    for (const phase of roadmap.phases) {
      const firstMonth = phase.months[0];
      const lastMonth = phase.months[phase.months.length - 1];
      if (!firstMonth || !lastMonth) {
        map.set(phase.id, []);
        continue;
      }
      const startRange = inferPeriodRange(firstMonth.id);
      const endRange = inferPeriodRange(lastMonth.id);
      if (!startRange || !endRange) {
        map.set(phase.id, []);
        continue;
      }
      const phaseStart = startRange.start;
      const phaseEnd = endRange.end;
      const phaseMs = roadmap.milestones.filter(ms => {
        const msDate = parseLocalDate(ms.date);
        return msDate >= phaseStart && msDate <= phaseEnd;
      });
      map.set(phase.id, phaseMs);
    }
    return map;
  }, [roadmap]);

  const currentPos = currentRoadmapPosition(roadmap);

  // Trajectory chart — todos os períodos do roadmap (qualquer cadência).
  const trajectoryMonths = useMemo(() => {
    const activeId = getActiveMonth(roadmap).id;
    const out: Array<{
      monthId: string;
      label: string;
      pct: number;
      done: number;
      total: number;
      phaseIdx: number;
      isActive: boolean;
    }> = [];
    roadmap.phases.forEach((phase, phaseIdx) => {
      for (const month of phase.months) {
        const p = getMonthProgress(month.id, roadmap);
        out.push({
          monthId: month.id,
          label: periodShortLabel({ id: month.id, label: month.label }),
          pct: p.pct,
          done: p.done,
          total: p.total,
          phaseIdx,
          isActive: month.id === activeId,
        });
      }
    });
    return out;
  }, [checkedTopics, getMonthProgress, roadmap]);

  function handlePhaseClick(phaseId: string) {
    const phase = roadmap.phases.find(p => p.id === phaseId);
    if (!phase || !phase.months[0]) return;
    setActiveMonth(phase.months[0].id);
    setActiveView('month');
  }

  function handleMilestoneClick(e: React.MouseEvent, ms: Milestone) {
    e.stopPropagation();
    setSelectedMilestone(ms);
  }

  // Related focus for a milestone (if any)
  const relatedFocus = useMemo(() => {
    if (!selectedMilestone) return null;
    // Try to match certification milestones to a prep focus
    if (selectedMilestone.type !== 'certification') return null;
    // Use key words from the milestone name (first 2-3 words) to find a focus
    const words = selectedMilestone.name.split(/\s+/).slice(0, 2).join(' ');
    return findFocusByName(roadmap, words);
  }, [selectedMilestone]);

  function handleOpenRelatedFocus() {
    if (!relatedFocus) return;
    setActiveMonth(relatedFocus.month.id);
    setActiveView('month');
    setSelectedMilestone(null);
  }

  return (
    <div
      className="flex flex-col"
      style={{
        maxWidth: 960,
        margin: '0 auto',
        width: '100%',
      }}
    >
      {/* Title */}
      <h2
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 28,
          color: 'var(--text)',
          lineHeight: 1.2,
          margin: 0,
        }}
      >
        {t('year.title', { startYear: new Date(roadmap.startDate).getFullYear(), endYear: new Date(roadmap.endDate).getFullYear() })}
      </h2>

      {/* Subtitle with status legend */}
      <div
        className="flex items-center"
        style={{
          gap: 14,
          marginTop: 6,
          marginBottom: 28,
          fontSize: 13,
          color: 'var(--text-30)',
        }}
      >
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
          {t('year.subtitle', { done: totalDone, total: totalTopics, pct: totalPct })}
        </span>
        <span style={{ color: 'var(--text-15)' }}>·</span>
        <span>
          {t('year.phaseStatus', {
            done: phaseStatus.done,
            active: phaseStatus.active,
            pending: phaseStatus.pending,
          })}
        </span>
      </div>

      {/* ── Trajectory chart — monthly progress bars colored by phase ─── */}
      <section style={{ marginBottom: 32 }}>
        <div
          className="flex items-baseline"
          style={{ gap: 10, marginBottom: 14 }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '1.1px',
              textTransform: 'uppercase',
              color: 'var(--text-30)',
            }}
          >
            {t('year.trajectory')}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-30)' }}>
            {t('year.trajectorySubtitle')}
          </span>
        </div>

        <div
          className="flex items-end"
          style={{
            gap: 4,
            height: 64,
            width: '100%',
          }}
        >
          {trajectoryMonths.map((m, idx) => {
            const prev = trajectoryMonths[idx - 1];
            const isPhaseBreak = prev && prev.phaseIdx !== m.phaseIdx;
            const color = PHASE_SOLID_COLORS[m.phaseIdx % PHASE_SOLID_COLORS.length];
            const barHeight = Math.max(2, (m.pct / 100) * 56);
            return (
              <div
                key={m.monthId}
                className="flex flex-col"
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: '100%',
                  marginLeft: isPhaseBreak ? 8 : 0,
                  gap: 4,
                  cursor: 'pointer',
                  position: 'relative',
                }}
                title={`${m.label} — ${m.done}/${m.total} tópicos (${m.pct}%)`}
                onClick={() => {
                  setActiveMonth(m.monthId);
                  setActiveView('month');
                }}
              >
                {/* Background track */}
                <div
                  style={{
                    flex: 1,
                    minHeight: 0,
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'flex-end',
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      backgroundColor: 'var(--text-04)',
                      position: 'absolute',
                      bottom: 0,
                    }}
                  />
                  <div
                    style={{
                      width: '100%',
                      height: `${barHeight}px`,
                      backgroundColor: color,
                      opacity: m.isActive ? 1 : 0.78,
                      position: 'relative',
                      zIndex: 1,
                      transition: 'height var(--transition-base)',
                    }}
                  />
                  {m.isActive && (
                    <div
                      aria-hidden
                      style={{
                        position: 'absolute',
                        top: -6,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 5,
                        height: 5,
                        borderRadius: '50%',
                        backgroundColor: 'var(--accent-coral)',
                      }}
                    />
                  )}
                </div>
                {/* Month label */}
                <span
                  style={{
                    fontSize: 9,
                    color: m.isActive ? 'var(--accent-coral)' : 'var(--text-30)',
                    fontWeight: m.isActive ? 600 : 500,
                    textAlign: 'center',
                    letterSpacing: '0.2px',
                    textTransform: 'lowercase',
                    lineHeight: 1,
                  }}
                >
                  {m.label.split(' ')[0]}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Timeline wrapper — for the "you are here" marker */}
      <div style={{ position: 'relative' }}>
        {/* Global "you are here" marker — spans all phase rows */}
        {/* Rendered per-row because each phase has a different calendar window */}

        {/* Phase rows */}
        <div className="flex flex-col">
          {roadmap.phases.map((phase, index) => {
            const progress = getPhaseProgress(phase.id, roadmap);
            const phaseMilestones = milestonesByPhase.get(phase.id) ?? [];
            const firstMonthId = phase.months[0]?.id ?? '';
            const lastMonthId = phase.months[phase.months.length - 1]?.id ?? '';
            const currentInPhase = currentPositionInPhase(firstMonthId, lastMonthId);
            const isCurrentPhase = currentInPhase !== null;

            return (
              <button
                key={phase.id}
                type="button"
                onClick={() => handlePhaseClick(phase.id)}
                className="flex items-center"
                style={{
                  padding: '18px 0',
                  borderBottom: '1px solid var(--text-08)',
                  gap: 20,
                  background: 'none',
                  border: 'none',
                  borderBottomColor: 'var(--text-08)',
                  borderBottomStyle: 'solid',
                  borderBottomWidth: 1,
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  transition: 'background-color var(--transition-fast)',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                    'var(--text-04)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                }}
                aria-label={`Abrir ${phase.label}`}
              >
                {/* Left — phase name + date range */}
                <div
                  className="flex flex-col flex-shrink-0"
                  style={{ minWidth: 130 }}
                >
                  <span
                    className="flex items-center"
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: 18,
                      color: 'var(--text)',
                      lineHeight: 1.3,
                      gap: 8,
                    }}
                  >
                    {phaseShortName(phase.label)}
                    {isCurrentPhase && (
                      <span
                        style={{
                          fontSize: 10,
                          fontFamily: 'var(--font-sans)',
                          color: 'var(--accent-coral)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          fontWeight: 600,
                          padding: '2px 6px',
                          border: '1px solid var(--accent-coral)',
                          borderRadius: 0,
                        }}
                      >
                        agora
                      </span>
                    )}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: 'var(--text-30)',
                      marginTop: 2,
                    }}
                  >
                    {phaseDateRange(phase)}
                  </span>
                </div>

                {/* Center — horizontal bar with fill + milestones + "now" marker */}
                <div
                  className="flex-1 relative"
                  style={{
                    height: 32,
                    backgroundColor: 'var(--text-08)',
                    borderRadius: 0,
                    overflow: 'visible',
                  }}
                >
                  {/* Progress fill */}
                  <div
                    style={{
                      width: `${progress.pct}%`,
                      height: '100%',
                      backgroundColor: PHASE_BAR_COLORS[index] ?? PHASE_BAR_COLORS[0],
                      transition: 'width var(--transition-base)',
                    }}
                  />

                  {/* "You are here" marker — only on the current phase */}
                  {currentInPhase !== null && (
                    <>
                      <div
                        style={{
                          position: 'absolute',
                          top: -4,
                          bottom: -4,
                          left: `${currentInPhase * 100}%`,
                          width: 2,
                          backgroundColor: 'var(--accent-coral)',
                          zIndex: 2,
                          pointerEvents: 'none',
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          top: -10,
                          left: `${currentInPhase * 100}%`,
                          transform: 'translateX(-50%)',
                          width: 7,
                          height: 7,
                          borderRadius: '50%',
                          backgroundColor: 'var(--accent-coral)',
                          zIndex: 3,
                          pointerEvents: 'none',
                        }}
                      />
                    </>
                  )}

                  {/* Milestone markers */}
                  {phaseMilestones.map(ms => {
                    const pos = milestonePosition(ms.date, firstMonthId, lastMonthId);
                    const status = getMilestoneStatus(ms);
                    return (
                      <button
                        key={ms.id}
                        type="button"
                        onClick={e => handleMilestoneClick(e, ms)}
                        aria-label={ms.name}
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: `${pos * 100}%`,
                          transform: 'translate(-50%, -50%)',
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          backgroundColor: resolveMilestoneColor(ms),
                          border: status === 'done' ? '2px solid var(--text)' : 'none',
                          padding: 0,
                          cursor: 'pointer',
                          zIndex: 4,
                          boxShadow: '0 0 0 2px var(--bg-surface)',
                          transition: 'transform var(--transition-fast)',
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLButtonElement).style.transform =
                            'translate(-50%, -50%) scale(1.3)';
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLButtonElement).style.transform =
                            'translate(-50%, -50%) scale(1)';
                        }}
                      />
                    );
                  })}
                </div>

                {/* Right — percentage */}
                <span
                  style={{
                    fontSize: 14,
                    color: 'var(--text-30)',
                    fontVariantNumeric: 'tabular-nums',
                    minWidth: 40,
                    textAlign: 'right',
                    flexShrink: 0,
                  }}
                >
                  {progress.pct}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend row */}
      <div
        className="flex items-center"
        style={{
          marginTop: 20,
          paddingTop: 14,
          gap: 20,
          flexWrap: 'wrap',
        }}
      >
        <div className="flex items-center" style={{ gap: 6 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: 'var(--milestone)',
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 12, color: 'var(--text-30)' }}>{t('year.milestonesLegend.certification')}</span>
        </div>
        <div className="flex items-center" style={{ gap: 6 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: 'var(--focus-sec)',
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 12, color: 'var(--text-30)' }}>{t('year.milestonesLegend.career')}</span>
        </div>
        <div className="flex items-center" style={{ gap: 6 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: 'var(--focus-cont)',
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 12, color: 'var(--text-30)' }}>{t('year.milestonesLegend.personal')}</span>
        </div>
        <div className="flex items-center" style={{ gap: 6 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: 'var(--focus-main)',
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 12, color: 'var(--text-30)' }}>{t('year.milestonesLegend.product')}</span>
        </div>
        {currentPos !== null && (
          <>
            <span style={{ color: 'var(--text-15)' }}>·</span>
            <div className="flex items-center" style={{ gap: 6 }}>
              <span
                style={{
                  width: 2,
                  height: 12,
                  backgroundColor: 'var(--accent-coral)',
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 12, color: 'var(--text-30)' }}>
                {t('year.youAreHereLong')}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Milestone popover */}
      {selectedMilestone && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 150,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--bg-backdrop)',
          }}
        >
          <div
            ref={popoverRef}
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--text-15)',
              width: 440,
              maxWidth: '90vw',
              padding: '24px 28px',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              boxShadow: '0 8px 32px var(--shadow-md)',
            }}
          >
            {/* Header */}
            <div className="flex items-start" style={{ gap: 12 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: resolveMilestoneColor(selectedMilestone),
                  flexShrink: 0,
                  marginTop: 8,
                }}
              />
              <div className="flex-1" style={{ minWidth: 0 }}>
                <h3
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 20,
                    color: 'var(--text)',
                    lineHeight: 1.25,
                    margin: 0,
                  }}
                >
                  {selectedMilestone.name}
                </h3>
                <div
                  className="flex items-center"
                  style={{
                    marginTop: 4,
                    gap: 10,
                    fontSize: 12,
                    color: 'var(--text-50)',
                  }}
                >
                  <span>{formatDateShort(selectedMilestone.date)}</span>
                  <span style={{ color: 'var(--text-15)' }}>·</span>
                  <span>
                    {(() => {
                      const d = daysUntil(selectedMilestone.date);
                      if (d === 0) return 'hoje';
                      if (d > 0) return `em ${d} dia${d === 1 ? '' : 's'}`;
                      return `${Math.abs(d)} dia${d === -1 ? '' : 's'} atrás`;
                    })()}
                  </span>
                  {getMilestoneStatus(selectedMilestone) === 'done' && (
                    <>
                      <span style={{ color: 'var(--text-15)' }}>·</span>
                      <span style={{ color: 'var(--accent-green)' }}>concluído</span>
                    </>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMilestone(null)}
                aria-label="Fechar"
                style={{
                  padding: 4,
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-30)',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Description */}
            {selectedMilestone.description && (
              <p
                style={{
                  fontSize: 13,
                  color: 'var(--text-80, var(--text))',
                  lineHeight: 1.55,
                  margin: 0,
                }}
              >
                {selectedMilestone.description}
              </p>
            )}

            {/* Link to related prep focus */}
            {relatedFocus && (
              <button
                type="button"
                onClick={handleOpenRelatedFocus}
                className="flex items-center justify-between"
                style={{
                  marginTop: 6,
                  padding: '12px 14px',
                  background: 'var(--text-08)',
                  border: '1px solid transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  transition: 'border-color var(--transition-fast)',
                  gap: 12,
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--text-30)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent';
                }}
              >
                <div className="flex flex-col" style={{ gap: 2, minWidth: 0 }}>
                  <span
                    style={{
                      fontSize: 10,
                      color: 'var(--text-50)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      fontWeight: 500,
                    }}
                  >
                    Foco de preparação
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      color: 'var(--text)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {relatedFocus.focus.name}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-30)' }}>
                    {relatedFocus.month.label}
                  </span>
                </div>
                <ArrowUpRight
                  size={16}
                  style={{ color: 'var(--text-50)', flexShrink: 0 }}
                />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
