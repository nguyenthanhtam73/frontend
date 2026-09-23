import {
  PRODUCT_INSIGHT_VERSION,
  insightLocale,
  type ProductInsight,
  type ProductInsightActive,
} from "./product-insight";

export type CabinetInsightInput = {
  name: string;
  brand?: string;
  category?: string;
  notes?: string;
  skinType?: string;
  concerns?: string[];
  recentTags?: string[];
  locale: string;
};

type ActiveHit = { id: string; strong: boolean; soothing: boolean };

type Signals = {
  skin: string;
  sensitiveSkin: boolean;
  irritated: boolean;
  irritatedRecent: boolean;
  dry: boolean;
  dryRecent: boolean;
  oily: boolean;
  breakout: boolean;
  breakoutRecent: boolean;
  pigment: boolean;
};

const ACTIVE_SPECS: { id: string; re: RegExp; strong?: boolean; soothing?: boolean }[] = [
  { id: "tretinoin", re: /tretinoin/i, strong: true },
  { id: "retinol", re: /(?:^|[^A-Za-z])(?:retinol|retinoid|adapalene)(?:[^A-Za-z]|$)/i, strong: true },
  { id: "benzoyl", re: /benzoyl/i, strong: true },
  { id: "bha", re: /(?:^|[^A-Za-z])(?:bha|salicylic)(?:[^A-Za-z]|$)/i, strong: true },
  { id: "aha", re: /(?:^|[^A-Za-z])(?:aha|glycolic)(?:[^A-Za-z]|$)/i, strong: true },
  { id: "vitamin_c", re: /vitamin\s*c|ascorbic|vit\.?\s*c/i, strong: true },
  { id: "niacinamide", re: /niacinamide|nicotinamide|vitamin\s*b3/i },
  { id: "centella", re: /centella|cica|madecassoside|rau má|rau ma/i, soothing: true },
  { id: "ceramide", re: /ceramide/i, soothing: true },
  { id: "hyaluronic", re: /hyaluronic/i, soothing: true },
  { id: "zinc", re: /(?:^|[^A-Za-z])zinc(?:[^A-Za-z]|$)|kẽm/i },
];

const IRRITATE = new Set(["itching", "stinging", "redness", "inflammation", "weak_barrier", "sensitive", "mask_friction"]);
const DRY = new Set(["dry", "dehydrated", "dryness"]);
const OILY = new Set(["oily", "oil"]);
const BREAKOUT = new Set(["breakout", "new_breakouts", "acne", "clogged_pores", "large_pores"]);
const PIGMENT = new Set(["hyperpigmentation", "pih", "post_acne_marks", "dull", "dullness", "dark_spots"]);

function normKeyPart(raw: string | undefined): string {
  return (raw ?? "").trim().toLowerCase().split(/\s+/).filter(Boolean).join(" ");
}

/** Identity of the shelf row + language. Skin and check-ins stay out so a later refresh can update fit. */
export function cabinetProductKey(input: Pick<CabinetInsightInput, "name" | "brand" | "category" | "notes" | "locale">): string {
  let notes = normKeyPart(input.notes);
  if (notes.length > 500) notes = notes.slice(0, 500);
  return [
    `v${PRODUCT_INSIGHT_VERSION}`,
    normKeyPart(input.name),
    normKeyPart(input.brand),
    normKeyPart(input.category),
    notes,
    insightLocale(input.locale),
  ].join("|");
}

function containsAny(blob: string, parts: string[]): boolean {
  const low = blob.toLowerCase();
  return parts.some((part) => low.includes(part.toLowerCase()));
}

