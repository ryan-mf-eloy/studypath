import { Hono } from 'hono';
import { db } from '../db.js';

export const routinesRoute = new Hono();

interface SlotRow {
  id: string;
  day_of_week: number;
  start_time: string;
  duration_min: number;
  label: string | null;
  focus_id: string | null;
  topic_id: string | null;
  subtopic_id: string | null;
  color: string | null;
  meeting_url: string | null;
  active: number;
  position: number;
  created_at: string;
  updated_at: string;
}

const SLOT_COLUMNS =
  'id, day_of_week, start_time, duration_min, label, focus_id, topic_id, subtopic_id, color, meeting_url, active, position, created_at, updated_at';

interface OverrideRow {
  id: string;
  slot_id: string;
  date: string;
  kind: string;
  new_date: string | null;
  new_start_time: string | null;
  created_at: string;
}

function rowToSlot(r: SlotRow) {
  return {
    id: r.id,
    dayOfWeek: r.day_of_week,
    startTime: r.start_time,
    durationMin: r.duration_min,
    label: r.label ?? undefined,
    focusId: r.focus_id ?? undefined,
    topicId: r.topic_id ?? undefined,
    subtopicId: r.subtopic_id ?? undefined,
    color: r.color ?? undefined,
    meetingUrl: r.meeting_url ?? undefined,
    active: r.active === 1,
    position: r.position,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function rowToOverride(r: OverrideRow) {
  return {
    id: r.id,
    slotId: r.slot_id,
    date: r.date,
    kind: r.kind as 'skip' | 'reschedule',
    newDate: r.new_date ?? undefined,
    newStartTime: r.new_start_time ?? undefined,
    createdAt: r.created_at,
  };
}

export function loadRoutines() {
  const slotRows = db
    .prepare(
      `SELECT ${SLOT_COLUMNS} FROM routine_slots ORDER BY day_of_week, start_time, position`,
    )
    .all() as SlotRow[];
  const overrideRows = db
    .prepare(
      'SELECT id, slot_id, date, kind, new_date, new_start_time, created_at FROM routine_overrides',
    )
    .all() as OverrideRow[];
  return {
    slots: slotRows.map(rowToSlot),
    overrides: overrideRows.map(rowToOverride),
  };
}

const SLOT_MIN_DURATION = 15;
const SLOT_MAX_DURATION = 240;

function isValidTime(t: unknown): t is string {
  return typeof t === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
}
function isValidDate(d: unknown): d is string {
  return typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);
}
function minutesFromTime(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function isValidMeetingUrl(u: unknown): u is string {
  if (typeof u !== 'string') return false;
  const trimmed = u.trim();
  if (trimmed.length === 0 || trimmed.length > 2048) return false;
  return /^https?:\/\//i.test(trimmed);
}

routinesRoute.get('/', (c) => c.json(loadRoutines()));

routinesRoute.post('/slots', async (c) => {
  const body = await c.req.json<{
    id: string;
    dayOfWeek: number;
    startTime: string;
    durationMin: number;
    label?: string;
    focusId?: string;
    topicId?: string;
    subtopicId?: string;
    color?: string;
    meetingUrl?: string;
    active?: boolean;
    position?: number;
  }>();

  if (!body.id) return c.json({ error: 'missing id' }, 400);
  if (typeof body.dayOfWeek !== 'number' || body.dayOfWeek < 0 || body.dayOfWeek > 6) {
    return c.json({ error: 'invalid dayOfWeek' }, 400);
  }
  if (!isValidTime(body.startTime)) return c.json({ error: 'invalid startTime' }, 400);
  if (
    typeof body.durationMin !== 'number' ||
    body.durationMin < SLOT_MIN_DURATION ||
    body.durationMin > SLOT_MAX_DURATION
  ) {
    return c.json({ error: 'invalid durationMin' }, 400);
  }
  if (minutesFromTime(body.startTime) + body.durationMin > 24 * 60) {
    return c.json({ error: 'slot crosses midnight' }, 400);
  }
  if (body.meetingUrl != null && !isValidMeetingUrl(body.meetingUrl)) {
    return c.json({ error: 'invalid meetingUrl' }, 400);
  }

  const now = new Date().toISOString();
  db.prepare(
    `INSERT OR REPLACE INTO routine_slots
       (id, day_of_week, start_time, duration_min, label, focus_id, topic_id, subtopic_id, color, meeting_url, active, position, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    body.id,
    body.dayOfWeek,
    body.startTime,
    body.durationMin,
    body.label ?? null,
    body.focusId ?? null,
    body.topicId ?? null,
    body.subtopicId ?? null,
    body.color ?? null,
    body.meetingUrl ? body.meetingUrl.trim() : null,
    body.active === false ? 0 : 1,
    body.position ?? 0,
    now,
    now,
  );

  const row = db
    .prepare(`SELECT ${SLOT_COLUMNS} FROM routine_slots WHERE id = ?`)
    .get(body.id) as SlotRow | undefined;
  if (!row) return c.json({ error: 'insert failed' }, 500);
  return c.json({ slot: rowToSlot(row) });
});

routinesRoute.patch('/slots/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<Partial<{
    dayOfWeek: number;
    startTime: string;
    durationMin: number;
    label: string | null;
    focusId: string | null;
    topicId: string | null;
    subtopicId: string | null;
    color: string | null;
    meetingUrl: string | null;
    active: boolean;
    position: number;
  }>>();

  const existing = db
    .prepare(`SELECT ${SLOT_COLUMNS} FROM routine_slots WHERE id = ?`)
    .get(id) as SlotRow | undefined;
  if (!existing) return c.json({ error: 'not found' }, 404);

  const next = {
    dayOfWeek: body.dayOfWeek ?? existing.day_of_week,
    startTime: body.startTime ?? existing.start_time,
    durationMin: body.durationMin ?? existing.duration_min,
    label: body.label === undefined ? existing.label : body.label,
    focusId: body.focusId === undefined ? existing.focus_id : body.focusId,
    topicId: body.topicId === undefined ? existing.topic_id : body.topicId,
    subtopicId: body.subtopicId === undefined ? existing.subtopic_id : body.subtopicId,
    color: body.color === undefined ? existing.color : body.color,
    meetingUrl:
      body.meetingUrl === undefined
        ? existing.meeting_url
        : body.meetingUrl === null
          ? null
          : body.meetingUrl.trim(),
    active: body.active === undefined ? existing.active === 1 : body.active,
    position: body.position ?? existing.position,
  };

  if (next.dayOfWeek < 0 || next.dayOfWeek > 6) return c.json({ error: 'invalid dayOfWeek' }, 400);
  if (!isValidTime(next.startTime)) return c.json({ error: 'invalid startTime' }, 400);
  if (next.durationMin < SLOT_MIN_DURATION || next.durationMin > SLOT_MAX_DURATION) {
    return c.json({ error: 'invalid durationMin' }, 400);
  }
  if (minutesFromTime(next.startTime) + next.durationMin > 24 * 60) {
    return c.json({ error: 'slot crosses midnight' }, 400);
  }
  if (next.meetingUrl !== null && !isValidMeetingUrl(next.meetingUrl)) {
    return c.json({ error: 'invalid meetingUrl' }, 400);
  }

  const now = new Date().toISOString();
  db.prepare(
    `UPDATE routine_slots
        SET day_of_week = ?, start_time = ?, duration_min = ?, label = ?, focus_id = ?, topic_id = ?, subtopic_id = ?, color = ?, meeting_url = ?, active = ?, position = ?, updated_at = ?
      WHERE id = ?`,
  ).run(
    next.dayOfWeek,
    next.startTime,
    next.durationMin,
    next.label,
    next.focusId,
    next.topicId,
    next.subtopicId,
    next.color,
    next.meetingUrl,
    next.active ? 1 : 0,
    next.position,
    now,
    id,
  );

  const row = db
    .prepare(`SELECT ${SLOT_COLUMNS} FROM routine_slots WHERE id = ?`)
    .get(id) as SlotRow;
  return c.json({ slot: rowToSlot(row) });
});

routinesRoute.delete('/slots/:id', (c) => {
  const id = c.req.param('id');
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM routine_overrides WHERE slot_id = ?').run(id);
    db.prepare('DELETE FROM routine_slots WHERE id = ?').run(id);
  });
  tx();
  return c.json({ ok: true, id });
});

routinesRoute.post('/overrides', async (c) => {
  const body = await c.req.json<{
    id: string;
    slotId: string;
    date: string;
    kind: 'skip' | 'reschedule';
    newDate?: string;
    newStartTime?: string;
  }>();

  if (!body.id || !body.slotId) return c.json({ error: 'missing fields' }, 400);
  if (!isValidDate(body.date)) return c.json({ error: 'invalid date' }, 400);
  if (body.kind !== 'skip' && body.kind !== 'reschedule') {
    return c.json({ error: 'invalid kind' }, 400);
  }
  if (body.kind === 'reschedule') {
    if (!isValidDate(body.newDate)) return c.json({ error: 'invalid newDate' }, 400);
    if (!isValidTime(body.newStartTime)) return c.json({ error: 'invalid newStartTime' }, 400);
  }

  const slot = db
    .prepare('SELECT id FROM routine_slots WHERE id = ?')
    .get(body.slotId) as { id: string } | undefined;
  if (!slot) return c.json({ error: 'slot not found' }, 404);

  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO routine_overrides (id, slot_id, date, kind, new_date, new_start_time, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(slot_id, date) DO UPDATE SET
       id = excluded.id,
       kind = excluded.kind,
       new_date = excluded.new_date,
       new_start_time = excluded.new_start_time,
       created_at = excluded.created_at`,
  ).run(
    body.id,
    body.slotId,
    body.date,
    body.kind,
    body.newDate ?? null,
    body.newStartTime ?? null,
    now,
  );

  const row = db
    .prepare(
      'SELECT id, slot_id, date, kind, new_date, new_start_time, created_at FROM routine_overrides WHERE slot_id = ? AND date = ?',
    )
    .get(body.slotId, body.date) as OverrideRow;
  return c.json({ override: rowToOverride(row) });
});

routinesRoute.delete('/overrides/:id', (c) => {
  const id = c.req.param('id');
  db.prepare('DELETE FROM routine_overrides WHERE id = ?').run(id);
  return c.json({ ok: true, id });
});
