import { routineAffiliateLink } from "@/lib/routine/affiliate-link";

export type MissionStep = {
  id: string;
  section: "morning" | "evening";
  title: string;
  category?: string;
  completed?: boolean;
  affiliate_link?: string | null;
  affiliate_product_id?: string | null;
  product_name?: string | null;
};

export type MissionRow = {
  id: string;
  section: "morning" | "evening";
  title: string;
  done: boolean;
  affiliateLink: string | null;
  productName: string | null;
};

/** One row per routine step. Done is the step's own tick, not a second counter. */
export function missionRows(steps: readonly MissionStep[]): MissionRow[] {
  return steps.map((step) => ({
    id: step.id,
    section: step.section,
    title: step.title,
    done: step.completed === true,
    affiliateLink: routineAffiliateLink(step),
    productName: step.product_name?.trim() || null,
  }));
}

/** The routine step that the wash or sunscreen mission represents. */
export function missionStepForQuest<T extends MissionStep>(steps: readonly T[], id: "wash" | "spf"): T | null {
  const morning = steps.filter((step) => step.section === "morning");
  if (id === "spf") return morning.find((step) => (step.category ?? "").toLowerCase() === "spf") ?? null;
  return (
    morning.find((step) => (step.category ?? "").toLowerCase() === "cleanser") ??
    morning.find((step) => (step.category ?? "").toLowerCase() !== "spf") ??
    null
  );
}
