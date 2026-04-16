import { useMemo } from 'react';
import { Flame } from '@phosphor-icons/react';
import { useProgressStore } from '../../store/useProgressStore';
import { useReviewStore } from '../../store/useReviewStore';
import { getCurrentStreak } from '../../lib/streak';

export default function StreakBadge() {
  const checkedAt = useProgressStore(s => s.checkedAt);
  const reviews = useReviewStore(s => s.reviews);

  const streak = useMemo(() => {
    const reviewDays: string[] = [];
    for (const r of Object.values(reviews)) {
      for (const h of r.history) {
        reviewDays.push(h.at.slice(0, 10));
      }
    }
    return getCurrentStreak(checkedAt, reviewDays);
  }, [checkedAt, reviews]);

  if (streak === 0) return null;

  return (
    <div
      className="flex items-center"
      style={{
        gap: 5,
        fontSize: 12,
        color: 'var(--accent-coral)',
        fontVariantNumeric: 'tabular-nums',
        fontWeight: 600,
        letterSpacing: '0.2px',
        userSelect: 'none',
      }}
      title={`Você está num streak de ${streak} ${streak === 1 ? 'dia' : 'dias'} consecutivos de estudo`}
      aria-label={`Streak de ${streak} dias`}
    >
      <Flame size={14} weight="fill" />
      {streak}
    </div>
  );
}
