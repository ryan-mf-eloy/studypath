import { Hono } from 'hono';
import { db } from '../db.js';
import { SEED_ROADMAP } from '../../src/data/roadmap';
import type {
  RoadmapData,
  Phase,
  Month,
  Focus,
  Topic,
  Milestone,
  FocusType,
  MilestoneType,
  MilestoneStatus,
} from '../../src/types';

export const roadmapRoute = new Hono();

/* ─── Row types ─────────────────────────────────────────────────── */

interface PhaseRow    { id: string; label: string; position: number }
interface MonthRow    { id: string; phase_id: string; label: string; position: number }
interface FocusRow    {
  id: string;
  month_id: string;
  type: string;
  name: string;
  mastery_note: string;
  icon: string | null;
  color: string | null;
  position: number;
}
interface TopicRow    { id: string; focus_id: string; label: string; position: number }
interface MilestoneRow {
  id: string;
  name: string;
  type: string;
  date: string;
  status: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  position: number;
}
interface SettingRow  { key: string; value: string }

/* ─── Seed idempotently on first boot ───────────────────────────── */

export function seedRoadmapIfEmpty(): void {
  const { count } = db
    .prepare('SELECT COUNT(*) AS count FROM roadmap_phases')
    .get() as { count: number };
  if (count > 0) return;

  const tx = db.transaction(() => {
    const insertPhase = db.prepare(
      'INSERT INTO roadmap_phases (id, label, position) VALUES (?, ?, ?)',
    );
    const insertMonth = db.prepare(
      'INSERT INTO roadmap_months (id, phase_id, label, position) VALUES (?, ?, ?, ?)',
    );
    const insertFocus = db.prepare(
      `INSERT INTO roadmap_focuses
         (id, month_id, type, name, mastery_note, icon, color, position)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const insertTopic = db.prepare(
      'INSERT INTO roadmap_topics (id, focus_id, label, position) VALUES (?, ?, ?, ?)',
    );
    const insertMilestone = db.prepare(
      `INSERT INTO roadmap_milestones
         (id, name, type, date, status, description, icon, color, position)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const insertSetting = db.prepare(
      'INSERT OR REPLACE INTO roadmap_settings (key, value) VALUES (?, ?)',
    );

    SEED_ROADMAP.phases.forEach((phase, pIdx) => {
      insertPhase.run(phase.id, phase.label, pIdx);
      phase.months.forEach((month, mIdx) => {
        insertMonth.run(month.id, phase.id, month.label, mIdx);
        month.focuses.forEach((focus, fIdx) => {
          insertFocus.run(
            focus.id,
            month.id,
            focus.type,
            focus.name,
            focus.masteryNote ?? '',
            focus.icon ?? null,
            focus.color ?? null,
            fIdx,
          );
          focus.topics.forEach((topic, tIdx) => {
            insertTopic.run(topic.id, focus.id, topic.label, tIdx);
          });
        });
      });
    });

    SEED_ROADMAP.milestones.forEach((milestone, idx) => {
      insertMilestone.run(
        milestone.id,
        milestone.name,
        milestone.type,
        milestone.date,
        milestone.status,
        milestone.description ?? null,
        milestone.icon ?? null,
        milestone.color ?? null,
        idx,
      );
    });

    insertSetting.run('startDate', SEED_ROADMAP.startDate);
    insertSetting.run('endDate', SEED_ROADMAP.endDate);
  });

  tx();
  console.log('[roadmap] seeded from SEED_ROADMAP');
}

/* ─── Load full tree from DB ────────────────────────────────────── */

export function loadRoadmap(): RoadmapData {
  const phaseRows = db
    .prepare('SELECT id, label, position FROM roadmap_phases ORDER BY position ASC')
    .all() as PhaseRow[];
  const monthRows = db
    .prepare('SELECT id, phase_id, label, position FROM roadmap_months ORDER BY phase_id, position ASC')
    .all() as MonthRow[];
  const focusRows = db
    .prepare(
      'SELECT id, month_id, type, name, mastery_note, icon, color, position FROM roadmap_focuses ORDER BY month_id, position ASC',
    )
    .all() as FocusRow[];
  const topicRows = db
    .prepare('SELECT id, focus_id, label, position FROM roadmap_topics ORDER BY focus_id, position ASC')
    .all() as TopicRow[];
  const milestoneRows = db
    .prepare(
      'SELECT id, name, type, date, status, description, icon, color, position FROM roadmap_milestones ORDER BY position ASC',
    )
    .all() as MilestoneRow[];
  const settingRows = db
    .prepare('SELECT key, value FROM roadmap_settings')
    .all() as SettingRow[];

  const settings: Record<string, string> = {};
  for (const s of settingRows) settings[s.key] = s.value;

  const topicsByFocus = new Map<string, Topic[]>();
  for (const t of topicRows) {
    if (!topicsByFocus.has(t.focus_id)) topicsByFocus.set(t.focus_id, []);
    topicsByFocus.get(t.focus_id)!.push({
      id: t.id,
      label: t.label,
      focusId: t.focus_id,
    });
  }

  const focusesByMonth = new Map<string, Focus[]>();
  for (const f of focusRows) {
    if (!focusesByMonth.has(f.month_id)) focusesByMonth.set(f.month_id, []);
    focusesByMonth.get(f.month_id)!.push({
      id: f.id,
      type: f.type as FocusType,
      name: f.name,
      monthId: f.month_id,
      masteryNote: f.mastery_note,
      icon: f.icon ?? undefined,
      color: f.color ?? undefined,
      topics: topicsByFocus.get(f.id) ?? [],
    });
  }

  const monthsByPhase = new Map<string, Month[]>();
  for (const m of monthRows) {
    if (!monthsByPhase.has(m.phase_id)) monthsByPhase.set(m.phase_id, []);
    monthsByPhase.get(m.phase_id)!.push({
      id: m.id,
      label: m.label,
      phaseId: m.phase_id,
      focuses: focusesByMonth.get(m.id) ?? [],
    });
  }

  const phases: Phase[] = phaseRows.map((p) => ({
    id: p.id,
    label: p.label,
    months: monthsByPhase.get(p.id) ?? [],
  }));

  const milestones: Milestone[] = milestoneRows.map((m) => ({
    id: m.id,
    name: m.name,
    type: m.type as MilestoneType,
    date: m.date,
    status: m.status as MilestoneStatus,
    description: m.description ?? undefined,
    icon: m.icon ?? undefined,
    color: m.color ?? undefined,
  }));

  return {
    phases,
    milestones,
    startDate: settings.startDate ?? '',
    endDate: settings.endDate ?? '',
  };
}

/* ─── Routes ────────────────────────────────────────────────────── */

roadmapRoute.get('/', (c) => c.json(loadRoadmap()));

// Reset to seed — wipes editor state then reseeds from SEED_ROADMAP.
roadmapRoute.post('/reset', (c) => {
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM roadmap_topics').run();
    db.prepare('DELETE FROM roadmap_focuses').run();
    db.prepare('DELETE FROM roadmap_months').run();
    db.prepare('DELETE FROM roadmap_phases').run();
    db.prepare('DELETE FROM roadmap_milestones').run();
    db.prepare('DELETE FROM roadmap_settings').run();
  });
  tx();
  seedRoadmapIfEmpty();
  return c.json({ ok: true, roadmap: loadRoadmap() });
});

