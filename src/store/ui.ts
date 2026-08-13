import { create } from 'zustand';

interface UIState {
  onAddPress: (() => void) | null;
  setOnAddPress: (cb: (() => void) | null) => void;
  hideBottomNav: boolean;
  setHideBottomNav: (hide: boolean) => void;
  autoOpenAddModal: boolean;
  triggerAutoOpenAddModal: () => void;
  consumeAutoOpenAddModal: () => boolean;
}

export const useUIStore = create<UIState>((set, get) => ({
  onAddPress: null,
  setOnAddPress: (cb) => set({ onAddPress: cb }),
  hideBottomNav: false,
  setHideBottomNav: (hide) => set({ hideBottomNav: hide }),
  autoOpenAddModal: false,
  triggerAutoOpenAddModal: () => set({ autoOpenAddModal: true }),
  consumeAutoOpenAddModal: () => {
    const val = get().autoOpenAddModal;
    if (val) set({ autoOpenAddModal: false });
    return val;
  },
}));
