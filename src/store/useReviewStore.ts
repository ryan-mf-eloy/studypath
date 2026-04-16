import { create } from 'zustand';
import {
  scheduleNextReview,
  nextStageForResult,
  type ReviewResult,
} from '../lib/srs';
import * as api from '../lib/api';
import { enqueueWrite } from '../lib/serverSync';

export interface ReviewHistoryItem {
  at: string;
  result: ReviewResult;
  stage: number;
}

export interface ReviewEntry {
  topicId: string;
  stage: number;
  nextReviewAt: string;
  lastResult?: ReviewResult;
  history: ReviewHistoryItem[];
  createdAt: string;
}

interface ReviewStore {
  reviews: Record<string, ReviewEntry>;

  scheduleReview: (topicId: string) => void;
  removeReview: (topicId: string) => void;
  recordReview: (topicId: string, result: ReviewResult) => void;

  getDueReviews: (now?: Date) => ReviewEntry[];
  getDueCount: (now?: Date) => number;
  getTotalCount: () => number;
}

export const useReviewStore = create<ReviewStore>()((set, get) => ({
  reviews: {},

  scheduleReview(topicId) {
    const existing = get().reviews[topicId];
    if (existing) return;
    const now = new Date().toISOString();
    const nextReviewAt = scheduleNextReview(0);
    set((s) => ({
      reviews: {
        ...s.reviews,
        [topicId]: {
          topicId,
          stage: 0,
          nextReviewAt,
          history: [],
          createdAt: now,
        },
      },
    }));
    enqueueWrite(() =>
      api.scheduleReview({ topicId, stage: 0, nextReviewAt, createdAt: now }),
    );
  },

  removeReview(topicId) {
    set((s) => {
      if (!s.reviews[topicId]) return s;
      const { [topicId]: _drop, ...rest } = s.reviews;
      void _drop;
      return { reviews: rest };
    });
    enqueueWrite(() => api.deleteReview(topicId));
  },

  recordReview(topicId, result) {
    const entry = get().reviews[topicId];
    if (!entry) return;

    const newStage = nextStageForResult(entry.stage, result);
    const nextReviewAt = scheduleNextReview(newStage);
    const at = new Date().toISOString();

    set((s) => ({
      reviews: {
        ...s.reviews,
        [topicId]: {
          ...entry,
          stage: newStage,
          nextReviewAt,
          lastResult: result,
          history: [...entry.history, { at, result, stage: newStage }],
        },
      },
    }));

    enqueueWrite(() =>
      api.recordReview({ topicId, stage: newStage, nextReviewAt, result }),
    );
  },

  getDueReviews(now = new Date()) {
    const nowMs = now.getTime();
    return Object.values(get().reviews)
      .filter((r) => new Date(r.nextReviewAt).getTime() <= nowMs)
      .sort(
        (a, b) =>
          new Date(a.nextReviewAt).getTime() -
          new Date(b.nextReviewAt).getTime(),
      );
  },

  getDueCount(now = new Date()) {
    return get().getDueReviews(now).length;
  },

  getTotalCount() {
    return Object.keys(get().reviews).length;
  },
}));
