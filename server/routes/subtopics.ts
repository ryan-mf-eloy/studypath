import { Hono } from 'hono';
import { db } from '../db.js';

export const subtopicsRoute = new Hono();

subtopicsRoute.post('/', async (c) => {
  const body = await c.req.json<{ id: string; topicId: string; label: string }>();
  if (!body.id || !body.topicId || !body.label) {
    return c.json({ error: 'missing fields' }, 400);
  }
  // Next position for this topic
  const row = db
    .prepare('SELECT COALESCE(MAX(position), -1) + 1 AS next FROM subtopics WHERE topic_id = ?')
    .get(body.topicId) as { next: number };
  db.prepare(
    'INSERT OR REPLACE INTO subtopics (id, topic_id, label, position) VALUES (?, ?, ?, ?)',
  ).run(body.id, body.topicId, body.label, row.next);
  return c.json({ ok: true, id: body.id });
});

subtopicsRoute.delete('/:id', (c) => {
  const id = c.req.param('id');
  db.prepare('DELETE FROM subtopics WHERE id = ?').run(id);
  return c.json({ ok: true, id });
});
