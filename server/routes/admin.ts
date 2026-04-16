import { Hono } from 'hono';
import { db } from '../db.js';

export const adminRoute = new Hono();

adminRoute.post('/reset', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  // Require explicit confirmation to prevent accidental invocation
  if (!(body as Record<string, unknown>).confirm) {
    return c.json({ error: 'pass { "confirm": true } to reset all data' }, 400);
  }
  const tx = db.transaction(() => {
    db.exec(`
      DELETE FROM routine_overrides;
      DELETE FROM routine_slots;
      DELETE FROM checked_topics;
      DELETE FROM study_sessions;
      DELETE FROM review_history;
      DELETE FROM reviews;
      DELETE FROM notes;
      DELETE FROM subtopics;
      DELETE FROM milestones_done;
      DELETE FROM reflections;
      DELETE FROM roadmap_topics;
      DELETE FROM roadmap_focuses;
      DELETE FROM roadmap_months;
      DELETE FROM roadmap_phases;
      DELETE FROM roadmap_milestones;
      DELETE FROM roadmap_settings;
    `);
  });
  tx();
  return c.json({ ok: true });
});
