/** Normalize product names for client-side duplicate checks. */
export function normalizeProductName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s+/\-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isSameShelfName(a: string, b: string): boolean {
  const na = normalizeProductName(a);
  const nb = normalizeProductName(b);
  if (!na || !nb) return false;
  return na === nb;
}
