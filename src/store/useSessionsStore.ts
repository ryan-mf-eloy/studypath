import { create } from 'zustand';
import { nanoid } from '../lib/utils';
import * as api from '../lib/api';
import { enqueueWrite } from '../lib/serverSync';

export interface StudySession {
  id: string;
  topicId?: string;
  focusId?: string;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  plannedMs: number;
  completed: boolean;
}

interface SessionsStore {
  sessions: StudySession[];

  addSession: (session: Omit<StudySession, 'id'>) => void;
  removeSession: (id: string) => void;
  clearAll: () => void;

  getSessionsBetween: (from: Date, to: Date) => StudySession[];
  getTimeOnTopic: (topicId: string) => number;
  getTimeOnFocus: (focusId: string) => number;
  getTimeThisWeek: () => number;
}

export const useSessionsStore = create<SessionsStore>()((set, get) => ({
  sessions: [],

  addSession(session) {
    const full: StudySession = { ...session, id: nanoid('sess') };
    set((s) => ({ sessions: [full, ...s.sessions] }));
    enqueueWrite(() => api.postSession(full));
  },

  removeSession(id) {
    set((s) => ({ sessions: s.sessions.filter((x) => x.id !== id) }));
    enqueueWrite(() => api.deleteSession(id));
  },

  clearAll() {
    set({ sessions: [] });
    enqueueWrite(() => api.clearSessions());
  },

  getSessionsBetween(from, to) {
    const fromMs = from.getTime();
    const toMs = to.getTime();
    return get().sessions.filter((s) => {
      const t = new Date(s.startedAt).getTime();
      return t >= fromMs && t <= toMs;
    });
  },

  getTimeOnTopic(topicId) {
    return get()
      .sessions.filter((s) => s.topicId === topicId)
      .reduce((acc, s) => acc + s.durationMs, 0);
  },

  getTimeOnFocus(focusId) {
    return get()
      .sessions.filter((s) => s.focusId === focusId)
      .reduce((acc, s) => acc + s.durationMs, 0);
  },

  getTimeThisWeek() {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    return get()
      .getSessionsBetween(weekAgo, now)
      .reduce((acc, s) => acc + s.durationMs, 0);
  },
}));