function resolveCategory(category: string | undefined, name: string, notes: string): string {
  const cat = (category ?? "").trim().toLowerCase();
  if (["cleanser", "toner", "serum", "moisturizer", "spf", "treatment", "mask", "other"].includes(cat)) {
    return cat;
  }
  const blob = `${name} ${notes}`.toLowerCase();
  if (containsAny(blob, ["spf", "sunscreen", "sun cream", "kem chống nắng", "chống nắng", "chong nang"])) return "spf";
  if (containsAny(blob, ["cleanser", "cleansing", "sữa rửa mặt", "rửa mặt", "rua mat"])) return "cleanser";
  if (containsAny(blob, ["toner", "essence", "nước hoa hồng"])) return "toner";
  if (containsAny(blob, ["serum", "ampoule"])) return "serum";
  if (containsAny(blob, ["moisturizer", "moisturiser", "kem dưỡng", "dưỡng ẩm", "duong am"])) return "moisturizer";
  if (containsAny(blob, ["sheet mask", "mặt nạ", "mat na", "face mask"])) return "mask";
  return "other";
}

function detectActives(blob: string): ActiveHit[] {
  const hits: ActiveHit[] = [];
  const seen = new Set<string>();
  for (const spec of ACTIVE_SPECS) {
    if (seen.has(spec.id) || !spec.re.test(blob)) continue;
    seen.add(spec.id);
    hits.push({ id: spec.id, strong: Boolean(spec.strong), soothing: Boolean(spec.soothing) });
    if (hits.length === 3) break;
  }
  return hits;
}

function normalizeSkin(raw: string | undefined): string {
  switch ((raw ?? "").trim().toLowerCase()) {
    case "oily":
    case "oil":
      return "oily";
    case "dry":
      return "dry";
    case "combo":
    case "combination":
    case "mixed":
      return "combo";
    case "sensitive":
      return "sensitive";
    case "normal":
      return "normal";
    default:
      return "";
  }
}

function absorb(sig: Signals, tags: string[] | undefined, recent: boolean) {
  for (const tag of tags ?? []) {
    const key = tag.trim().toLowerCase();
    if (!key) continue;
    if (IRRITATE.has(key)) {
      sig.irritated = true;
      if (recent) sig.irritatedRecent = true;
      if (key === "sensitive") sig.sensitiveSkin = true;
    }
    if (DRY.has(key)) {
      sig.dry = true;
      if (recent) sig.dryRecent = true;
    }
    if (OILY.has(key)) sig.oily = true;
    if (BREAKOUT.has(key)) {
      sig.breakout = true;
      if (recent) sig.breakoutRecent = true;
    }
    if (PIGMENT.has(key)) sig.pigment = true;
  }
}

function collectSignals(input: CabinetInsightInput): Signals {
  const skin = normalizeSkin(input.skinType);
  const sig: Signals = {
    skin,
    sensitiveSkin: skin === "sensitive",
    irritated: false,
    irritatedRecent: false,
    dry: skin === "dry",
    dryRecent: false,
    oily: skin === "oily" || skin === "combo",
    breakout: false,
    breakoutRecent: false,
    pigment: false,
  };
  absorb(sig, input.concerns, false);
  absorb(sig, input.recentTags, true);
  return sig;
}

function skinPhrase(sig: Signals, en: boolean): string {
  const phrases: Record<string, [string, string]> = {
    oily: ["oily skin", "da dầu"],
    dry: ["dry skin", "da khô"],
    combo: ["combination skin", "da hỗn hợp"],
    sensitive: ["sensitive skin", "da nhạy"],
    normal: ["normal skin", "da thường"],
  };
  const pair = phrases[sig.skin];
  if (!pair) return en ? "your skin" : "da bạn";
  return en ? pair[0] : pair[1];
}

function disclaimer(en: boolean): string {
  return en
    ? "This suggestion is for reference only. It does not replace a dermatologist."
    : "Gợi ý này chỉ để tham khảo, không thay bác sĩ da liễu.";
}

