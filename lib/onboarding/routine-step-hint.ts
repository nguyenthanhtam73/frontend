import { parseRoutineStep } from "@/lib/onboarding/parse-routine-step";

function lowerFirst(text: string): string {
  const chars = Array.from(text);
  if (!chars[0]) return text;
  chars[0] = chars[0].toLocaleLowerCase("vi");
  return chars.join("");
}

/** Subtitle built from the steps that are actually listed. */
export function routineStepHint(steps: string[], locale: string): string {
  const titles = steps.map((step) => parseRoutineStep(step).title).filter(Boolean);
  if (titles.length === 0) return "";
  if (titles.length === 1) return titles[0]!;
  const en = locale.toLowerCase().startsWith("en");
  const later = titles.slice(1).map(lowerFirst);
  const head = [titles[0]!, ...later.slice(0, -1)];
  const last = later[later.length - 1]!;
  return en ? `${head.join(", ")}, then ${last}` : `${head.join(", ")}, rồi ${last}`;
}
