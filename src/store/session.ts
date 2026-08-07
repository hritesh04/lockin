import { create } from 'zustand';

export interface Option {
  id: string;
  question_id: string;
  index: number;
  label: string;
  explanation: string;
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

export type Confidence = 'low' | 'med' | 'high';

export interface UserAnswer {
  question: Question;
  answer: string;
  confidence?: Confidence;
  isCorrect?: boolean;
}

export type SessionType = 'lesson' | 'mcq' | 'qna' | 'review' | 'diagnostic';

export interface SessionRecord {
  id: string;
  type: SessionType;
  topicId: string;
  topicTitle?: string;
  lessonId?: string;
  lessonTitle?: string;
  startedAt: number;
  endedAt?: number;
  durationMs?: number;
  questionsTotal: number;
  questionsAnswered: number;
  score: number;
  completed: boolean;
}

interface SessionState {
  activeSessionId: string | null;
  activeSessionType: SessionType | null;
  activeTopicId: string | null;
  activeTopicTitle: string | null;
  activeLessonId: string | null;
  activeLessonTitle: string | null;
  questions: Question[];
  userAnswers: UserAnswer[];
  currentIndex: number;
  score: number;
  isCompleted: boolean;
  sessionStartTime: number | null;
  sessionHistory: SessionRecord[];
  startSession: (params: {
    sessionId: string;
    type: SessionType;
    topicId: string;
    topicTitle?: string;
    lessonId?: string;
    lessonTitle?: string;
    questions: Question[];
  }) => void;
  submitAnswer: (answer: string, isCorrect: boolean, confidence?: Confidence) => void;
  nextQuestion: () => void;
  completeSession: () => void;
  resetSession: () => void;
  getCurrentSessionRecord: () => SessionRecord | null;
}

export const useSessionStore = create<SessionState>()(
    (set, get) => ({
      activeSessionId: null,
      activeSessionType: null,
      activeTopicId: null,
      activeTopicTitle: null,
      activeLessonId: null,
      activeLessonTitle: null,
      questions: [],
      userAnswers: [],
      currentIndex: 0,
      score: 0,
      isCompleted: false,
      sessionStartTime: null,
      sessionHistory: [],

      startSession: (params) =>
        set({
          activeSessionId: params.sessionId,
          activeSessionType: params.type,
          activeTopicId: params.topicId,
          activeTopicTitle: params.topicTitle ?? null,
          activeLessonId: params.lessonId ?? null,
          activeLessonTitle: params.lessonTitle ?? null,
          questions: params.questions,
          userAnswers: [],
          currentIndex: 0,
          score: 0,
          isCompleted: false,
          sessionStartTime: Date.now(),
        }),

      submitAnswer: (answer, isCorrect, confidence) =>
        set((state) => {
          const currentQ = state.questions[state.currentIndex];
          return {
            score: isCorrect ? state.score + 1 : state.score,
            userAnswers: [...state.userAnswers, { question: currentQ, answer, confidence, isCorrect }],
          };
        }),

      nextQuestion: () =>
        set((state) => {
          const nextIdx = state.currentIndex + 1;
          if (nextIdx >= state.questions.length) {
            return { isCompleted: true };
          }
          return { currentIndex: nextIdx };
        }),

      completeSession: () =>
        set((state) => {
          const endedAt = Date.now();
          const startedAt = state.sessionStartTime ?? endedAt;
          const record: SessionRecord = {
            id: state.activeSessionId ?? `session-${Date.now()}`,
            type: state.activeSessionType ?? 'lesson',
            topicId: state.activeTopicId ?? '',
            topicTitle: state.activeTopicTitle ?? undefined,
            lessonId: state.activeLessonId ?? undefined,
            lessonTitle: state.activeLessonTitle ?? undefined,
            startedAt,
            endedAt,
            durationMs: endedAt - startedAt,
            questionsTotal: state.questions.length,
            questionsAnswered: state.userAnswers.length,
            score: state.score,
            completed: true,
          };
          return {
            isCompleted: true,
            sessionHistory: [record, ...state.sessionHistory].slice(0, 100),
          };
        }),

      resetSession: () =>
        set({
          activeSessionId: null,
          activeSessionType: null,
          activeTopicId: null,
          activeTopicTitle: null,
          activeLessonId: null,
          activeLessonTitle: null,
          questions: [],
          userAnswers: [],
          currentIndex: 0,
          score: 0,
          isCompleted: false,
          sessionStartTime: null,
        }),

      getCurrentSessionRecord: () => {
        const state = get();
        if (!state.activeSessionId || !state.sessionStartTime) return null;
        const endedAt = Date.now();
        return {
          id: state.activeSessionId,
          type: state.activeSessionType ?? 'lesson',
          topicId: state.activeTopicId ?? '',
          topicTitle: state.activeTopicTitle ?? undefined,
          lessonId: state.activeLessonId ?? undefined,
          lessonTitle: state.activeLessonTitle ?? undefined,
          startedAt: state.sessionStartTime,
          endedAt,
          durationMs: endedAt - state.sessionStartTime,
          questionsTotal: state.questions.length,
          questionsAnswered: state.userAnswers.length,
          score: state.score,
          completed: state.isCompleted,
        };
      },
    })
  );