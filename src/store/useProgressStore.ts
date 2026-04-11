import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RoadmapData, FocusProgress, MonthProgress, PhaseProgress } from '../types';

interface ProgressStore {
  /** IDs dos tópicos concluídos */
  checkedTopics: string[];

  /** Marca/desmarca um tópico */
  toggleTopic: (topicId: string) => void;

  /** Verifica se um tópico está concluído */
  isChecked: (topicId: string) => boolean;

  /** Progresso de um foco (0–100) */
  getFocusProgress: (focusId: string, roadmap: RoadmapData) => FocusProgress;

  /** Progresso de um mês (0–100) */
  getMonthProgress: (monthId: string, roadmap: RoadmapData) => MonthProgress;

  /** Progresso de uma fase (0–100) */
  getPhaseProgress: (phaseId: string, roadmap: RoadmapData) => PhaseProgress;

  /** Progresso total do roadmap (0–100) */
  getTotalProgress: (roadmap: RoadmapData) => number;

  /** Reseta todo o progresso (uso em dev/debug) */
  reset: () => void;
}

export const useProgressStore = create<ProgressStore>()(
  persist(
    (set, get) => ({
      checkedTopics: [],

      toggleTopic(topicId) {
        set(s => ({
          checkedTopics: s.checkedTopics.includes(topicId)
            ? s.checkedTopics.filter(id => id !== topicId)
            : [...s.checkedTopics, topicId],
        }));
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
        const done  = focus.topics.filter(t => get().isChecked(t.id)).length;
        return { focusId, done, total, pct: total ? Math.round((done / total) * 100) : 0 };
      },

      getMonthProgress(monthId, roadmap) {
        const month = roadmap.phases
          .flatMap(p => p.months)
          .find(m => m.id === monthId);

        if (!month) return { monthId, done: 0, total: 0, pct: 0 };

        const allTopics = month.focuses.flatMap(f => f.topics);
        const total = allTopics.length;
        const done  = allTopics.filter(t => get().isChecked(t.id)).length;
        return { monthId, done, total, pct: total ? Math.round((done / total) * 100) : 0 };
      },

      getPhaseProgress(phaseId, roadmap) {
        const phase = roadmap.phases.find(p => p.id === phaseId);
        if (!phase) return { phaseId, done: 0, total: 0, pct: 0 };

        const allTopics = phase.months.flatMap(m => m.focuses).flatMap(f => f.topics);
        const total = allTopics.length;
        const done  = allTopics.filter(t => get().isChecked(t.id)).length;
        return { phaseId, done, total, pct: total ? Math.round((done / total) * 100) : 0 };
      },

      getTotalProgress(roadmap) {
        const allTopics = roadmap.phases
          .flatMap(p => p.months)
          .flatMap(m => m.focuses)
          .flatMap(f => f.topics);
        const total = allTopics.length;
        const done  = allTopics.filter(t => get().isChecked(t.id)).length;
        return total ? Math.round((done / total) * 100) : 0;
      },

      reset() {
        set({ checkedTopics: [] });
      },
    }),
    { name: 'studypath-progress' }
  )
);
