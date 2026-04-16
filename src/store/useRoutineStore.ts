import { create } from 'zustand';
import type {
  RoutineSlot,
  RoutineOverride,
  DayOfWeek,
} from '../types';
import { nanoid } from '../lib/utils';
import * as api from '../lib/api';
import { enqueueWrite } from '../lib/serverSync';

type SlotCreateInput = {
  dayOfWeek: DayOfWeek;
  startTime: string;
  durationMin: number;
  label?: string;
  focusId?: string;
  topicId?: string;
  subtopicId?: string;
  color?: string;
  meetingUrl?: string;
  active?: boolean;
  position?: number;
};

type SlotPatch = Partial<{
  dayOfWeek: DayOfWeek;
  startTime: string;
  durationMin: number;
  label: string | null;
  focusId: string | null;
  topicId: string | null;
  subtopicId: string | null;
  color: string | null;
  meetingUrl: string | null;
  active: boolean;
  position: number;
}>;

/**
 * Merge a server-canonical slot back into the store. Called after create/update
 * writes succeed so the optimistic state is always reconciled with the database.
 * If the slot is no longer in the store (e.g. deleted between enqueue and flush),
 * this is a no-op — we don't want to resurrect deleted rows.
 */
function reconcileSlot(canonical: RoutineSlot) {
  useRoutineStore.setState(s => ({
    slots: s.slots.map(slot => (slot.id === canonical.id ? canonical : slot)),
  }));
}

function reconcileOverride(canonical: RoutineOverride) {
  useRoutineStore.setState(s => {
    const exists = s.overrides.some(o => o.id === canonical.id);
    return {
      overrides: exists
        ? s.overrides.map(o => (o.id === canonical.id ? canonical : o))
        : [...s.overrides, canonical],
    };
  });
}

interface RoutineStore {
  slots: RoutineSlot[];
  overrides: RoutineOverride[];

  addSlot: (input: SlotCreateInput) => RoutineSlot;
  updateSlot: (id: string, patch: SlotPatch) => void;
  removeSlot: (id: string) => void;

  skipSlot: (slotId: string, date: string) => void;
  rescheduleSlot: (
    slotId: string,
    date: string,
    newDate: string,
    newStartTime: string,
  ) => void;
  undoOverride: (overrideId: string) => void;
  getOverrideFor: (slotId: string, date: string) => RoutineOverride | null;
}

export const useRoutineStore = create<RoutineStore>()((set, get) => ({
  slots: [],
  overrides: [],

  addSlot(input) {
    const now = new Date().toISOString();
    const slot: RoutineSlot = {
      id: nanoid('slot'),
      dayOfWeek: input.dayOfWeek,
      startTime: input.startTime,
      durationMin: input.durationMin,
      label: input.label,
      focusId: input.focusId,
      topicId: input.topicId,
      subtopicId: input.subtopicId,
      color: input.color,
      meetingUrl: input.meetingUrl,
      active: input.active ?? true,
      position: input.position ?? 0,
      createdAt: now,
      updatedAt: now,
    };
    set(s => ({ slots: [...s.slots, slot] }));
    enqueueWrite(async () => {
      const result = await api.createRoutineSlot({
        id: slot.id,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        durationMin: slot.durationMin,
        label: slot.label,
        focusId: slot.focusId,
        topicId: slot.topicId,
        subtopicId: slot.subtopicId,
        color: slot.color,
        meetingUrl: slot.meetingUrl,
        active: slot.active,
        position: slot.position,
      });
      reconcileSlot(result.slot);
    });
    return slot;
  },

  updateSlot(id, patch) {
    // Imperative, field-by-field merge. Avoids the conditional-spread pattern
    // so it's obvious exactly what each case does.
    set(s => ({
      slots: s.slots.map(slot => {
        if (slot.id !== id) return slot;
        const next: RoutineSlot = { ...slot };
        if (patch.dayOfWeek !== undefined) next.dayOfWeek = patch.dayOfWeek;
        if (patch.startTime !== undefined) next.startTime = patch.startTime;
        if (patch.durationMin !== undefined) next.durationMin = patch.durationMin;
        if (patch.label !== undefined) next.label = patch.label ?? undefined;
        if (patch.focusId !== undefined) next.focusId = patch.focusId ?? undefined;
        if (patch.topicId !== undefined) next.topicId = patch.topicId ?? undefined;
        if (patch.subtopicId !== undefined) next.subtopicId = patch.subtopicId ?? undefined;
        if (patch.color !== undefined) next.color = patch.color ?? undefined;
        if (patch.meetingUrl !== undefined) next.meetingUrl = patch.meetingUrl ?? undefined;
        if (patch.active !== undefined) next.active = patch.active;
        if (patch.position !== undefined) next.position = patch.position;
        next.updatedAt = new Date().toISOString();
        return next;
      }),
    }));
    enqueueWrite(async () => {
      const result = await api.updateRoutineSlot(id, patch);
      // Reconcile with server truth. Only fields the server actually changed
      // flow back — fields not in the patch are preserved by the server.
      reconcileSlot(result.slot);
    });
  },

  removeSlot(id) {
    set(s => ({
      slots: s.slots.filter(slot => slot.id !== id),
      overrides: s.overrides.filter(o => o.slotId !== id),
    }));
    enqueueWrite(() => api.deleteRoutineSlot(id));
  },

  skipSlot(slotId, date) {
    const existing = get().overrides.find(o => o.slotId === slotId && o.date === date);
    const override: RoutineOverride = {
      id: existing?.id ?? nanoid('ovr'),
      slotId,
      date,
      kind: 'skip',
      createdAt: new Date().toISOString(),
    };
    set(s => ({
      overrides: existing
        ? s.overrides.map(o => (o.id === existing.id ? override : o))
        : [...s.overrides, override],
    }));
    enqueueWrite(async () => {
      const result = await api.createRoutineOverride({
        id: override.id,
        slotId: override.slotId,
        date: override.date,
        kind: 'skip',
      });
      reconcileOverride(result.override);
    });
  },

  rescheduleSlot(slotId, date, newDate, newStartTime) {
    const existing = get().overrides.find(o => o.slotId === slotId && o.date === date);
    const override: RoutineOverride = {
      id: existing?.id ?? nanoid('ovr'),
      slotId,
      date,
      kind: 'reschedule',
      newDate,
      newStartTime,
      createdAt: new Date().toISOString(),
    };
    set(s => ({
      overrides: existing
        ? s.overrides.map(o => (o.id === existing.id ? override : o))
        : [...s.overrides, override],
    }));
    enqueueWrite(async () => {
      const result = await api.createRoutineOverride({
        id: override.id,
        slotId: override.slotId,
        date: override.date,
        kind: 'reschedule',
        newDate,
        newStartTime,
      });
      reconcileOverride(result.override);
    });
  },

  undoOverride(overrideId) {
    set(s => ({ overrides: s.overrides.filter(o => o.id !== overrideId) }));
    enqueueWrite(() => api.deleteRoutineOverride(overrideId));
  },

  getOverrideFor(slotId, date) {
    return get().overrides.find(o => o.slotId === slotId && o.date === date) ?? null;
  },
}));
