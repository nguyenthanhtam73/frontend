import { inferCategory } from "@/components/check-in/routine-hint-parser";
import { parseOnboardingSnapshot } from "@/lib/onboarding/snapshot";
import type { SkinProfileResponse } from "@/lib/types/profile";
import {
  normalizeCategory,
  type RoutineCategory,
  type RoutineStepDTO,
} from "@/lib/types/routine";
import type { WardrobeProductDTO } from "@/lib/types/wardrobe";

export type StepPeriod = "morning" | "evening";

export type StepSkinKind = "oily" | "dry" | "sensitive" | "default";

export type ResolvedStepDetails = {
  how_to: string;
  dose: string;
  /** One easy sentence: purpose of this step (not a diagnosis). */
  why: string;
  /** Cabinet product label when a shelf item maps to this step. */
  productLabel?: string;
};

const SKIN_ALIASES: Record<string, StepSkinKind> = {
  oily: "oily",
  oil: "oily",
  da_dau: "oily",
  "da dầu": "oily",
  dry: "dry",
  da_kho: "dry",
  "da khô": "dry",
  sensitive: "sensitive",
  da_nhay: "sensitive",
  "da nhạy": "sensitive",
  "da nhạy cảm": "sensitive",
};

export function normalizeStepSkin(raw: string | null | undefined): StepSkinKind {
  const key = (raw ?? "").trim().toLowerCase();
  if (!key || key === "prefer_not" || key === "unspecified") return "default";
  return SKIN_ALIASES[key] ?? "default";
}

