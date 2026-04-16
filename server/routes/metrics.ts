import { Hono } from 'hono';
import { db } from '../db.js';
import { loadRoadmap } from './roadmap.js';

export const metricsRoute = new Hono();

/* ── Helpers (server-side versions — authoritative) ──────────────── */

function allTopicIds(): string[] {
  return loadRoadmap().phases
    .flatMap(p => p.months)
    .flatMap(m => m.focuses)
    .flatMap(f => f.topics)
    .map(t => t.id);
}

function getCheckedSet(): Set<string> {
  const rows = db.prepare('SELECT topic_id FROM checked_topics').all() as Array<{
    topic_id: string;
  }>;
  return new Set(rows.map(r => r.topic_id));
}

function getCheckedAtMap(): Record<string, string> {
  const rows = db
    .prepare('SELECT topic_id, checked_at FROM checked_topics')
    .all() as Array<{ topic_id: string; checked_at: string }>;
  const out: Record<string, string> = {};
  for (const r of rows) out[r.topic_id] = r.checked_at;
  return out;
}

function pct(done: number, total: number): number {
  return total ? Math.round((done / total) * 100) : 0;
}

/* ── /api/metrics/progress ──────────────────────────────────────── */

metricsRoute.get('/progress', (c) => {
  const checked = getCheckedSet();
  const roadmap = loadRoadmap();

  const byFocus: Array<{ focusId: string; done: number; total: number; pct: number }> = [];
  const byMonth: Array<{ monthId: string; done: number; total: number; pct: number }> = [];
  const byPhase: Array<{ phaseId: string; done: number; total: number; pct: number }> = [];
  let totalDone = 0;
  let totalCount = 0;

  for (const phase of roadmap.phases) {
    let phaseDone = 0;
    let phaseTotal = 0;
    for (const month of phase.months) {
      let monthDone = 0;
      let monthTotal = 0;
      for (const focus of month.focuses) {
        const total = focus.topics.length;
        const done = focus.topics.filter(t => checked.has(t.id)).length;
        byFocus.push({ focusId: focus.id, done, total, pct: pct(done, total) });
        monthDone += done;
        monthTotal += total;
      }
      byMonth.push({
        monthId: month.id,
        done: monthDone,
        total: monthTotal,
        pct: pct(monthDone, monthTotal),
      });
      phaseDone += monthDone;
      phaseTotal += monthTotal;
    }
    byPhase.push({
      phaseId: phase.id,
      done: phaseDone,
      total: phaseTotal,
      pct: pct(phaseDone, phaseTotal),
    });
    totalDone += phaseDone;
    totalCount += phaseTotal;
  }

  return c.json({
    byFocus,
    byMonth,
    byPhase,
    total: { done: totalDone, total: totalCount, pct: pct(totalDone, totalCount) },
  });
});

/* ── /api/metrics/pace/:monthId ─────────────────────────────────── */

metricsRoute.get('/pace/:monthId', (c) => {
  const monthId = c.req.param('monthId');
  const month = loadRoadmap()
    .phases.flatMap(p => p.months)
    .find(m => m.id === monthId);
  if (!month) return c.json({ error: 'month_not_found' }, 404);

  const allTopics = month.focuses.flatMap(f => f.topics);
  const total = allTopics.length;
  const checked = getCheckedSet();
  const done = allTopics.filter(t => checked.has(t.id)).length;

  // Calendar progress — fraction of the month elapsed
  const [year, mon] = monthId.split('-').map(Number);
  const firstDay = new Date(Date.UTC(year, mon - 1, 1));
  const lastDay = new Date(Date.UTC(year, mon, 0));
  const now = new Date();

  let calendarPct = 0;
  if (now >= firstDay) {
    const totalDays = lastDay.getUTCDate();
    const elapsed = Math.min(
      totalDays,
      Math.max(
        0,
        Math.ceil(
          (now.getTime() - firstDay.getTime()) / 86_400_000 + (now.getUTCDate() > 0 ? 0 : 1),
        ),
      ),
    );
    calendarPct = Math.round((elapsed / totalDays) * 100);
  }

  const progressPct = pct(done, total);
  const delta = progressPct - calendarPct; // positive = ahead, negative = behind

  const daysLeft = Math.max(
    0,
    Math.ceil((lastDay.getTime() - Math.max(now.getTime(), firstDay.getTime())) / 86_400_000) + 1,
  );
  const remaining = total - done;
  const dailyGoal = daysLeft > 0 ? Math.max(1, Math.ceil(remaining / daysLeft)) : 0;

  return c.json({
    monthId,
    calendarPct,
    progressPct,
    delta,
    done,
    total,
    remaining,
    daysLeft,
    dailyGoal,
  });
});

/* ── /api/metrics/streak ─────────────────────────────────────────── */

metricsRoute.get('/streak', (c) => {
  // All days on which the user either checked a topic or completed a review
  const checkedAt = getCheckedAtMap();
  const reviewRows = db
    .prepare('SELECT reviewed_at FROM review_history')
    .all() as Array<{ reviewed_at: string }>;

  const days = new Set<string>();
  for (const iso of Object.values(checkedAt)) days.add(iso.slice(0, 10));
  for (const r of reviewRows) days.add(r.reviewed_at.slice(0, 10));

  // Current streak
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  let anchor = days.has(today) ? today : days.has(yesterday) ? yesterday : null;

  let current = 0;
  if (anchor) {
    const cursor = new Date(anchor + 'T00:00:00.000Z');
    while (days.has(cursor.toISOString().slice(0, 10))) {
      current++;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }
  }

  // Longest streak — walk sorted days
  const sorted = Array.from(days).sort();
  let longest = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const d of sorted) {
    const curDate = new Date(d + 'T00:00:00.000Z');
    if (prev && (curDate.getTime() - prev.getTime()) === 86_400_000) {
      run++;
    } else {
      run = 1;
    }
    if (run > longest) longest = run;
    prev = curDate;
  }

  const graceUsed = !days.has(today) && current > 0;

  return c.json({ current, longest, graceUsed });
});

