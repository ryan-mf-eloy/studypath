import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CaretLeft, CaretRight, Plus } from '@phosphor-icons/react';
import { useRoutineStore } from '../../store/useRoutineStore';
import { useRoadmap } from '../../store/useRoadmapStore';
import {
  materializeRange,
  toLocalDateKey,
  formatTime,
  slotColorAlpha,
  slotHatchPattern,
  layoutDaySlots,
  SLOT_MIN_DURATION,
  SLOT_MAX_DURATION,
  type ResolvedSlot,
} from '../../lib/routineCalendar';
import { resolveFocusMeta } from '../../lib/subjectMeta';
import type { Focus, DayOfWeek } from '../../types';
import SlotActionMenu, { type SlotMenuAnchor } from '../ui/SlotActionMenu';
import SlotTooltip from '../ui/SlotTooltip';

type DragMode = 'move' | 'resize-top' | 'resize-bottom';

interface DragPreview {
  slotId: string;
  mode: DragMode;
  dayOfWeek: DayOfWeek;
  startTime: string;
  durationMin: number;
  /** Horizontal offset from the original day column (px). */
  translateX: number;
}

interface Props {
  anchorDate: Date;
  onChangeAnchor: (d: Date) => void;
  onEditSlot: (slotId: string) => void;
  /**
   * Creates a new slot. Optionally pinned to a starting time (HH:MM) so
   * clicking an empty spot in the day column creates the event at that hour.
   */
  onAddSlot: (dayOfWeek: number, startTime?: string) => void;
}

const PX_PER_MIN = 1.1;
const HOUR_WIDTH = 52;
const MIN_WINDOW_START = 6;
const MIN_WINDOW_END = 22;