// Full replace — accept a RoadmapData payload and replace the whole tree.
// Tier 2 UI will consume this; useful now for import/export flows.
roadmapRoute.put('/', async (c) => {
  const body = (await c.req.json()) as RoadmapData;
  if (!body || !Array.isArray(body.phases)) {
    return c.json({ error: 'invalid_payload' }, 400);
  }

  const tx = db.transaction(() => {
    db.prepare('DELETE FROM roadmap_topics').run();
    db.prepare('DELETE FROM roadmap_focuses').run();
    db.prepare('DELETE FROM roadmap_months').run();
    db.prepare('DELETE FROM roadmap_phases').run();
    db.prepare('DELETE FROM roadmap_milestones').run();
    db.prepare('DELETE FROM roadmap_settings').run();

    const insertPhase = db.prepare('INSERT INTO roadmap_phases (id, label, position) VALUES (?, ?, ?)');
    const insertMonth = db.prepare('INSERT INTO roadmap_months (id, phase_id, label, position) VALUES (?, ?, ?, ?)');
    const insertFocus = db.prepare(
      'INSERT INTO roadmap_focuses (id, month_id, type, name, mastery_note, icon, color, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    );
    const insertTopic = db.prepare('INSERT INTO roadmap_topics (id, focus_id, label, position) VALUES (?, ?, ?, ?)');
    const insertMilestone = db.prepare(
      'INSERT INTO roadmap_milestones (id, name, type, date, status, description, icon, color, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    );
    const insertSetting = db.prepare('INSERT OR REPLACE INTO roadmap_settings (key, value) VALUES (?, ?)');

    body.phases.forEach((p, pIdx) => {
      insertPhase.run(p.id, p.label, pIdx);
      (p.months ?? []).forEach((m, mIdx) => {
        insertMonth.run(m.id, p.id, m.label, mIdx);
        (m.focuses ?? []).forEach((f, fIdx) => {
          insertFocus.run(
            f.id,
            m.id,
            f.type,
            f.name,
            f.masteryNote ?? '',
            f.icon ?? null,
            f.color ?? null,
            fIdx,
          );
          (f.topics ?? []).forEach((t, tIdx) => {
            insertTopic.run(t.id, f.id, t.label, tIdx);
          });
        });
      });
    });
    (body.milestones ?? []).forEach((ms, idx) => {
      insertMilestone.run(
        ms.id,
        ms.name,
        ms.type,
        ms.date,
        ms.status,
        ms.description ?? null,
        ms.icon ?? null,
        ms.color ?? null,
        idx,
      );
    });
    if (body.startDate) insertSetting.run('startDate', body.startDate);
    if (body.endDate) insertSetting.run('endDate', body.endDate);
  });

  tx();
  return c.json({ ok: true, roadmap: loadRoadmap() });
});

/* ─── Granular CRUD — phases ────────────────────────────────────── */

roadmapRoute.post('/phases', async (c) => {
  const body = await c.req.json<{ id: string; label: string; position?: number }>();
  if (!body.id || !body.label) return c.json({ error: 'missing_fields' }, 400);
  const pos =
    body.position ??
    (
      db.prepare('SELECT COALESCE(MAX(position), -1) + 1 AS p FROM roadmap_phases').get() as {
        p: number;
      }
    ).p;
  db.prepare('INSERT INTO roadmap_phases (id, label, position) VALUES (?, ?, ?)').run(
    body.id,
    body.label,
    pos,
  );
  return c.json({ ok: true });
});

roadmapRoute.patch('/phases/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{ label?: string; position?: number }>();
  const fields: string[] = [];
  const vals: (string | number)[] = [];
  if (body.label !== undefined) { fields.push('label = ?'); vals.push(body.label); }
  if (body.position !== undefined) { fields.push('position = ?'); vals.push(body.position); }
  if (fields.length === 0) return c.json({ error: 'no_fields' }, 400);
  vals.push(id);
  db.prepare(`UPDATE roadmap_phases SET ${fields.join(', ')} WHERE id = ?`).run(...(vals as never[]));
  return c.json({ ok: true });
});

roadmapRoute.delete('/phases/:id', (c) => {
  const id = c.req.param('id');
  db.prepare('DELETE FROM roadmap_phases WHERE id = ?').run(id);
  return c.json({ ok: true });
});

/* ─── Granular CRUD — months ────────────────────────────────────── */

roadmapRoute.post('/months', async (c) => {
  const body = await c.req.json<{ id: string; phaseId: string; label: string; position?: number }>();
  if (!body.id || !body.phaseId || !body.label) return c.json({ error: 'missing_fields' }, 400);
  const pos =
    body.position ??
    (
      db
        .prepare('SELECT COALESCE(MAX(position), -1) + 1 AS p FROM roadmap_months WHERE phase_id = ?')
        .get(body.phaseId) as { p: number }
    ).p;
  db.prepare('INSERT INTO roadmap_months (id, phase_id, label, position) VALUES (?, ?, ?, ?)').run(
    body.id,
    body.phaseId,
    body.label,
    pos,
  );
  return c.json({ ok: true });
});

roadmapRoute.patch('/months/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{ label?: string; phaseId?: string; position?: number }>();
  const fields: string[] = [];
  const vals: (string | number)[] = [];
  if (body.label !== undefined) { fields.push('label = ?'); vals.push(body.label); }
  if (body.phaseId !== undefined) { fields.push('phase_id = ?'); vals.push(body.phaseId); }
  if (body.position !== undefined) { fields.push('position = ?'); vals.push(body.position); }
  if (fields.length === 0) return c.json({ error: 'no_fields' }, 400);
  vals.push(id);
  db.prepare(`UPDATE roadmap_months SET ${fields.join(', ')} WHERE id = ?`).run(...(vals as never[]));
  return c.json({ ok: true });
});

