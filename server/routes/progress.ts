import { Hono } from 'hono';
import { db } from '../db.js';

export const progressRoute = new Hono();

interface CheckedTopicRow {
  topic_id: string;
  checked_at: string;
}

function readAll() {
  const rows = db
    .prepare('SELECT topic_id, checked_at FROM checked_topics')
    .all() as CheckedTopicRow[];

  const checkedTopics = rows.map(r => r.topic_id);
  const checkedAt: Record<string, string> = {};
  for (const r of rows) checkedAt[r.topic_id] = r.checked_at;
  return { checkedTopics, checkedAt };
}

progressRoute.get('/', (c) => c.json(readAll()));

progressRoute.put('/', async (c) => {
  const body = await c.req.json<{
    checkedTopics: string[];
    checkedAt: Record<string, string>;
  }>();
  const topics = Array.isArray(body.checkedTopics) ? body.checkedTopics : [];
  const at = body.checkedAt ?? {};

  const replace = db.transaction(() => {
    db.prepare('DELETE FROM checked_topics').run();
    const insert = db.prepare(
      'INSERT INTO checked_topics (topic_id, checked_at) VALUES (?, ?)',
    );
    for (const topicId of topics) {
      insert.run(topicId, at[topicId] ?? new Date().toISOString());
    }
  });
  replace();

  return c.json(readAll());
});

progressRoute.post('/toggle', async (c) => {
  const { topicId } = await c.req.json<{ topicId: string }>();
  if (!topicId) return c.json({ error: 'missing topicId' }, 400);

  const existing = db
    .prepare('SELECT topic_id FROM checked_topics WHERE topic_id = ?')
    .get(topicId);

  if (existing) {
    db.prepare('DELETE FROM checked_topics WHERE topic_id = ?').run(topicId);
    return c.json({ topicId, checked: false });
  }
  db.prepare(
    'INSERT INTO checked_topics (topic_id, checked_at) VALUES (?, ?)',
  ).run(topicId, new Date().toISOString());
  return c.json({ topicId, checked: true, checkedAt: new Date().toISOString() });
});
