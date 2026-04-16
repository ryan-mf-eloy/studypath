import type { RoutineSlot, RoutineOverride, MeetingProvider } from '../types';

/**
 * Detecta o provedor da reunião a partir da URL. Fallback: `'other'` para
 * qualquer URL http(s) válida que não bate com nenhum padrão conhecido.
 */
export function detectMeetingProvider(url: string | undefined): MeetingProvider | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  let host: string;
  try {
    host = new URL(trimmed).hostname.toLowerCase();
  } catch {
    return null;
  }
  if (host === 'meet.google.com' || host.endsWith('.meet.google.com')) return 'google-meet';
  if (host === 'teams.microsoft.com' || host.endsWith('.teams.microsoft.com')) return 'teams';
  if (host === 'teams.live.com') return 'teams';
  if (host.endsWith('.zoom.us') || host === 'zoom.us') return 'zoom';
  if (host.endsWith('.slack.com') || host === 'slack.com') return 'slack';
  if (host === 'discord.com' || host === 'discord.gg' || host.endsWith('.discord.com')) return 'discord';
  return 'other';
}

export function meetingProviderLabel(provider: MeetingProvider): string {
  switch (provider) {
    case 'google-meet': return 'Google Meet';
    case 'teams': return 'Microsoft Teams';
    case 'zoom': return 'Zoom';
    case 'slack': return 'Slack';
    case 'discord': return 'Discord';
    default: return 'Reunião';
  }
}

/** Minimum slot duration in minutes. Shared between UI + server validation. */
export const SLOT_MIN_DURATION = 15;
/** Maximum slot duration in minutes. Shared between UI + server validation. */
export const SLOT_MAX_DURATION = 240;
/** Step for duration controls (stepper + keyboard arrows). */
export const SLOT_DURATION_STEP = 15;

/**
 * Blend a color with transparency. Uses CSS `color-mix` so it works with any
 * valid CSS color value — hex, rgb(), hsl(), named colors, AND CSS variables
 * like `var(--accent-coral)`. Returns a string safe to use as `background` or
 * `border-color`.
 */
export function slotColorAlpha(color: string, alpha: number): string {
  const pct = Math.max(0, Math.min(100, Math.round(alpha * 100)));
  return `color-mix(in srgb, ${color} ${pct}%, transparent)`;
}

/** Minimal diagonal-line hatch used for skipped slot blocks. */
export function slotHatchPattern(color: string): string {
  const line = slotColorAlpha(color, 0.18);
  const fill = slotColorAlpha(color, 0.04);
  return `repeating-linear-gradient(-45deg, ${line} 0 1px, ${fill} 1px 9px)`;
}

/* ─── Overlap layout ──────────────────────────────────────────────── */

/** Slot laid out with its column assignment inside its overlap cluster. */
export interface LaidOutSlot {
  slot: ResolvedSlot;
  /** 0-based column index within the cluster. */
  lane: number;
  /** Total number of lanes in this slot's cluster. */
  groupColumns: number;
}

function startMinutes(slot: ResolvedSlot): number {
  const [h, m] = slot.startTime.split(':').map(Number);
  return h * 60 + m;
}

function endMinutes(slot: ResolvedSlot): number {
  return startMinutes(slot) + slot.durationMin;
}

/**
 * Arranges a day's visible slots into parallel lanes so overlapping events
 * render side-by-side. Uses the standard greedy algorithm:
 *
 *  1. Sort by start time (ties broken by longer-first for visual stability).
 *  2. Walk events; when an event starts after the max end of the running
 *     "cluster", flush the cluster and start a new one.
 *  3. Within a cluster, place each event into the earliest lane whose last
 *     event has already ended — otherwise open a new lane.
 *
 * Every event in a cluster gets the same `groupColumns` (the widest point
 * of the cluster), so lanes stay visually aligned column-to-column.
 *
 * Rescheduled-out slots are filtered out — they're already hidden visually.
 */
export function layoutDaySlots(slots: ResolvedSlot[]): LaidOutSlot[] {
  const visible = slots.filter((s) => s.status !== 'rescheduled-out');
  if (visible.length === 0) return [];

  const sorted = [...visible].sort((a, b) => {
    const diff = startMinutes(a) - startMinutes(b);
    if (diff !== 0) return diff;
    return b.durationMin - a.durationMin;
  });

  const result: LaidOutSlot[] = [];
  let cluster: ResolvedSlot[] = [];
  let clusterEndMax = -Infinity;

  const flush = () => {
    if (cluster.length === 0) return;
    // Assign each event the earliest available lane.
    const lanes: number[] = []; // lanes[i] = end minute of the last event in lane i
    const laneOf = new Map<ResolvedSlot, number>();
    for (const slot of cluster) {
      const start = startMinutes(slot);
      let placed = -1;
      for (let i = 0; i < lanes.length; i++) {
        if (lanes[i] <= start) {
          placed = i;
          break;
        }
      }
      if (placed === -1) {
        placed = lanes.length;
        lanes.push(endMinutes(slot));
      } else {
        lanes[placed] = endMinutes(slot);
      }
      laneOf.set(slot, placed);
    }
    const groupColumns = lanes.length;
    for (const slot of cluster) {
      result.push({
        slot,
        lane: laneOf.get(slot) ?? 0,
        groupColumns,
      });
    }
    cluster = [];
    clusterEndMax = -Infinity;
  };

  for (const slot of sorted) {
    const start = startMinutes(slot);
    if (cluster.length > 0 && start >= clusterEndMax) flush();
    cluster.push(slot);
    clusterEndMax = Math.max(clusterEndMax, endMinutes(slot));
  }
  flush();

  return result;
}

