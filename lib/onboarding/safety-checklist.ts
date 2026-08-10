/**
 * Turn long safety prose into short checklist bullets for the welcome UI.
 */

const MAX_ITEMS = 4;
const MAX_ITEM_CHARS = 110;

/** Prefer splitting on newlines / bullets; else sentence boundaries. */
export function safetyNotesToChecklist(raw: string): string[] {
  const text = raw.trim();
  if (!text) return [];

  let parts = text
    .split(/\n+/)
    .map((l) => l.replace(/^[-•*–—]\s*/, "").trim())
    .filter(Boolean);

  if (parts.length <= 1) {
    parts = text
      .split(/(?<=[.!?…])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 12);
  }

  const out: string[] = [];
  const seen = new Set<string>();

  for (const p of parts) {
    let item = p.replace(/\s+/g, " ").trim();
    if (item.length > MAX_ITEM_CHARS) {
      item = `${item.slice(0, MAX_ITEM_CHARS).replace(/\s+\S*$/, "").trim()}…`;
    }
    const key = item
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .slice(0, 48);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= MAX_ITEMS) break;
  }

  return out.length ? out : [text.slice(0, MAX_ITEM_CHARS)];
}
