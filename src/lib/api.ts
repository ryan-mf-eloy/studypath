/**
 * Thin typed fetch client for the local backend.
 * All writes are fire-and-forget with a retry queue managed in serverSync.ts.
 */

import type { StudySession } from '../store/useSessionsStore';
import type {
  Note,
  RoadmapData,
  FocusType,
  MilestoneType,
  MilestoneStatus,
  RoutineData,
  RoutineSlot,
  RoutineOverride,
  RoutineOverrideKind,
  DayOfWeek,
} from '../types';
import type { ReviewEntry } from '../store/useReviewStore';
import type { WeeklyReflection } from '../store/useJournalStore';

const BASE = '/api';

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  return res.json() as Promise<T>;
}

/* ── Shape of GET /api/state ─────────────────────────────── */

export interface ServerState {
  empty: boolean;
  progress: {
    checkedTopics: string[];
    checkedAt: Record<string, string>;
  };
  sessions: StudySession[];
  reviews: Record<string, unknown>;
  notes: unknown[];
  subtopics: Record<string, unknown[]>;
  milestones: { doneIds: string[] };
  reflections: unknown[];
  roadmap: RoadmapData;
  routines: RoutineData;
}

/* ── Endpoints ──────────────────────────────────────────── */

export async function health(): Promise<{ ok: boolean; schemaVersion: string }> {
  return json(await fetch(`${BASE}/health`));
}

export async function getState(): Promise<ServerState> {
  return json(await fetch(`${BASE}/state`));
}

/** Progress */
export async function toggleProgress(topicId: string): Promise<void> {
  await fetch(`${BASE}/progress/toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topicId }),
  }).then(json);
}

export async function putProgress(
  checkedTopics: string[],
  checkedAt: Record<string, string>,
): Promise<void> {
  await fetch(`${BASE}/progress`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ checkedTopics, checkedAt }),
  }).then(json);
}

/** Migration */
export interface MigrationSummary {
  checkedTopics: number;
  sessions: number;
  reviews: number;
  notes: number;
  subtopics: number;
  milestones: number;
  reflections: number;
}
export interface MigrationResult {
  ok?: boolean;
  skipped?: boolean;
  reason?: string;
  summary?: MigrationSummary;
  error?: string;
  message?: string;
}

export async function migrateFromLocal(payload: unknown): Promise<MigrationResult> {
  const res = await fetch(`${BASE}/migrate/from-local`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return json(res);
}

/** Sessions */
export async function postSession(session: StudySession): Promise<void> {
  await fetch(`${BASE}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(session),
  }).then(json);
}

export async function deleteSession(id: string): Promise<void> {
  await fetch(`${BASE}/sessions/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  }).then(json);
}

export async function clearSessions(): Promise<void> {
  await fetch(`${BASE}/sessions`, { method: 'DELETE' }).then(json);
}

/** Reviews */
export async function scheduleReview(entry: {
  topicId: string;
  stage: number;
  nextReviewAt: string;
  createdAt?: string;
}): Promise<void> {
  await fetch(`${BASE}/reviews/schedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  }).then(json);
}

export async function recordReview(entry: {
  topicId: string;
  stage: number;
  nextReviewAt: string;
  result: string;
}): Promise<void> {
  await fetch(`${BASE}/reviews/record`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  }).then(json);
}

export async function deleteReview(topicId: string): Promise<void> {
  await fetch(`${BASE}/reviews/${encodeURIComponent(topicId)}`, {
    method: 'DELETE',
  }).then(json);
}

/** Notes */
export async function postNote(note: Note): Promise<void> {
  await fetch(`${BASE}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(note),
  }).then(json);
}

export async function patchNote(id: string, partial: Partial<Note>): Promise<void> {
  await fetch(`${BASE}/notes/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(partial),
  }).then(json);
}

export async function deleteNote(id: string): Promise<void> {
  await fetch(`${BASE}/notes/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  }).then(json);
}

/** Subtopics */
export async function postSubtopic(entry: {
  id: string;
  topicId: string;
  label: string;
}): Promise<void> {
  await fetch(`${BASE}/subtopics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  }).then(json);
}

export async function deleteSubtopic(id: string): Promise<void> {
  await fetch(`${BASE}/subtopics/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  }).then(json);
}

/** Milestones */
export async function postMilestone(milestoneId: string): Promise<void> {
  await fetch(`${BASE}/milestones`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ milestoneId }),
  }).then(json);
}

export async function deleteMilestone(milestoneId: string): Promise<void> {
  await fetch(`${BASE}/milestones/${encodeURIComponent(milestoneId)}`, {
    method: 'DELETE',
  }).then(json);
}

/** Reflections */
export async function postReflection(entry: WeeklyReflection): Promise<void> {
  await fetch(`${BASE}/reflections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  }).then(json);
}

