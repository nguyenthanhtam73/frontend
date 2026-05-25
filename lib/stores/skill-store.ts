import { create } from "zustand";
import type { SkillMode } from "./onboarding-store";

/**
 * Mirrors onboarding skill or can be changed in Settings later.
 */
type SkillStore = {
  mode: SkillMode | null;
  setMode: (m: SkillMode | null) => void;
};

export const useSkillStore = create<SkillStore>((set) => ({
  mode: null,
  setMode: (mode) => set({ mode }),
}));
