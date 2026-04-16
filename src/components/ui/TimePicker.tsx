import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { Clock, CaretDown } from '@phosphor-icons/react';
import { usePopoverPosition } from './usePopoverPosition';
import { formatTime } from '../../lib/routineCalendar';

interface TimePickerProps {
  /** "HH:MM" (24h) or empty. */
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  disabled?: boolean;
  /** Minute granularity (default 5). */
  minuteStep?: number;
}

function parseTime(t: string): { h: number; m: number } | null {
  const m = t.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!m) return null;
  return { h: Number(m[1]), m: Number(m[2]) };
}

function toHHMM(h: number, m: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Custom time picker. Substitui `<input type="time">` com popover portaled
 * seguindo o mesmo design system do DatePicker.
 */
export function TimePicker({
  value,
  onChange,
  placeholder,
  ariaLabel,
  disabled = false,
  minuteStep = 5,
}: TimePickerProps) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const hoursRef = useRef<HTMLDivElement>(null);
  const minutesRef = useRef<HTMLDivElement>(null);

  const parsed = useMemo(() => parseTime(value), [value]);
  const [draftH, setDraftH] = useState<number>(parsed?.h ?? 8);
  const [draftM, setDraftM] = useState<number>(parsed?.m ?? 0);

  useEffect(() => {
    if (open) {
      const cur = parseTime(value) ?? { h: 8, m: 0 };
      setDraftH(cur.h);
      setDraftM(cur.m);
    }
  }, [open, value]);

  const pos = usePopoverPosition({ open, anchorRef, popoverRef, gap: 6 });

  // Close on outside click + Esc
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
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minutes = useMemo(() => {
    const step = Math.max(1, Math.min(30, minuteStep));
    const out: number[] = [];
    for (let i = 0; i < 60; i += step) out.push(i);
    return out;
  }, [minuteStep]);

  // Scroll selected row into view when opened
  useEffect(() => {
    if (!open || !pos) return;
    const frame = requestAnimationFrame(() => {
      const hoursEl = hoursRef.current?.querySelector<HTMLButtonElement>(
        `[data-hour="${draftH}"]`,
      );
      const minutesEl = minutesRef.current?.querySelector<HTMLButtonElement>(
        `[data-minute="${draftM}"]`,
      );
      hoursEl?.scrollIntoView({ block: 'center' });
      minutesEl?.scrollIntoView({ block: 'center' });
    });
    return () => cancelAnimationFrame(frame);
  }, [open, pos, draftH, draftM]);

  const commit = (h = draftH, m = draftM) => {
    onChange(toHHMM(h, m));
    setOpen(false);
  };

  const locale = i18n.language || 'pt-BR';
  const resolvedPlaceholder = placeholder ?? t('timePicker.selectTime');
  const resolvedAriaLabel = ariaLabel ?? resolvedPlaceholder;
  const displayText = parsed ? formatTime(value, locale) : '';

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        disabled={disabled}
        aria-label={resolvedAriaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => !disabled && setOpen(v => !v)}
        className="flex items-center"
        style={{
          gap: 10,
          padding: '8px 12px',
          background: open ? 'var(--text-04)' : 'var(--bg-surface)',
          border: `1px solid ${open ? 'var(--text-30)' : 'var(--text-15)'}`,
          color: 'var(--text)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          fontFamily: 'var(--font-sans)',
          fontSize: 13,
          minWidth: 120,
          transition:
            'background-color var(--transition-fast), border-color var(--transition-fast)',
        }}
      >
        <Clock
          size={14}
          weight="regular"
          style={{ color: 'var(--text-50)', flexShrink: 0 }}
        />
        <span
          style={{
            flex: 1,
            textAlign: 'left',
            fontVariantNumeric: 'tabular-nums',
            color: displayText ? 'var(--text)' : 'var(--text-30)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {displayText || resolvedPlaceholder}
        </span>
        <CaretDown
          size={10}
          weight="bold"
          style={{
            color: 'var(--text-30)',
            flexShrink: 0,
            transform: open ? 'rotate(180deg)' : undefined,
            transition: 'transform var(--transition-fast)',
          }}
        />
      </button>

      {open &&
        createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-label={resolvedAriaLabel}
            className="sp-popover-enter sp-glass"
            style={{
              position: 'fixed',
              top: pos?.top ?? -9999,
              left: pos?.left ?? -9999,
              visibility: pos ? 'visible' : 'hidden',
              width: 200,
              border: '1px solid var(--glass-border)',
              boxShadow: '0 16px 40px var(--shadow-md), 0 2px 8px var(--shadow-sm)',
              padding: 10,
              zIndex: 500,
            }}
          >
            <div
              className="flex items-center"
              style={{
                marginBottom: 8,
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text-50)',
                letterSpacing: '0.4px',
                textTransform: 'uppercase',
                gap: 8,
              }}
            >
              <span style={{ flex: 1, textAlign: 'center' }}>
                {t('timePicker.hours')}
              </span>
              <span style={{ flex: 1, textAlign: 'center' }}>
                {t('timePicker.minutes')}
              </span>
            </div>

            <div
              className="flex"
              style={{
                gap: 8,
                height: 180,
              }}
            >
              <Column
                ref={hoursRef}
                items={hours}
                value={draftH}
                format={(n) => String(n).padStart(2, '0')}
                dataKey="hour"
                onPick={(n) => setDraftH(n)}
              />
              <Column
                ref={minutesRef}
                items={minutes}
                value={draftM}
                format={(n) => String(n).padStart(2, '0')}
                dataKey="minute"
                onPick={(n) => setDraftM(n)}
              />
            </div>

            <div
              className="flex items-center"
              style={{
                marginTop: 10,
                paddingTop: 8,
                borderTop: '1px solid var(--text-08)',
                justifyContent: 'flex-end',
                gap: 8,
              }}
            >
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-50)',
                  cursor: 'pointer',
                  fontSize: 11,
                  padding: 0,
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => commit()}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--accent-coral)',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 600,
                  padding: 0,
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

/* ─── Column (hours / minutes) ────────────────────────────────────── */

interface ColumnProps {
  items: number[];
  value: number;
  format: (n: number) => string;
  dataKey: 'hour' | 'minute';
  onPick: (n: number) => void;
  ref?: React.Ref<HTMLDivElement>;
}

const Column = ({ items, value, format, dataKey, onPick, ref }: ColumnProps) => {
  return (
    <div
      ref={ref}
      style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      {items.map((n) => {
        const selected = n === value;
        return (
          <button
            key={n}
            type="button"
            data-hour={dataKey === 'hour' ? n : undefined}
            data-minute={dataKey === 'minute' ? n : undefined}
            onClick={() => onPick(n)}
            style={{
              padding: '6px 0',
              background: selected ? 'var(--text)' : 'transparent',
              color: selected ? 'var(--bg-surface)' : 'var(--text)',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              fontWeight: selected ? 600 : 500,
              fontVariantNumeric: 'tabular-nums',
              textAlign: 'center',
              transition: 'background-color var(--transition-fast), color var(--transition-fast)',
            }}
            onMouseEnter={(e) => {
              if (!selected) {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                  'var(--text-04)';
              }
            }}
            onMouseLeave={(e) => {
              if (!selected) {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                  'transparent';
              }
            }}
          >
            {format(n)}
          </button>
        );
      })}
    </div>
  );
};
