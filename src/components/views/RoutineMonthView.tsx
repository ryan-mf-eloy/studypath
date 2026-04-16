import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { CaretLeft, CaretRight, X } from '@phosphor-icons/react';
import { useRoutineStore } from '../../store/useRoutineStore';
import { useRoadmap } from '../../store/useRoadmapStore';
import { parseLocalDate } from '../../lib/utils';
import type { Focus } from '../../types';
import {
  materializeRange,
  toLocalDateKey,
  formatTime,
  detectMeetingProvider,
  slotColorAlpha,
  slotHatchPattern,
  type ResolvedSlot,
} from '../../lib/routineCalendar';
import MeetingBadge from '../ui/MeetingBadge';
import { resolveFocusMeta } from '../../lib/subjectMeta';
import SlotActionMenu, { type SlotMenuAnchor } from '../ui/SlotActionMenu';

interface Props {
  anchorDate: Date;
  onChangeAnchor: (d: Date) => void;
  onEditSlot: (slotId: string) => void;
  onAddSlot: (dayOfWeek: number) => void;
}

const MAX_CHIPS_PER_DAY = 3;

export default function RoutineMonthView({
  anchorDate,
  onChangeAnchor,
  onEditSlot,
  onAddSlot,
}: Props) {
  const { t, i18n } = useTranslation();
  const slots = useRoutineStore(s => s.slots);
  const overrides = useRoutineStore(s => s.overrides);
  const roadmap = useRoadmap();
  const [drawerDate, setDrawerDate] = useState<string | null>(null);
  const [menu, setMenu] = useState<SlotMenuAnchor | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  const focusLookup = useMemo(() => {
    const map = new Map<string, Focus>();
    for (const phase of roadmap.phases)
      for (const month of phase.months)
        for (const focus of month.focuses) map.set(focus.id, focus);
    return map;
  }, [roadmap.phases]);

  const locale = i18n.language || 'pt-BR';
  const viewMonth = useMemo(
    () => new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1),
    [anchorDate],
  );

  // Build 42-cell grid, Mon-first.
  const cells = useMemo(() => {
    const y = viewMonth.getFullYear();
    const m = viewMonth.getMonth();
    const first = new Date(y, m, 1);
    const leadingSunday = first.getDay(); // 0=Sun
    const leading = (leadingSunday + 6) % 7; // Mon-first offset
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const out: Array<{ date: Date; inMonth: boolean }> = [];
    for (let i = leading - 1; i >= 0; i--) {
      out.push({ date: new Date(y, m, -i), inMonth: false });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      out.push({ date: new Date(y, m, day), inMonth: true });
    }
    while (out.length < 42) {
      const idx = out.length - leading - daysInMonth + 1;
      out.push({ date: new Date(y, m + 1, idx), inMonth: false });
    }
    return out;
  }, [viewMonth]);

  const resolved = useMemo(
    () => materializeRange(slots, overrides, cells[0].date, cells[cells.length - 1].date),
    [slots, overrides, cells],
  );

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const weekdayHeaders = useMemo(() => {
    const keys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    return keys.map(k => t(`routine.weekdaysShort.${k}`));
  }, [t]);

  const monthLabel = viewMonth.toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  });

  const shiftMonth = (delta: number) => {
    const next = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + delta, 1);
    onChangeAnchor(next);
  };

  const drawerSlots = drawerDate ? resolved.get(drawerDate) ?? [] : [];
  // Parse component-wise; `new Date("YYYY-MM-DD")` parses as UTC midnight and
  // drifts to the previous day in negative-offset locales.
  const drawerDateObj = drawerDate ? parseLocalDate(drawerDate) : null;

  return (
    <div
      className="flex flex-col"
      style={{ gap: 16, height: '100%', minHeight: 0 }}
    >
      {/* Nav */}
      <div className="flex items-center" style={{ gap: 12, flexShrink: 0 }}>
        <div className="flex items-center" style={{ gap: 4 }}>
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            aria-label={t('datePicker.previousMonth')}
            style={NAV_BTN}
          >
            <CaretLeft size={13} weight="bold" />
          </button>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            aria-label={t('datePicker.nextMonth')}
            style={NAV_BTN}
          >
            <CaretRight size={13} weight="bold" />
          </button>
          <button
            type="button"
            onClick={() => onChangeAnchor(new Date())}
            style={{
              ...NAV_BTN,
              width: 'auto',
              padding: '6px 12px',
              marginLeft: 2,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.3px',
              textTransform: 'uppercase',
            }}
          >
            {t('routine.thisMonth')}
          </button>
        </div>
        <div
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 18,
            color: 'var(--text)',
            marginLeft: 4,
            textTransform: 'capitalize',
          }}
        >
          {monthLabel}
        </div>
      </div>

      {/* Weekday row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
          gap: 0,
          flexShrink: 0,
        }}
      >
        {weekdayHeaders.map((label, i) => (
          <div
            key={i}
            style={{
              textAlign: 'center',
              padding: '6px 0',
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              color: 'var(--text-30)',
              borderBottom: '1px solid var(--text-08)',
            }}
          >
            {label}
          </div>
        ))}
      </div>

      {/* Cell grid */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
          gridTemplateRows: 'repeat(6, minmax(96px, 1fr))',
          gap: 0,
        }}
      >
        {cells.map(({ date, inMonth }, idx) => {
          const key = toLocalDateKey(date);
          const daySlots = (resolved.get(key) ?? []).filter(
            s => s.status !== 'rescheduled-out',
          );
          const isToday =
            date.getFullYear() === today.getFullYear() &&
            date.getMonth() === today.getMonth() &&
            date.getDate() === today.getDate();
          return (
            <button
              key={`${key}-${idx}`}
              type="button"
              onClick={() => setDrawerDate(key)}
              onDoubleClick={() => onAddSlot(date.getDay())}
              className="flex flex-col"
              style={{
                borderRight: '1px solid var(--text-08)',
                borderBottom: '1px solid var(--text-08)',
                padding: '6px 7px',
                background: inMonth ? 'transparent' : 'var(--text-02)',
                alignItems: 'stretch',
                textAlign: 'left',
                cursor: 'pointer',
                minHeight: 0,
                transition: 'background-color var(--transition-fast)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                  inMonth ? 'var(--text-04)' : 'var(--text-04)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = inMonth
                  ? 'transparent'
                  : 'var(--text-02)';
              }}
            >
              <div
                className="flex items-center"
                style={{
                  justifyContent: 'space-between',
                  marginBottom: 4,
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 20,
                    height: 20,
                    fontSize: 11,
                    fontFamily: 'var(--font-sans)',
                    fontVariantNumeric: 'tabular-nums',
                    fontWeight: isToday ? 600 : 500,
                    color: isToday
                      ? 'var(--bg-surface)'
                      : inMonth
                      ? 'var(--text)'
                      : 'var(--text-30)',
                    background: isToday ? 'var(--accent-coral)' : 'transparent',
                    borderRadius: '50%',
                  }}
                >
                  {date.getDate()}
                </span>
                {daySlots.length > 0 && (
                  <span
                    style={{
                      fontSize: 9,
                      fontVariantNumeric: 'tabular-nums',
                      color: 'var(--text-30)',
                    }}
                  >
                    {daySlots.length}
                  </span>
                )}
              </div>
              <div
                className="flex flex-col"
                style={{ gap: 2, flex: 1, minHeight: 0 }}
              >
                {daySlots.slice(0, MAX_CHIPS_PER_DAY).map((slot, i) => (
                  <DayChip
                    key={`${slot.slotId}-${i}`}
                    slot={slot}
                    focusLookup={focusLookup}
                    locale={locale}
                  />
                ))}
                {daySlots.length > MAX_CHIPS_PER_DAY && (
                  <span
                    style={{
                      fontSize: 9,
                      color: 'var(--text-50)',
                      paddingLeft: 4,
                    }}
                  >
                    +{daySlots.length - MAX_CHIPS_PER_DAY}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Day drawer */}
      {drawerDate && drawerDateObj && createPortal(
        <>
          <div
            onClick={() => setDrawerDate(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'var(--bg-backdrop)',
              zIndex: 440,
              animation: 'sp-confirm-backdrop-in 200ms cubic-bezier(0.22,1,0.36,1)',
            }}
          />
          <aside
            ref={drawerRef}
            role="dialog"
            aria-label={t('routine.dayDrawerTitle')}
            className="sp-glass"
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              height: '100vh',
              width: 420,
              maxWidth: '100vw',
              borderLeft: '1px solid var(--glass-border)',
              boxShadow: '-16px 0 40px var(--shadow-md)',
              zIndex: 450,
              display: 'flex',
              flexDirection: 'column',
              animation: 'sp-pop-in 280ms cubic-bezier(0.22,1,0.36,1)',
              transformOrigin: 'right center',
            }}
          >
            <header
              className="flex items-center"
              style={{
                padding: '18px 22px 16px',
                gap: 12,
                borderBottom: '1px solid var(--text-08)',
              }}
            >
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    color: 'var(--text-30)',
                  }}
                >
                  {drawerDateObj.toLocaleDateString(locale, {
                    weekday: 'long',
                  })}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 22,
                    color: 'var(--text)',
                    lineHeight: 1.15,
                  }}
                >
                  {drawerDateObj.toLocaleDateString(locale, {
                    day: '2-digit',
                    month: 'long',
                  })}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDrawerDate(null)}
                aria-label={t('common.close')}
                style={{
                  padding: 6,
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-50)',
                  cursor: 'pointer',
                }}
              >
                <X size={16} />
              </button>
            </header>

            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px 22px 32px',
              }}
            >
              {drawerSlots.filter(s => s.status !== 'rescheduled-out').length === 0 && (
                <div
                  style={{
                    padding: '24px 0',
                    color: 'var(--text-50)',
                    fontSize: 13,
                    textAlign: 'center',
                  }}
                >
                  {t('routine.dayEmpty')}
                </div>
              )}
              <div className="flex flex-col" style={{ gap: 8 }}>
                {drawerSlots
                  .filter(s => s.status !== 'rescheduled-out')
                  .map((slot, i) => (
                    <DrawerSlotRow
                      key={`${slot.slotId}-${i}`}
                      slot={slot}
                      focusLookup={focusLookup}
                      locale={locale}
                      onClick={(el) =>
                        setMenu({
                          slotId: slot.slotId,
                          date: slot.date,
                          overrideId: slot.overrideId,
                          status: slot.status,
                          anchor: el,
                        })
                      }
                    />
                  ))}
              </div>
            </div>
          </aside>
        </>,
        document.body,
      )}

      {menu && (
        <SlotActionMenu
          anchor={menu}
          onClose={() => setMenu(null)}
          onEdit={() => {
            onEditSlot(menu.slotId);
            setMenu(null);
            setDrawerDate(null);
          }}
        />
      )}
    </div>
  );
}