function whatItDoes(cat: string, strong: boolean, soothe: boolean, en: boolean): string {
  let resolved = cat;
  if ((resolved === "other" || resolved === "") && strong) resolved = "treatment";
  if ((resolved === "other" || resolved === "") && soothe) {
    return en
      ? "This has a calming ingredient. It helps skin feel less dry or less sore."
      : "Món này có thành phần làm dịu, giúp da đỡ khô hoặc đỡ rát.";
  }
  if (en) {
    switch (resolved) {
      case "cleanser":
        return "A cleanser lifts off dust, oil, and sunscreen. A gentle wash is enough — no scrubbing.";
      case "toner":
        return "Toner is a liquid used after washing. You do not have to use this step.";
      case "serum":
        return "A serum is a thin layer used after washing and before moisturizer.";
      case "moisturizer":
        return "Moisturizer keeps skin from feeling dry and tight after you wash.";
      case "spf":
        return "Sunscreen blocks the sun so new dark marks are less likely.";
      case "treatment":
        return "A treatment targets pimples or dark marks. Too much can make skin sore.";
      case "mask":
        return "A mask is for once in a while, when skin feels dry or oily. It does not replace daily steps.";
      default:
        return "It is not clear what this product does. Read the label before using it all over your face.";
    }
  }
  switch (resolved) {
    case "cleanser":
      return "Sữa rửa mặt gỡ bụi, dầu và kem chống nắng. Rửa nhẹ là đủ, không cần chà.";
    case "toner":
      return "Toner là nước thoa sau khi rửa mặt. Bước này không bắt buộc.";
    case "serum":
      return "Serum là lớp mỏng thoa sau rửa mặt và trước kem dưỡng.";
    case "moisturizer":
      return "Kem dưỡng giúp da đỡ khô và đỡ căng sau khi rửa mặt.";
    case "spf":
      return "Kem chống nắng che da khỏi nắng, để vết thâm mới khó lên hơn.";
    case "treatment":
      return "Món trị dùng để xử lý mụn hoặc đốm. Dễ làm da rát nếu thoa nhiều.";
    case "mask":
      return "Mặt nạ dùng thỉnh thoảng cho da đỡ khô hoặc đỡ dầu. Không thay bước mỗi ngày.";
    default:
      return "Chưa rõ món này làm gì. Hãy đọc nhãn trước khi thoa đều lên mặt.";
  }
}

function strongPause(sig: Signals, en: boolean): string {
  if (en) {
    if (sig.irritatedRecent) return "Recent check-ins say skin feels sore or red. Pause products with strong ingredients.";
    if (sig.sensitiveSkin && !sig.irritated) return "Sensitive skin gets sore easily with strong ingredients. This is not a match right now.";
    return "Skin is showing soreness or redness. Pause products with strong ingredients.";
  }
  if (sig.irritatedRecent) return "Mấy lần check-in gần đây da đang rát hoặc đỏ. Món có thành phần mạnh nên tạm để đó.";
  if (sig.sensitiveSkin && !sig.irritated) return "Da nhạy dễ bị rát với thành phần mạnh. Chưa hợp lúc này.";
  return "Da đang có dấu hiệu rát hoặc đỏ. Món có thành phần mạnh nên tạm để đó.";
}

function waitUnfit(en: boolean): string {
  return en
    ? "Do not buy or add more of this while it does not fit your skin."
    : "Chưa nên mua hay dùng thêm khi da đang không hợp món này.";
}

function hasActive(hits: ActiveHit[], id: string): boolean {
  return hits.some((hit) => hit.id === id);
}

function serumMatches(hits: ActiveHit[], sig: Signals): boolean {
  if (hasActive(hits, "niacinamide") && (sig.oily || sig.breakout || sig.pigment || sig.skin === "combo")) return true;
  if (hasActive(hits, "zinc") && (sig.oily || sig.breakout)) return true;
  if (hasActive(hits, "hyaluronic") && sig.dry) return true;
  if (hasActive(hits, "ceramide") && (sig.dry || sig.sensitiveSkin || sig.irritated)) return true;
  if (hasActive(hits, "centella") && (sig.irritated || sig.sensitiveSkin || sig.dry)) return true;
  return false;
}

