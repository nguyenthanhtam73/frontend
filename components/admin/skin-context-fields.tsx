"use client";

import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

/**
 * Structured touch / pain / duration answers.
 *
 * A photo physically cannot separate milia from closed comedones from skin tags —
 * they look the same. Firmness, whether the bump sits on a stalk, how long it has been
 * there, and whether it hurts do separate them, so these answers are sent to vision and
 * outrank pixel guessing.
 */
export type SkinContextAnswers = {
  firmness: string;
  duration: string;
  pain: string;
  extra: string;
};

export const EMPTY_SKIN_CONTEXT: SkinContextAnswers = {
  firmness: "",
  duration: "",
  pain: "",
  extra: "",
};

const FIRMNESS_IDS = ["firm", "soft", "stalked", "unknown"] as const;
const DURATION_IDS = ["days", "weeks", "months", "comes_and_goes", "unknown"] as const;
const PAIN_IDS = ["none", "itchy", "sore", "unknown"] as const;

export function skinContextHasAnswers(v: SkinContextAnswers): boolean {
  return Boolean(v.firmness || v.duration || v.pain || v.extra.trim());
}

/** Flatten answers into the plain-text block the backend forwards to vision. */
export function buildSkinContextText(
  v: SkinContextAnswers,
  t: (key: string) => string,
): string {
  const lines: string[] = [];
  if (v.firmness) lines.push(`${t("skinContext.firmnessLabel")}: ${t(`skinContext.firmness.${v.firmness}`)}`);
  if (v.duration) lines.push(`${t("skinContext.durationLabel")}: ${t(`skinContext.duration.${v.duration}`)}`);
  if (v.pain) lines.push(`${t("skinContext.painLabel")}: ${t(`skinContext.pain.${v.pain}`)}`);
  if (v.extra.trim()) lines.push(`${t("skinContext.extraLabel")}: ${v.extra.trim()}`);
  return lines.join("\n");
}

function ChoiceRow({
  label,
  ids,
  group,
  value,
  onChange,
  disabled,
  t,
}: {
  label: string;
  ids: readonly string[];
  group: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  t: (key: string) => string;
}) {
  return (
    <fieldset className="space-y-1.5" disabled={disabled}>
      <legend className="text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {ids.map((id) => {
          const active = value === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={active}
              disabled={disabled}
              onClick={() => onChange(active ? "" : id)}
              className={cn(
                "min-h-9 rounded-full border px-3 py-1 text-xs transition-colors disabled:opacity-50",
                active
                  ? "border-primary bg-primary/10 font-semibold text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {t(`skinContext.${group}.${id}`)}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function SkinContextFields({
  value,
  onChange,
  disabled,
}: {
  value: SkinContextAnswers;
  onChange: (next: SkinContextAnswers) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("adminSkinReview") as unknown as (key: string) => string;

  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-muted p-3.5">
      <div className="space-y-1">
        <p className="text-sm font-semibold">{t("skinContext.title")}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t("skinContext.why")}
        </p>
      </div>

      <ChoiceRow
        label={t("skinContext.firmnessLabel")}
        ids={FIRMNESS_IDS}
        group="firmness"
        value={value.firmness}
        onChange={(firmness) => onChange({ ...value, firmness })}
        disabled={disabled}
        t={t}
      />
      <ChoiceRow
        label={t("skinContext.durationLabel")}
        ids={DURATION_IDS}
        group="duration"
        value={value.duration}
        onChange={(duration) => onChange({ ...value, duration })}
        disabled={disabled}
        t={t}
      />
      <ChoiceRow
        label={t("skinContext.painLabel")}
        ids={PAIN_IDS}
        group="pain"
        value={value.pain}
        onChange={(pain) => onChange({ ...value, pain })}
        disabled={disabled}
        t={t}
      />

      <label className="block space-y-1.5 text-sm">
        <span className="font-medium">{t("skinContext.extraLabel")}</span>
        <input
          type="text"
          className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={value.extra}
          onChange={(e) => onChange({ ...value, extra: e.target.value })}
          placeholder={t("skinContext.extraPlaceholder")}
          disabled={disabled}
          maxLength={300}
        />
      </label>
    </div>
  );
}
