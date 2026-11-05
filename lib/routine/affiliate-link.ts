type AffiliateStep = {
  affiliate_link?: string | null;
  affiliate_product_id?: string | null;
  product_name?: string | null;
};

/** An https link already stored on a step. Anything else is not shown. */
export function routineAffiliateLink(step: { affiliate_link?: string | null }): string | null {
  const link = step.affiliate_link?.trim() ?? "";
  if (!/^https:\/\/\S+$/i.test(link)) return null;
  return link;
}

/** Keep a link the server echoed back without, so a tick does not wipe it. */
export function keepAffiliate<T extends AffiliateStep & { id: string }>(previous: readonly T[], next: readonly T[]): T[] {
  return next.map((step) => {
    if (routineAffiliateLink(step)) return step;
    const old = previous.find((item) => item.id === step.id);
    const link = old ? routineAffiliateLink(old) : null;
    if (!link || !old) return step;
    return {
      ...step,
      affiliate_link: link,
      ...(old.affiliate_product_id ? { affiliate_product_id: old.affiliate_product_id } : {}),
      ...(old.product_name ? { product_name: old.product_name } : {}),
    };
  });
}

/** Fields to keep on a save body when the step already has a real link. */
export function affiliatePayload(step: AffiliateStep): {
  affiliate_link?: string;
  affiliate_product_id?: string;
  product_name?: string;
} {
  const link = routineAffiliateLink(step);
  if (!link) return {};
  const productId = step.affiliate_product_id?.trim();
  const name = step.product_name?.trim();
  return {
    affiliate_link: link,
    ...(productId ? { affiliate_product_id: productId } : {}),
    ...(name ? { product_name: name } : {}),
  };
}
