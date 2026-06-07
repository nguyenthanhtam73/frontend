import { create } from "zustand";

import { getAccessToken } from "@/lib/auth-token";
import {
  ONBOARDING_GUEST_TRIAL_KEY,
  ONBOARDING_MAX_PHOTOS,
} from "@/lib/onboarding/constants";
import type { OnboardingSkinAnalyzeDTO } from "@/lib/types/onboarding-ai";

/** Primary skin type (self-reported or confirmed from AI). */
export type SkinTypeCard = "dry" | "oily" | "combo" | "normal" | "sensitive" | "prefer_not";
/** Undertone for product shade hints. */
export type SkinUndertone = "cool" | "warm" | "neutral" | "deep" | "fair" | "prefer_not";
export type BudgetTier = "entry" | "mid" | "flexible";
/** Primary skin goal. */
export type SkinGoal = "glow" | "clear_acne" | "barrier" | "anti_aging" | "unsure";
export type SkillMode = "beginner" | "intermediate" | "advanced";

/** Three-step onboarding: analyze (photos + skin) → quickInfo → summary. */
export const ONBOARDING_STEPS = ["analyze", "quickInfo", "summary"] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number];

export type PhotoItem = {
  file: File;
  preview: string;
};

export type OnboardingState = {
  skinType: SkinTypeCard | null;
  undertone: SkinUndertone | null;
  budget: BudgetTier | null;
  goal: SkinGoal | null;
  skillMode: SkillMode | null;
  /** Free text split into body_concerns on submit (comma or newline). */
  bodyConcernsText: string;
  currentRoutineText: string;
  /** Tags from AI + user toggles (stable ids from API). */
  aiConcernTags: string[];
  /** Full response from POST /onboarding/analyze-skin */
  aiSnapshot: OnboardingSkinAnalyzeDTO | null;
  photos: PhotoItem[];
  /** Analyzing facial photos with vision API */
  analyzeStatus: "idle" | "loading" | "error";
  analyzeError: string | null;
  completedAt: string | null;
};

type Store = OnboardingState & {
  setSkinType: (v: SkinTypeCard | null) => void;
  setUndertone: (v: SkinUndertone | null) => void;
  setBudget: (v: BudgetTier | null) => void;
  setGoal: (v: SkinGoal | null) => void;
  setSkillMode: (v: SkillMode | null) => void;
  setBodyConcernsText: (v: string) => void;
  setCurrentRoutineText: (v: string) => void;
  setAiConcernTags: (v: string[]) => void;
  toggleAiConcernTag: (id: string) => void;
  setAiSnapshot: (v: OnboardingSkinAnalyzeDTO | null) => void;
  setPhotos: (items: PhotoItem[]) => void;
  addPhoto: (item: PhotoItem) => void;
  removePhotoAt: (index: number) => void;
  clearPhotos: () => void;
  setAnalyzeStatus: (s: OnboardingState["analyzeStatus"], err?: string | null) => void;
  reset: () => void;
  markComplete: () => void;
  /** Apply AI result to form fields + concern tags */
  applyAiAnalyzeResult: (data: OnboardingSkinAnalyzeDTO) => void;
};

const initial: OnboardingState = {
  skinType: null,
  undertone: null,
  budget: null,
  goal: null,
  skillMode: null,
  bodyConcernsText: "",
  currentRoutineText: "",
  aiConcernTags: [],
  aiSnapshot: null,
  photos: [],
  analyzeStatus: "idle",
  analyzeError: null,
  completedAt: null,
};

const skinSet = new Set<SkinTypeCard>([
  "dry",
  "oily",
  "combo",
  "normal",
  "sensitive",
  "prefer_not",
]);
const undertoneSet = new Set<SkinUndertone>([
  "cool",
  "warm",
  "neutral",
  "deep",
  "fair",
  "prefer_not",
]);
const goalSet = new Set<SkinGoal>(["glow", "clear_acne", "barrier", "anti_aging", "unsure"]);

/** True when a guest has already finished onboarding once on this device. */
export function hasGuestCompletedOnboardingTrial(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(ONBOARDING_GUEST_TRIAL_KEY) === "true";
  } catch {
    return false;
  }
}

/** Persist one-time guest trial flag (logged-in users are not limited). */
export function markGuestOnboardingTrialComplete(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ONBOARDING_GUEST_TRIAL_KEY, "true");
  } catch {
    /* private mode / quota */
  }
}

/** Guest = no JWT; logged-in users may repeat onboarding freely. */
export function isGuestOnboardingBlocked(): boolean {
  if (getAccessToken()) return false;
  return hasGuestCompletedOnboardingTrial();
}