/* ─── Chip (one per slot in grid cell) ────────────────────────────── */

interface ChipProps {
  slot: ResolvedSlot;
  focusLookup: Map<string, Focus>;
  locale: string;
}
function DayChip({ slot, focusLookup, locale }: ChipProps) {
  const focus = slot.focusId ? focusLookup.get(slot.focusId) ?? null : null;
  const meta = focus ? resolveFocusMeta(focus) : null;
  const color = slot.color ?? meta?.color ?? 'var(--accent-coral)';
  const label = slot.label?.trim() || focus?.name || null;
  const skipped = slot.status === 'skipped';
  return (
    <div
      className="flex items-center"
      style={{
        gap: 4,
        fontSize: 9,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: skipped ? 'transparent' : color,
          border: skipped ? `1px solid ${color}` : 'none',
          flexShrink: 0,
        }}
      />
      <span
        style={{
          color: skipped ? 'var(--text-30)' : 'var(--text-50)',
          fontVariantNumeric: 'tabular-nums',
          flexShrink: 0,
        }}
      >
        {formatTime(slot.startTime, locale)}
      </span>
      {label && (
        <span
          style={{
            color: skipped ? 'var(--text-30)' : 'var(--text)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
}

interface RowProps {
  slot: ResolvedSlot;
  focusLookup: Map<string, Focus>;
  locale: string;
  onClick: (el: HTMLButtonElement) => void;
}
function DrawerSlotRow({ slot, focusLookup, locale, onClick }: RowProps) {
  const { t } = useTranslation();
  const focus = slot.focusId ? focusLookup.get(slot.focusId) ?? null : null;
  const meta = focus ? resolveFocusMeta(focus) : null;
  const color = slot.color ?? meta?.color ?? 'var(--accent-coral)';
  const label = slot.label?.trim() || focus?.name || t('routine.freeBlockLabel');
  const skipped = slot.status === 'skipped';
  const isIn = slot.status === 'rescheduled-in';

  // Mesmo tratamento da week view: fundo bem discreto na cor do evento.
  const background = skipped ? slotHatchPattern(color) : slotColorAlpha(color, 0.08);
  const borderColor = skipped
    ? slotColorAlpha(color, 0.45)
    : slotColorAlpha(color, 0.7);

  return (
    <button
      type="button"
      onClick={(e) => onClick(e.currentTarget)}
      className="flex items-center"
      style={{
        gap: 12,
        padding: '10px 12px',
        background,
        border: 'none',
        borderLeft: `3px ${isIn ? 'dashed' : 'solid'} ${borderColor}`,
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      {slot.meetingUrl && !skipped && (
        <MeetingBadge
          url={slot.meetingUrl}
          provider={detectMeetingProvider(slot.meetingUrl)}
        />
      )}
      <span
        style={{
          width: 48,
          fontSize: 12,
          fontFamily: 'var(--font-sans)',
          fontVariantNumeric: 'tabular-nums',
          color: skipped ? 'var(--text-30)' : 'var(--text)',
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        {formatTime(slot.startTime, locale)}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          className="flex items-center"
          style={{
            gap: 8,
            fontSize: 13,
            color: skipped ? 'var(--text-30)' : 'var(--text)',
            fontWeight: 500,
          }}
        >
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </span>
          {skipped && (
            <span
              aria-label={t('routine.skipped')}
              style={{
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: '0.6px',
                textTransform: 'uppercase',
                color: 'var(--text-50)',
                flexShrink: 0,
              }}
            >
              {t('routine.skipped')}
            </span>
          )}
          {isIn && <span aria-hidden style={{ flexShrink: 0 }}>↪</span>}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-50)', marginTop: 2 }}>
          {t('routine.endsAt', { time: slot.endTime })}
        </div>
      </div>
    </button>
  );
}


const NAV_BTN: React.CSSProperties = {
  width: 28,
  height: 28,
  background: 'var(--bg-surface)',
  border: '1px solid var(--text-15)',
  color: 'var(--text-50)',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'var(--font-sans)',
};
