import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * Privacy preferences for face-photo flows (Onboarding + Daily Check-in).
 *
 * Persisted in `localStorage` so that a user who has already accepted the
 * transparency notice doesn't get nagged on every photo step, and a user who
 * picked "I don't want to take a face photo" stays in tag-only mode across
 * sessions until they change their mind in Settings.
 */
export type PrivacyState = {
  /**
   * Has the user acknowledged the privacy notice (auto-blur + no original
   * stored + delete-anytime) at least once? Re-asking on every photo step
   * is hostile UX; the consent dialog stays a tap away from the photo
   * controls and from the Privacy section in Settings if they want to
   * read it again.
   */
  consentAcknowledged: boolean;
  /** ISO timestamp of the most recent acknowledgement (for the Settings UI). */
  consentAcknowledgedAt: string | null;
  /**
   * User opted out of face capture entirely. When true, both flows fall back
   * to text + tag input — onboarding skips photo + AI review steps; daily
   * check-in still works without an image.
   */
  skipFaceCapture: boolean;
  /** Counter for "delete all data" — bumped after successful deletes. */
  dataResetAt: string | null;
};

type Actions = {
  acknowledgeConsent: () => void;
  withdrawConsent: () => void;
  setSkipFaceCapture: (skip: boolean) => void;
  markDataReset: () => void;
  reset: () => void;
};

const initialState: PrivacyState = {
  consentAcknowledged: false,
  consentAcknowledgedAt: null,
  skipFaceCapture: false,
  dataResetAt: null,
};

export const usePrivacyStore = create<PrivacyState & Actions>()(
  persist(
    (set) => ({
      ...initialState,
      acknowledgeConsent: () =>
        set({
          consentAcknowledged: true,
          consentAcknowledgedAt: new Date().toISOString(),
        }),
      withdrawConsent: () =>
        set({
          consentAcknowledged: false,
          consentAcknowledgedAt: null,
        }),
      setSkipFaceCapture: (skipFaceCapture) => set({ skipFaceCapture }),
      markDataReset: () => set({ dataResetAt: new Date().toISOString() }),
      reset: () => set({ ...initialState }),
    }),
    {
      name: "dadiary:privacy",
      version: 1,
      storage: createJSONStorage(() => {
        if (typeof window === "undefined") {
          return {
            getItem: () => null,
            setItem: () => undefined,
            removeItem: () => undefined,
          };
        }
        return localStorage;
      }),
      // Only persist user-visible preferences; transient state (if any
      // gets added later) should be excluded here so SSR + private mode
      // remain happy.
      partialize: (state) => ({
        consentAcknowledged: state.consentAcknowledged,
        consentAcknowledgedAt: state.consentAcknowledgedAt,
        skipFaceCapture: state.skipFaceCapture,
        dataResetAt: state.dataResetAt,
      }),
    },
  ),
);
