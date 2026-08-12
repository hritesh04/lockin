import { create } from 'zustand';
import {
  completeSession,
  getDueReviews,
  rateReviewCard,
  startReviewSession,
  type ApiReviewCard,
} from '../lib/api';
import { useSessionStore, Question } from './session';

interface ReviewsState {
  dueCards: ApiReviewCard[];
  currentIndex: number;
  ratings: Record<string, number>;
  loading: boolean;
  completed: boolean;
  loadDue: (topicId?: string) => Promise<void>;
  rate: (quality: number) => Promise<void>;
  reset: () => void;
}

function convertReviewCardToQuestion(card: ApiReviewCard): Question {
  return {
    id: card.id,
    format: 'short_answer',
    question: card.prompt,
    options: [],
    answer: card.answer,
    explanation: `Concept: ${card.concept_tags.join(', ')}`,
  };
}

export const useReviewsStore = create<ReviewsState>((set, get) => ({
  dueCards: [],
  currentIndex: 0,
  ratings: {},
  loading: false,
  completed: false,

  loadDue: async (topicId) => {
    set({ loading: true });
    try {
      const cards = await getDueReviews(topicId ? { topic_id: topicId } : {});
      set({ dueCards: cards, currentIndex: 0, ratings: {}, completed: cards.length === 0, loading: false });

      if (cards.length > 0) {
        const questions = cards.map(convertReviewCardToQuestion);
        try {
          const res = await startReviewSession(cards[0].topicId, cards[0].lessonId);
          useSessionStore.getState().startSession({
            sessionId: res.session_id,
            type: 'review',
            topicId: cards[0].topicId,
            topicTitle: undefined,
            lessonId: cards[0].lessonId ?? undefined,
            lessonTitle: undefined,
            questions,
          });
        } catch (e) {
          console.warn(
            'Failed to create review session entry',
            { topicId: cards[0].topicId, lessonId: cards[0].lessonId },
            e
          );
        }
      }
    } catch (e) {
      console.warn('Failed to load due reviews', e);
      set({ loading: false });
    }
  },

  rate: async (quality) => {
    const { dueCards, currentIndex, ratings } = get();
    const card = dueCards[currentIndex];
    if (!card) return;

    set({ ratings: { ...ratings, [card.id]: quality } });

    try {
      await rateReviewCard(card.id, quality);
    } catch (e) {
      console.warn('Failed to rate review card', e);
    }

    const remaining = dueCards.filter((c) => c.id !== card.id);
    if (remaining.length === 0) {
      set({ dueCards: [], currentIndex: 0, completed: true });
      const activeSessionId = useSessionStore.getState().activeSessionId;
      const isServerSession = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        activeSessionId ?? ''
      );
      if (isServerSession) {
        try {
          await completeSession(activeSessionId as string);
        } catch (e) {
          console.warn('Failed to complete review session', e);
        }
      }
      useSessionStore.getState().completeSession();
    } else {
      set({ dueCards: remaining, currentIndex: 0 });
    }
  },

  reset: () => {
    set({ dueCards: [], currentIndex: 0, ratings: {}, completed: false, loading: false });
    useSessionStore.getState().resetSession();
  },
}));
