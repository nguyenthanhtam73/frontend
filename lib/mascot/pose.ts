export const STEP_POSES = [
  "cleanser",
  "toner",
  "serum",
  "treatment",
  "moisturizer",
  "spf",
  "eye",
  "mask",
  "other",
] as const;

export type StepPose = (typeof STEP_POSES)[number];

export const POSE_HOLD_MS = 1600;

export function poseForStep(step: { category?: string; title?: string }): StepPose {
  const category = (step.category ?? "").toLowerCase().trim();
  const blob = `${category} ${(step.title ?? "").toLowerCase()}`;
  if (category === "cleanser" || /cleanser|rửa mặt|rua mat|sữa rửa|sua rua/.test(blob)) {
    return "cleanser";
  }
  if (category === "toner" || /toner|hoa hồng|hoa hong/.test(blob)) return "toner";
  if (category === "serum" || /serum|tinh chất|tinh chat/.test(blob)) return "serum";
  if (category === "treatment" || /treatment|điều trị|dieu tri/.test(blob)) return "treatment";
  if (category === "moisturizer" || /moistur|dưỡng ẩm|duong am|kem dưỡng|kem duong/.test(blob)) {
    return "moisturizer";
  }
  if (category === "spf" || /spf|sunscreen|chống nắng|chong nang/.test(blob)) return "spf";
  if (category === "eye" || /\beye\b|mắt|vùng mắt/.test(blob)) return "eye";
  if (category === "mask" || /mask|mặt nạ|mat na/.test(blob)) return "mask";
  if ((STEP_POSES as readonly string[]).includes(category)) return category as StepPose;
  return "other";
}

export function isSessionComplete(steps: { completed?: boolean }[]): boolean {
  return steps.length > 0 && steps.every((step) => !!step.completed);
}

export function streakDotBonus(sessionHappy: boolean, todayAlreadyChecked: boolean): number {
  return sessionHappy && !todayAlreadyChecked ? 1 : 0;
}