export default function RoutineWeekView({
  anchorDate,
  onChangeAnchor,
  onEditSlot,
  onAddSlot,
}: Props) {
  const { t, i18n } = useTranslation();
  const slots = useRoutineStore(s => s.slots);
  const overrides = useRoutineStore(s => s.overrides);
  const updateSlot = useRoutineStore(s => s.updateSlot);
  const roadmap = useRoadmap();
  const [menu, setMenu] = useState<SlotMenuAnchor | null>(null);
  const [tooltip, setTooltip] = useState<{
    slot: ResolvedSlot;
    anchor: HTMLElement;
  } | null>(null);
  const showTimer = useRef<number | null>(null);
  const hideTimer = useRef<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // ── Drag + resize state ─────────────────────────────────────────
  const [drag, setDrag] = useState<DragPreview | null>(null);
  const dragRef = useRef<DragPreview | null>(null);
  const suppressClickRef = useRef(false);

  const setDragBoth = useCallback((d: DragPreview | null) => {
    dragRef.current = d;
    setDrag(d);
  }, []);

  const clearTimers = useCallback(() => {
    if (showTimer.current !== null) {
      window.clearTimeout(showTimer.current);
      showTimer.current = null;
    }
    if (hideTimer.current !== null) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  // Mouse entered a slot — schedule tooltip to appear after 250ms.
  const handleSlotHoverEnter = useCallback(
    (slot: ResolvedSlot, anchor: HTMLElement) => {
      clearTimers();
      showTimer.current = window.setTimeout(() => {
        setTooltip({ slot, anchor });
      }, 250);
    },
    [clearTimers],
  );

  // Mouse left a slot OR the tooltip — delay the hide so the cursor can
  // travel through the gap without the tooltip vanishing underneath it.
  const handleHoverLeave = useCallback(() => {
    if (showTimer.current !== null) {
      window.clearTimeout(showTimer.current);
      showTimer.current = null;
    }
    if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      setTooltip(null);
    }, 180);
  }, []);

  // Mouse re-entered the tooltip (or a new slot) — cancel any pending hide.
  const handleTooltipEnter = useCallback(() => {
    if (hideTimer.current !== null) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  // Hide tooltip whenever the action menu opens (click shouldn't leave a
  // stale tooltip hanging around the menu).
  useEffect(() => {
    if (menu) {
      clearTimers();
      setTooltip(null);
    }
  }, [menu, clearTimers]);

  /**
   * Starts a drag or resize interaction on a slot block. Subscribes to
   * window-level pointermove/pointerup so the drag keeps working even when
   * the cursor leaves the block. On commit, persists via `updateSlot`.
   */
  const startDrag = useCallback(
    (
      slot: ResolvedSlot,
      mode: DragMode,
      event: React.PointerEvent<HTMLElement>,
    ) => {
      // Cancel any pending tooltip and immediately hide if shown.
      clearTimers();
      setTooltip(null);

      const grid = gridRef.current;
      if (!grid) return;

      const gridRect = grid.getBoundingClientRect();
      const colWidth = (gridRect.width - HOUR_WIDTH) / 7;
      const [h, m] = slot.startTime.split(':').map(Number);
      const initialStartMin = h * 60 + m;
      const initialDurationMin = slot.durationMin;
      const initialDayOfWeek = slot.dayOfWeek as DayOfWeek;
      // Convert JS day-of-week (Sun=0..Sat=6) to Mon-first column index.
      const initialColIdx = (initialDayOfWeek + 6) % 7;

      const startX = event.clientX;
      const startY = event.clientY;
      let moved = false;

      // Prevent text selection / focus ring flicker while dragging.
      event.preventDefault();

      const prevBodyCursor = document.body.style.cursor;
      document.body.style.cursor =
        mode === 'move' ? 'grabbing' : 'ns-resize';
      document.body.style.userSelect = 'none';

      const onMove = (e: PointerEvent) => {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (!moved && Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
        moved = true;

        // Snap vertical motion to 15-minute increments.
        const deltaMin = Math.round(dy / PX_PER_MIN / 15) * 15;

        let newStartMin = initialStartMin;
        let newDurationMin = initialDurationMin;
        let newColIdx = initialColIdx;

        if (mode === 'move') {
          newStartMin = initialStartMin + deltaMin;
          newStartMin = Math.max(
            0,
            Math.min(24 * 60 - newDurationMin, newStartMin),
          );
          // Compute target column from pointer x.
          const localX = e.clientX - gridRect.left - HOUR_WIDTH;
          newColIdx = Math.max(
            0,
            Math.min(6, Math.floor(localX / colWidth)),
          );
        } else if (mode === 'resize-top') {
          const endMin = initialStartMin + initialDurationMin;
          newStartMin = initialStartMin + deltaMin;
          // Clamp so the top never crosses the bottom (respecting min duration)
          // and never goes below 0 or above the SLOT_MAX_DURATION window.
          newStartMin = Math.max(0, newStartMin);
          newStartMin = Math.min(endMin - SLOT_MIN_DURATION, newStartMin);
          newStartMin = Math.max(endMin - SLOT_MAX_DURATION, newStartMin);
          newDurationMin = endMin - newStartMin;
        } else if (mode === 'resize-bottom') {
          newDurationMin = initialDurationMin + deltaMin;
          newDurationMin = Math.max(SLOT_MIN_DURATION, newDurationMin);
          newDurationMin = Math.min(SLOT_MAX_DURATION, newDurationMin);
          newDurationMin = Math.min(
            newDurationMin,
            24 * 60 - initialStartMin,
          );
        }

        const hh = Math.floor(newStartMin / 60);
        const mm = newStartMin % 60;
        const newStartTime = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
        const newDayOfWeek = (((newColIdx + 1) % 7) as DayOfWeek);
        const translateX = (newColIdx - initialColIdx) * colWidth;

        setDragBoth({
          slotId: slot.slotId,
          mode,
          dayOfWeek: newDayOfWeek,
          startTime: newStartTime,
          durationMin: newDurationMin,
          translateX,
        });
      };

      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
        document.body.style.cursor = prevBodyCursor;
        document.body.style.userSelect = '';

        const preview = dragRef.current;
        if (moved && preview && preview.slotId === slot.slotId) {
          const patch: Parameters<typeof updateSlot>[1] = {
            durationMin: preview.durationMin,
            startTime: preview.startTime,
          };
          if (mode === 'move') patch.dayOfWeek = preview.dayOfWeek;
          updateSlot(slot.slotId, patch);
          // Suppress the upcoming click so it doesn't open the action menu.
          suppressClickRef.current = true;
        }

        setDragBoth(null);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    },
    [clearTimers, setDragBoth, updateSlot],
  );

  // Memoize focusId → Focus lookup once per roadmap change to avoid
  // the roadmap traversal rule (one flatMap walk per rendered block).
  const focusLookup = useMemo(() => {
    const map = new Map<string, Focus>();
    for (const phase of roadmap.phases)
      for (const month of phase.months)
        for (const focus of month.focuses) map.set(focus.id, focus);
    return map;
  }, [roadmap.phases]);

  // Compute Monday-anchored week start.
  const weekStart = useMemo(() => {
    const d = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), anchorDate.getDate());
    const dow = d.getDay();
    const mondayOffset = (dow + 6) % 7; // Sun=6, Mon=0…
    d.setDate(d.getDate() - mondayOffset);
    return d;
  }, [anchorDate]);

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const resolved = useMemo(
    () => materializeRange(slots, overrides, days[0], days[6]),
    [slots, overrides, days],
  );

  // Hour window: clamp to [06, 22] unless actual slots fall outside.
  const { startHour, endHour } = useMemo(() => {
    let min = MIN_WINDOW_START * 60;
    let max = MIN_WINDOW_END * 60;
    for (const list of resolved.values()) {
      for (const s of list) {
        if (s.status === 'rescheduled-out') continue;
        const [h, m] = s.startTime.split(':').map(Number);
        const startMin = h * 60 + m;
        const endMin = startMin + s.durationMin;
        if (startMin < min) min = startMin;
        if (endMin > max) max = endMin;
      }
    }
    return {
      startHour: Math.floor(min / 60),
      endHour: Math.ceil(max / 60),
    };
  }, [resolved]);

  const hours = useMemo(() => {
    const out: number[] = [];
    for (let h = startHour; h <= endHour; h++) out.push(h);
    return out;
  }, [startHour, endHour]);

  const totalMins = (endHour - startHour) * 60;
  const gridHeight = Math.max(360, totalMins * PX_PER_MIN);

  const locale = i18n.language || 'pt-BR';
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const weekLabel = useMemo(() => {
    const first = days[0];
    const last = days[6];
    const sameMonth = first.getMonth() === last.getMonth();
    const firstStr = first.toLocaleDateString(locale, {
      day: '2-digit',
      month: sameMonth ? undefined : 'short',
    });
    const lastStr = last.toLocaleDateString(locale, {
      day: '2-digit',
      month: 'short',
      year:
        first.getFullYear() === last.getFullYear() && first.getFullYear() === today.getFullYear()
          ? undefined
          : 'numeric',
    });
    return `${firstStr} – ${lastStr}`;
  }, [days, locale, today]);

  const shiftWeek = (delta: number) => {
    const next = new Date(anchorDate);
    next.setDate(next.getDate() + delta * 7);
    onChangeAnchor(next);
  };

  return (
    <div
      className="flex flex-col"
      style={{ gap: 16, height: '100%', minHeight: 0 }}
    >
      {/* Week nav row */}
      <div
        className="flex items-center"
        style={{
          gap: 12,
          flexShrink: 0,
        }}
      >
        <div className="flex items-center" style={{ gap: 4 }}>
          <button
            type="button"
            onClick={() => shiftWeek(-1)}
            aria-label={t('routine.previousWeek')}
            style={NAV_BTN}
          >
            <CaretLeft size={13} weight="bold" />
          </button>
          <button
            type="button"
            onClick={() => shiftWeek(1)}
            aria-label={t('routine.nextWeek')}
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
            {t('routine.thisWeek')}
          </button>
        </div>
        <div
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 18,
            color: 'var(--text)',
            marginLeft: 4,
          }}
        >
          {weekLabel}
        </div>
      </div>

      {/* Day header row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `${HOUR_WIDTH}px repeat(7, minmax(0, 1fr))`,
          gap: 0,
          borderBottom: '1px solid var(--text-08)',
          flexShrink: 0,
        }}
      >
        <div />
        {days.map(d => {
          const isToday =
            d.getFullYear() === today.getFullYear() &&
            d.getMonth() === today.getMonth() &&
            d.getDate() === today.getDate();
          return (
            <div
              key={toLocalDateKey(d)}
              className="flex flex-col items-center"
              style={{
                padding: '8px 4px 10px',
                borderLeft: '1px solid var(--text-08)',
                borderBottom: isToday ? '2px solid var(--accent-coral)' : undefined,
                marginBottom: isToday ? -1 : 0,
                gap: 2,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  color: isToday ? 'var(--accent-coral)' : 'var(--text-50)',
                }}
              >
                {d.toLocaleDateString(locale, { weekday: 'short' })}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 18,
                  color: isToday ? 'var(--accent-coral)' : 'var(--text)',
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {d.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Scrollable grid */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          paddingBottom: 12,
        }}
      >
        <div
          ref={gridRef}
          style={{
            display: 'grid',
            gridTemplateColumns: `${HOUR_WIDTH}px repeat(7, minmax(0, 1fr))`,
            position: 'relative',
            height: gridHeight,
          }}
        >
          {/* Hour ruler */}
          <div style={{ position: 'relative' }}>
            {hours.map((h, idx) => (
              <div
                key={h}
                style={{
                  position: 'absolute',
                  top: (h - startHour) * 60 * PX_PER_MIN,
                  left: 0,
                  right: 0,
                  paddingRight: 8,
                  textAlign: 'right',
                  fontSize: 10,
                  color: 'var(--text-30)',
                  fontVariantNumeric: 'tabular-nums',
                  transform: idx === 0 ? 'translateY(0)' : 'translateY(-50%)',
                }}
              >
                {formatTime(`${String(h).padStart(2, '0')}:00`, locale)}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map(date => {
            const key = toLocalDateKey(date);
            const daySlots = resolved.get(key) ?? [];
            return (
              <DayColumn
                key={key}
                date={date}
                daySlots={daySlots}
                startHour={startHour}
                hours={hours}
                focusLookup={focusLookup}
                drag={drag}
                dragActive={drag !== null}
                suppressClickRef={suppressClickRef}
                onAddSlot={onAddSlot}
                onOpenSlot={(slot, el) =>
                  setMenu({
                    slotId: slot.slotId,
                    date: slot.date,
                    overrideId: slot.overrideId,
                    status: slot.status,
                    anchor: el,
                  })
                }
                onSlotHoverEnter={handleSlotHoverEnter}
                onSlotHoverLeave={handleHoverLeave}
                onSlotDragStart={startDrag}
              />
            );
          })}
        </div>
      </div>

      {menu && (
        <SlotActionMenu
          anchor={menu}
          onClose={() => setMenu(null)}
          onEdit={() => {
            onEditSlot(menu.slotId);
            setMenu(null);
          }}
        />
      )}

      {tooltip && !menu && (
        <SlotTooltip
          slot={tooltip.slot}
          focus={tooltip.slot.focusId ? focusLookup.get(tooltip.slot.focusId) ?? null : null}
          anchor={tooltip.anchor}
          onMouseEnter={handleTooltipEnter}
          onMouseLeave={handleHoverLeave}
        />
      )}
    </div>
  );
}

