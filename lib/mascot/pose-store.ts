"use client";

import { create } from "zustand";

import { POSE_HOLD_MS, type StepPose } from "@/lib/mascot/pose";

let poseTimer: ReturnType<typeof setTimeout> | null = null;

type BeDaPoseState = {
  stepPose: StepPose | null;
  sessionHappy: boolean;
  showStepPose: (pose: StepPose) => void;
  clearStepPose: () => void;
  setSessionHappy: (happy: boolean) => void;
};

function clearPoseTimer() {
  if (poseTimer) clearTimeout(poseTimer);
  poseTimer = null;
}

/** Short-lived step pose. A finished AM/PM session clears it and flips happy. */
export const useBeDaPoseStore = create<BeDaPoseState>((set, get) => ({
  stepPose: null,
  sessionHappy: false,
  showStepPose: (pose) => {
    if (get().sessionHappy) return;
    clearPoseTimer();
    set({ stepPose: pose });
    poseTimer = setTimeout(() => {
      poseTimer = null;
      set({ stepPose: null });
    }, POSE_HOLD_MS);
  },
  clearStepPose: () => {
    clearPoseTimer();
    set({ stepPose: null });
  },
  setSessionHappy: (happy) => {
    if (happy) {
      clearPoseTimer();
      set({ sessionHappy: true, stepPose: null });
      return;
    }
    set({ sessionHappy: false });
  },
}));
