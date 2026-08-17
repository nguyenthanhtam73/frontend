import { create } from "zustand";

export type NavigationBlockRegistration = {
  id: string;
  isActive: () => boolean;
  getMessage: () => string;
};

type NavigationBlockState = {
  registrations: Record<string, NavigationBlockRegistration>;
  register: (entry: NavigationBlockRegistration) => void;
  unregister: (id: string) => void;
  getActiveBlock: () => NavigationBlockRegistration | null;
};

export const useNavigationBlockStore = create<NavigationBlockState>((set, get) => ({
  registrations: {},
  register: (entry) =>
    set((state) => ({
      registrations: { ...state.registrations, [entry.id]: entry },
    })),
  unregister: (id) =>
    set((state) => {
      if (!state.registrations[id]) return state;
      const next = { ...state.registrations };
      delete next[id];
      return { registrations: next };
    }),
  getActiveBlock: () => {
    for (const entry of Object.values(get().registrations)) {
      if (entry.isActive()) return entry;
    }
    return null;
  },
}));

/** Sync confirm — returns true when navigation may proceed. */
export function confirmLeaveIfBlocked(): boolean {
  const block = useNavigationBlockStore.getState().getActiveBlock();
  if (!block) return true;
  return window.confirm(block.getMessage());
}
