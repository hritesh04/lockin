import { create } from 'zustand';

export interface Module {
  id: string;
  topicId: string;
  index: number;
  title: string;
  description: string;
  status: 'locked' | 'in-progress' | 'completed';
  concept_tags: string[];
}

interface ModuleState {
  modules: Record<string, Module>;
  setModules: (modules: Module[]) => void;
  updateModule: (module: Module) => void;
  getModulesByTopic: (topicId: string) => Module[];
}

export const useModuleStore = create<ModuleState>((set, get) => ({
  modules: {},
  setModules: (modulesList) => set((state) => {
    const newModules = { ...state.modules };
    modulesList.forEach((m) => {
      newModules[m.id] = m;
    });
    return { modules: newModules };
  }),
  updateModule: (m) => set((state) => ({
    modules: { ...state.modules, [m.id]: m }
  })),
  getModulesByTopic: (topicId) => {
    return Object.values(get().modules)
      .filter((m) => m.topicId === topicId)
      .sort((a, b) => a.index - b.index);
  },
}));
