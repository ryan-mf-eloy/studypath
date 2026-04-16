import { create } from 'zustand';
import type { Subtopic } from '../types';
import { nanoid } from '../lib/utils';
import * as api from '../lib/api';
import { enqueueWrite } from '../lib/serverSync';

interface SubtopicsStore {
  subtopics: Record<string, Subtopic[]>;

  addSubtopic: (topicId: string, label: string) => void;
  removeSubtopic: (topicId: string, subtopicId: string) => void;
  getSubtopics: (topicId: string) => Subtopic[];
}

export const useSubtopicsStore = create<SubtopicsStore>()((set, get) => ({
  subtopics: {},

  addSubtopic(topicId, label) {
    const sub: Subtopic = { id: nanoid('sub'), label, topicId };
    set(s => ({
      subtopics: {
        ...s.subtopics,
        [topicId]: [...(s.subtopics[topicId] ?? []), sub],
      },
    }));
    enqueueWrite(() => api.postSubtopic({ id: sub.id, topicId, label }));
  },

  removeSubtopic(topicId, subtopicId) {
    set(s => ({
      subtopics: {
        ...s.subtopics,
        [topicId]: (s.subtopics[topicId] ?? []).filter(st => st.id !== subtopicId),
      },
    }));
    enqueueWrite(() => api.deleteSubtopic(subtopicId));
  },

  getSubtopics(topicId) {
    return get().subtopics[topicId] ?? [];
  },
}));
