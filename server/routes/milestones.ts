import { Hono } from 'hono';
import { db } from '../db.js';

export const milestonesRoute = new Hono();

milestonesRoute.post('/', async (c) => {
  const body = await c.req.json<{ milestoneId: string }>();
  if (!body.milestoneId) return c.json({ error: 'missing fields' }, 400);
  db.prepare(
    'INSERT OR REPLACE INTO milestones_done (milestone_id, done_at) VALUES (?, ?)',
  ).run(body.milestoneId, new Date().toISOString());
  return c.json({ ok: true, milestoneId: body.milestoneId });
});

milestonesRoute.delete('/:id', (c) => {
  const id = c.req.param('id');
  db.prepare('DELETE FROM milestones_done WHERE milestone_id = ?').run(id);
  return c.json({ ok: true, id });
});