function fitForCategory(cat: string, sig: Signals, hits: ActiveHit[], en: boolean): { fit: ProductInsight["fit"]["verdict"]; reason: string } {
  switch (cat) {
    case "spf":
      if (sig.irritated) {
        return en
          ? { fit: "maybe", reason: "Skin feels sore, but you still need sun protection. Pick a gentle sunscreen with no alcohol and no fragrance." }
          : { fit: "maybe", reason: "Da đang rát thì vẫn cần che nắng. Chọn loại dịu, không cồn và không mùi." };
      }
      return en
        ? { fit: "yes", reason: `Sunscreen fits ${skinPhrase(sig, true)}. Window light can still darken marks.` }
        : { fit: "yes", reason: `Kem chống nắng hợp với ${skinPhrase(sig, false)}. Nắng cửa sổ vẫn có thể làm thâm.` };
    case "cleanser":
      if (sig.irritated) {
        return en
          ? { fit: "maybe", reason: "When skin is sore, wash very gently and do not scrub. You still want a cleanser." }
          : { fit: "maybe", reason: "Da đang nhạy thì rửa thật nhẹ, không chà. Vẫn nên có sữa rửa mặt." };
      }
      if (sig.dry && !sig.oily) {
        return en
          ? { fit: "maybe", reason: "Dry skin still needs a wash. Pick a gentle one that does not foam a lot." }
          : { fit: "maybe", reason: "Da khô vẫn cần rửa mặt. Chọn loại dịu, ít bọt." };
      }
      return en
        ? { fit: "yes", reason: `For ${skinPhrase(sig, true)}, a gentle cleanser morning and night is enough. Do not wash more than twice a day.` }
        : { fit: "yes", reason: `Với ${skinPhrase(sig, false)}, sữa rửa mặt dịu dùng sáng và tối là đủ. Đừng rửa quá 2 lần một ngày.` };
    case "moisturizer":
      if (sig.skin === "combo") {
        return en
          ? { fit: "maybe", reason: "Combination skin still needs moisturizer. Pick a light one that is not greasy." }
          : { fit: "maybe", reason: "Da hỗn hợp vẫn cần kem dưỡng. Chọn loại mỏng, không quá dầu." };
      }
      if (sig.oily && !sig.dry) {
        return en
          ? { fit: "maybe", reason: "Oily skin still needs moisturizer. Pick a light one that is not greasy." }
          : { fit: "maybe", reason: "Da dầu vẫn cần kem dưỡng. Chọn loại mỏng, không dầu." };
      }
      return en
        ? { fit: "yes", reason: `Moisturizer helps ${skinPhrase(sig, true)} feel less tight. Apply it while skin is still a little damp.` }
        : { fit: "yes", reason: `Kem dưỡng giúp ${skinPhrase(sig, false)} đỡ căng. Thoa khi da còn hơi ẩm.` };
    case "treatment":
      if (sig.irritated) {
        return en
          ? { fit: "no", reason: "Skin is sore. Pause treatments until it feels calm again." }
          : { fit: "no", reason: "Da đang rát. Tạm dừng món trị cho đến khi da dịu lại." };
      }
      if (sig.breakout) {
        return en
          ? { fit: "maybe", reason: "Skin has had breakouts and is not reporting stinging. You can use a little, a few nights a week." }
          : { fit: "maybe", reason: "Da đang có mụn và chưa báo rát. Có thể dùng ít, vài đêm một tuần." };
      }
      return en
        ? { fit: "maybe", reason: "It is not clear your skin needs a treatment yet. Try a small area first." }
        : { fit: "maybe", reason: "Chưa rõ da có đang cần món trị không. Thử vùng nhỏ trước đã." };
    case "serum":
      if (hits.length === 0) {
        return en
          ? { fit: "maybe", reason: "The main ingredient is not clear, so it is hard to say if this fits your skin." }
          : { fit: "maybe", reason: "Chưa đọc được thành phần chính. Chưa biết món này có hợp da bạn không." };
      }
      if (hits.some((hit) => hit.strong) && (sig.breakout || sig.pigment)) {
        return en
          ? { fit: "maybe", reason: "You can try a little on a small area. Stop if skin gets more sore." }
          : { fit: "maybe", reason: "Có thể thoa ít trên vùng nhỏ. Dừng nếu da rát hơn." };
      }
      if (serumMatches(hits, sig)) {
        return en
          ? { fit: "yes", reason: `This kind of serum often fits ${skinPhrase(sig, true)}. Try a small area before the whole face.` }
          : { fit: "yes", reason: `Loại serum này thường hợp với ${skinPhrase(sig, false)}. Thử một vùng nhỏ trước khi thoa cả mặt.` };
      }
      return en
        ? { fit: "maybe", reason: "Try a small area first. Add only one new product this week." }
        : { fit: "maybe", reason: "Thử một vùng nhỏ trước. Tuần này chỉ thêm một món mới." };
    case "toner":
      return en
        ? { fit: "maybe", reason: "Toner is optional. If you already have a cleanser and moisturizer, you do not need this extra step." }
        : { fit: "maybe", reason: "Toner không bắt buộc. Nếu đã có sữa rửa mặt và kem dưỡng thì chưa cần thêm bước này." };
    case "mask":
      return en
        ? { fit: "maybe", reason: "A mask is only for once in a while. It should not replace moisturizer every day." }
        : { fit: "maybe", reason: "Mặt nạ chỉ dùng thỉnh thoảng. Không hợp để thay kem dưỡng mỗi ngày." };
    default:
      return en
        ? { fit: "maybe", reason: "There is not enough information to say if this fits your skin." }
        : { fit: "maybe", reason: "Chưa đủ thông tin để biết món này có hợp da bạn không." };
  }
}

