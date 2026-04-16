import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { X } from '@phosphor-icons/react';
import { useUIStore } from '../../store/useUIStore';
import ReviewSection from '../overview/ReviewSection';
import WeeklyReflectionSection from '../overview/WeeklyReflection';

/* ─── Shared modal frame ─────────────────────────────────── */

interface ModalFrameProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

function ModalFrame({ open, onClose, title, children }: ModalFrameProps) {
  const { t } = useTranslation();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 460,
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
          maxWidth: 560,
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
        <div
          className="flex items-center"
          style={{
            padding: '20px 24px 16px',
            borderBottom: '1px solid var(--text-08)',
            gap: 12,
            flexShrink: 0,
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 22,
              color: 'var(--text)',
              margin: 0,
              lineHeight: 1.2,
              flex: 1,
            }}
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="flex items-center justify-center"
            style={{
              width: 30,
              height: 30,
              background: 'var(--text-08)',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-50)',
            }}
          >
            <X size={14} weight="bold" />
          </button>
        </div>
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: '20px 24px 24px',
          }}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ─── Review Modal ──────────────────────────────────────── */

export function ReviewModal() {
  const { t } = useTranslation();
  const open = useUIStore(s => s.reviewModalOpen);
  const close = useUIStore(s => s.closeReviewModal);

  return (
    <ModalFrame open={open} onClose={close} title={t('modals.reviewsPending')}>
      <ReviewSection />
    </ModalFrame>
  );
}

/* ─── Reflection Modal ──────────────────────────────────── */

export function ReflectionModal() {
  const { t } = useTranslation();
  const open = useUIStore(s => s.reflectionModalOpen);
  const close = useUIStore(s => s.closeReflectionModal);

  return (
    <ModalFrame open={open} onClose={close} title={t('overview.weeklyReflection.title')}>
      <WeeklyReflectionSection />
    </ModalFrame>
  );
}
