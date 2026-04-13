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
  format: 'mcq' | 'true_false' | 'text' | 'short_answer' | 'fill_blank';
  question: string;
  options: Option[];
  answer: string;
  explanation: string;
}

interface UserAnswer {
  question: Question;
  answer: string;
}

interface SessionState {
  activeSessionId: string | null;
  questions: Question[];
  userAnswers: UserAnswer[];
  currentIndex: number;
  score: number;
  isCompleted: boolean;
  startSession: (sessionId: string, questions: Question[]) => void;
  submitAnswer: (answer: string, isCorrect: boolean) => void;
  nextQuestion: () => void;
  resetSession: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  activeSessionId: null,
  questions: [],
  userAnswers: [],
  currentIndex: 0,
  score: 0,
  isCompleted: false,

  startSession: (sessionId, questions) => set({
    activeSessionId: sessionId,
    questions,
    userAnswers: [],
    currentIndex: 0,
    score: 0,
    isCompleted: false,
  }),

  submitAnswer: (answer, isCorrect) => set((state) => {
    const currentQ = state.questions[state.currentIndex];
    return {
      score: isCorrect ? state.score + 1 : state.score,
      userAnswers: [...state.userAnswers, { question: currentQ, answer }],
    };
  }),

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
    userAnswers: [],
    currentIndex: 0,
    score: 0,
    isCompleted: false,
  })
}));
