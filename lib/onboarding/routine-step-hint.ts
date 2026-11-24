import { parseRoutineStep } from "@/lib/onboarding/parse-routine-step";

/** Subtitle built from the steps that are actually listed. Names keep their own capitals. */
export function routineStepHint(steps: string[], locale: string): string {
  const titles = steps.map((step) => parseRoutineStep(step).title).filter(Boolean);
  if (titles.length === 0) return "";
  if (titles.length === 1) return titles[0]!;
  const en = locale.toLowerCase().startsWith("en");
  const head = titles.slice(0, -1);
  const last = titles[titles.length - 1]!;
  return en ? `${head.join(", ")}, then ${last}` : `${head.join(", ")}, rồi ${last}`;
}