export async function deleteReflection(id: string): Promise<void> {
  await fetch(`${BASE}/reflections/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  }).then(json);
}

/** Admin */
export async function resetAll(): Promise<void> {
  await fetch(`${BASE}/admin/reset`, { method: 'POST' }).then(json);
}

/** Roadmap */
export async function getRoadmap(): Promise<RoadmapData> {
  return json(await fetch(`${BASE}/roadmap`));
}

export async function replaceRoadmap(payload: RoadmapData): Promise<{ ok: boolean; roadmap: RoadmapData }> {
  return json(
    await fetch(`${BASE}/roadmap`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  );
}

export async function resetRoadmap(): Promise<{ ok: boolean; roadmap: RoadmapData }> {
  return json(await fetch(`${BASE}/roadmap/reset`, { method: 'POST' }));
}

/* ─── Roadmap granular CRUD ───────────────────────────────────── */

async function ok(method: string, path: string, body?: unknown): Promise<void> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  await json(res);
}

/** Phases */
export const createPhase = (entry: { id: string; label: string; position?: number }) =>
  ok('POST', '/roadmap/phases', entry);
export const updatePhase = (id: string, patch: { label?: string; position?: number }) =>
  ok('PATCH', `/roadmap/phases/${encodeURIComponent(id)}`, patch);
export const deletePhase = (id: string) =>
  ok('DELETE', `/roadmap/phases/${encodeURIComponent(id)}`);

/** Months */
export const createMonth = (entry: {
  id: string;
  phaseId: string;
  label: string;
  position?: number;
}) => ok('POST', '/roadmap/months', entry);
export const updateMonth = (
  id: string,
  patch: { label?: string; phaseId?: string; position?: number },
) => ok('PATCH', `/roadmap/months/${encodeURIComponent(id)}`, patch);
export const deleteMonth = (id: string) =>
  ok('DELETE', `/roadmap/months/${encodeURIComponent(id)}`);

/** Focuses */
export const createFocus = (entry: {
  id: string;
  monthId: string;
  type: FocusType;
  name: string;
  masteryNote?: string;
  icon?: string | null;
  color?: string | null;
  position?: number;
}) => ok('POST', '/roadmap/focuses', entry);
export const updateFocus = (
  id: string,
  patch: {
    name?: string;
    type?: FocusType;
    masteryNote?: string;
    icon?: string | null;
    color?: string | null;
    monthId?: string;
    position?: number;
  },
) => ok('PATCH', `/roadmap/focuses/${encodeURIComponent(id)}`, patch);
export const deleteFocus = (id: string) =>
  ok('DELETE', `/roadmap/focuses/${encodeURIComponent(id)}`);

/** Topics */
export const createTopic = (entry: {
  id: string;
  focusId: string;
  label: string;
  position?: number;
}) => ok('POST', '/roadmap/topics', entry);
export const updateTopic = (
  id: string,
  patch: { label?: string; focusId?: string; position?: number },
) => ok('PATCH', `/roadmap/topics/${encodeURIComponent(id)}`, patch);
export const deleteTopic = (id: string) =>
  ok('DELETE', `/roadmap/topics/${encodeURIComponent(id)}`);

/** Milestones (roadmap-level, not the user done-state store) */
export const createRoadmapMilestone = (entry: {
  id: string;
  name: string;
  type: MilestoneType;
  date: string;
  status: MilestoneStatus;
  description?: string;
  icon?: string | null;
  color?: string | null;
  position?: number;
}) => ok('POST', '/roadmap/milestones', entry);
export const updateRoadmapMilestone = (
  id: string,
  patch: {
    name?: string;
    type?: MilestoneType;
    date?: string;
    status?: MilestoneStatus;
    description?: string | null;
    icon?: string | null;
    color?: string | null;
    position?: number;
  },
) => ok('PATCH', `/roadmap/milestones/${encodeURIComponent(id)}`, patch);
export const deleteRoadmapMilestone = (id: string) =>
  ok('DELETE', `/roadmap/milestones/${encodeURIComponent(id)}`);

/** Settings (startDate / endDate etc.) */
export const updateRoadmapSettings = (patch: Record<string, string>) =>
  ok('PATCH', '/roadmap/settings', patch);

/** Routines */
export async function getRoutines(): Promise<RoutineData> {
  return json(await fetch(`${BASE}/routines`));
}

export async function createRoutineSlot(entry: {
  id: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  durationMin: number;
  label?: string;
  focusId?: string;
  topicId?: string;
  subtopicId?: string;
  color?: string;
  meetingUrl?: string;
  active?: boolean;
  position?: number;
}): Promise<{ slot: RoutineSlot }> {
  return json(
    await fetch(`${BASE}/routines/slots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    }),
  );
}

export async function updateRoutineSlot(
  id: string,
  patch: Partial<{
    dayOfWeek: DayOfWeek;
    startTime: string;
    durationMin: number;
    label: string | null;
    focusId: string | null;
    topicId: string | null;
    subtopicId: string | null;
    color: string | null;
    meetingUrl: string | null;
    active: boolean;
    position: number;
  }>,
): Promise<{ slot: RoutineSlot }> {
  return json(
    await fetch(`${BASE}/routines/slots/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }),
  );
}

export async function deleteRoutineSlot(id: string): Promise<void> {
  await fetch(`${BASE}/routines/slots/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  }).then(json);
}

export async function createRoutineOverride(entry: {
  id: string;
  slotId: string;
  date: string;
  kind: RoutineOverrideKind;
  newDate?: string;
  newStartTime?: string;
}): Promise<{ override: RoutineOverride }> {
  return json(
    await fetch(`${BASE}/routines/overrides`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    }),
  );
}

export async function deleteRoutineOverride(id: string): Promise<void> {
  await fetch(`${BASE}/routines/overrides/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  }).then(json);
}

/** Reviews shape helper for hydration */
export interface ServerReviewEntry extends Omit<ReviewEntry, 'history'> {
  history: Array<{ at: string; result: string; stage: number }>;
}
