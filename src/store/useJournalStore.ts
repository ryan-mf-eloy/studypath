import { create } from 'zustand';
import { nanoid } from '../lib/utils';
import * as api from '../lib/api';
import { enqueueWrite } from '../lib/serverSync';

export type PaceFeel = 'chill' | 'tight' | 'behind';

export interface WeeklyReflection {
  id: string;
  createdAt: string;
  weekKey: string;
  hardest: string;
  toReview: string[];
  pace: PaceFeel;
  noteToSelf: string;
}

interface JournalStore {
  reflections: WeeklyReflection[];

  addReflection: (entry: Omit<WeeklyReflection, 'id' | 'createdAt'>) => void;
  removeReflection: (id: string) => void;

  getCurrentWeekKey: () => string;
  getCurrentWeekEntry: () => WeeklyReflection | null;
  getRecent: (limit?: number) => WeeklyReflection[];
}

function weekKeyFor(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

export const useJournalStore = create<JournalStore>()((set, get) => ({
  reflections: [],

  addReflection(entry) {
    const full: WeeklyReflection = {
      ...entry,
      id: nanoid('refl'),
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ reflections: [full, ...s.reflections] }));
    enqueueWrite(() => api.postReflection(full));
  },

  removeReflection(id) {
    set((s) => ({ reflections: s.reflections.filter((r) => r.id !== id) }));
    enqueueWrite(() => api.deleteReflection(id));
  },

  getCurrentWeekKey() {
    return weekKeyFor(new Date());
  },

  getCurrentWeekEntry() {
    const key = weekKeyFor(new Date());
    return get().reflections.find((r) => r.weekKey === key) ?? null;
  },

  getRecent(limit = 3) {
    return [...get().reflections]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  },
}));
