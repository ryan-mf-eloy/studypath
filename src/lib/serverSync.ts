/**
 * Bootstraps stores from GET /api/state and manages a write-through retry
 * queue for failed server calls. Stores call `enqueueWrite(fn)` when they
 * mutate local state; if the fetch fails, it's retried until success.
 *
 * Degrades gracefully: if the server is unreachable, the app keeps working
 * in memory, mutations sit in the queue, a sync badge can reflect the state.
 */

import { getState, migrateFromLocal, getRoadmap as apiGetRoadmap } from './api';
import type { ServerState, MigrationSummary } from './api';
import { useProgressStore } from '../store/useProgressStore';
import { useSessionsStore } from '../store/useSessionsStore';
import type { StudySession } from '../store/useSessionsStore';
import { useReviewStore } from '../store/useReviewStore';
import type { ReviewEntry } from '../store/useReviewStore';
import { useNotesStore } from '../store/useNotesStore';
import { useSubtopicsStore } from '../store/useSubtopicsStore';
import { useMilestonesStore } from '../store/useMilestonesStore';
import { useJournalStore } from '../store/useJournalStore';
import type { WeeklyReflection } from '../store/useJournalStore';
import { useRoadmapStore } from '../store/useRoadmapStore';
import { useRoutineStore } from '../store/useRoutineStore';
import type { Note, Subtopic } from '../types';
import { collectLocalPayload, hasLocalData } from './backup';

type Write = () => Promise<void>;

const queue: Write[] = [];
let flushTimer: number | null = null;
let listeners: Array<(status: SyncStatus) => void> = [];

export type SyncStatus = 'ok' | 'pending' | 'offline';
let status: SyncStatus = 'ok';

function setStatus(next: SyncStatus) {
  if (status === next) return;
  status = next;
  for (const fn of listeners) fn(status);
}

export function getSyncStatus(): SyncStatus {
  return status;
}

export function subscribeSyncStatus(fn: (s: SyncStatus) => void): () => void {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter(x => x !== fn);
  };
}

/** Schedule a write to the server. Silently retries on failure. */
export function enqueueWrite(fn: Write): void {
  queue.push(fn);
  if (queue.length > 0) setStatus('pending');
  scheduleFlush(0);
}

function scheduleFlush(delayMs: number) {
  if (flushTimer !== null) return;
  flushTimer = window.setTimeout(async () => {
    flushTimer = null;
    await flush();
  }, delayMs);
}

async function flush() {
  while (queue.length > 0) {
    const next = queue[0];
    try {
      await next();
      queue.shift();
    } catch (err) {
      console.warn('[serverSync] write failed, will retry in 5s', err);
      setStatus('offline');
      scheduleFlush(5000);
      return;
    }
  }
  setStatus('ok');
}

function applyServerState(state: ServerState) {
  // Roadmap goes first — everything else depends on it for lookups/metrics.
  if (state.roadmap) {
    useRoadmapStore.setState({ roadmap: state.roadmap });
  }

  useProgressStore.setState({
    checkedTopics: state.progress.checkedTopics,
    checkedAt: state.progress.checkedAt,
  });

  useSessionsStore.setState({
    sessions: state.sessions as StudySession[],
  });

  // Reviews: server returns `history[]` items with `{reviewedAt, result}` —
  // the client store expects `{at, result, stage}`. Normalize.
  const serverReviews = state.reviews as Record<
    string,
    {
      topicId: string;
      stage: number;
      nextReviewAt: string;
      lastResult?: string;
      createdAt: string;
      history?: Array<{ at?: string; reviewedAt?: string; result: string; stage?: number }>;
    }
  >;
  const reviews: Record<string, ReviewEntry> = {};
  for (const [topicId, r] of Object.entries(serverReviews)) {
    reviews[topicId] = {
      topicId: r.topicId,
      stage: r.stage,
      nextReviewAt: r.nextReviewAt,
      lastResult: r.lastResult as ReviewEntry['lastResult'],
      createdAt: r.createdAt,
      history: (r.history ?? []).map(h => ({
        at: h.at ?? h.reviewedAt ?? r.createdAt,
        result: (h.result ?? 'partial') as ReviewEntry['history'][number]['result'],
        stage: h.stage ?? r.stage,
      })),
    };
  }
  useReviewStore.setState({ reviews });

  useNotesStore.setState({ notes: state.notes as Note[] });

  useSubtopicsStore.setState({
    subtopics: state.subtopics as Record<string, Subtopic[]>,
  });

  useMilestonesStore.setState({ doneIds: state.milestones.doneIds });

  useJournalStore.setState({
    reflections: state.reflections as WeeklyReflection[],
  });

  if (state.routines) {
    useRoutineStore.setState({
      slots: state.routines.slots,
      overrides: state.routines.overrides,
    });
  }
}

export interface HydrateResult {
  ok: boolean;
  state?: ServerState;
  error?: string;
  migrated?: MigrationSummary;
}

/** Refetch just the roadmap and update the store. Used after CRUD edits. */
export async function refreshRoadmap(): Promise<void> {
  try {
    const roadmap = await apiGetRoadmap();
    useRoadmapStore.setState({ roadmap });
  } catch (err) {
    console.warn('[serverSync] refreshRoadmap failed', err);
  }
}

/**
 * Hydrate stores from server. Called once on app mount.
 * If the server is empty and localStorage has data, auto-migrates first.
 */
export async function hydrateFromServer(): Promise<HydrateResult> {
  try {
    let state = await getState();

    let migratedSummary: MigrationSummary | undefined;
    if (state.empty && hasLocalData()) {
      try {
        const payload = collectLocalPayload();
        const result = await migrateFromLocal(payload);
        if (result.ok && result.summary) {
          migratedSummary = result.summary;
          // Re-fetch state now that the backend is populated.
          state = await getState();
        }
      } catch (err) {
        console.warn('[serverSync] migration failed, continuing with empty state', err);
      }
    }

    applyServerState(state);
    setStatus('ok');
    return { ok: true, state, migrated: migratedSummary };
  } catch (err) {
    setStatus('offline');
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}
