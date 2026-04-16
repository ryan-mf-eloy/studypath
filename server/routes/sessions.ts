import { Hono } from 'hono';
import { db } from '../db.js';

export const sessionsRoute = new Hono();

interface SessionRow {
  id: string;
  topic_id: string | null;
  focus_id: string | null;
  started_at: string;
  ended_at: string;
  duration_ms: number;
  planned_ms: number | null;
  completed: number;
}

function rowToSession(r: SessionRow) {
  return {
    id: r.id,
    topicId: r.topic_id ?? undefined,
    focusId: r.focus_id ?? undefined,
    startedAt: r.started_at,
    endedAt: r.ended_at,
    durationMs: r.duration_ms,
    plannedMs: r.planned_ms ?? 0,
    completed: r.completed === 1,
  };
}

export function listAllSessions() {
  const rows = db
    .prepare(
      'SELECT id, topic_id, focus_id, started_at, ended_at, duration_ms, planned_ms, completed FROM study_sessions ORDER BY started_at DESC',
    )
    .all() as SessionRow[];
  return rows.map(rowToSession);
}

sessionsRoute.get('/', (c) => c.json({ sessions: listAllSessions() }));

sessionsRoute.post('/', async (c) => {
  const body = await c.req.json<{
    id: string;
    topicId?: string;
    focusId?: string;
    startedAt: string;
    endedAt: string;
    durationMs: number;
    plannedMs?: number;
    completed?: boolean;
  }>();

  if (!body.id || !body.startedAt || !body.endedAt) {
    return c.json({ error: 'missing fields' }, 400);
  }

  db.prepare(
    `INSERT OR REPLACE INTO study_sessions
       (id, topic_id, focus_id, started_at, ended_at, duration_ms, planned_ms, completed)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    body.id,
    body.topicId ?? null,
    body.focusId ?? null,
    body.startedAt,
    body.endedAt,
    body.durationMs,
    body.plannedMs ?? null,
    body.completed ? 1 : 0,
  );

  return c.json({ ok: true, id: body.id });
});

sessionsRoute.delete('/:id', (c) => {
  const id = c.req.param('id');
  db.prepare('DELETE FROM study_sessions WHERE id = ?').run(id);
  return c.json({ ok: true, id });
});

sessionsRoute.delete('/', (c) => {
  db.prepare('DELETE FROM study_sessions').run();
  return c.json({ ok: true });
});