roadmapRoute.delete('/months/:id', (c) => {
  db.prepare('DELETE FROM roadmap_months WHERE id = ?').run(c.req.param('id'));
  return c.json({ ok: true });
});

/* ─── Granular CRUD — focuses ───────────────────────────────────── */

roadmapRoute.post('/focuses', async (c) => {
  const body = await c.req.json<{
    id: string;
    monthId: string;
    type: FocusType;
    name: string;
    masteryNote?: string;
    icon?: string | null;
    color?: string | null;
    position?: number;
  }>();
  if (!body.id || !body.monthId || !body.type || !body.name) {
    return c.json({ error: 'missing_fields' }, 400);
  }
  const pos =
    body.position ??
    (
      db
        .prepare('SELECT COALESCE(MAX(position), -1) + 1 AS p FROM roadmap_focuses WHERE month_id = ?')
        .get(body.monthId) as { p: number }
    ).p;
  db.prepare(
    'INSERT INTO roadmap_focuses (id, month_id, type, name, mastery_note, icon, color, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  ).run(
    body.id,
    body.monthId,
    body.type,
    body.name,
    body.masteryNote ?? '',
    body.icon ?? null,
    body.color ?? null,
    pos,
  );
  return c.json({ ok: true });
});

roadmapRoute.patch('/focuses/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{
    name?: string;
    type?: FocusType;
    masteryNote?: string;
    icon?: string | null;
    color?: string | null;
    monthId?: string;
    position?: number;
  }>();
  const fields: string[] = [];
  const vals: (string | number | null)[] = [];
  if (body.name !== undefined) { fields.push('name = ?'); vals.push(body.name); }
  if (body.type !== undefined) { fields.push('type = ?'); vals.push(body.type); }
  if (body.masteryNote !== undefined) { fields.push('mastery_note = ?'); vals.push(body.masteryNote); }
  if (body.icon !== undefined) { fields.push('icon = ?'); vals.push(body.icon); }
  if (body.color !== undefined) { fields.push('color = ?'); vals.push(body.color); }
  if (body.monthId !== undefined) { fields.push('month_id = ?'); vals.push(body.monthId); }
  if (body.position !== undefined) { fields.push('position = ?'); vals.push(body.position); }
  if (fields.length === 0) return c.json({ error: 'no_fields' }, 400);
  vals.push(id);
  db.prepare(`UPDATE roadmap_focuses SET ${fields.join(', ')} WHERE id = ?`).run(...(vals as never[]));
  return c.json({ ok: true });
});

