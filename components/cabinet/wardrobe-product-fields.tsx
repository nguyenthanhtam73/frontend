"use client";

import { useTranslations } from "next-intl";

import {
  WARDROBE_CATEGORY_IDS,
  type WardrobeCategoryId,
  isWardrobeCategoryId,
} from "@/lib/cabinet/categories";

export { WARDROBE_CATEGORY_IDS, type WardrobeCategoryId };

export const wardrobeInputClass =
  "w-full min-h-11 max-w-full rounded-xl border border-input bg-background px-3 py-2 text-base shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:text-sm";

export function WardrobeField({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </label>
      {children}
    </div>
  );
}

export function WardrobeCategorySelect({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("cabinet");
  return (
    <select
      id={id}
      className={wardrobeInputClass}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    >
      <option value="">{t("categoryUnset")}</option>
      {WARDROBE_CATEGORY_IDS.map((catId) => (
        <option key={catId} value={catId}>
          {t(`categories.${catId}`)}
        </option>
      ))}
    </select>
  );
}

export function categoryLabelFor(
  t: ReturnType<typeof useTranslations<"cabinet">>,
  id: string,
) {
  if (isWardrobeCategoryId(id)) {
    return t(`categories.${id}`);
  }
  return id;
}