function buyVerdict(cat: string, fit: ProductInsight["fit"]["verdict"], sig: Signals, strong: boolean): ProductInsight["buy"]["verdict"] {
  if (fit === "no") return "wait";
  if (cat === "cleanser" || cat === "moisturizer" || cat === "spf") return "buy";
  if ((cat === "treatment" || cat === "serum") && (sig.breakout || sig.pigment) && strong && !sig.irritated && !sig.sensitiveSkin) {
    return "buy";
  }
  if (fit === "yes" && cat === "serum") return "buy";
  return "wait";
}

function buyReason(cat: string, fit: ProductInsight["fit"]["verdict"], sig: Signals, strong: boolean, en: boolean): string {
  const verdict = buyVerdict(cat, fit, sig, strong);
  if (verdict === "wait") {
    if (fit === "no") return waitUnfit(en);
    return en
      ? "Do not buy more yet. Use what is already on your shelf first."
      : "Chưa nên mua thêm. Dùng món đang có trong tủ trước đã.";
  }
  if (cat === "spf") {
    return en
      ? "Worth having. Wear sunscreen every morning, even indoors near a window."
      : "Nên có kem chống nắng mỗi sáng, kể cả ngày ở trong nhà gần cửa sổ.";
  }
  if (cat === "cleanser") {
    return en ? "Worth having a gentle cleanser on your shelf." : "Nên có sữa rửa mặt dịu trong tủ.";
  }
  if (cat === "moisturizer") {
    return en ? "Worth having a moisturizer on your shelf." : "Nên có kem dưỡng trong tủ.";
  }
  return en
    ? "Worth buying if you do not already own something like this. Start with a small area."
    : "Nên mua nếu tủ chưa có món cùng loại. Thử vùng nhỏ trước.";
}

