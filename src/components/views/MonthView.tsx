import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../../store/useUIStore';
import { useProgressStore } from '../../store/useProgressStore';
import { useRoadmap } from '../../store/useRoadmapStore';
import { phaseShortName } from '../../lib/utils';
import FocusCard from '../ui/FocusCard';
import FocusModal from '../ui/FocusModal';
import type { Focus } from '../../types';

interface FlatFocus {
  focus: Focus;
  monthId: string;
  monthLabel: string;
  isActive: boolean;
}

export default function MonthView() {
  const { t } = useTranslation();
  const activeMonthId = useUIStore(s => s.activeMonthId);
  const setActiveMonth = useUIStore(s => s.setActiveMonth);
  const getMonthProgress = useProgressStore(s => s.getMonthProgress);
  // Subscribe to checkedTopics so the phase-month progress strip re-renders
  // whenever the user toggles a topic. Referenced implicitly via the void
  // expression below — we don't need the value directly, just the subscription.
  const checkedTopics = useProgressStore(s => s.checkedTopics);
  void checkedTopics;
  const roadmap = useRoadmap();

  // Modal state — which focus is currently open
  const [openFocus, setOpenFocus] = useState<{ focus: Focus; monthLabel: string } | null>(null);

  // Locate the active month and its parent phase
  const context = useMemo(() => {
    for (let pIdx = 0; pIdx < roadmap.phases.length; pIdx++) {
      const phase = roadmap.phases[pIdx];
      const mIdx = phase.months.findIndex(m => m.id === activeMonthId);
      if (mIdx !== -1) {
        return {
          phase,
          phaseIndex: pIdx,
          phaseCount: roadmap.phases.length,
          month: phase.months[mIdx],
        };
      }
    }
    return null;
  }, [activeMonthId, roadmap]);

  // All focuses of the active phase, sorted by type so each column in the
  // masonry becomes a track: main → secondary → continuous.
  const phaseFocuses: FlatFocus[] = useMemo(() => {
    if (!context) return [];
    const typeOrder: Record<string, number> = { main: 0, secondary: 1, continuous: 2 };
    const orderOf = (t: string): number => (t in typeOrder ? typeOrder[t] : 99);
    const out: FlatFocus[] = [];
    for (const month of context.phase.months) {
      for (const focus of month.focuses) {
        out.push({
          focus,
          monthId: month.id,
          monthLabel: month.label,
          isActive: month.id === activeMonthId,
        });
      }
    }
    return out.sort((a, b) => {
      const typeDiff = orderOf(a.focus.type) - orderOf(b.focus.type);
      if (typeDiff !== 0) return typeDiff;
      return a.monthId.localeCompare(b.monthId);
    });
  }, [context, activeMonthId]);

  if (!context) {
    return (
      <div
        className="flex flex-1 items-center justify-center"
        style={{ color: 'var(--text-30)', fontSize: 14 }}
      >
        {t('period.noneSelected')}
      </div>
    );
  }

  const { phase, phaseIndex, phaseCount } = context;
  const totalFocuses = phase.months.reduce((sum, m) => sum + m.focuses.length, 0);

  return (
    <div
      className="flex flex-col"
      style={{
        width: '100%',
        height: '100%',
        minHeight: 0,
        gap: 22,
      }}
    >
      {/* ── Phase header ─────────────────────────────────── */}
      <header className="flex items-baseline" style={{ gap: 18 }}>
        <div className="flex flex-col">
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: 'var(--text-30)',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
            }}
          >
            {t('month.phaseHeader', {
              index: phaseIndex + 1,
              total: phaseCount,
              periods: phase.months.length,
              periodWord: t(phase.months.length === 1 ? 'period.period' : 'period.periods'),
              focuses: totalFocuses,
            })}
          </span>
          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 32,
              color: 'var(--text)',
              lineHeight: 1.1,
              margin: 0,
              marginTop: 6,
            }}
          >
            {phaseShortName(phase.label)}
          </h2>
        </div>
        <span
          style={{
            fontSize: 13,
            color: 'var(--text-50)',
            marginLeft: 'auto',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {t('month.expandCardHint')}
        </span>
      </header>

      {/* ── 3-column grid of focus cards (scrollable) ──────────────
         Cards are click-to-open; the topic list lives in a modal, so
         the grid layout is stable and never distorts. */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          paddingRight: 6,
          marginRight: -6,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 'var(--card-gap)',
            alignContent: 'start',
          }}
        >
          {phaseFocuses.map(({ focus, monthLabel, isActive }) => (
            <FocusCard
              key={focus.id}
              focus={focus}
              monthLabel={monthLabel}
              isActive={isActive}
              onOpen={() => setOpenFocus({ focus, monthLabel })}
            />
          ))}
        </div>
      </div>

      {/* ── Phase-month strip ─────────────────────────────── */}
      <section
        className="flex flex-col"
        style={{ gap: 10, flexShrink: 0 }}
      >
        <div className="flex items-center" style={{ gap: 10 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: 'var(--text-30)',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
            }}
          >
            {t('month.phasePeriodsSection')}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-30)' }}>
            {phase.label}
          </span>
        </div>

        <div
          className="flex"
          style={{
            gap: 8,
            overflowX: 'auto',
            paddingBottom: 4,
          }}
        >
          {phase.months.map(m => {
            const mp = getMonthProgress(m.id, roadmap);
            const isActiveMonth = m.id === activeMonthId;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setActiveMonth(m.id)}
                className="flex flex-col flex-shrink-0"
                style={{
                  minWidth: 140,
                  padding: '12px 14px',
                  border: `1px solid ${isActiveMonth ? 'var(--text)' : 'var(--text-08)'}`,
                  background: isActiveMonth ? 'var(--text-04)' : 'var(--bg-surface)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition:
                    'border-color var(--transition-fast), background-color var(--transition-fast)',
                  gap: 6,
                }}
              >
                <div
                  className="flex items-baseline"
                  style={{ gap: 8, justifyContent: 'space-between' }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: 14,
                      color: 'var(--text)',
                      lineHeight: 1.2,
                    }}
                  >
                    {m.label}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: 'var(--text-30)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {mp.pct}%
                  </span>
                </div>
                <div
                  style={{
                    height: 2,
                    backgroundColor: 'var(--text-08)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${mp.pct}%`,
                      height: '100%',
                      backgroundColor: 'var(--text)',
                      transition: 'width var(--transition-base)',
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: 10,
                    color: 'var(--text-30)',
                  }}
                >
                  {t('week.topicsCount', { done: mp.done, total: mp.total })}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Focus modal — topics live here, outside the grid ───────── */}
      <FocusModal
        focus={openFocus?.focus ?? null}
        monthLabel={openFocus?.monthLabel}
        onClose={() => setOpenFocus(null)}
      />
    </div>
  );
}
