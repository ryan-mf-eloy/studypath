import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { CaretDown } from '@phosphor-icons/react';
import { usePopoverPosition } from './usePopoverPosition';

/** Paleta curada alinhada com os tokens do design system. */
export const BRAND_COLORS: string[] = [
  '#E84F3C', // coral
  '#2B6CB0', // blue
  '#3D9E6B', // green
  '#A855F7', // lilac
  '#D97706', // amber
  '#B0442F', // rust
  '#6B9E3F', // olive
  '#8B5CF6', // violet
  '#0284C7', // sky
  '#C2410C', // orange
  '#7C5CBF', // purple
  '#475569', // slate
  '#A86A2B', // ochre
  '#8B8478', // stone
];

interface ColorPickerProps {
  value?: string;
  onChange: (hex: string | undefined) => void;
  fallback?: string;
  ariaLabel?: string;
}

export default function ColorPicker({
  value,
  onChange,
  fallback = '#8B8478',
  ariaLabel,
}: ColorPickerProps) {
  const { t } = useTranslation();
  const resolvedAriaLabel = ariaLabel ?? t('colorPicker.pickColor');
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const display = value ?? fallback;

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
        <span
          style={{
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: display,
            border: '1px solid var(--text-15)',
            flexShrink: 0,
          }}
        />
        <span style={{ color: 'var(--text-50)', fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>
          {value ?? t('common.default')}
        </span>
        <CaretDown size={10} weight="bold" style={{ color: 'var(--text-30)' }} />
      </button>

      {open && createPortal(
        <div
          ref={popoverRef}
          role="dialog"
          aria-label={t('colorPicker.palette')}
          className="sp-popover-enter"
          style={{
            position: 'fixed',
            top: pos?.top ?? -9999,
            left: pos?.left ?? -9999,
            visibility: pos ? 'visible' : 'hidden',
            background: 'var(--bg-surface)',
            border: '1px solid var(--text-15)',
            boxShadow: '0 16px 40px var(--shadow-md), 0 2px 8px var(--shadow-sm)',
            padding: 12,
            zIndex: 500,
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 6,
            }}
          >
            {BRAND_COLORS.map((hex) => {
              const isActive = hex === value;
              return (
                <button
                  key={hex}
                  type="button"
                  aria-label={hex}
                  title={hex}
                  onClick={() => {
                    onChange(hex);
                    setOpen(false);
                  }}
                  style={{
                    width: 28,
                    height: 28,
                    padding: 0,
                    borderRadius: '50%',
                    background: hex,
                    border: `2px solid ${
                      isActive ? 'var(--accent-coral)' : 'transparent'
                    }`,
                    outline: '1px solid var(--text-15)',
                    outlineOffset: -2,
                    cursor: 'pointer',
                    transition: 'transform var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                  }}
                />
              );
            })}
          </div>

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
            <span>{t('colorPicker.colorCount', { count: BRAND_COLORS.length })}</span>
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
                {t('colorPicker.useDefault')}
              </button>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
