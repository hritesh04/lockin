import { create } from 'zustand';

export interface Topic {
  id: string;
  title: string;
  currentTier: number;
  familiarityLevel: string;
  accuracyPercent: number;
  sessionsCompleted: number;
  weakConcepts: string[];
}

interface TopicsState {
  topics: Topic[];
  addTopic: (topic: Topic) => void;
  updateTopicProgress: (id: string, accuracy: number, sessionsIncrement: number) => void;
  setTopics: (topics: Topic[]) => void;
}

export const useTopicsStore = create<TopicsState>((set) => ({
  topics: [],
  addTopic: (topic) => set((state) => ({ topics: [...state.topics, topic] })),
  updateTopicProgress: (id, accuracy, sessionsIncrement) => set((state) => ({
    topics: state.topics.map(t => t.id === id ? {
      ...t, 
      accuracyPercent: accuracy, 
      sessionsCompleted: t.sessionsCompleted + sessionsIncrement 
    } : t)
  })),
  setTopics: (topics) => set({ topics }),
}));
