import { roadmap } from '../../data/roadmap';
import { getGreeting, formatDateLong, getCurrentMonth } from '../../lib/utils';
import { useProgressStore } from '../../store/useProgressStore';

export default function TopBar() {
  const greeting = getGreeting();
  const today = formatDateLong();
  const currentMonth = getCurrentMonth(roadmap);
  const getTotalProgress = useProgressStore(s => s.getTotalProgress);
  const totalPct = getTotalProgress(roadmap);

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 'var(--sidebar-width)',
        right: 0,
        height: 'var(--topbar-height)',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 var(--space-6)',
        zIndex: 90,
      }}
    >
      {/* Left: greeting */}
      <div>
        <p
          style={{
            margin: 0,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 700,
            fontSize: '1rem',
            color: 'var(--text-primary)',
            lineHeight: 1.2,
          }}
        >
          {greeting}, Ryan.
        </p>
        <p
          style={{
            margin: 0,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: '0.8125rem',
            color: 'var(--text-muted)',
            lineHeight: 1.4,
            textTransform: 'capitalize',
          }}
        >
          {today}
        </p>
      </div>

      {/* Right: current phase badge + progress */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        {currentMonth && (
          <span
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 600,
              fontSize: '0.75rem',
              color: 'var(--focus-main)',
              background: 'var(--focus-main-bg)',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid rgba(232,79,60,0.2)',
            }}
          >
            {currentMonth.label}
          </span>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <div
            style={{
              width: 120,
              height: 6,
              background: 'var(--border-subtle)',
              borderRadius: 'var(--radius-full)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${totalPct}%`,
                height: '100%',
                background: 'var(--focus-main)',
                borderRadius: 'var(--radius-full)',
                transition: 'width var(--transition-base)',
              }}
            />
          </div>
          <span
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 600,
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              minWidth: '32px',
            }}
          >
            {totalPct}%
          </span>
        </div>
      </div>
    </header>
  );
}
