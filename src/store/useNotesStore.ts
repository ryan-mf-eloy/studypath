import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Note } from '../types';
import { nanoid } from '../lib/utils';

type NoteInput = Omit<Note, 'id' | 'createdAt' | 'updatedAt'>;

interface NotesStore {
  notes: Note[];

  addNote: (input: NoteInput) => Note;
  updateNote: (id: string, partial: Partial<NoteInput>) => void;
  deleteNote: (id: string) => void;

  getNoteById: (id: string) => Note | undefined;
  getNotesByTopic: (topicId: string) => Note[];
  getNotesByFocus: (focusId: string) => Note[];
  getNotesBySubject: (subjectTag: string) => Note[];
  getLinkedNotes: () => Note[];
  searchNotes: (query: string) => Note[];
}

export const useNotesStore = create<NotesStore>()(
  persist(
    (set, get) => ({
      notes: [],

      addNote(input) {
        const now  = new Date().toISOString();
        const note: Note = { ...input, id: nanoid('note'), createdAt: now, updatedAt: now };
        set(s => ({ notes: [note, ...s.notes] }));
        return note;
      },

      updateNote(id, partial) {
        set(s => ({
          notes: s.notes.map(n =>
            n.id === id ? { ...n, ...partial, updatedAt: new Date().toISOString() } : n
          ),
        }));
      },

      deleteNote(id) {
        set(s => ({ notes: s.notes.filter(n => n.id !== id) }));
      },

      getNoteById(id) {
        return get().notes.find(n => n.id === id);
      },

      getNotesByTopic(topicId) {
        return get().notes.filter(n => n.topicId === topicId);
      },

      getNotesByFocus(focusId) {
        return get().notes.filter(n => n.focusId === focusId);
      },

      getNotesBySubject(subjectTag) {
        return get().notes.filter(n => n.subjectTag === subjectTag);
      },

      getLinkedNotes() {
        return get().notes.filter(n => n.topicId || n.focusId);
      },

      searchNotes(query) {
        const q = query.toLowerCase().trim();
        if (!q) return get().notes;
        return get().notes.filter(n =>
          n.title.toLowerCase().includes(q) ||
          n.body.toLowerCase().includes(q) ||
          n.subjectTag?.toLowerCase().includes(q)
        );
      },
    }),
    { name: 'studypath-notes' }
  )
);
