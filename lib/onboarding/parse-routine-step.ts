import type { LucideIcon } from "lucide-react";
import {
  Droplets,
  FlaskConical,
  Heart,
  Moon,
  Shield,
  Sparkles,
  Sun,
} from "lucide-react";

export type RoutineStepIconKind =
  | "cleanser"
  | "moisturizer"
  | "spf"
  | "serum"
  | "treatment"
  | "repair"
  | "default";

export type ParsedRoutineStep = {
  title: string;
  detail?: string;
  icon: RoutineStepIconKind;
};

const ICON_MAP: Record<RoutineStepIconKind, LucideIcon> = {
  cleanser: Droplets,
  moisturizer: Heart,
  spf: Sun,
  serum: Sparkles,
  treatment: FlaskConical,
  repair: Shield,
  default: Moon,
};

export function routineStepIcon(kind: RoutineStepIconKind): LucideIcon {
  return ICON_MAP[kind] ?? ICON_MAP.default;
}

function inferIcon(text: string): RoutineStepIconKind {
  const lower = text.toLowerCase();
  if (
    /spf|chống nắng|sunscreen|kem chống|broad-spectrum|khoáng spf/.test(lower)
  ) {
    return "spf";
  }
  if (
    /cleanser|rửa mặt|sữa rửa|tẩy trang|cleanse|double cleanse|gel\/bọt|dạng kem/.test(
      lower,
    )
  ) {
    return "cleanser";
  }
  if (
    /serum|essence|toner|vitamin c|bha|pha|retinol|acid|hoạt chất|spot treatment|chấm điều trị|điều trị mụn/.test(
      lower,
    )
  ) {
    return /bha|pha|retinol|acid|spot|chấm|vitamin c|hoạt chất/.test(lower)
      ? "treatment"
      : "serum";
  }
  if (/ceramide|barrier|phục hồi|panthenol|repair|dịu|làm dịu|sleeping mask/.test(lower)) {
    return "repair";
  }
  if (/moistur|dưỡng|kem dưỡng|hydrat|cấp ẩm|occlusive|oil-free/.test(lower)) {
    return "moisturizer";
  }
  return "default";
}

/** Split a routine line into a short title + optional detail for display. */
export function parseRoutineStep(raw: string): ParsedRoutineStep {
  const text = raw.trim();
  if (!text) return { title: "", icon: "default" };

  const splitPatterns = [
    /^(.+?)\s*[—–]\s+(.+)$/,
    /^(.+?)\s+-\s+(.+)$/,
    /^(.+?):\s+(.+)$/,
    /^(.+?)\s+\((.+)\)$/,
  ];

  for (const pattern of splitPatterns) {
    const match = text.match(pattern);
    if (match) {
      const title = match[1].trim();
      const detail = match[2].trim();
      return { title, detail, icon: inferIcon(title + " " + detail) };
    }
  }

  const icon = inferIcon(text);
  const short =
    text.length > 52
      ? text.slice(0, 50).trim() + "…"
      : text;

  return {
    title: short,
    detail: text.length > 52 ? text : undefined,
    icon,
  };
}
