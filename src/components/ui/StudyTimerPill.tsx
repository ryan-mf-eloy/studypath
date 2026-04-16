import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Pause, Stop } from '@phosphor-icons/react';
import { useTimerStore } from '../../store/useTimerStore';

function formatMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function StudyTimerPill() {
  const { t } = useTranslation();
  const active = useTimerStore(s => s.active);
  const paused = useTimerStore(s => s.paused);
  const topicLabel = useTimerStore(s => s.topicLabel);
  const plannedMs = useTimerStore(s => s.plannedMs);
  const getRemainingMs = useTimerStore(s => s.getRemainingMs);
  const pause = useTimerStore(s => s.pause);
  const resume = useTimerStore(s => s.resume);
  const stop = useTimerStore(s => s.stop);

  // Force re-render every second while active
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!active || paused) return;
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [active, paused]);

  // Auto-complete when time runs out
  useEffect(() => {
    if (!active || paused) return;
    const remaining = getRemainingMs();
    if (remaining <= 0) {
      stop(true);
    }
  }, [tick, active, paused, getRemainingMs, stop]);

  if (!active) return null;

  const remaining = getRemainingMs();
  const progress = plannedMs > 0 ? 1 - remaining / plannedMs : 0;
  const isRunningOut = remaining > 0 && remaining < 60_000;

  return (
    <div
      role="region"
      aria-label={t('timer.sessionAria')}
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 350,
        background: 'var(--bg-surface)',
        border: `1px solid ${isRunningOut ? 'var(--accent-coral)' : 'var(--text-15)'}`,
        boxShadow: '0 16px 40px var(--shadow-md), 0 2px 8px var(--shadow-sm)',
        padding: '14px 16px',
        minWidth: 240,
        maxWidth: 320,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        animation: 'sp-pop-in 260ms cubic-bezier(0.22, 1, 0.36, 1)',
        transformOrigin: 'bottom right',
      }}
    >
      {/* Header: topic + eyebrow */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span
          style={{
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: '1px',
            textTransform: 'uppercase',
            color: paused ? 'var(--text-30)' : 'var(--accent-coral)',
          }}
        >
          {paused ? t('timer.paused') : t('timer.sessionInProgress')}
        </span>
        <span
          style={{
            fontSize: 13,
            color: 'var(--text)',
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: 280,
          }}
        >
          {topicLabel ?? t('timer.freeSession')}
        </span>
      </div>

      {/* Countdown + controls */}
      <div className="flex items-center" style={{ gap: 14 }}>
        <span
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 28,
            color: isRunningOut ? 'var(--accent-coral)' : 'var(--text)',
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1,
          }}
        >
          {formatMs(remaining)}
        </span>
        <div className="flex items-center" style={{ gap: 6, marginLeft: 'auto' }}>
          {paused ? (
            <IconButton onClick={resume} label={t('timer.resume')}>
              <Play size={14} weight="fill" />
            </IconButton>
          ) : (
            <IconButton onClick={pause} label={t('timer.pause')}>
              <Pause size={14} weight="fill" />
            </IconButton>
          )}
          <IconButton onClick={() => stop(false)} label={t('timer.stop')} destructive>
            <Stop size={14} weight="fill" />
          </IconButton>
        </div>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: 2,
          backgroundColor: 'var(--text-08)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${Math.round(progress * 100)}%`,
            height: '100%',
            backgroundColor: 'var(--accent-coral)',
            transition: 'width 1s linear',
          }}
        />
      </div>
    </div>
  );
}

interface IconButtonProps {
  onClick: () => void;
  label: string;
  destructive?: boolean;
  children: React.ReactNode;
}

function IconButton({ onClick, label, destructive = false, children }: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex items-center justify-center"
      style={{
        width: 28,
        height: 28,
        border: `1px solid var(--text-15)`,
        background: 'transparent',
        cursor: 'pointer',
        color: destructive ? 'var(--text-50)' : 'var(--text)',
        transition:
          'border-color var(--transition-fast), background-color var(--transition-fast), color var(--transition-fast)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = destructive
          ? 'var(--accent-coral)'
          : 'var(--text)';
        (e.currentTarget as HTMLButtonElement).style.color = destructive
          ? 'var(--accent-coral)'
          : 'var(--text)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--text-15)';
        (e.currentTarget as HTMLButtonElement).style.color = destructive
          ? 'var(--text-50)'
          : 'var(--text)';
      }}
    >
      {children}
    </button>
  );
}
