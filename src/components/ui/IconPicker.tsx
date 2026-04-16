import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { CaretDown, MagnifyingGlass } from '@phosphor-icons/react';
import { ICONS, ICON_KEYS, resolveIcon } from '../../lib/iconRegistry';
import { usePopoverPosition } from './usePopoverPosition';

interface IconPickerProps {
  value?: string;
  onChange: (key: string | undefined) => void;
  fallback?: string;
  color?: string;
  size?: number;
  ariaLabel?: string;
}

/**
 * Popover com grid de ícones do iconRegistry + busca por nome.
 * Selecionado retorna a string key, que é persistida no DB.
 */
export default function IconPicker({
  value,
  onChange,
  fallback = 'BookOpenText',
  color = 'var(--text-50)',
  size = 20,
  ariaLabel,
}: IconPickerProps) {
  const { t } = useTranslation();
  const resolvedAriaLabel = ariaLabel ?? t('appearance.title');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const anchorRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const Current = resolveIcon(value, ICONS[fallback] ?? ICONS.BookOpenText);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ICON_KEYS;
    return ICON_KEYS.filter((k) => k.toLowerCase().includes(q));
  }, [query]);

  const pos = usePopoverPosition({ open, anchorRef, popoverRef });

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (
        (anchorRef.current && target && anchorRef.current.contains(target)) ||
        (popoverRef.current && target && popoverRef.current.contains(target))
      ) {
        return;
      }
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        aria-label={resolvedAriaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center"
        style={{
          gap: 8,
          padding: '8px 12px',
          background: open ? 'var(--text-04)' : 'var(--bg-surface)',
          border: `1px solid ${open ? 'var(--text-30)' : 'var(--text-15)'}`,
          color: 'var(--text)',
          cursor: 'pointer',
          fontFamily: 'var(--font-sans)',
          fontSize: 12,
          transition:
            'background-color var(--transition-fast), border-color var(--transition-fast)',
        }}
      >
        <Current size={size} weight="regular" style={{ color }} />
        <span style={{ color: 'var(--text-50)', fontSize: 11 }}>
          {value ?? t('common.default')}
        </span>
        <CaretDown size={10} weight="bold" style={{ color: 'var(--text-30)' }} />
      </button>

      {open && createPortal(
        <div
          ref={popoverRef}
          role="dialog"
          aria-label={t('iconPicker.searchPlaceholder')}
          className="sp-popover-enter"
          style={{
            position: 'fixed',
            top: pos?.top ?? -9999,
            left: pos?.left ?? -9999,
            visibility: pos ? 'visible' : 'hidden',
            width: 320,
            background: 'var(--bg-surface)',
            border: '1px solid var(--text-15)',
            boxShadow: '0 16px 40px var(--shadow-md), 0 2px 8px var(--shadow-sm)',
            padding: 12,
            zIndex: 500,
          }}
        >
          <div
            className="flex items-center"
            style={{
              gap: 8,
              padding: '6px 10px',
              border: '1px solid var(--text-15)',
              marginBottom: 10,
            }}
          >
            <MagnifyingGlass size={13} style={{ color: 'var(--text-30)' }} />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('iconPicker.searchPlaceholder')}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text)',
                fontFamily: 'var(--font-sans)',
                fontSize: 12,
              }}
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(8, 1fr)',
              gap: 2,
              maxHeight: 260,
              overflowY: 'auto',
            }}
          >
            {filtered.map((key) => {
              const Icon = ICONS[key];
              const isActive = key === value;
              return (
                <button
                  key={key}
                  type="button"
                  aria-label={key}
                  title={key}
                  onClick={() => {
                    onChange(key);
                    setOpen(false);
                    setQuery('');
                  }}
                  className="flex items-center justify-center"
                  style={{
                    width: 36,
                    height: 36,
                    padding: 0,
                    background: 'transparent',
                    border: 'none',
                    color: isActive ? color : 'var(--text-50)',
                    cursor: 'pointer',
                    transition: 'color var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-50)';
                    }
                  }}
                >
                  <Icon size={21} weight="regular" />
                </button>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div
              style={{
                padding: '20px 10px',
                textAlign: 'center',
                fontSize: 11,
                color: 'var(--text-30)',
              }}
            >
              {t('iconPicker.empty')}
            </div>
          )}

          <div
            className="flex items-center"
            style={{
              justifyContent: 'space-between',
              marginTop: 10,
              paddingTop: 8,
              borderTop: '1px solid var(--text-08)',
              fontSize: 11,
              color: 'var(--text-30)',
            }}
          >
            <span>{t('iconPicker.iconCount', { count: filtered.length })}</span>
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange(undefined);
                  setOpen(false);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-50)',
                  cursor: 'pointer',
                  fontSize: 11,
                  padding: 0,
                  textDecoration: 'underline',
                }}
              >
                {t('iconPicker.useDefault')}
              </button>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
