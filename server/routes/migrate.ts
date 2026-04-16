import { Hono } from 'hono';
import { db } from '../db.js';

export const migrateRoute = new Hono();

interface BackupStores {
  'studypath-progress'?: {
    state?: {
      checkedTopics?: string[];
      checkedAt?: Record<string, string>;
    };
  };
  'studypath-sessions'?: {
    state?: {
      sessions?: Array<{
        id: string;
        topicId?: string;
        focusId?: string;
        startedAt: string;
        endedAt: string;
        durationMs: number;
        plannedMs?: number;
        completed?: boolean;
      }>;
    };
  };
  'studypath-reviews'?: {
    state?: {
      reviews?: Record<
        string,
        {
          topicId: string;
          stage: number;
          nextReviewAt: string;
          lastResult?: string;
          createdAt: string;
          history?: Array<{ result: string; reviewedAt: string }>;
        }
      >;
    };
  };
  'studypath-notes'?: {
    state?: {
      notes?: Array<{
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
      }>;
    };
  };
  'studypath-subtopics'?: {
    state?: {
      subtopics?: Record<
        string,
        Array<{ id: string; topicId: string; label: string }>
      >;
    };
  };
  'studypath-milestones'?: {
    state?: {
      doneIds?: string[];
    };
  };
  'studypath-journal'?: {
    state?: {
      reflections?: Array<{
        id: string;
        weekKey: string;
        hardest?: string;
        toReview?: string[];
        pace?: string;
        noteToSelf?: string;
        createdAt: string;
      }>;
    };
  };
}

interface BackupPayload {
  version: number;
  stores: BackupStores;
}

function isDbEmpty(): boolean {
  const counts = [
    'SELECT COUNT(*) as n FROM checked_topics',
    'SELECT COUNT(*) as n FROM study_sessions',
    'SELECT COUNT(*) as n FROM reviews',
    'SELECT COUNT(*) as n FROM notes',
    'SELECT COUNT(*) as n FROM subtopics',
    'SELECT COUNT(*) as n FROM milestones_done',
    'SELECT COUNT(*) as n FROM reflections',
  ];
  for (const sql of counts) {
    const row = db.prepare(sql).get() as { n: number };
    if (row.n > 0) return false;
  }
  return true;
}

migrateRoute.post('/from-local', async (c) => {
  if (!isDbEmpty()) {
    return c.json({ skipped: true, reason: 'db_not_empty' });
  }

  const payload = (await c.req.json()) as BackupPayload;
  if (!payload || typeof payload !== 'object' || !payload.stores) {
    return c.json({ error: 'invalid_payload' }, 400);
  }

  const summary = {
    checkedTopics: 0,
    sessions: 0,
    reviews: 0,
    notes: 0,
    subtopics: 0,
    milestones: 0,
    reflections: 0,
  };

  const migrate = db.transaction(() => {
    // Progress
    const progress = payload.stores['studypath-progress']?.state;
    if (progress?.checkedTopics) {
      const insertProgress = db.prepare(
        'INSERT OR REPLACE INTO checked_topics (topic_id, checked_at) VALUES (?, ?)',
      );
      const at = progress.checkedAt ?? {};
      for (const topicId of progress.checkedTopics) {
        insertProgress.run(topicId, at[topicId] ?? new Date().toISOString());
        summary.checkedTopics++;
      }
    }

    // Sessions
    const sessions = payload.stores['studypath-sessions']?.state?.sessions ?? [];
    const insertSession = db.prepare(
      `INSERT OR REPLACE INTO study_sessions
         (id, topic_id, focus_id, started_at, ended_at, duration_ms, planned_ms, completed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const s of sessions) {
      insertSession.run(
        s.id,
        s.topicId ?? null,
        s.focusId ?? null,
        s.startedAt,
        s.endedAt,
        s.durationMs,
        s.plannedMs ?? null,
        s.completed ? 1 : 0,
      );
      summary.sessions++;
    }

    // Reviews + history
    const reviews = payload.stores['studypath-reviews']?.state?.reviews ?? {};
    const insertReview = db.prepare(
      `INSERT OR REPLACE INTO reviews
         (topic_id, stage, next_review_at, last_result, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    );
    const insertHistory = db.prepare(
      'INSERT INTO review_history (topic_id, result, reviewed_at) VALUES (?, ?, ?)',
    );
    for (const [, r] of Object.entries(reviews)) {
      insertReview.run(
        r.topicId,
        r.stage,
        r.nextReviewAt,
        r.lastResult ?? null,
        r.createdAt,
      );
      for (const h of r.history ?? []) {
        insertHistory.run(r.topicId, h.result, h.reviewedAt);
      }
      summary.reviews++;
    }

    // Notes
    const notes = payload.stores['studypath-notes']?.state?.notes ?? [];
    const insertNote = db.prepare(
      `INSERT OR REPLACE INTO notes
         (id, title, body, body_version, icon, topic_id, focus_id, subject_tag, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const n of notes) {
      insertNote.run(
        n.id,
        n.title,
        n.body,
        n.bodyVersion ?? 2,
        n.icon ?? null,
        n.topicId ?? null,
        n.focusId ?? null,
        n.subjectTag ?? null,
        n.createdAt,
        n.updatedAt,
      );
      summary.notes++;
    }

    // Subtopics
    const subtopicsMap =
      payload.stores['studypath-subtopics']?.state?.subtopics ?? {};
    const insertSubtopic = db.prepare(
      'INSERT OR REPLACE INTO subtopics (id, topic_id, label, position) VALUES (?, ?, ?, ?)',
    );
    for (const [topicId, arr] of Object.entries(subtopicsMap)) {
      arr.forEach((s, idx) => {
        insertSubtopic.run(s.id, topicId, s.label, idx);
        summary.subtopics++;
      });
    }

    // Milestones
    const milestones = payload.stores['studypath-milestones']?.state?.doneIds ?? [];
    const insertMilestone = db.prepare(
      'INSERT OR REPLACE INTO milestones_done (milestone_id, done_at) VALUES (?, ?)',
    );
    for (const m of milestones) {
      insertMilestone.run(m, new Date().toISOString());
      summary.milestones++;
    }

    // Reflections
    const reflections =
      payload.stores['studypath-journal']?.state?.reflections ?? [];
    const insertReflection = db.prepare(
      `INSERT OR REPLACE INTO reflections
         (id, week_key, hardest, to_review, pace, note_to_self, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const r of reflections) {
      insertReflection.run(
        r.id,
        r.weekKey,
        r.hardest ?? null,
        JSON.stringify(r.toReview ?? []),
        r.pace ?? null,
        r.noteToSelf ?? null,
        r.createdAt,
      );
      summary.reflections++;
    }
  });

  try {
    migrate();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ error: 'migration_failed', message: msg }, 500);
  }

  return c.json({ ok: true, summary });
});
