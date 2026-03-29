import { create } from 'zustand';
import type { ApiUser } from '../lib/api';

interface UserState {
  hasCompletedOnboarding: boolean;
  streakCount: number;
  activityHistory: ('active' | 'inactive')[];
  goal: string | null;
  dailyCommitment: number | null;
  serverUserId: string | null;
  serverName: string | null;
  serverEmail: string | null;
  completeOnboarding: (goal: string, commitment: number) => void;
  incrementStreak: () => void;
  hydrateFromServer: (u: ApiUser) => void;
}

export const useUserStore = create<UserState>((set) => ({
  hasCompletedOnboarding: false,
  streakCount: 0,
  activityHistory: ['active', 'active', 'inactive', 'inactive', 'inactive'],
  goal: null,
  dailyCommitment: null,
  serverUserId: null,
  serverName: null,
  serverEmail: null,
  completeOnboarding: (goal, commitment) => set({ hasCompletedOnboarding: true, goal, dailyCommitment: commitment }),
  incrementStreak: () => set((state) => ({ streakCount: state.streakCount + 1 })),
  hydrateFromServer: (u) =>
    set({
      serverUserId: u.id,
      serverName: u.name,
      serverEmail: u.email,
      streakCount: u.streakCount,
    }),
}));
