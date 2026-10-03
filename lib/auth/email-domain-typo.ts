import { isValidAccountEmail } from "./email-format";

/**
 * Providers people in Vietnam mistype on the register form.
 * `yahoo.com.vn` is separate from `yahoo.com` — an exact match of either
 * must not be rewritten to the other.
 */
const COMMON_EMAIL_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "yahoo.com.vn",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
] as const;

const COMMON_EMAIL_DOMAIN_SET = new Set<string>(COMMON_EMAIL_DOMAINS);

/**
 * Real mailbox domains that sit within 1–2 edits of a provider above.
 * Suggesting a "fix" here would rewrite a legitimate address.
 * Country Yahoo/Hotmail domains and cloud.com are real, not typos.
 */
const REAL_DOMAINS_NEAR_PROVIDERS = new Set([
  "mail.com",
  "email.com",
  "ymail.com",
  "yahoo.com.au",
  "yahoo.com.sg",
  "yahoo.com.ph",
  "yahoo.com.tw",
  "yahoo.com.my",
  "yahoo.ca",
  "hotmail.ca",
  "cloud.com",
]);

/**
 * Vietnamese Gmail mistakes that are more than two edits away from gmail.com
 * (an extra `.vn`, or `.vn` instead of `.com`).
 */
const DOMAIN_FIXES: Record<string, string> = {
  "gmail.com.vn": "gmail.com",
  "gmail.vn": "gmail.com",
};

/** Insertions, deletions, and substitutions. One adjacent swap costs 2. */
const MAX_EDITS = 2;

/**
 * When `value` is already a syntactically valid account email and its domain
 * is a small typo of a common provider, return the address with that domain
 * corrected. Exact providers and unrelated domains return null.
 *
 * This never blocks submit — callers only offer the result as a hint.
 */
export function suggestEmailDomain(value: string): string | null {
  const trimmed = value.trim();
  if (!isValidAccountEmail(trimmed)) return null;

  const at = trimmed.lastIndexOf("@");
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1).toLowerCase();
  if (COMMON_EMAIL_DOMAIN_SET.has(domain)) return null;
  if (REAL_DOMAINS_NEAR_PROVIDERS.has(domain)) return null;
  const fixed = DOMAIN_FIXES[domain];
  if (fixed) return `${local}@${fixed}`;

  let best: string | null = null;
  let bestDistance = MAX_EDITS + 1;
  let bestTldDistance = MAX_EDITS + 1;

  for (const provider of COMMON_EMAIL_DOMAINS) {
    const distance = editDistance(domain, provider, MAX_EDITS);
    if (distance < 1 || distance > MAX_EDITS) continue;
    const tldDistance = lastLabelDistance(domain, provider);
    if (tldDistance > MAX_EDITS) continue;
    const closer =
      distance < bestDistance ||
      (distance === bestDistance && tldDistance < bestTldDistance);
    const tied =
      distance === bestDistance && tldDistance === bestTldDistance && provider !== best;
    if (closer) {
      best = provider;
      bestDistance = distance;
      bestTldDistance = tldDistance;
    } else if (tied) {
      best = null;
    }
  }

  if (!best) return null;
  return `${local}@${best}`;
}

function lastLabelDistance(typed: string, provider: string): number {
  const typedDot = typed.lastIndexOf(".");
  const providerDot = provider.lastIndexOf(".");
  if (typedDot <= 0 || providerDot <= 0) return MAX_EDITS + 1;
  return editDistance(
    typed.slice(typedDot + 1),
    provider.slice(providerDot + 1),
    MAX_EDITS,
  );
}

/** Levenshtein distance, or `max + 1` when the distance is known to exceed `max`. */
function editDistance(a: string, b: string, max: number): number {
  if (a === b) return 0;
  const aLen = a.length;
  const bLen = b.length;
  if (Math.abs(aLen - bLen) > max) return max + 1;

  const prev = new Array<number>(bLen + 1);
  const curr = new Array<number>(bLen + 1);
  for (let j = 0; j <= bLen; j++) prev[j] = j;

  for (let i = 1; i <= aLen; i++) {
    curr[0] = i;
    let rowMin = i;
    const code = a.charCodeAt(i - 1);
    for (let j = 1; j <= bLen; j++) {
      const cost = code === b.charCodeAt(j - 1) ? 0 : 1;
      const value = Math.min(prev[j]! + 1, curr[j - 1]! + 1, prev[j - 1]! + cost);
      curr[j] = value;
      if (value < rowMin) rowMin = value;
    }
    if (rowMin > max) return max + 1;
    for (let j = 0; j <= bLen; j++) prev[j] = curr[j]!;
  }

  const distance = prev[bLen]!;
  return distance > max ? max + 1 : distance;
}
