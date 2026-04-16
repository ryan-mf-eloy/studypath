import { Hono } from 'hono';
import { db } from '../db.js';
import { listAllSessions } from './sessions.js';
import { loadRoadmap } from './roadmap.js';
import { loadRoutines } from './routines.js';

export const stateRoute = new Hono();

interface CheckedTopicRow {
  topic_id: string;
  checked_at: string;
}
interface ReviewRow {
  topic_id: string;
  stage: number;
  next_review_at: string;
  last_result: string | null;
  created_at: string;
}
interface ReviewHistoryRow {
  topic_id: string;
  result: string;
  reviewed_at: string;
}
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
interface SubtopicRow {
  id: string;
  topic_id: string;
  label: string;
  position: number;
}
interface MilestoneRow {
  milestone_id: string;
  done_at: string;
}
interface ReflectionRow {
  id: string;
  week_key: string;
  hardest: string | null;
  to_review: string | null;
  pace: string | null;
  note_to_self: string | null;
  created_at: string;
}

stateRoute.get('/', (c) => {
  // progress
  const progressRows = db
    .prepare('SELECT topic_id, checked_at FROM checked_topics')
    .all() as CheckedTopicRow[];
  const checkedTopics = progressRows.map(r => r.topic_id);
  const checkedAt: Record<string, string> = {};
  for (const r of progressRows) checkedAt[r.topic_id] = r.checked_at;

  // sessions
  const sessions = listAllSessions();

  // reviews
  const reviewRows = db
    .prepare(
      'SELECT topic_id, stage, next_review_at, last_result, created_at FROM reviews',
    )
    .all() as ReviewRow[];
  const historyRows = db
    .prepare(
      'SELECT topic_id, result, reviewed_at FROM review_history ORDER BY reviewed_at ASC',
    )
    .all() as ReviewHistoryRow[];
  const historyByTopic: Record<
    string,
    Array<{ result: string; reviewedAt: string }>
  > = {};
  for (const h of historyRows) {
    if (!historyByTopic[h.topic_id]) historyByTopic[h.topic_id] = [];
    historyByTopic[h.topic_id].push({ result: h.result, reviewedAt: h.reviewed_at });
  }
  const reviews: Record<string, unknown> = {};
  for (const r of reviewRows) {
    reviews[r.topic_id] = {
      topicId: r.topic_id,
      stage: r.stage,
      nextReviewAt: r.next_review_at,
      lastResult: r.last_result ?? undefined,
      createdAt: r.created_at,
      history: historyByTopic[r.topic_id] ?? [],
    };
  }

  // notes
  const noteRows = db
    .prepare(
      'SELECT id, title, body, body_version, icon, topic_id, focus_id, subject_tag, created_at, updated_at FROM notes ORDER BY updated_at DESC',
    )
    .all() as NoteRow[];
  const notes = noteRows.map(r => ({
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
  }));

  // subtopics
  const subtopicRows = db
    .prepare(
      'SELECT id, topic_id, label, position FROM subtopics ORDER BY topic_id, position',
    )
    .all() as SubtopicRow[];
  const subtopics: Record<string, Array<{ id: string; topicId: string; label: string }>> = {};
  for (const r of subtopicRows) {
    if (!subtopics[r.topic_id]) subtopics[r.topic_id] = [];
    subtopics[r.topic_id].push({ id: r.id, topicId: r.topic_id, label: r.label });
  }

  // milestones
  const milestoneRows = db
    .prepare('SELECT milestone_id, done_at FROM milestones_done')
    .all() as MilestoneRow[];
  const doneIds = milestoneRows.map(r => r.milestone_id);

  // reflections
  const reflectionRows = db
    .prepare(
      'SELECT id, week_key, hardest, to_review, pace, note_to_self, created_at FROM reflections ORDER BY week_key DESC',
    )
    .all() as ReflectionRow[];
  const reflections = reflectionRows.map(r => ({
    id: r.id,
    weekKey: r.week_key,
    hardest: r.hardest ?? '',
    toReview: r.to_review ? (JSON.parse(r.to_review) as string[]) : [],
    pace: r.pace ?? '',
    noteToSelf: r.note_to_self ?? '',
    createdAt: r.created_at,
  }));

  const routines = loadRoutines();

  const isEmpty =
    checkedTopics.length === 0 &&
    sessions.length === 0 &&
    Object.keys(reviews).length === 0 &&
    notes.length === 0 &&
    Object.keys(subtopics).length === 0 &&
    doneIds.length === 0 &&
    reflections.length === 0 &&
    routines.slots.length === 0;

  return c.json({
    empty: isEmpty,
    progress: { checkedTopics, checkedAt },
    sessions,
    reviews,
    notes,
    subtopics,
    milestones: { doneIds },
    reflections,
    roadmap: loadRoadmap(),
    routines,
  });
});
