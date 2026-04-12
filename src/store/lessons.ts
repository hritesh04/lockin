import { create } from 'zustand';

export interface Lesson {
  id: string;
  nodeId: string; // This is the module ID
  index: number;
  title: string;
  description: string;
  content: string;
  status: 'locked' | 'in-progress' | 'completed';
  quizzes?: any[];
}

interface LessonState {
  lessons: Record<string, Lesson>;
  setLessons: (lessons: Lesson[]) => void;
  updateLesson: (lesson: Lesson) => void;
  getLessonsByModule: (moduleId: string) => Lesson[];
}

export const useLessonStore = create<LessonState>((set, get) => ({
  lessons: {},
  setLessons: (lessonsList) => set((state) => {
    const newLessons = { ...state.lessons };
    lessonsList.forEach((l) => {
      newLessons[l.id] = l;
    });
    return { lessons: newLessons };
  }),
  updateLesson: (l) => set((state) => ({
    lessons: { ...state.lessons, [l.id]: l }
  })),
  getLessonsByModule: (moduleId) => {
    return Object.values(get().lessons)
      .filter((l) => l.nodeId === moduleId)
      .sort((a, b) => a.index - b.index);
  },
}));