roadmapRoute.delete('/focuses/:id', (c) => {
  db.prepare('DELETE FROM roadmap_focuses WHERE id = ?').run(c.req.param('id'));
  return c.json({ ok: true });
});

/* ─── Granular CRUD — topics ────────────────────────────────────── */

roadmapRoute.post('/topics', async (c) => {
  const body = await c.req.json<{ id: string; focusId: string; label: string; position?: number }>();
  if (!body.id || !body.focusId || !body.label) return c.json({ error: 'missing_fields' }, 400);
  const pos =
    body.position ??
    (
      db
        .prepare('SELECT COALESCE(MAX(position), -1) + 1 AS p FROM roadmap_topics WHERE focus_id = ?')
        .get(body.focusId) as { p: number }
    ).p;
  db.prepare('INSERT INTO roadmap_topics (id, focus_id, label, position) VALUES (?, ?, ?, ?)').run(
    body.id,
    body.focusId,
    body.label,
    pos,
  );
  return c.json({ ok: true });
});

roadmapRoute.patch('/topics/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{ label?: string; focusId?: string; position?: number }>();
  const fields: string[] = [];
  const vals: (string | number)[] = [];
  if (body.label !== undefined) { fields.push('label = ?'); vals.push(body.label); }
  if (body.focusId !== undefined) { fields.push('focus_id = ?'); vals.push(body.focusId); }
  if (body.position !== undefined) { fields.push('position = ?'); vals.push(body.position); }
  if (fields.length === 0) return c.json({ error: 'no_fields' }, 400);
  vals.push(id);
  db.prepare(`UPDATE roadmap_topics SET ${fields.join(', ')} WHERE id = ?`).run(...(vals as never[]));
  return c.json({ ok: true });
});

