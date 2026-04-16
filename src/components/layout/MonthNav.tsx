import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { useUIStore } from '../../store/useUIStore';
import { useProgressStore } from '../../store/useProgressStore';
import { useRoadmap } from '../../store/useRoadmapStore';

export default function MonthNav() {
  const { t } = useTranslation();

  const activeMonthId = useUIStore(s => s.activeMonthId);
  const setActiveMonth = useUIStore(s => s.setActiveMonth);
  const checkedTopics = useProgressStore(s => s.checkedTopics);
  const roadmap = useRoadmap();

  const allMonths = useMemo(
    () => roadmap.phases.flatMap(p => p.months),
    [roadmap],
  );

  const currentIndex = useMemo(
    () => allMonths.findIndex(m => m.id === activeMonthId),
    [allMonths, activeMonthId],
  );

  const activeMonth = currentIndex >= 0 ? allMonths[currentIndex] : allMonths[0];
  if (!activeMonth) return null;

  const monthTopics = activeMonth.focuses.flatMap(f => f.topics);
  const progress = {
    done: monthTopics.filter(t => checkedTopics.includes(t.id)).length,
    total: monthTopics.length,
  };

  const isFirst = currentIndex <= 0;
  const isLast = currentIndex >= allMonths.length - 1;

  function goToPrev() {
    if (!isFirst) {
      setActiveMonth(allMonths[currentIndex - 1].id);
    }
  }

  function goToNext() {
    if (!isLast) {
      setActiveMonth(allMonths[currentIndex + 1].id);
    }
  }

  function goToMonth(monthId: string) {
    setActiveMonth(monthId);
  }

  return (
    <div className="flex items-center gap-4">
      {/* Left arrow */}
      <button
        onClick={goToPrev}
        disabled={isFirst}
        style={{
          width: 32,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid var(--text-15)',
          borderRadius: 0,
          backgroundColor: 'transparent',
          cursor: isFirst ? 'default' : 'pointer',
          opacity: isFirst ? 0.3 : 1,
          transition: 'opacity var(--transition-fast)',
          color: 'var(--text)',
          flexShrink: 0,
        }}
        aria-label={t('period.previous')}
      >
        <CaretLeft size={14} weight="bold" />
      </button>

      {/* Month label + progress */}
      <div className="flex items-baseline gap-3">
        <span
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 22,
            color: 'var(--text)',
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
          }}
        >
          {activeMonth.label}
        </span>
        <span
          style={{
            fontSize: 12,
            color: 'var(--text-30)',
            whiteSpace: 'nowrap',
          }}
        >
          {progress.done}/{progress.total}
        </span>
      </div>

      {/* Right arrow */}
      <button
        onClick={goToNext}
        disabled={isLast}
        style={{
          width: 32,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid var(--text-15)',
          borderRadius: 0,
          backgroundColor: 'transparent',
          cursor: isLast ? 'default' : 'pointer',
          opacity: isLast ? 0.3 : 1,
          transition: 'opacity var(--transition-fast)',
          color: 'var(--text)',
          flexShrink: 0,
        }}
        aria-label={t('period.next')}
      >
        <CaretRight size={14} weight="bold" />
      </button>

      {/* Dot strip */}
      <div className="flex items-center gap-1.5" style={{ marginLeft: 8 }}>
        {allMonths.map((month) => {
          const isActive = month.id === activeMonthId;
          return (
            <button
              key={month.id}
              onClick={() => goToMonth(month.id)}
              title={month.label}
              style={{
                width: 7,
                height: 7,
                borderRadius: 'var(--radius-dot)',
                border: 'none',
                padding: 0,
                backgroundColor: isActive ? 'var(--text)' : 'var(--text-15)',
                transform: isActive ? 'scale(1.3)' : 'scale(1)',
                transition: 'transform var(--transition-fast), background-color var(--transition-fast)',
                cursor: 'pointer',
              }}
              aria-label={month.label}
            />
          );
        })}
      </div>
    </div>
  );
}