/* ─── Day column ──────────────────────────────────────────────────── */

interface DayColumnProps {
  date: Date;
  daySlots: ResolvedSlot[];
  startHour: number;
  hours: number[];
  focusLookup: Map<string, Focus>;
  drag: DragPreview | null;
  dragActive: boolean;
  suppressClickRef: React.RefObject<boolean>;
  onAddSlot: (dayOfWeek: number, startTime?: string) => void;
  onOpenSlot: (slot: ResolvedSlot, el: HTMLElement) => void;
  onSlotHoverEnter: (slot: ResolvedSlot, el: HTMLElement) => void;
  onSlotHoverLeave: () => void;
  onSlotDragStart: (
    slot: ResolvedSlot,
    mode: DragMode,
    event: React.PointerEvent<HTMLElement>,
  ) => void;
}

/**
 * One column in the 7-day week grid. Tracks mouse hover to preview where a
 * new event would be created (rounded down to the hour), and commits the new
 * event on click at the hovered hour.
 */
function DayColumn({
  date,
  daySlots,
  startHour,
  hours,
  focusLookup,
  drag,
  dragActive,
  suppressClickRef,
  onAddSlot,
  onOpenSlot,
  onSlotHoverEnter,
  onSlotHoverLeave,
  onSlotDragStart,
}: DayColumnProps) {
  const { t, i18n } = useTranslation();
  const [hoverHour, setHoverHour] = useState<number | null>(null);
  const locale = i18n.language || 'pt-BR';

  // Lay out overlapping slots into parallel lanes (Google-Calendar-style).
  const laidOutSlots = useMemo(() => layoutDaySlots(daySlots), [daySlots]);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragActive) {
      if (hoverHour !== null) setHoverHour(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const absoluteMin = startHour * 60 + y / PX_PER_MIN;
    const hourFloor = Math.floor(absoluteMin / 60);
    // Hide the preview if the mouse is over an existing visible slot.
    const occupied = daySlots.some(slot => {
      if (slot.status === 'rescheduled-out' || slot.status === 'skipped') return false;
      const [sh, sm] = slot.startTime.split(':').map(Number);
      const start = sh * 60 + sm;
      const end = start + slot.durationMin;
      return absoluteMin >= start && absoluteMin < end;
    });
    setHoverHour(occupied ? null : hourFloor);
  };

  const handleLeave = () => setHoverHour(null);

  const handleClick = () => {
    if (dragActive) return;
    if (hoverHour === null) return;
    const hh = Math.max(0, Math.min(23, hoverHour));
    const startTime = `${String(hh).padStart(2, '0')}:00`;
    onAddSlot(date.getDay(), startTime);
  };

  const ghostTop =
    hoverHour !== null
      ? (hoverHour - startHour) * 60 * PX_PER_MIN
      : 0;
  const ghostHeight = 60 * PX_PER_MIN - 2;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={t('routine.addSlotForDay')}
      style={{
        position: 'relative',
        borderLeft: '1px solid var(--text-08)',
        cursor: hoverHour !== null ? 'copy' : 'default',
      }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onAddSlot(date.getDay());
        }
      }}
    >
      {/* Hour gridlines */}
      {hours.map(h => (
        <div
          key={h}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: (h - startHour) * 60 * PX_PER_MIN,
            height: 1,
            background: 'var(--text-04)',
            pointerEvents: 'none',
          }}
        />
      ))}

      {/* Ghost "new event" preview on hover */}
      {hoverHour !== null && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: ghostTop,
            left: 3,
            right: 3,
            height: ghostHeight,
            background:
              'repeating-linear-gradient(-45deg, var(--text-08) 0 1px, transparent 1px 8px)',
            border: '1px dashed var(--text-15)',
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            padding: '5px 7px',
            overflow: 'hidden',
            color: 'var(--text-50)',
            fontFamily: 'var(--font-sans)',
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontVariantNumeric: 'tabular-nums',
              opacity: 0.8,
            }}
          >
            {formatTime(`${String(hoverHour).padStart(2, '0')}:00`, locale)}
          </span>
          <span
            className="flex items-center"
            style={{
              gap: 4,
              fontSize: 11,
              fontWeight: 600,
              opacity: 0.85,
            }}
          >
            <Plus size={11} weight="bold" />
            {t('routine.addSlotHint')}
          </span>
        </div>
      )}

      {/* Slot blocks */}
      {laidOutSlots.map(({ slot, lane, groupColumns }, idx) => {
        const isDragging = drag?.slotId === slot.slotId;
        const preview = isDragging ? drag : null;
        return (
          <SlotBlock
            key={`${slot.slotId}-${slot.status}-${idx}`}
            slot={slot}
            startHour={startHour}
            focusLookup={focusLookup}
            lane={lane}
            groupColumns={groupColumns}
            preview={preview}
            suppressClickRef={suppressClickRef}
            onClick={(el) => onOpenSlot(slot, el)}
            onHoverEnter={(el) => onSlotHoverEnter(slot, el)}
            onHoverLeave={onSlotHoverLeave}
            onDragStart={(mode, ev) => onSlotDragStart(slot, mode, ev)}
          />
        );
      })}
    </div>
  );
}

