import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { X } from '@phosphor-icons/react';

interface Shortcut {
  keys: string[];
  description: string;
}

interface ShortcutGroup {
  label: string;
  shortcuts: Shortcut[];
}

export default function ShortcutsDialog() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const GROUPS = useMemo<ShortcutGroup[]>(
    () => [
      {
        label: t('shortcuts.groupGlobal'),
        shortcuts: [
          { keys: ['⌘', 'K'], description: t('shortcuts.openSearch') },
          { keys: ['?'], description: t('shortcuts.openShortcuts') },
          { keys: ['Esc'], description: t('shortcuts.closeModalPanel') },
        ],
      },
      {
        label: t('shortcuts.groupView'),
        shortcuts: [
          { keys: ['['], description: t('shortcuts.prevFocus') },
          { keys: [']'], description: t('shortcuts.nextFocus') },
        ],
      },
      {
        label: t('shortcuts.groupNote'),
        shortcuts: [
          { keys: ['⌘', 'Enter'], description: t('shortcuts.saveCloseNote') },
          { keys: ['⌘', 'B'], description: t('shortcuts.bold') },
          { keys: ['⌘', 'I'], description: t('shortcuts.italic') },
          { keys: ['⌘', 'U'], description: t('shortcuts.underline') },
          { keys: ['⌘', 'Z'], description: t('shortcuts.undo') },
          { keys: ['⌘', '⇧', 'Z'], description: t('shortcuts.redo') },
          { keys: ['/'], description: t('shortcuts.blockMenu') },
          { keys: [':'], description: t('shortcuts.insertEmoji') },
        ],
      },
      {
        label: t('shortcuts.groupConfirmations'),
        shortcuts: [
          { keys: ['Enter'], description: t('shortcuts.confirmDestructive') },
          { keys: ['Esc'], description: t('shortcuts.cancelShortcut') },
        ],
      },
    ],
    [t],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Avoid triggering inside inputs/editors
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        // Only Escape should still work
        if (open && e.key === 'Escape') setOpen(false);
        return;
      }

      if (e.key === '?' && !open) {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('shortcuts.title')}
      onClick={() => setOpen(false)}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 500,
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
          maxWidth: 520,
          maxHeight: '84vh',
          background: 'var(--bg-surface)',
          border: '1px solid var(--text-15)',
          boxShadow: '0 24px 60px var(--shadow-lg), 0 4px 12px var(--shadow-md)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'sp-confirm-modal-in 260ms cubic-bezier(0.22, 1, 0.36, 1)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
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
            {t('shortcuts.title')}
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
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

        {/* Groups */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: '20px 24px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
          }}
        >
          {GROUPS.map((group) => (
            <div key={group.label}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '1.1px',
                  textTransform: 'uppercase',
                  color: 'var(--text-30)',
                  marginBottom: 10,
                }}
              >
                {group.label}
              </div>
              <div className="flex flex-col" style={{ gap: 8 }}>
                {group.shortcuts.map((sc, idx) => (
                  <div
                    key={idx}
                    className="flex items-center"
                    style={{ gap: 12, fontSize: 13 }}
                  >
                    <div className="flex items-center" style={{ gap: 4, flexShrink: 0 }}>
                      {sc.keys.map((k, i) => (
                        <kbd
                          key={i}
                          style={{
                            padding: '2px 7px',
                            border: '1px solid var(--text-15)',
                            background: 'var(--text-04)',
                            fontSize: 11,
                            fontFamily: 'var(--font-sans)',
                            color: 'var(--text-50)',
                            minWidth: 18,
                            textAlign: 'center',
                            fontWeight: 500,
                          }}
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                    <span style={{ color: 'var(--text)', flex: 1 }}>
                      {sc.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
