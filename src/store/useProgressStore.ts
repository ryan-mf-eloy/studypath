import { create } from 'zustand';
import type { RoadmapData, FocusProgress, MonthProgress, PhaseProgress } from '../types';
import { useReviewStore } from './useReviewStore';
import * as api from '../lib/api';
import { enqueueWrite } from '../lib/serverSync';

interface ProgressStore {
  checkedTopics: string[];
  checkedAt: Record<string, string>;

  toggleTopic: (topicId: string) => void;
  isChecked: (topicId: string) => boolean;

  getFocusProgress: (focusId: string, roadmap: RoadmapData) => FocusProgress;
  getMonthProgress: (monthId: string, roadmap: RoadmapData) => MonthProgress;
  getPhaseProgress: (phaseId: string, roadmap: RoadmapData) => PhaseProgress;
  getTotalProgress: (roadmap: RoadmapData) => number;
  getChecksByDay: (days: number) => Array<{ date: string; count: number }>;

  reset: () => void;
}

export const useProgressStore = create<ProgressStore>()((set, get) => ({
  checkedTopics: [],
  checkedAt: {},

  toggleTopic(topicId) {
    const wasOn = get().checkedTopics.includes(topicId);
    set(s => {
      if (wasOn) {
        const { [topicId]: _drop, ...restAt } = s.checkedAt;
        void _drop;
        return {
          checkedTopics: s.checkedTopics.filter(id => id !== topicId),
          checkedAt: restAt,
        };
      }
      return {
        checkedTopics: [...s.checkedTopics, topicId],
        checkedAt: { ...s.checkedAt, [topicId]: new Date().toISOString() },
      };
    });

    // Write-through to server
    enqueueWrite(() => api.toggleProgress(topicId));

    // SRS side-effect
    const reviewStore = useReviewStore.getState();
    if (wasOn) {
      reviewStore.removeReview(topicId);
    } else {
      reviewStore.scheduleReview(topicId);
    }
  },

  isChecked(topicId) {
    return get().checkedTopics.includes(topicId);
  },

  getFocusProgress(focusId, roadmap) {
    const focus = roadmap.phases
      .flatMap(p => p.months)
      .flatMap(m => m.focuses)
      .find(f => f.id === focusId);

    if (!focus) return { focusId, done: 0, total: 0, pct: 0 };

    const total = focus.topics.length;
    const done = focus.topics.filter(t => get().isChecked(t.id)).length;
    return { focusId, done, total, pct: total ? Math.round((done / total) * 100) : 0 };
  },

  getMonthProgress(monthId, roadmap) {
    const month = roadmap.phases
      .flatMap(p => p.months)
      .find(m => m.id === monthId);

    if (!month) return { monthId, done: 0, total: 0, pct: 0 };

    const allTopics = month.focuses.flatMap(f => f.topics);
    const total = allTopics.length;
    const done = allTopics.filter(t => get().isChecked(t.id)).length;
    return { monthId, done, total, pct: total ? Math.round((done / total) * 100) : 0 };
  },

  getPhaseProgress(phaseId, roadmap) {
    const phase = roadmap.phases.find(p => p.id === phaseId);
    if (!phase) return { phaseId, done: 0, total: 0, pct: 0 };

    const allTopics = phase.months.flatMap(m => m.focuses).flatMap(f => f.topics);
    const total = allTopics.length;
    const done = allTopics.filter(t => get().isChecked(t.id)).length;
    return { phaseId, done, total, pct: total ? Math.round((done / total) * 100) : 0 };
  },

  getTotalProgress(roadmap) {
    const allTopics = roadmap.phases
      .flatMap(p => p.months)
      .flatMap(m => m.focuses)
      .flatMap(f => f.topics);
    const total = allTopics.length;
    const done = allTopics.filter(t => get().isChecked(t.id)).length;
    return total ? Math.round((done / total) * 100) : 0;
  },

  getChecksByDay(days) {
    const localKey = (d: Date): string => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    const out: Record<string, number> = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      out[localKey(d)] = 0;
    }
    for (const iso of Object.values(get().checkedAt)) {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) continue;
      const dayKey = localKey(d);
      if (dayKey in out) {
        out[dayKey] += 1;
      }
    }
    return Object.entries(out).map(([date, count]) => ({ date, count }));
  },

  reset() {
    set({ checkedTopics: [], checkedAt: {} });
    enqueueWrite(() => api.putProgress([], {}));
  },
}));
