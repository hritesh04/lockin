import { create } from 'zustand';

interface AudioState {
  isMuted: boolean;
  toggleMute: () => void;
  setMute: (muted: boolean) => void;
}

export const useAudioStore = create<AudioState>((set) => ({
  isMuted: false,
  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
  setMute: (muted) => set({ isMuted: muted }),
}));
