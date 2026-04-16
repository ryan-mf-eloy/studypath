import { Hono } from 'hono';
import { db } from '../db.js';

export const notesRoute = new Hono();

interface NoteRow {
  id: string;
  title: string;
  body: string;
  body_version: number;
  icon: string | null;
  topic_id: string | null;
  focus_id: string | null;
  subject_tag: string | null;
  created_at: string;
  updated_at: string;
}

function rowToNote(r: NoteRow) {
  return {
    id: r.id,
    title: r.title,
    body: r.body,
    bodyVersion: r.body_version,
    icon: r.icon ?? undefined,
    topicId: r.topic_id ?? undefined,
    focusId: r.focus_id ?? undefined,
    subjectTag: r.subject_tag ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

notesRoute.get('/', (c) => {
  const rows = db
    .prepare(
      'SELECT id, title, body, body_version, icon, topic_id, focus_id, subject_tag, created_at, updated_at FROM notes ORDER BY updated_at DESC',
    )
    .all() as NoteRow[];
  return c.json({ notes: rows.map(rowToNote) });
});

notesRoute.post('/', async (c) => {
  const body = await c.req.json<{
    id: string;
    title: string;
    body: string;
    bodyVersion?: number;
    icon?: string;
    topicId?: string;
    focusId?: string;
    subjectTag?: string;
    createdAt: string;
    updatedAt: string;
  }>();

  if (!body.id || body.title == null) return c.json({ error: 'missing fields' }, 400);

  db.prepare(
    `INSERT OR REPLACE INTO notes
       (id, title, body, body_version, icon, topic_id, focus_id, subject_tag, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    body.id,
    body.title,
    body.body,
    body.bodyVersion ?? 2,
    body.icon ?? null,
    body.topicId ?? null,
    body.focusId ?? null,
    body.subjectTag ?? null,
    body.createdAt,
    body.updatedAt,
  );
  return c.json({ ok: true, id: body.id });
});

notesRoute.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<Partial<{
    title: string;
    body: string;
    bodyVersion: number;
    icon: string | null;
    topicId: string | null;
    focusId: string | null;
    subjectTag: string | null;
    updatedAt: string;
  }>>();

  const existing = db.prepare('SELECT id FROM notes WHERE id = ?').get(id);
  if (!existing) return c.json({ error: 'not_found' }, 404);

  const fields: string[] = [];
  const values: unknown[] = [];
  if (body.title !== undefined) { fields.push('title = ?'); values.push(body.title); }
  if (body.body !== undefined) { fields.push('body = ?'); values.push(body.body); }
  if (body.bodyVersion !== undefined) { fields.push('body_version = ?'); values.push(body.bodyVersion); }
  if (body.icon !== undefined) { fields.push('icon = ?'); values.push(body.icon ?? null); }
  if (body.topicId !== undefined) { fields.push('topic_id = ?'); values.push(body.topicId ?? null); }
  if (body.focusId !== undefined) { fields.push('focus_id = ?'); values.push(body.focusId ?? null); }
  if (body.subjectTag !== undefined) { fields.push('subject_tag = ?'); values.push(body.subjectTag ?? null); }
  fields.push('updated_at = ?');
  values.push(body.updatedAt ?? new Date().toISOString());
  values.push(id);

  db.prepare(`UPDATE notes SET ${fields.join(', ')} WHERE id = ?`).run(...values as never[]);
  return c.json({ ok: true, id });
});

notesRoute.delete('/:id', (c) => {
  const id = c.req.param('id');
  db.prepare('DELETE FROM notes WHERE id = ?').run(id);
  return c.json({ ok: true, id });
});
