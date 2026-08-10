/**
 * Collapse overlapping skin-concern ids so chips don’t repeat
 * “đỏ / kích ứng / barrier yếu” as three near-identical signals.
 */

/** Later ids in a group are dropped if an earlier one is already present. */
const OVERLAP_DROP: Record<string, string[]> = {
  redness: ["weak_barrier"],
  weak_barrier: [], // kept only when redness absent
  acne: [],
  hyperpigmentation: ["dullness"],
  uneven_texture: ["dullness", "large_pores"],
  dryness: ["dehydration"],
  dehydration: [],
};

export function dedupeConcernIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const raw of ids) {
    const id = raw.trim();
    if (!id || seen.has(id)) continue;

    // Skip if a stronger sibling already kept us covered.
    let dropped = false;
    for (const [keep, drops] of Object.entries(OVERLAP_DROP)) {
      if (drops.includes(id) && (seen.has(keep) || ids.includes(keep))) {
        // Prefer the "keep" id — if keep is still ahead in the list, skip this.
        if (seen.has(keep) || ids.indexOf(keep) < ids.indexOf(id)) {
          dropped = true;
          break;
        }
      }
    }
    if (dropped) continue;

    seen.add(id);
    out.push(id);

    for (const drop of OVERLAP_DROP[id] ?? []) {
      seen.add(drop);
    }
  }

  return out;
}

/** Deduplicate display labels (translated) with light string normalize. */
export function dedupeConcernLabels(labels: string[]): string[] {
  const IRRITATION_RE =
    /\b(do|redness|kich ung|irritat|yeu|barrier|nhay cam)\b/i;

  const seen = new Set<string>();
  let keptIrritation = false;
  const out: string[] = [];

  for (const raw of labels) {
    const label = raw.trim();
    if (!label) continue;
    const key = label
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/\s+/g, " ");
    const softKey = key
      .replace(/da\s+/g, "")
      .replace(/\/.*/, "")
      .replace(/\s+/g, " ")
      .trim();

    if (seen.has(key) || seen.has(softKey)) continue;

    const isIrritation = IRRITATION_RE.test(key) || IRRITATION_RE.test(softKey);
    if (isIrritation && keptIrritation) continue;

    // If softKey overlaps an existing soft prefix heavily, skip.
    let overlap = false;
    for (const s of seen) {
      if (s.includes(softKey) || softKey.includes(s)) {
        if (Math.min(s.length, softKey.length) >= 6) {
          overlap = true;
          break;
        }
      }
    }
    if (overlap) continue;

    seen.add(key);
    seen.add(softKey);
    if (isIrritation) keptIrritation = true;
    out.push(label);
  }
  return out;
}
