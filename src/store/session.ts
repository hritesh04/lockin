import { create } from 'zustand';

export interface Option {
  id: string;
  question_id:string;
  index: number;
  label: string;
  explanation:string;
  is_correct: boolean;
}

export interface Question {
  id: string;
  format: 'mcq' | 'true_false' | 'text' | 'speech';
  question: string;
  options: Option[];
  answer: string;
  explanation: string;
}

interface SessionState {
  activeSessionId: string | null;
  questions: Question[];
  currentIndex: number;
  score: number;
  isCompleted: boolean;
  startSession: (sessionId: string, questions: Question[]) => void;
  submitAnswer: (isCorrect: boolean) => void;
  nextQuestion: () => void;
  resetSession: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  activeSessionId: null,
  questions: [],
  currentIndex: 0,
  score: 0,
  isCompleted: false,

  startSession: (sessionId, questions) => set({
    activeSessionId: sessionId,
    questions,
    currentIndex: 0,
    score: 0,
    isCompleted: false,
  }),

  submitAnswer: (isCorrect) => set((state) => ({
    score: isCorrect ? state.score + 1 : state.score,
  })),

  nextQuestion: () => set((state) => {
    const nextIdx = state.currentIndex + 1;
    if (nextIdx >= state.questions.length) {
      return { isCompleted: true };
    }
    return { currentIndex: nextIdx };
  }),

  resetSession: () => set({
    activeSessionId: null,
    questions: [],
    currentIndex: 0,
    score: 0,
    isCompleted: false,
  })
}));
