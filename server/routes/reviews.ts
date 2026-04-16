import { Hono } from 'hono';
import { db } from '../db.js';

export const reviewsRoute = new Hono();

interface ReviewRow {
  topic_id: string;
  stage: number;
  next_review_at: string;
  last_result: string | null;
  created_at: string;
}

interface HistoryRow {
  topic_id: string;
  result: string;
  reviewed_at: string;
}

function rowsToReviews() {
  const rows = db
    .prepare(
      'SELECT topic_id, stage, next_review_at, last_result, created_at FROM reviews',
    )
    .all() as ReviewRow[];
  const history = db
    .prepare(
      'SELECT topic_id, result, reviewed_at FROM review_history ORDER BY reviewed_at ASC',
    )
    .all() as HistoryRow[];
  const byTopic: Record<string, Array<{ at: string; result: string; stage: number }>> = {};
  for (const h of history) {
    if (!byTopic[h.topic_id]) byTopic[h.topic_id] = [];
    byTopic[h.topic_id].push({ at: h.reviewed_at, result: h.result, stage: 0 });
  }
  const out: Record<string, unknown> = {};
  for (const r of rows) {
    out[r.topic_id] = {
      topicId: r.topic_id,
      stage: r.stage,
      nextReviewAt: r.next_review_at,
      lastResult: r.last_result ?? undefined,
      createdAt: r.created_at,
      history: byTopic[r.topic_id] ?? [],
    };
  }
  return out;
}

reviewsRoute.get('/', (c) => c.json({ reviews: rowsToReviews() }));

reviewsRoute.post('/schedule', async (c) => {
  const body = await c.req.json<{
    topicId: string;
    stage: number;
    nextReviewAt: string;
    createdAt?: string;
  }>();
  if (!body.topicId || !body.nextReviewAt) {
    return c.json({ error: 'missing fields' }, 400);
  }
  db.prepare(
    `INSERT OR REPLACE INTO reviews (topic_id, stage, next_review_at, last_result, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(
    body.topicId,
    body.stage,
    body.nextReviewAt,
    null,
    body.createdAt ?? new Date().toISOString(),
  );
  return c.json({ ok: true });
});

reviewsRoute.post('/record', async (c) => {
  const body = await c.req.json<{
    topicId: string;
    stage: number;
    nextReviewAt: string;
    result: string;
  }>();
  if (!body.topicId || !body.result) {
    return c.json({ error: 'missing fields' }, 400);
  }
  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE reviews SET stage = ?, next_review_at = ?, last_result = ? WHERE topic_id = ?`,
    ).run(body.stage, body.nextReviewAt, body.result, body.topicId);
    db.prepare(
      'INSERT INTO review_history (topic_id, result, reviewed_at) VALUES (?, ?, ?)',
    ).run(body.topicId, body.result, new Date().toISOString());
  });
  tx();
  return c.json({ ok: true });
});

reviewsRoute.delete('/:topicId', (c) => {
  const topicId = c.req.param('topicId');
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM reviews WHERE topic_id = ?').run(topicId);
    db.prepare('DELETE FROM review_history WHERE topic_id = ?').run(topicId);
  });
  tx();
  return c.json({ ok: true, topicId });
});
