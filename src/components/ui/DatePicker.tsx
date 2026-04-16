import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import {
  CalendarBlank,
  CaretDown,
  CaretLeft,
  CaretRight,
} from '@phosphor-icons/react';
import { usePopoverPosition } from './usePopoverPosition';

interface DatePickerProps {
  /** ISO date YYYY-MM-DD or empty string. */
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  /** Allow clearing the date (defaults to false — always picks a date). */
  allowClear?: boolean;
  /** Min/max bounds as ISO strings. */
  min?: string;
  max?: string;
  disabled?: boolean;
}

// Weekdays + month names are loaded via i18n at render time.

function parseISO(iso: string): Date | null {
  if (!iso) return null;
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDisplay(d: Date, locale: string): string {
  return d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Date picker custom do app — substitui `<input type="date">`. Abre um
 * popover portaled com calendário mensal estilizado no design system, sem
 * depender do chrome nativo do browser. Formato pt-BR (dd/mm/yyyy).
 */
export function DatePicker({
  value,
  onChange,
  placeholder,
  ariaLabel,
  allowClear = false,
  min,
  max,
  disabled = false,
}: DatePickerProps) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const resolvedPlaceholder = placeholder ?? t('datePicker.selectDate');
  const resolvedAriaLabel = ariaLabel ?? t('datePicker.selectDate');
  const WEEKDAYS = useMemo(() => t('datePicker.weekdays').split(','), [t]);
  const MONTH_NAMES = useMemo(() => t('datePicker.months').split(','), [t]);

  const valueDate = useMemo(() => parseISO(value), [value]);
  const minDate = useMemo(() => (min ? parseISO(min) : null), [min]);
  const maxDate = useMemo(() => (max ? parseISO(max) : null), [max]);

  // Month currently shown in the calendar (independent from selected value).
  const [viewMonth, setViewMonth] = useState<Date>(() => {
    return valueDate ?? new Date();
  });

  // Keep viewMonth in sync when the popover reopens with a new value.
  useEffect(() => {
    if (open) {
      setViewMonth(valueDate ?? new Date());
    }
  }, [open, valueDate]);

  const pos = usePopoverPosition({ open, anchorRef, popoverRef, gap: 6 });

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

  const grid = useMemo(() => {
    const y = viewMonth.getFullYear();
    const m = viewMonth.getMonth();
    const first = new Date(y, m, 1);
    const leading = first.getDay(); // 0 = Sunday
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    const cells: Array<{ date: Date; inMonth: boolean }> = [];
    // Previous month tail
    for (let i = leading - 1; i >= 0; i--) {
      const d = new Date(y, m, -i);
      cells.push({ date: d, inMonth: false });
    }
    // Current month
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push({ date: new Date(y, m, day), inMonth: true });
    }
    // Next month head to fill to 42 cells (6 rows × 7 cols)
    while (cells.length < 42) {
      const idx = cells.length - leading - daysInMonth + 1;
      cells.push({ date: new Date(y, m + 1, idx), inMonth: false });
    }
    return cells;
  }, [viewMonth]);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const isDisabled = (d: Date): boolean => {
    if (minDate && d < minDate) return true;
    if (maxDate && d > maxDate) return true;
    return false;
  };

  const goToPrevMonth = () => {
    setViewMonth((v) => new Date(v.getFullYear(), v.getMonth() - 1, 1));
  };
  const goToNextMonth = () => {
    setViewMonth((v) => new Date(v.getFullYear(), v.getMonth() + 1, 1));
  };
  const goToToday = () => {
    setViewMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    if (!isDisabled(today)) {
      onChange(toISO(today));
      setOpen(false);
    }
  };
  const pickDay = (d: Date) => {
    if (isDisabled(d)) return;
    onChange(toISO(d));
    setOpen(false);
  };
  const clear = () => {
    onChange('');
    setOpen(false);
  };

  const locale = i18n.language || 'pt-BR';
  const displayText = valueDate ? formatDisplay(valueDate, locale) : '';

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        disabled={disabled}
        aria-label={resolvedAriaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((v) => !v)}
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
          minWidth: 160,
          transition:
            'background-color var(--transition-fast), border-color var(--transition-fast)',
        }}
      >
        <CalendarBlank
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

      {open && createPortal(
        <div
          ref={popoverRef}
          role="dialog"
          aria-label={`${resolvedAriaLabel} — ${t('datePicker.calendar')}`}
          className="sp-popover-enter sp-glass"
          style={{
            position: 'fixed',
            top: pos?.top ?? -9999,
            left: pos?.left ?? -9999,
            visibility: pos ? 'visible' : 'hidden',
            width: 280,
            border: '1px solid var(--glass-border)',
            boxShadow: '0 16px 40px var(--shadow-md), 0 2px 8px var(--shadow-sm)',
            padding: 12,
            zIndex: 500,
          }}
        >
          {/* Header: month nav */}
          <div
            className="flex items-center"
            style={{
              gap: 6,
              marginBottom: 10,
            }}
          >
            <button
              type="button"
              onClick={goToPrevMonth}
              aria-label={t('datePicker.previousMonth')}
              className="flex items-center justify-center"
              style={{
                width: 26,
                height: 26,
                background: 'transparent',
                border: 'none',
                color: 'var(--text-50)',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.color = 'var(--text)')
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.color = 'var(--text-50)')
              }
            >
              <CaretLeft size={12} weight="bold" />
            </button>

            <div
              style={{
                flex: 1,
                textAlign: 'center',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--text)',
                fontFamily: 'var(--font-sans)',
              }}
            >
              {MONTH_NAMES[viewMonth.getMonth()]} {viewMonth.getFullYear()}
            </div>

            <button
              type="button"
              onClick={goToNextMonth}
              aria-label={t('datePicker.nextMonth')}
              className="flex items-center justify-center"
              style={{
                width: 26,
                height: 26,
                background: 'transparent',
                border: 'none',
                color: 'var(--text-50)',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.color = 'var(--text)')
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.color = 'var(--text-50)')
              }
            >
              <CaretRight size={12} weight="bold" />
            </button>
          </div>

          {/* Weekday header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 2,
              marginBottom: 4,
            }}
          >
            {WEEKDAYS.map((w, i) => (
              <div
                key={i}
                style={{
                  textAlign: 'center',
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.4px',
                  color: 'var(--text-30)',
                  padding: '4px 0',
                }}
              >
                {w}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 2,
            }}
          >
            {grid.map(({ date, inMonth }, idx) => {
              const isSelected = valueDate ? sameDay(date, valueDate) : false;
              const isToday = sameDay(date, today);
              const disabledCell = isDisabled(date);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => pickDay(date)}
                  disabled={disabledCell}
                  aria-label={formatDisplay(date, locale)}
                  aria-pressed={isSelected}
                  className="flex items-center justify-center"
                  style={{
                    height: 32,
                    padding: 0,
                    background: isSelected ? 'var(--text)' : 'transparent',
                    border: isToday && !isSelected
                      ? '1px solid var(--accent-coral)'
                      : '1px solid transparent',
                    color: disabledCell
                      ? 'var(--text-15)'
                      : isSelected
                      ? 'var(--bg-surface)'
                      : !inMonth
                      ? 'var(--text-30)'
                      : 'var(--text)',
                    cursor: disabledCell ? 'not-allowed' : 'pointer',
                    fontFamily: 'var(--font-sans)',
                    fontSize: 12,
                    fontWeight: isSelected ? 600 : 500,
                    fontVariantNumeric: 'tabular-nums',
                    transition:
                      'background-color var(--transition-fast), color var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected && !disabledCell) {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                        'var(--text-04)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected && !disabledCell) {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                        'transparent';
                    }
                  }}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div
            className="flex items-center"
            style={{
              marginTop: 10,
              paddingTop: 8,
              borderTop: '1px solid var(--text-08)',
              gap: 8,
              justifyContent: allowClear ? 'space-between' : 'flex-end',
            }}
          >
            {allowClear && valueDate && (
              <button
                type="button"
                onClick={clear}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-50)',
                  cursor: 'pointer',
                  fontSize: 11,
                  padding: 0,
                  textDecoration: 'underline',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {t('datePicker.clear')}
              </button>
            )}
            <button
              type="button"
              onClick={goToToday}
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
              {t('datePicker.today')}
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
