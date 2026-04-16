import { create } from 'zustand';
import type { RoadmapData, Phase, Month, Focus, Topic, Milestone } from '../types';

interface RoadmapStore {
  roadmap: RoadmapData;

  setRoadmap: (roadmap: RoadmapData) => void;

  /** Helpers usados no lugar dos antigos `findX` do `lib/utils`. */
  findPhase: (phaseId: string) => Phase | undefined;
  findMonth: (monthId: string) => Month | undefined;
  findFocus: (focusId: string) => Focus | undefined;
  findTopic: (topicId: string) => Topic | undefined;

  getAllTopics: () => Topic[];
  getAllFocuses: () => Focus[];
  getAllMonths: () => Month[];
}

const EMPTY_ROADMAP: RoadmapData = {
  phases: [],
  milestones: [],
  startDate: '',
  endDate: '',
};

export const useRoadmapStore = create<RoadmapStore>()((set, get) => ({
  roadmap: EMPTY_ROADMAP,

  setRoadmap(roadmap) {
    set({ roadmap });
  },

  findPhase(phaseId) {
    return get().roadmap.phases.find(p => p.id === phaseId);
  },

  findMonth(monthId) {
    for (const p of get().roadmap.phases) {
      const m = p.months.find(x => x.id === monthId);
      if (m) return m;
    }
    return undefined;
  },

  findFocus(focusId) {
    for (const p of get().roadmap.phases) {
      for (const m of p.months) {
        const f = m.focuses.find(x => x.id === focusId);
        if (f) return f;
      }
    }
    return undefined;
  },

  findTopic(topicId) {
    for (const p of get().roadmap.phases) {
      for (const m of p.months) {
        for (const f of m.focuses) {
          const t = f.topics.find(x => x.id === topicId);
          if (t) return t;
        }
      }
    }
    return undefined;
  },

  getAllTopics() {
    return get().roadmap.phases.flatMap(p =>
      p.months.flatMap(m => m.focuses.flatMap(f => f.topics)),
    );
  },

  getAllFocuses() {
    return get().roadmap.phases.flatMap(p =>
      p.months.flatMap(m => m.focuses),
    );
  },

  getAllMonths() {
    return get().roadmap.phases.flatMap(p => p.months);
  },
}));

/**
 * Convenience non-reactive getter — use in helpers/utils that need the
 * current roadmap but shouldn't subscribe to the store (e.g. progress calcs
 * called from inside other stores).
 */
export function getRoadmap(): RoadmapData {
  return useRoadmapStore.getState().roadmap;
}

/** Serve as a hook-free alias for legacy code that imported the constant. */
export { type RoadmapData } from '../types';

/** Reactive hook for components. */
export function useRoadmap(): RoadmapData {
  return useRoadmapStore(s => s.roadmap);
}

/** Reactive milestones hook — derived from the roadmap store. */
export function useMilestones(): Milestone[] {
  return useRoadmapStore(s => s.roadmap.milestones);
}