/* ─── Slot block ──────────────────────────────────────────────────── */

interface BlockProps {
  slot: ResolvedSlot;
  startHour: number;
  focusLookup: Map<string, Focus>;
  /** 0-based horizontal lane within the overlap cluster. */
  lane: number;
  /** Total number of lanes in the cluster. */
  groupColumns: number;
  preview: DragPreview | null;
  suppressClickRef: React.RefObject<boolean>;
  onClick: (el: HTMLElement) => void;
  onHoverEnter: (el: HTMLElement) => void;
  onHoverLeave: () => void;
  onDragStart: (
    mode: DragMode,
    event: React.PointerEvent<HTMLElement>,
  ) => void;
}

function SlotBlock({
  slot,
  startHour,
  focusLookup,
  lane,
  groupColumns,
  preview,
  suppressClickRef,
  onClick,
  onHoverEnter,
  onHoverLeave,
  onDragStart,
}: BlockProps) {
  const { i18n } = useTranslation();

  if (slot.status === 'rescheduled-out') return null;

  // Use the live drag preview for this slot if there is one — otherwise the
  // slot's own persisted values.
  const effStartTime = preview?.startTime ?? slot.startTime;
  const effDurationMin = preview?.durationMin ?? slot.durationMin;
  const effTranslateX = preview?.translateX ?? 0;
  const isDragging = preview !== null;

  const [h, m] = effStartTime.split(':').map(Number);
  const startMin = h * 60 + m;
  const top = (startMin - startHour * 60) * PX_PER_MIN;
  const height = Math.max(22, effDurationMin * PX_PER_MIN - 2);

  // Lane-based horizontal layout. Each lane takes 1/groupColumns of the
  // column width; adjacent lanes split the 6px side padding (3px each)
  // so there's a visible 6px gap between events.
  const laneWidthPct = 100 / groupColumns;
  const leftPct = lane * laneWidthPct;
  const narrow = groupColumns >= 3;
  const veryNarrow = groupColumns >= 4;

  const focus = slot.focusId ? focusLookup.get(slot.focusId) ?? null : null;
  const meta = focus ? resolveFocusMeta(focus) : null;
  const color = slot.color ?? meta?.color ?? 'var(--accent-coral)';
  const locale = i18n.language || 'pt-BR';

  const label = slot.label?.trim() || focus?.name || null;

  const isSkipped = slot.status === 'skipped';
  const isIn = slot.status === 'rescheduled-in';

  // Fundo bem discreto na cor do evento (8%), borda esquerda em 70% pra
  // manter a identidade visual mesmo com o fill quase transparente.
  const background = isSkipped
    ? slotHatchPattern(color)
    : slotColorAlpha(color, 0.08);
  const borderColor = isSkipped
    ? slotColorAlpha(color, 0.45)
    : slotColorAlpha(color, 0.7);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={label ?? formatTime(effStartTime, locale)}
      onPointerDown={(e) => {
        // Ignore right-click and secondary buttons.
        if (e.button !== 0) return;
        e.stopPropagation();
        onDragStart('move', e);
      }}
      onClick={(e) => {
        // If a drag just committed, the click should be ignored.
        if (suppressClickRef.current) {
          suppressClickRef.current = false;
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        e.stopPropagation();
        onClick(e.currentTarget);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(e.currentTarget);
        }
      }}
      style={{
        position: 'absolute',
        top,
        left: `calc(${leftPct}% + 3px)`,
        width: `calc(${laneWidthPct}% - 6px)`,
        height,
        padding: veryNarrow ? '4px 5px' : '5px 7px',
        background,
        border: 'none',
        borderLeft: `2px ${isIn ? 'dashed' : 'solid'} ${borderColor}`,
        color: 'var(--text)',
        cursor: isDragging ? 'grabbing' : 'grab',
        textAlign: 'left',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        gap: 1,
        fontFamily: 'var(--font-sans)',
        transform: `translateX(${effTranslateX}px)`,
        transition: isDragging
          ? 'none'
          : 'transform var(--transition-fast), background-color var(--transition-fast), left var(--transition-base), width var(--transition-base)',
        boxShadow: isDragging ? '0 10px 28px rgba(0,0,0,0.25)' : undefined,
        opacity: isDragging ? 0.95 : 1,
        zIndex: isDragging ? 3 : 1,
        touchAction: 'none',
        userSelect: 'none',
      }}
      onMouseEnter={(e) => {
        if (isDragging) return;
        (e.currentTarget as HTMLElement).style.transform =
          `translateX(${effTranslateX}px) translateY(-1px)`;
        onHoverEnter(e.currentTarget);
      }}
      onMouseLeave={(e) => {
        if (isDragging) return;
        (e.currentTarget as HTMLElement).style.transform = `translateX(${effTranslateX}px)`;
        onHoverLeave();
      }}
    >
      {/* Top resize handle */}
      <div
        aria-hidden
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.stopPropagation();
          onDragStart('resize-top', e);
        }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 6,
          cursor: 'ns-resize',
          touchAction: 'none',
        }}
      />
      {/* Bottom resize handle */}
      <div
        aria-hidden
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.stopPropagation();
          onDragStart('resize-bottom', e);
        }}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 6,
          cursor: 'ns-resize',
          touchAction: 'none',
        }}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: narrow ? 4 : 6,
          fontSize: veryNarrow ? 9 : 10,
          fontVariantNumeric: 'tabular-nums',
          color: isSkipped ? 'var(--text-30)' : 'var(--text-50)',
          minWidth: 0,
        }}
      >
        <span
          style={{
            flexShrink: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {formatTime(effStartTime, locale)}
        </span>
        {isIn && <span aria-hidden style={{ flexShrink: 0 }}>↪</span>}
      </div>
      {label && (
        <span
          style={{
            fontSize: veryNarrow ? 10 : 11,
            fontWeight: 600,
            color: isSkipped ? 'var(--text-30)' : 'var(--text)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: 1.2,
          }}
        >
          {label}
        </span>
      )}
    </div>
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
