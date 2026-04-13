import { create } from 'zustand';
import type { ApiUser, UserActivityData } from '../lib/api';

interface UserState {
  hasCompletedOnboarding: boolean;
  streakCount: number;
  longestStreak: number;
  activityHistory: UserActivityData[];
  goal: string | null;
  dailyCommitment: number | null;
  serverUserId: string | null;
  serverEmail: string | null;
  completeOnboarding: (goal: string, commitment: number) => void;
  incrementStreak: () => void;
  hydrateFromServer: (u: ApiUser) => void;
  setActivityHistory: (history: UserActivityData[]) => void;
}

export const useUserStore = create<UserState>((set) => ({
  hasCompletedOnboarding: false,
  streakCount: 0,
  longestStreak: 0,
  activityHistory: [],
  goal: null,
  dailyCommitment: null,
  serverUserId: null,
  serverEmail: null,
  completeOnboarding: (goal, commitment) => set({ hasCompletedOnboarding: true, goal, dailyCommitment: commitment }),
  incrementStreak: () => set((state) => ({ streakCount: state.streakCount + 1 })),
  hydrateFromServer: (u) =>
    set({
      serverUserId: u.id,
      serverEmail: u.email,
      streakCount: u.currentStreak,
      longestStreak: u.longestStreak,
    }),
  setActivityHistory: (history) => set({ activityHistory: history }),
}));