/** Profile → onboarding snapshot / photo analysis → explicit skin_type. */
export function skinTypeFromProfile(
  profile: SkinProfileResponse | null | undefined,
): string | undefined {
  const direct = profile?.skin_type?.trim();
  if (direct) return direct;
  const snap = parseOnboardingSnapshot(profile?.onboarding_snapshot);
  const fromSnap = snap?.skin_type?.trim();
  if (fromSnap) return fromSnap;
  const analysis = snap?.skin_analysis;
  if (analysis && typeof analysis === "object") {
    const rec = analysis as Record<string, unknown>;
    for (const key of ["overall_skin_type", "skin_type_guess", "skin_type"] as const) {
      const v = rec[key];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
  }
  return undefined;
}

export function resolveStepCategory(step: Pick<RoutineStepDTO, "title" | "category">): RoutineCategory {
  const explicit = (step.category ?? "").trim();
  if (explicit && explicit.toLowerCase() !== "other") {
    return normalizeCategory(explicit);
  }
  return inferCategory(step.title ?? "");
}

type TechniqueSeed = { how_to: string; dose: string };
type Seed = TechniqueSeed & { why: string };

function cleanserSeed(skin: StepSkinKind, period: StepPeriod, en: boolean): TechniqueSeed {
  if (period === "evening") {
    if (en) {
      return {
        how_to:
          skin === "dry"
            ? "Remove sunscreen or makeup first, then a gentle wash with lukewarm water. Pat dry — skin should not feel tight."
            : "Remove sunscreen or makeup first, then massage cleanser ~60 seconds and rinse cool. Don’t scrub.",
        dose: skin === "dry" ? "pea-size" : "1–2 pump",
      };
    }
    return {
      how_to:
        skin === "dry"
          ? "Gỡ kem chống nắng/makeup trước, rồi rửa nhẹ với nước ấm. Thấm khô — da xong không nên căng."
          : "Gỡ kem chống nắng/makeup trước, massage sữa rửa khoảng 60 giây, rồi xả nước mát. Đừng chà mạnh.",
      dose: skin === "dry" ? "hạt đậu" : "1–2 pump",
    };
  }

  if (skin === "oily") {
    return en
      ? {
          how_to: "Warm water → gel cleanser → about 60 seconds → cool rinse. Don’t scrub hard.",
          dose: "1–2 pump",
        }
      : {
          how_to: "Nước ấm → sữa rửa gel → khoảng 60 giây → xả mát. Đừng chà mạnh.",
          dose: "1–2 pump",
        };
  }
  if (skin === "dry") {
    return en
      ? {
          how_to: "Lukewarm (not hot) water, cream cleanser ~30–60 seconds, cool rinse. Stop if skin feels tight.",
          dose: "pea-size",
        }
      : {
          how_to: "Nước ấm (không nóng) → sữa rửa dạng kem → khoảng 30–60 giây → xả mát. Da xong không nên căng.",
          dose: "hạt đậu",
        };
  }
  if (skin === "sensitive") {
    return en
      ? {
          how_to: "Lukewarm water is enough — press gently, no scrubbing, then rinse well and pat dry.",
          dose: "1 pump",
        }
      : {
          how_to: "Nước ấm là đủ — miết nhẹ, không chà. Xả sạch rồi thấm khô.",
          dose: "1 pump",
        };
  }
  return en
    ? {
        how_to: "Warm water → cleanser → about 60 seconds → cool rinse. Don’t scrub hard.",
        dose: "1–2 pump",
      }
    : {
        how_to: "Nước ấm → sữa rửa → khoảng 60 giây → xả mát. Đừng chà mạnh.",
        dose: "1–2 pump",
      };
}

function moisturizerSeed(skin: StepSkinKind, period: StepPeriod, en: boolean): TechniqueSeed {
  if (en) {
    if (skin === "oily") {
      return {
        how_to:
          period === "evening"
            ? "A thin oil-free layer while skin is slightly damp. Enough comfort, not a heavy coat."
            : "A thin oil-free layer right after washing while skin is still a bit damp.",
        dose: "1 pump",
      };
    }
    if (skin === "dry") {
      return {
        how_to: "Apply right after washing while skin is still a bit damp so it absorbs better.",
        dose: "1–2 pump",
      };
    }
    if (skin === "sensitive") {
      return {
        how_to: "A short-formula cream, thin layer on the face. Skip if it stings.",
        dose: "pea-size",
      };
    }
    return {
      how_to: "Apply right after washing while skin is still a bit damp so it absorbs better.",
      dose: "1 pump",
    };
  }
  if (skin === "oily") {
    return {
      how_to:
        period === "evening"
          ? "Một lớp mỏng không dầu lúc da còn hơi ẩm. Đủ êm, không phủ dày."
          : "Một lớp mỏng không dầu ngay sau rửa, lúc da còn hơi ẩm.",
      dose: "1 pump",
    };
  }
  if (skin === "dry") {
    return {
      how_to: "Thoa ngay sau rửa, lúc da còn ẩm một chút để kem thấm tốt hơn.",
      dose: "1–2 pump",
    };
  }
  if (skin === "sensitive") {
    return {
      how_to: "Kem tối giản, lớp mỏng trên mặt. Bỏ qua nếu đang rát.",
      dose: "hạt đậu",
    };
  }
  return {
    how_to: "Thoa ngay sau rửa, lúc da còn ẩm một chút để kem thấm tốt hơn.",
    dose: "1 pump",
  };
}

/** One easy purpose sentence. Not a diagnosis or cure claim. */
function whyForCategory(
  category: RoutineCategory,
  skin: StepSkinKind,
  period: StepPeriod,
  en: boolean,
): string {
  switch (category) {
    case "cleanser":
      return cleanserWhy(skin, period, en);
    case "moisturizer":
      return moisturizerWhy(skin, period, en);
    case "spf":
      return en
        ? "Morning sunscreen helps limit new dark marks — window light at home counts too."
        : "Kem chống nắng buổi sáng giúp hạn chế thâm mới — kể cả nắng cửa sổ trong nhà.";
    case "toner":
      return tonerWhy(skin, en);
    case "serum":
      return serumWhy(skin, en);
    case "treatment":
      return en
        ? "Optional at night — support for this step, not a medical treatment. Skip if skin stings."
        : "Tuỳ chọn buổi tối — hỗ trợ bước này, không phải điều trị y khoa. Bỏ qua nếu da đang rát.";
    case "eye":
      return en
        ? "A tiny amount for the thin skin around the eyes — don’t drag."
        : "Lượng rất nhỏ cho vùng mắt mỏng — đừng kéo da.";
    case "mask":
      return en
        ? "An extra rest step when you have time — not a medical treatment."
        : "Bước thêm khi da cần nghỉ — không phải điều trị y khoa.";
    default:
      return en
        ? "Supports this step as the product label describes."
        : "Hỗ trợ bước này theo hướng dẫn trên sản phẩm.";
  }
}

function cleanserWhy(skin: StepSkinKind, period: StepPeriod, en: boolean): string {
  if (period === "evening") {
    if (skin === "dry") {
      return en
        ? "Gently take off sunscreen so skin isn’t tight before you moisturize."
        : "Gỡ kem chống nắng nhẹ nhàng để da không căng trước khi dưỡng.";
    }
    return en
      ? "Take off sunscreen and the day’s dirt so later steps sit on clean skin."
      : "Gỡ kem chống nắng và bụi trong ngày để bước sau thấm trên da sạch.";
  }
  if (skin === "oily") {
    return en
      ? "Wash off oil and dust so later steps sit evenly — not to strip the face."
      : "Rửa để gỡ dầu và bụi, giúp bước sau thấm đều — không phải để ‘tẩy sạch’ da.";
  }
  if (skin === "dry") {
    return en
      ? "A gentle wash so skin is clean without feeling tight."
      : "Rửa dịu để sạch nhẹ mà da không bị căng.";
  }
  if (skin === "sensitive") {
    return en
      ? "A light wash to clear dust without rubbing reactive skin."
      : "Rửa nhẹ để sạch bụi, không chà lên da đang nhạy.";
  }
  return en
    ? "Clear dust from the face before you moisturize."
    : "Rửa để sạch bụi trên mặt trước khi dưỡng.";
}

function moisturizerWhy(skin: StepSkinKind, period: StepPeriod, en: boolean): string {
  if (skin === "oily") {
    return period === "evening"
      ? en
        ? "A light layer so skin stays comfortable overnight without feeling greasy."
        : "Một lớp mỏng để da êm qua đêm, không bí dầu."
      : en
        ? "A thin layer so skin stays comfortable after washing, without extra shine."
        : "Lớp mỏng để da êm sau rửa, không thêm nhờn.";
  }
  if (skin === "dry") {
    return en
      ? "Hold moisture after washing so skin feels less tight."
      : "Giữ ẩm sau rửa để da đỡ khô căng.";
  }
  if (skin === "sensitive") {
    return en
      ? "Keep skin comfortable after washing — skip if it stings."
      : "Giữ da êm sau rửa — bỏ qua nếu đang rát.";
  }
  return period === "evening"
    ? en
      ? "Keep skin comfortable overnight after washing."
      : "Giữ da êm qua đêm sau khi rửa."
    : en
      ? "Keep skin comfortable after washing, before sunscreen."
      : "Giữ da êm sau rửa, trước kem chống nắng.";
}

function tonerWhy(skin: StepSkinKind, en: boolean): string {
  if (skin === "oily") {
    return en
      ? "Helps the face feel less oily after washing so moisturizer sits better."
      : "Giúp mặt bớt nhờn sau rửa, kem dưỡng thấm dễ hơn.";
  }
  if (skin === "dry") {
    return en
      ? "A light sip of moisture after washing so cream absorbs more easily."
      : "Thêm ẩm nhẹ sau rửa, giúp kem dưỡng thấm dễ hơn.";
  }
  if (skin === "sensitive") {
    return en
      ? "A calm pat after washing — skip if skin is stinging."
      : "Vỗ nhẹ sau rửa — bỏ qua nếu da đang rát.";
  }
  return en
    ? "Preps clean skin so moisturizer absorbs more easily."
    : "Chuẩn bị da sạch, giúp kem dưỡng thấm dễ hơn.";
}

function serumWhy(skin: StepSkinKind, en: boolean): string {
  if (skin === "oily") {
    return en
      ? "A focused thin layer before cream — one serum at a time is enough."
      : "Dưỡng mỏng, tập trung trước kem — một serum một lần là đủ.";
  }
  if (skin === "dry") {
    return en
      ? "Adds extra comfort before moisturizer on dry-feeling skin."
      : "Thêm dưỡng trước kem khi da dễ khô.";
  }
  if (skin === "sensitive") {
    return en
      ? "A light leave-on before cream — skip if it stings."
      : "Dưỡng nhẹ trước kem — bỏ qua nếu da đang rát.";
  }
  return en
    ? "A focused leave-on before moisturizer."
    : "Bổ sung dưỡng chất tập trung trước kem dưỡng.";
}

function seedForCategory(
  category: RoutineCategory,
  skin: StepSkinKind,
  period: StepPeriod,
  en: boolean,
): Seed {
  const why = whyForCategory(category, skin, period, en);
  switch (category) {
    case "cleanser":
      return { ...cleanserSeed(skin, period, en), why };
    case "moisturizer":
      return { ...moisturizerSeed(skin, period, en), why };
    case "spf":
      return en
        ? {
            how_to:
              "Last morning step — cover face and neck. Window light at home can still darken marks.",
            dose: "2 finger-lengths",
            why,
          }
        : {
            how_to:
              "Bước cuối buổi sáng — phủ đều mặt và cổ. Nắng cửa sổ trong nhà vẫn có thể làm thâm.",
            dose: "2 ngón tay",
            why,
          };
    case "toner":
      return en
        ? {
            how_to: "Pat onto clean skin — don’t rub. Wait a moment, then moisturizer.",
            dose: "2–3 drops",
            why,
          }
        : {
            how_to: "Vỗ nhẹ lên da sạch — đừng chà. Chờ thấm rồi tới bước dưỡng.",
            dose: "2–3 giọt",
            why,
          };
    case "serum":
      return en
        ? {
            how_to: "A few drops on damp skin; pat in. One serum at a time is enough.",
            dose: "3–4 drops",
            why,
          }
        : {
            how_to: "Vài giọt lúc da còn hơi ẩm, vỗ nhẹ. Một serum một lần là đủ.",
            dose: "3–4 giọt",
            why,
          };
    case "treatment":
      return en
        ? {
            how_to:
              "At most one treatment at night, on a small area. Skip if skin stings. Not medical advice.",
            dose: "thin layer",
            why,
          }
        : {
            how_to:
              "Tối đa một sản phẩm trị mỗi đêm, vùng nhỏ. Bỏ qua nếu da đang rát. Không phải lời khuyên y khoa.",
            dose: "lớp mỏng",
            why,
          };
    case "eye":
      return en
        ? {
            how_to: "Tap a tiny amount along the orbital bone — don’t drag the skin.",
            dose: "rice-grain / eye",
            why,
          }
        : {
            how_to: "Chấm ít dọc xương ổ mắt — đừng kéo da.",
            dose: "hạt gạo / mắt",
            why,
          };
    case "mask":
      return en
        ? {
            how_to: "A thin layer on clean skin; follow the product’s time. Not a medical treatment.",
            dose: "1 thin layer",
            why,
          }
        : {
            how_to: "Một lớp mỏng trên da sạch; giữ đúng thời gian ghi trên sản phẩm. Không phải điều trị y khoa.",
            dose: "1 lớp mỏng",
            why,
          };
    default:
      return en
        ? {
            how_to: "Use a small amount as the product label describes. Stop if it stings.",
            dose: "as labelled",
            why,
          }
        : {
            how_to: "Dùng lượng nhỏ theo hướng dẫn trên sản phẩm. Ngưng nếu da rát.",
            dose: "theo nhãn",
            why,
          };
  }
}

export function seedStepDetails(
  step: Pick<RoutineStepDTO, "title" | "category" | "how_to" | "dose" | "why">,
  opts: {
    period: StepPeriod;
    skinType?: string | null;
    locale?: string;
  },
): { how_to: string; dose: string; why: string; category: RoutineCategory } {
  const en = (opts.locale ?? "vi").toLowerCase().startsWith("en");
  const category = resolveStepCategory(step);
  const seeded = seedForCategory(category, normalizeStepSkin(opts.skinType), opts.period, en);
  return {
    category,
    how_to: step.how_to?.trim() || seeded.how_to,
    dose: step.dose?.trim() || seeded.dose,
    why: step.why?.trim() || seeded.why,
  };
}

export function formatCabinetLabel(product: Pick<WardrobeProductDTO, "name" | "brand">): string {
  const name = product.name.trim();
  const brand = product.brand?.trim();
  if (brand && name && !name.toLowerCase().startsWith(brand.toLowerCase())) {
    return `${brand} · ${name}`;
  }
  return name;
}

function productCategory(product: WardrobeProductDTO): RoutineCategory {
  const explicit = normalizeCategory(product.category);
  if (explicit !== "other") return explicit;
  return inferCategory(`${product.brand ?? ""} ${product.name}`);
}

function titleMentions(title: string, product: WardrobeProductDTO): boolean {
  const t = title.toLowerCase();
  if (!t) return false;
  const name = product.name.trim().toLowerCase();
  const brand = product.brand?.trim().toLowerCase() ?? "";
  if (name.length >= 3 && t.includes(name)) return true;
  if (brand.length >= 3 && t.includes(brand) && name && t.includes(name.split(/\s+/)[0] ?? "")) {
    return true;
  }
  return false;
}

function pickCabinetProduct(
  category: RoutineCategory,
  title: string,
  products: WardrobeProductDTO[],
  used: Set<string>,
): WardrobeProductDTO | undefined {
  const unused = products.filter((p) => !used.has(p.id));
  if (!unused.length) return undefined;

  const named = unused.find((p) => titleMentions(title, p));
  if (named) return named;

  if (category === "other") return undefined;
  return unused.find((p) => productCategory(p) === category);
}

/** Map at most one unused cabinet product per step within a period. AM/PM may share a product. */
export function mapCabinetProducts(
  morning: RoutineStepDTO[],
  evening: RoutineStepDTO[],
  products: WardrobeProductDTO[],
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!products.length) return out;

  const assign = (steps: RoutineStepDTO[]) => {
    const used = new Set<string>();
    for (const step of steps) {
      if (!step.title.trim() && resolveStepCategory(step) === "other") continue;
      const category = resolveStepCategory(step);
      const match = pickCabinetProduct(category, step.title, products, used);
      if (!match) continue;
      used.add(match.id);
      out[step.id] = formatCabinetLabel(match);
    }
  };

  assign(morning);
  assign(evening);
  return out;
}

export function resolveStepDetails(
  step: RoutineStepDTO,
  opts: {
    period: StepPeriod;
    skinType?: string | null;
    locale?: string;
    productLabel?: string;
  },
): ResolvedStepDetails | null {
  if (!step.title.trim() && resolveStepCategory(step) === "other") return null;
  const seeded = seedStepDetails(step, opts);
  return {
    how_to: seeded.how_to,
    dose: seeded.dose,
    why: seeded.why,
    productLabel: opts.productLabel?.trim() || undefined,
  };
}