export const useOnboardingStore = create<Store>((set) => ({
  ...initial,
  setSkinType: (skinType) => set({ skinType }),
  setUndertone: (undertone) => set({ undertone }),
  setBudget: (budget) => set({ budget }),
  setGoal: (goal) => set({ goal }),
  setSkillMode: (skillMode) => set({ skillMode }),
  setBodyConcernsText: (bodyConcernsText) => set({ bodyConcernsText }),
  setCurrentRoutineText: (currentRoutineText) => set({ currentRoutineText }),
  setAiConcernTags: (aiConcernTags) => set({ aiConcernTags }),
  toggleAiConcernTag: (id) =>
    set((s) => ({
      aiConcernTags: s.aiConcernTags.includes(id)
        ? s.aiConcernTags.filter((x) => x !== id)
        : [...s.aiConcernTags, id],
    })),
  setAiSnapshot: (aiSnapshot) => set({ aiSnapshot }),
  setPhotos: (photos) => set({ photos }),
  addPhoto: (item) =>
    set((s) => {
      if (s.photos.length >= ONBOARDING_MAX_PHOTOS) return s;
      return {
        photos: [...s.photos, item],
        aiSnapshot: null,
        aiConcernTags: [],
        analyzeStatus: "idle",
        analyzeError: null,
      };
    }),
  removePhotoAt: (index) =>
    set((s) => {
      const next = [...s.photos];
      const [rm] = next.splice(index, 1);
      if (rm?.preview) URL.revokeObjectURL(rm.preview);
      return {
        photos: next,
        aiSnapshot: null,
        aiConcernTags: [],
        analyzeStatus: "idle",
        analyzeError: null,
      };
    }),
  clearPhotos: () =>
    set((s) => {
      s.photos.forEach((p) => URL.revokeObjectURL(p.preview));
      return { photos: [], aiSnapshot: null, analyzeStatus: "idle", analyzeError: null };
    }),
  setAnalyzeStatus: (status, err = null) =>
    set({ analyzeStatus: status, analyzeError: err ?? null }),
  reset: () =>
    set((s) => {
      for (const p of s.photos) {
        if (p.preview) URL.revokeObjectURL(p.preview);
      }
      return initial;
    }),
  markComplete: () => {
    if (!getAccessToken()) {
      markGuestOnboardingTrialComplete();
    }
    set({ completedAt: new Date().toISOString() });
  },
  applyAiAnalyzeResult: (data) =>
    set((s) => {
      const st = skinSet.has(data.skin_type_guess as SkinTypeCard)
        ? (data.skin_type_guess as SkinTypeCard)
        : null;
      const un = undertoneSet.has(data.undertone_guess as SkinUndertone)
        ? (data.undertone_guess as SkinUndertone)
        : null;
      const gl = goalSet.has(data.suggested_goal as SkinGoal)
        ? (data.suggested_goal as SkinGoal)
        : null;
      return {
        aiSnapshot: data,
        aiConcernTags: [...data.concerns],
        skinType: st ?? s.skinType,
        undertone: un ?? s.undertone,
        goal: gl ?? s.goal,
        analyzeStatus: "idle",
        analyzeError: null,
      };
    }),
}));

/** Client-side DaDiary starter routine bullets until API persists SkinProfile. */
export function buildStarterPackBullets(s: OnboardingState): string[] {
  const lines: string[] = [];
  if (s.skillMode === "beginner") {
    lines.push("Nền an toàn: sữa rửa mặt dịu + kem dưỡng ẩm + SPF buổi sáng (kể cả ở nhà gần cửa sổ).");
    lines.push("Một hoạt chất mới / tuần — patch test trước khi full face.");
  } else if (s.skillMode === "intermediate") {
    lines.push("Xen kẽ hoạt chất (VD: BHA/PHA tối) — luôn kẹp cấp ẩm + phục hồi khi da căng.");
    lines.push("Ghi routine 5–7 ngày để nhìn pattern da, không đổi cùng lúc nhiều sản phẩm.");
  } else if (s.skillMode === "advanced") {
    lines.push("Tối ưu tầng (layering) có chủ đích; theo dõi pH và thứ tự acid/retinol.");
    lines.push("So ảnh cùng ánh sáng/góc trước khi kết luận “tiến triển”.");
  }
  if (s.goal && s.goal !== "unsure") {
    lines.push(`Mục tiêu: ${s.goal} — coach AI sẽ ưu tiên giải thích “vì sao” trước “dùng gì”.`);
  }
  return lines.slice(0, 6);
}
