import { create } from "zustand";
import type { ApiUser, UserActivityData } from "../lib/api";
import { updateMe } from "../lib/api";

interface UserState {
  hasCompletedOnboarding: boolean;
  hydrated: boolean;
  streakCount: number;
  longestStreak: number;
  activityHistory: UserActivityData[];
  goal: string | null;
  dailyCommitment: number | null;
  serverUserId: string | null;
  serverEmail: string | null;
  completeOnboarding: (goal: string, commitment: number) => Promise<void>;
  incrementStreak: () => void;
  hydrateFromServer: (u: ApiUser) => void;
  setActivityHistory: (history: UserActivityData[]) => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  hasCompletedOnboarding: false,
  hydrated: false,
  streakCount: 0,
  longestStreak: 0,
  activityHistory: [],
  goal: null,
  dailyCommitment: null,
  serverUserId: null,
  serverEmail: null,
  completeOnboarding: async (goal, commitment) => {
    set({ hasCompletedOnboarding: true, goal, dailyCommitment: commitment });
    try {
      const user = await updateMe({
        goal,
        daily_commitment: commitment,
        onboarding_completed: true,
      });
      set({
        hasCompletedOnboarding: user.onboardingCompleted ?? true,
        goal: user.goal ?? goal,
        dailyCommitment: user.dailyCommitment ?? commitment,
      });
    } catch (e) {
      console.warn("Failed to persist onboarding", e);
    }
  },
  incrementStreak: () =>
    set((state) => ({ streakCount: state.streakCount + 1 })),
  hydrateFromServer: (u) =>
    set({
      serverUserId: u.id,
      serverEmail: u.email,
      streakCount: u.currentStreak,
      longestStreak: u.longestStreak,
      goal: u.goal ?? null,
      dailyCommitment: u.dailyCommitment ?? null,
      hasCompletedOnboarding: u.onboardingCompleted ?? false,
      hydrated: true,
    }),
  setActivityHistory: (history) => set({ activityHistory: history }),
}));