/* ── /api/metrics/time ──────────────────────────────────────────── */

metricsRoute.get('/time', (c) => {
  const scope = (c.req.query('scope') ?? 'all') as 'week' | 'month' | 'all';
  const by = (c.req.query('by') ?? 'all') as 'focus' | 'topic' | 'day' | 'all';

  let whereClause = '';
  const params: string[] = [];

  if (scope === 'week') {
    const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
    whereClause = 'WHERE started_at >= ?';
    params.push(weekAgo);
  } else if (scope === 'month') {
    const monthAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
    whereClause = 'WHERE started_at >= ?';
    params.push(monthAgo);
  }

  const total = (
    db
      .prepare(`SELECT COALESCE(SUM(duration_ms), 0) AS total FROM study_sessions ${whereClause}`)
      .get(...(params as never[])) as { total: number }
  ).total;

  const response: {
    scope: string;
    totalMs: number;
    byFocus?: Array<{ focusId: string | null; totalMs: number }>;
    byTopic?: Array<{ topicId: string | null; totalMs: number }>;
    byDay?: Array<{ day: string; totalMs: number }>;
  } = { scope, totalMs: total };

  if (by === 'focus' || by === 'all') {
    response.byFocus = db
      .prepare(
        `SELECT focus_id AS focusId, COALESCE(SUM(duration_ms), 0) AS totalMs
         FROM study_sessions ${whereClause}
         GROUP BY focus_id ORDER BY totalMs DESC`,
      )
      .all(...(params as never[])) as Array<{ focusId: string | null; totalMs: number }>;
  }

  if (by === 'topic' || by === 'all') {
    response.byTopic = db
      .prepare(
        `SELECT topic_id AS topicId, COALESCE(SUM(duration_ms), 0) AS totalMs
         FROM study_sessions ${whereClause}
         GROUP BY topic_id ORDER BY totalMs DESC`,
      )
      .all(...(params as never[])) as Array<{ topicId: string | null; totalMs: number }>;
  }

  if (by === 'day' || by === 'all') {
    response.byDay = db
      .prepare(
        `SELECT SUBSTR(started_at, 1, 10) AS day, COALESCE(SUM(duration_ms), 0) AS totalMs
         FROM study_sessions ${whereClause}
         GROUP BY day ORDER BY day ASC`,
      )
      .all(...(params as never[])) as Array<{ day: string; totalMs: number }>;
  }

  return c.json(response);
});

/* ── /api/metrics/reviews/due ────────────────────────────────────── */

metricsRoute.get('/reviews/due', (c) => {
  const now = new Date().toISOString();
  const count = (
    db
      .prepare('SELECT COUNT(*) AS n FROM reviews WHERE next_review_at <= ?')
      .get(now) as { n: number }
  ).n;

  const next = db
    .prepare(
      `SELECT topic_id, stage, next_review_at, last_result
       FROM reviews WHERE next_review_at <= ?
       ORDER BY next_review_at ASC LIMIT 10`,
    )
    .all(now) as Array<{
    topic_id: string;
    stage: number;
    next_review_at: string;
    last_result: string | null;
  }>;

  return c.json({
    count,
    next: next.map(r => ({
      topicId: r.topic_id,
      stage: r.stage,
      nextReviewAt: r.next_review_at,
      lastResult: r.last_result ?? undefined,
    })),
  });
});

/* ── /api/metrics/overview — one-shot bundle ─────────────────────── */

metricsRoute.get('/overview', async (c) => {
  // Total progress
  const checked = getCheckedSet();
  const all = allTopicIds();
  const totalPct = pct(checked.size, all.length);

  // Active month — first month whose topics aren't all checked, else last
  const months = loadRoadmap().phases.flatMap(p => p.months);
  let activeMonth = months[months.length - 1];
  for (const m of months) {
    const topics = m.focuses.flatMap(f => f.topics);
    const done = topics.filter(t => checked.has(t.id)).length;
    if (done < topics.length) {
      activeMonth = m;
      break;
    }
  }

  // Reviews due
  const reviewsDueCount = (
    db
      .prepare('SELECT COUNT(*) AS n FROM reviews WHERE next_review_at <= ?')
      .get(new Date().toISOString()) as { n: number }
  ).n;

  // Week time
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const weekTimeMs = (
    db
      .prepare(
        'SELECT COALESCE(SUM(duration_ms), 0) AS total FROM study_sessions WHERE started_at >= ?',
      )
      .get(weekAgo) as { total: number }
  ).total;

  // Total sessions count
  const sessionsCount = (
    db.prepare('SELECT COUNT(*) AS n FROM study_sessions').get() as { n: number }
  ).n;

  return c.json({
    totalPct,
    activeMonthId: activeMonth?.id ?? null,
    reviewsDueCount,
    weekTimeMs,
    sessionsCount,
    checkedTopicsCount: checked.size,
    totalTopicsCount: all.length,
  });
});