function activeCopy(id: string, en: boolean): ProductInsightActive | null {
  const copy: Record<string, [string, string, string, string]> = {
    bha: ["BHA", "BHA (salicylic) gets into pores to clear oil and blackheads.", "BHA", "BHA (salicylic) chui vào lỗ chân lông để gỡ dầu và mụn đầu đen."],
    aha: ["AHA", "AHA (glycolic) loosens dead skin on the surface. Skip it when skin is sore.", "AHA", "AHA (glycolic) làm bong lớp da chết trên mặt. Da đang rát thì chưa dùng."],
    retinol: ["Retinol", "Retinol makes skin renew faster. Too much can make skin sore.", "Retinol", "Retinol làm da đổi mới nhanh hơn. Dễ rát nếu dùng nhiều."],
    tretinoin: ["Tretinoin", "Tretinoin is a strong cream that renews skin. Use it only as directed, and stop if skin gets more sore.", "Tretinoin", "Tretinoin là thuốc bôi mạnh làm da đổi mới. Chỉ dùng theo chỉ dẫn, dừng khi da rát hơn."],
    benzoyl: ["Benzoyl peroxide", "Benzoyl peroxide lowers the bacteria that cause pimples. It can dry skin out.", "Benzoyl peroxide", "Benzoyl peroxide giảm vi khuẩn gây mụn. Có thể làm da khô."],
    vitamin_c: ["Vitamin C", "Vitamin C helps skin look more even and fades dark marks slowly.", "Vitamin C", "Vitamin C giúp da đều màu hơn và hỗ trợ vết thâm mờ dần."],
    niacinamide: ["Niacinamide", "Niacinamide is vitamin B3. It helps pores look smaller and skin look more even.", "Niacinamide", "Niacinamide là vitamin B3, giúp lỗ chân lông trông nhỏ hơn và da đều màu hơn."],
    centella: ["Centella", "Centella (cica) helps red skin feel calmer.", "Centella", "Centella (rau má) giúp da đang đỏ dịu lại."],
    ceramide: ["Ceramide", "Ceramide is like the oil layer skin already has. It helps skin feel less dry and less sore.", "Ceramide", "Ceramide giống lớp dầu bảo vệ sẵn có của da, giúp da đỡ khô và đỡ rát."],
    hyaluronic: ["Hyaluronic acid", "Hyaluronic acid holds water on the skin so it feels less tight.", "Hyaluronic acid", "Hyaluronic acid giữ nước trên da, giúp da đỡ khô căng."],
    zinc: ["Zinc", "Zinc helps oily skin look less shiny and less spotty.", "Kẽm", "Kẽm giúp da dầu đỡ bóng và đỡ mụn."],
  };
  const row = copy[id];
  if (!row) return null;
  return en ? { label: row[0], plain: row[1] } : { label: row[2], plain: row[3] };
}

/**
 * Plain-language cabinet card. Same idea as onboarding product guidance:
 * templates from the product text, skin type, and recent check-ins — not a chat.
 */
export function buildCabinetProductInsight(input: CabinetInsightInput): ProductInsight {
  const en = insightLocale(input.locale) === "en";
  const cat = resolveCategory(input.category, input.name, input.notes ?? "");
  const hits = detectActives(`${input.name}\n${input.brand ?? ""}\n${input.notes ?? ""}`);
  const sig = collectSignals(input);
  const strong = hits.some((hit) => hit.strong);
  const soothe = hits.some((hit) => hit.soothing);
  const what = whatItDoes(cat, strong, soothe, en);

  let fit: ProductInsight["fit"]["verdict"];
  let fitReason: string;
  if (strong && (sig.irritated || sig.sensitiveSkin)) {
    fit = "no";
    fitReason = strongPause(sig, en);
  } else if (soothe && (sig.irritated || sig.dry || sig.sensitiveSkin) && cat !== "toner" && cat !== "mask") {
    fit = "yes";
    fitReason = en
      ? "Skin needs calming right now. A soothing ingredient fits better than a strong treatment."
      : "Da đang cần dịu. Thành phần làm dịu trong món này hợp hơn món trị mạnh.";
  } else {
    const decided = fitForCategory(cat, sig, hits, en);
    fit = decided.fit;
    fitReason = decided.reason;
  }

  const buy = buyVerdict(cat, fit, sig, strong);
  return {
    whatItDoes: what,
    fit: { verdict: fit, reason: fitReason },
    buy: { verdict: buy, reason: buyReason(cat, fit, sig, strong, en) },
    actives: hits.map((hit) => activeCopy(hit.id, en)).filter((item): item is ProductInsightActive => item != null),
    disclaimer: disclaimer(en),
    locale: insightLocale(input.locale),
    version: PRODUCT_INSIGHT_VERSION,
  };
}
