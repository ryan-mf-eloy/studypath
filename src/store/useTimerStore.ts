import { create } from 'zustand';
import { useSessionsStore } from './useSessionsStore';

/**
 * Running study timer. NOT persisted — running timers don't survive reloads
 * and we don't want stale state. Only completed sessions are persisted (via
 * useSessionsStore).
 */

export type TimerDuration = 25 | 45 | 90; // minutes

interface TimerStore {
  active: boolean;
  paused: boolean;

  topicId?: string;
  topicLabel?: string;
  focusId?: string;

  plannedMs: number;               // total planned duration
  startedAt: number;               // timestamp of the latest resume (ms)
  elapsedBeforeCurrentRun: number; // accumulated ms from previous pauses
  sessionStartedAt: string;        // ISO of the first start (for logging)

  start: (opts: {
    topicId?: string;
    topicLabel?: string;
    focusId?: string;
    minutes: TimerDuration;
  }) => void;
  /**
   * Start the timer from a resolved routine slot. Uses the slot's duration
   * directly instead of the preset values.
   */
  startFromSlot: (slot: {
    durationMin: number;
    label?: string;
    focusId?: string;
    topicId?: string;
  }) => void;
  pause: () => void;
  resume: () => void;
  stop: (completed?: boolean) => void;

  /** Current elapsed in ms, computed live. */
  getElapsedMs: () => number;
  /** Remaining ms until the planned time runs out (clamped at 0). */
  getRemainingMs: () => number;
}

export const useTimerStore = create<TimerStore>((set, get) => ({
  active: false,
  paused: false,
  plannedMs: 25 * 60 * 1000,
  startedAt: 0,
  elapsedBeforeCurrentRun: 0,
  sessionStartedAt: '',

  start({ topicId, topicLabel, focusId, minutes }) {
    const now = Date.now();
    set({
      active: true,
      paused: false,
      topicId,
      topicLabel,
      focusId,
      plannedMs: minutes * 60 * 1000,
      startedAt: now,
      elapsedBeforeCurrentRun: 0,
      sessionStartedAt: new Date(now).toISOString(),
    });
  },

  startFromSlot(slot) {
    const now = Date.now();
    set({
      active: true,
      paused: false,
      topicId: slot.topicId,
      topicLabel: slot.label,
      focusId: slot.focusId,
      plannedMs: Math.max(60_000, slot.durationMin * 60 * 1000),
      startedAt: now,
      elapsedBeforeCurrentRun: 0,
      sessionStartedAt: new Date(now).toISOString(),
    });
  },

  pause() {
    if (!get().active || get().paused) return;
    const elapsed = get().getElapsedMs();
    set({ paused: true, elapsedBeforeCurrentRun: elapsed, startedAt: Date.now() });
  },

  resume() {
    if (!get().active || !get().paused) return;
    set({ paused: false, startedAt: Date.now() });
  },

  stop(completed = false) {
    const state = get();
    if (!state.active) return;

    const durationMs = state.getElapsedMs();
    // Only log sessions with at least 60 seconds of effective time
    if (durationMs >= 60_000) {
      useSessionsStore.getState().addSession({
        topicId: state.topicId,
        focusId: state.focusId,
        startedAt: state.sessionStartedAt,
        endedAt: new Date().toISOString(),
        durationMs,
        plannedMs: state.plannedMs,
        completed,
      });
    }

    set({
      active: false,
      paused: false,
      topicId: undefined,
      topicLabel: undefined,
      focusId: undefined,
      plannedMs: 25 * 60 * 1000,
      startedAt: 0,
      elapsedBeforeCurrentRun: 0,
      sessionStartedAt: '',
    });
  },

  getElapsedMs() {
    const s = get();
    if (!s.active) return 0;
    if (s.paused) return s.elapsedBeforeCurrentRun;
    return s.elapsedBeforeCurrentRun + (Date.now() - s.startedAt);
  },

  getRemainingMs() {
    const s = get();
    return Math.max(0, s.plannedMs - s.getElapsedMs());
  },
}));
