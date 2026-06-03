import type { OnboardingState } from "@/lib/stores/onboarding-store";

/** Localized starter routine bullets (mirrors onboarding summary). */
export function buildLocalizedStarterLines(
  s: OnboardingState,
  t: (key: string, values?: Record<string, string | number | Date>) => string,
): string[] {
  const lines: string[] = [];
  if (s.aiSnapshot?.coaching_notes) {
    const note = s.aiSnapshot.coaching_notes.trim();
    if (note.length > 220) {
      lines.push(note.slice(0, 217) + "…");
    } else if (note) {
      lines.push(note);
    }
  }
  if (s.skillMode === "beginner") {
    lines.push(t("packLines.skillBeginner0"));
    lines.push(t("packLines.skillBeginner1"));
  } else if (s.skillMode === "intermediate") {
    lines.push(t("packLines.skillIntermediate0"));
    lines.push(t("packLines.skillIntermediate1"));
  } else if (s.skillMode === "advanced") {
    lines.push(t("packLines.skillAdvanced0"));
    lines.push(t("packLines.skillAdvanced1"));
  }
  if (s.goal && s.goal !== "unsure") {
    lines.push(
      t("goalCoachLine", {
        goal: t(`goal.${s.goal}`),
      }),
    );
  }
  if (s.contexts.length) {
    const ctx = s.contexts.map((c) => t(`context.${c}`)).join(", ");
    lines.push(t("contextCoachLine", { contexts: ctx }));
  }
  return lines.slice(0, 6);
}