/** Resolved slot on a specific date, with status reflecting any override. */
export interface ResolvedSlot {
  slotId: string;
  /** YYYY-MM-DD (local). */
  date: string;
  /** "HH:MM" after applying any reschedule. */
  startTime: string;
  /** "HH:MM" derived from startTime + durationMin. */
  endTime: string;
  durationMin: number;
  label?: string;
  focusId?: string;
  topicId?: string;
  subtopicId?: string;
  color?: string;
  meetingUrl?: string;
  dayOfWeek: number;
  status: 'scheduled' | 'rescheduled-in' | 'rescheduled-out' | 'skipped';
  /** Original date when this slot was moved into this date. */
  originalDate?: string;
  /** Override record that produced this result, if any. */
  overrideId?: string;
}

/** Local YYYY-MM-DD. No UTC. */
export function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const clamped = Math.max(0, Math.min(24 * 60, mins));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function addMinutesToTime(startTime: string, minutes: number): string {
  return minutesToTime(timeToMinutes(startTime) + minutes);
}

export function compareTime(a: string, b: string): number {
  return timeToMinutes(a) - timeToMinutes(b);
}

/** Format "HH:MM" according to the active locale. */
export function formatTime(t: string, locale: string): string {
  const [h, m] = t.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(d);
}

/**
 * Resolve all slots that land on a given date, applying the overrides.
 * Returns them sorted by startTime.
 */
export function materializeDay(
  slots: RoutineSlot[],
  overrides: RoutineOverride[],
  date: Date,
): ResolvedSlot[] {
  const dateKey = toLocalDateKey(date);
  const dow = date.getDay();
  const out: ResolvedSlot[] = [];

  for (const slot of slots) {
    if (!slot.active) continue;
    if (slot.dayOfWeek !== dow) continue;
    const ov = overrides.find(o => o.slotId === slot.id && o.date === dateKey);
    if (!ov) {
      out.push({
        slotId: slot.id,
        date: dateKey,
        startTime: slot.startTime,
        endTime: addMinutesToTime(slot.startTime, slot.durationMin),
        durationMin: slot.durationMin,
        label: slot.label,
        focusId: slot.focusId,
        topicId: slot.topicId,
        subtopicId: slot.subtopicId,
        color: slot.color,
        meetingUrl: slot.meetingUrl,
        dayOfWeek: slot.dayOfWeek,
        status: 'scheduled',
      });
      continue;
    }
    if (ov.kind === 'skip') {
      out.push({
        slotId: slot.id,
        date: dateKey,
        startTime: slot.startTime,
        endTime: addMinutesToTime(slot.startTime, slot.durationMin),
        durationMin: slot.durationMin,
        label: slot.label,
        focusId: slot.focusId,
        topicId: slot.topicId,
        subtopicId: slot.subtopicId,
        color: slot.color,
        meetingUrl: slot.meetingUrl,
        dayOfWeek: slot.dayOfWeek,
        status: 'skipped',
        overrideId: ov.id,
      });
      continue;
    }
    if (ov.kind === 'reschedule') {
      out.push({
        slotId: slot.id,
        date: dateKey,
        startTime: slot.startTime,
        endTime: addMinutesToTime(slot.startTime, slot.durationMin),
        durationMin: slot.durationMin,
        label: slot.label,
        focusId: slot.focusId,
        topicId: slot.topicId,
        subtopicId: slot.subtopicId,
        color: slot.color,
        meetingUrl: slot.meetingUrl,
        dayOfWeek: slot.dayOfWeek,
        status: 'rescheduled-out',
        overrideId: ov.id,
      });
    }
  }

  // Rescheduled-in: slots moved into this date from elsewhere.
  for (const ov of overrides) {
    if (ov.kind !== 'reschedule') continue;
    if (ov.newDate !== dateKey) continue;
    const slot = slots.find(s => s.id === ov.slotId);
    if (!slot || !slot.active) continue;
    const startTime = ov.newStartTime ?? slot.startTime;
    out.push({
      slotId: slot.id,
      date: dateKey,
      startTime,
      endTime: addMinutesToTime(startTime, slot.durationMin),
      durationMin: slot.durationMin,
      label: slot.label,
      focusId: slot.focusId,
      topicId: slot.topicId,
      subtopicId: slot.subtopicId,
      color: slot.color,
      meetingUrl: slot.meetingUrl,
      dayOfWeek: slot.dayOfWeek,
      status: 'rescheduled-in',
      originalDate: ov.date,
      overrideId: ov.id,
    });
  }

  out.sort((a, b) => compareTime(a.startTime, b.startTime));
  return out;
}

/**
 * Resolve slots across an inclusive date range.
 * Returns a Map keyed by YYYY-MM-DD.
 */
export function materializeRange(
  slots: RoutineSlot[],
  overrides: RoutineOverride[],
  start: Date,
  end: Date,
): Map<string, ResolvedSlot[]> {
  const result = new Map<string, ResolvedSlot[]>();
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (cursor <= last) {
    const key = toLocalDateKey(cursor);
    result.set(key, materializeDay(slots, overrides, cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}

/**
 * Find the next upcoming visible (non-skipped) slot starting from `now`.
 * Looks ahead up to `lookaheadDays` days.
 */
export function findNextUpcoming(
  slots: RoutineSlot[],
  overrides: RoutineOverride[],
  now: Date,
  lookaheadDays = 7,
): ResolvedSlot | null {
  for (let i = 0; i <= lookaheadDays; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const resolved = materializeDay(slots, overrides, d);
    for (const slot of resolved) {
      if (slot.status === 'skipped' || slot.status === 'rescheduled-out') continue;
      if (i === 0) {
        const nowMin = now.getHours() * 60 + now.getMinutes();
        if (timeToMinutes(slot.endTime) < nowMin) continue;
      }
      return slot;
    }
  }
  return null;
}
