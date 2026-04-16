import { Hono } from 'hono';
import { db } from '../db.js';

export const reflectionsRoute = new Hono();

interface ReflectionRow {
  id: string;
  week_key: string;
  hardest: string | null;
  to_review: string | null;
  pace: string | null;
  note_to_self: string | null;
  created_at: string;
}

function rowToReflection(r: ReflectionRow) {
  return {
    id: r.id,
    weekKey: r.week_key,
    hardest: r.hardest ?? '',
    toReview: r.to_review ? (JSON.parse(r.to_review) as string[]) : [],
    pace: r.pace ?? '',
    noteToSelf: r.note_to_self ?? '',
    createdAt: r.created_at,
  };
}

reflectionsRoute.get('/', (c) => {
  const rows = db
    .prepare(
      'SELECT id, week_key, hardest, to_review, pace, note_to_self, created_at FROM reflections ORDER BY week_key DESC',
    )
    .all() as ReflectionRow[];
  return c.json({ reflections: rows.map(rowToReflection) });
});

reflectionsRoute.post('/', async (c) => {
  const body = await c.req.json<{
    id: string;
    weekKey: string;
    hardest?: string;
    toReview?: string[];
    pace?: string;
    noteToSelf?: string;
    createdAt: string;
  }>();
  if (!body.id || !body.weekKey) return c.json({ error: 'missing fields' }, 400);

  db.prepare(
    `INSERT OR REPLACE INTO reflections
       (id, week_key, hardest, to_review, pace, note_to_self, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    body.id,
    body.weekKey,
    body.hardest ?? null,
    JSON.stringify(body.toReview ?? []),
    body.pace ?? null,
    body.noteToSelf ?? null,
    body.createdAt,
  );
  return c.json({ ok: true, id: body.id });
});

reflectionsRoute.delete('/:id', (c) => {
  const id = c.req.param('id');
  db.prepare('DELETE FROM reflections WHERE id = ?').run(id);
  return c.json({ ok: true, id });
});