roadmapRoute.delete('/topics/:id', (c) => {
  db.prepare('DELETE FROM roadmap_topics WHERE id = ?').run(c.req.param('id'));
  return c.json({ ok: true });
});

/* ─── Granular CRUD — milestones ─────────────────────────────────── */

roadmapRoute.post('/milestones', async (c) => {
  const body = await c.req.json<{
    id: string;
    name: string;
    type: MilestoneType;
    date: string;
    status: MilestoneStatus;
    description?: string;
    icon?: string | null;
    color?: string | null;
    position?: number;
  }>();
  if (!body.id || !body.name || !body.type || !body.date || !body.status) {
    return c.json({ error: 'missing_fields' }, 400);
  }
  const pos =
    body.position ??
    (
      db.prepare('SELECT COALESCE(MAX(position), -1) + 1 AS p FROM roadmap_milestones').get() as {
        p: number;
      }
    ).p;
  db.prepare(
    'INSERT INTO roadmap_milestones (id, name, type, date, status, description, icon, color, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  ).run(
    body.id,
    body.name,
    body.type,
    body.date,
    body.status,
    body.description ?? null,
    body.icon ?? null,
    body.color ?? null,
    pos,
  );
  return c.json({ ok: true });
});

roadmapRoute.patch('/milestones/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json<{
    name?: string;
    type?: MilestoneType;
    date?: string;
    status?: MilestoneStatus;
    description?: string | null;
    icon?: string | null;
    color?: string | null;
    position?: number;
  }>();
  const fields: string[] = [];
  const vals: (string | number | null)[] = [];
  if (body.name !== undefined) { fields.push('name = ?'); vals.push(body.name); }
  if (body.type !== undefined) { fields.push('type = ?'); vals.push(body.type); }
  if (body.date !== undefined) { fields.push('date = ?'); vals.push(body.date); }
  if (body.status !== undefined) { fields.push('status = ?'); vals.push(body.status); }
  if (body.description !== undefined) { fields.push('description = ?'); vals.push(body.description); }
  if (body.icon !== undefined) { fields.push('icon = ?'); vals.push(body.icon); }
  if (body.color !== undefined) { fields.push('color = ?'); vals.push(body.color); }
  if (body.position !== undefined) { fields.push('position = ?'); vals.push(body.position); }
  if (fields.length === 0) return c.json({ error: 'no_fields' }, 400);
  vals.push(id);
  db.prepare(`UPDATE roadmap_milestones SET ${fields.join(', ')} WHERE id = ?`).run(
    ...(vals as never[]),
  );
  return c.json({ ok: true });
});

roadmapRoute.delete('/milestones/:id', (c) => {
  db.prepare('DELETE FROM roadmap_milestones WHERE id = ?').run(c.req.param('id'));
  return c.json({ ok: true });
});

/* ─── Settings (startDate, endDate, …) ───────────────────────────── */

roadmapRoute.patch('/settings', async (c) => {
  const body = await c.req.json<Record<string, string>>();
  const insert = db.prepare(
    'INSERT OR REPLACE INTO roadmap_settings (key, value) VALUES (?, ?)',
  );
  const tx = db.transaction(() => {
    for (const [k, v] of Object.entries(body)) insert.run(k, v);
  });
  tx();
  return c.json({ ok: true });
});
