import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from '@phosphor-icons/react';
import type { Focus, FocusType } from '../../types';
import { useProgressStore } from '../../store/useProgressStore';
import { focusLabel } from '../../lib/utils';
import { resolveFocusMeta } from '../../lib/subjectMeta';
import TopicRow from './TopicRow';

interface FocusModalProps {
  focus: Focus | null;
  monthLabel?: string;
  onClose: () => void;
}

function accentForType(type: FocusType): string {
  return type === 'main'       ? 'var(--accent-coral)'
       : type === 'secondary'  ? 'var(--accent-blue)'
       :                         'var(--accent-green)';
}

export default function FocusModal({ focus, monthLabel, onClose }: FocusModalProps) {
  const checkedTopics = useProgressStore(s => s.checkedTopics);

  useEffect(() => {
    if (!focus) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [focus, onClose]);

  if (!focus) return null;

  const accent = accentForType(focus.type);
  const subject = resolveFocusMeta(focus);
  const SubjectIcon = subject.Icon;

  const total = focus.topics.length;
  const done = focus.topics.filter(t => checkedTopics.includes(t.id)).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={focus.name}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 400,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        backgroundColor: 'var(--bg-backdrop)',
        animation: 'sp-confirm-backdrop-in 180ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 680,
          maxHeight: '86vh',
          background: 'var(--bg-surface)',
          border: '1px solid var(--text-15)',
          boxShadow: '0 24px 60px var(--shadow-lg), 0 4px 12px var(--shadow-md)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'sp-confirm-modal-in 260ms cubic-bezier(0.22, 1, 0.36, 1)',
          overflow: 'hidden',
        }}
      >
        {/* ── Colored header ───────────────────────────────── */}
        <div
          style={{
            backgroundColor: accent,
            padding: '22px 26px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            position: 'relative',
            flexShrink: 0,
          }}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex items-center justify-center"
            style={{
              position: 'absolute',
              top: 14,
              right: 14,
              width: 30,
              height: 30,
              background: 'rgba(255, 255, 255, 0.14)',
              border: 'none',
              cursor: 'pointer',
              color: '#FFFFFF',
              transition: 'background-color var(--transition-fast)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255, 255, 255, 0.25)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255, 255, 255, 0.14)';
            }}
          >
            <X size={16} weight="bold" />
          </button>

          {/* Eyebrow */}
          <div
            className="flex items-center"
            style={{
              gap: 8,
              fontSize: 10,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: 'rgba(255, 255, 255, 0.72)',
              paddingRight: 44,
            }}
          >
            <span>{focusLabel(focus.type)}</span>
            <span style={{ color: 'rgba(255, 255, 255, 0.38)' }}>·</span>
            <span>{subject.label}</span>
            {monthLabel && (
              <>
                <span style={{ color: 'rgba(255, 255, 255, 0.38)' }}>·</span>
                <span>{monthLabel}</span>
              </>
            )}
          </div>

          {/* Name + icon */}
          <div className="flex items-start" style={{ gap: 14, paddingRight: 44 }}>
            <SubjectIcon
              size={30}
              weight="regular"
              style={{
                color: '#FFFFFF',
                flexShrink: 0,
                marginTop: 4,
                opacity: 0.95,
              }}
            />
            <h2
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 28,
                color: '#FFFFFF',
                lineHeight: 1.2,
                margin: 0,
                flex: 1,
                minWidth: 0,
              }}
            >
              {focus.name}
            </h2>
          </div>

          {/* masteryNote */}
          {focus.masteryNote && (
            <p
              style={{
                fontSize: 13,
                fontStyle: 'italic',
                color: 'rgba(255, 255, 255, 0.72)',
                lineHeight: 1.55,
                margin: 0,
                paddingRight: 44,
              }}
            >
              {focus.masteryNote}
            </p>
          )}

          {/* Progress bar */}
          <div className="flex items-center" style={{ gap: 14, marginTop: 4 }}>
            <div
              className="flex-1"
              style={{
                height: 4,
                backgroundColor: 'rgba(255, 255, 255, 0.22)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  transition: 'width var(--transition-base)',
                }}
              />
            </div>
            <span
              style={{
                fontSize: 12,
                color: 'rgba(255, 255, 255, 0.85)',
                whiteSpace: 'nowrap',
                fontVariantNumeric: 'tabular-nums',
                fontWeight: 500,
              }}
            >
              {done}/{total} · {pct}%
            </span>
          </div>
        </div>

        {/* ── Topics list (scrollable) ─────────────────────── */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: '8px 8px 16px',
          }}
        >
          {focus.topics.map((topic, idx) => (
            <TopicRow
              key={topic.id}
              topic={topic}
              accentColor={accent}
              index={idx + 1}
            />
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
