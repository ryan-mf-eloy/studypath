import { create } from 'zustand';
import type { Milestone, MilestoneStatus } from '../types';
import * as api from '../lib/api';
import { enqueueWrite } from '../lib/serverSync';

interface MilestonesStore {
  doneIds: string[];

  toggleDone: (id: string) => void;
  markDone: (id: string) => void;
  markPending: (id: string) => void;
  isDone: (id: string) => boolean;

  getStatus: (milestone: Milestone) => MilestoneStatus;

  reset: () => void;
}

export const useMilestonesStore = create<MilestonesStore>()((set, get) => ({
  doneIds: [],

  toggleDone(id) {
    const wasOn = get().doneIds.includes(id);
    set(s => ({
      doneIds: wasOn ? s.doneIds.filter(x => x !== id) : [...s.doneIds, id],
    }));
    if (wasOn) {
      enqueueWrite(() => api.deleteMilestone(id));
    } else {
      enqueueWrite(() => api.postMilestone(id));
    }
  },

  markDone(id) {
    if (get().doneIds.includes(id)) return;
    set(s => ({ doneIds: [...s.doneIds, id] }));
    enqueueWrite(() => api.postMilestone(id));
  },

  markPending(id) {
    if (!get().doneIds.includes(id)) return;
    set(s => ({ doneIds: s.doneIds.filter(x => x !== id) }));
    enqueueWrite(() => api.deleteMilestone(id));
  },

  isDone(id) {
    return get().doneIds.includes(id);
  },

  getStatus(milestone) {
    if (get().doneIds.includes(milestone.id)) return 'done';
    return milestone.status;
  },

  reset() {
    const ids = get().doneIds;
    set({ doneIds: [] });
    for (const id of ids) {
      enqueueWrite(() => api.deleteMilestone(id));
    }
  },
}));
