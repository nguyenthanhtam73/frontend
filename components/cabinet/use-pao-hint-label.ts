"use client";

import { useTranslations } from "next-intl";

import { getPaoHint, paoHintCopy } from "@/lib/cabinet/pao";

/** Existing period-after-opening hint, derived during render from the opened date. */
export function usePaoHintLabel(
  openedAt: string | undefined,
  category: string | undefined,
): string | null {
  const t = useTranslations("cabinet");
  const pao = getPaoHint(openedAt, category);
  if (!pao) return null;
  const copy = paoHintCopy(pao);
  switch (copy.key) {
    case "paoHintFreshFixed":
      return t("paoHintFreshFixed", copy.values);
    case "paoHintFreshRange":
      return t("paoHintFreshRange", copy.values);
    case "paoHintFixed":
      return t("paoHintFixed", copy.values);
    case "paoHintRange":
      return t("paoHintRange", copy.values);
  }
}
