import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { useConfirmStore } from '../../store/useConfirmStore';

export default function ConfirmDialog() {
  const { t } = useTranslation();
  const open = useConfirmStore(s => s.open);
  const options = useConfirmStore(s => s.options);
  const accept = useConfirmStore(s => s.accept);
  const dismiss = useConfirmStore(s => s.dismiss);

  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        dismiss();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        accept();
      }
    };
    document.addEventListener('keydown', onKey);
    // Focus the confirm button on open for quick Enter-confirm
    const id = setTimeout(() => confirmBtnRef.current?.focus(), 50);
    return () => {
      document.removeEventListener('keydown', onKey);
      clearTimeout(id);
    };
  }, [open, accept, dismiss]);

  if (!open || !options) return null;

  const {
    title,
    message,
    confirmLabel = t('confirmDialog.defaultConfirm'),
    cancelLabel = t('confirmDialog.defaultCancel'),
    destructive = false,
  } = options;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 24px',
        backgroundColor: 'var(--bg-backdrop)',
        animation: 'sp-confirm-backdrop-in 160ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
      onClick={dismiss}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="sp-glass"
        style={{
          width: '100%',
          maxWidth: 420,
          border: '1px solid var(--glass-border)',
          boxShadow: '0 24px 60px var(--shadow-lg), 0 4px 12px var(--shadow-md)',
          padding: '28px 30px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          animation: 'sp-confirm-modal-in 220ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 22,
            lineHeight: 1.25,
            color: 'var(--text)',
            margin: 0,
          }}
        >
          {title}
        </h2>

        {message && (
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.55,
              color: 'var(--text-50)',
              margin: 0,
            }}
          >
            {message}
          </p>
        )}

        <div
          className="flex items-center"
          style={{
            gap: 10,
            justifyContent: 'flex-end',
            marginTop: 10,
          }}
        >
          <button
            type="button"
            onClick={dismiss}
            style={{
              padding: '10px 18px',
              border: '1px solid var(--text-15)',
              background: 'transparent',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--text-50)',
              transition:
                'border-color var(--transition-fast), color var(--transition-fast), background-color var(--transition-fast)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--text-30)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--text-15)';
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-50)';
            }}
          >
            {cancelLabel}
          </button>

          <button
            ref={confirmBtnRef}
            type="button"
            onClick={accept}
            style={{
              padding: '10px 20px',
              border: `1px solid ${destructive ? 'var(--accent-coral)' : 'var(--text)'}`,
              background: destructive ? 'var(--accent-coral)' : 'var(--text)',
              color: destructive ? '#FFFFFF' : 'var(--bg-surface)',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '0.2px',
              transition: 'background-color var(--transition-fast)',
            }}
            onMouseEnter={(e) => {
              if (destructive) {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--accent-coral-hover)';
              }
            }}
            onMouseLeave={(e) => {
              if (destructive) {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--accent-coral)';
              }
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
