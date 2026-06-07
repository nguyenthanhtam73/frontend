"use client";

import { Loader2, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

import { ToastBanner } from "@/components/ui/toast-banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useWardrobe } from "@/components/cabinet/wardrobe-provider";
import { PremiumUpsellBanner } from "@/components/premium/premium-upsell-banner";
import { useUsageQuota } from "@/lib/hooks/use-usage-quota";

const CATEGORY_IDS = [
  "cleanser",
  "toner",
  "serum",
  "moisturizer",
  "spf",
  "treatment",
  "mask",
  "other",
] as const;

const inputClass =
  "w-full min-h-11 rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function WardrobeProductForm({ formId = "wardrobe-add-form" }: { formId?: string }) {
  const t = useTranslations("cabinet");
  const tPremium = useTranslations("premium");
  const formRef = useRef<HTMLFormElement>(null);
  const { hasAuth, createProduct, isCreating } = useWardrobe();
  const { canWardrobeWrite, isPremium, isLoading: usageLoading, isFetched: usageReady } =
    useUsageQuota();
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState<string>("");
  const [openedAt, setOpenedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setToast(null);
    if (!name.trim()) {
      setFormError(t("nameRequired"));
      return;
    }
    if (!brand.trim()) {
      setFormError(t("brandRequired"));
      return;
    }
    try {
      await createProduct({
        name: name.trim(),
        brand: brand.trim(),
        category: category || undefined,
        opened_at: openedAt.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setName("");
      setBrand("");
      setCategory("");
      setOpenedAt("");
      setNotes("");
      setToast({ kind: "ok", text: t("addSuccess") });
      setTimeout(() => setToast(null), 4000);
    } catch (err) {
      if (err instanceof Error && err.message === "auth") {
        setFormError(t("needAuth"));
        return;
      }
      if (err instanceof Error && err.message === "premium_required") {
        setFormError(t("premiumWardrobeBody"));
        return;
      }
      setToast({ kind: "err", text: t("addError") });
    }
  }

  if (!hasAuth) {
    return (
      <Card className="opacity-80">
        <CardContent className="space-y-2 p-5 sm:p-6">
          <h2 className="text-lg font-semibold tracking-tight">{t("addTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("needAuth")}</p>
        </CardContent>
      </Card>
    );
  }

  if (!usageLoading && usageReady && !canWardrobeWrite && !isPremium) {
    return (
      <Card id={formId} className="opacity-95">
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-tight">{t("addTitle")}</h2>
          </div>
          <PremiumUpsellBanner
            title={tPremium("wardrobeTitle")}
            body={tPremium("wardrobeBody")}
            cta={tPremium("cta")}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card id={formId}>
      <CardContent className="space-y-4 p-5 sm:p-6">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">{t("addTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("addSub")}</p>
        </div>

        {toast ? (
          <ToastBanner
            kind={toast.kind}
            message={toast.text}
            onDismiss={() => setToast(null)}
            dismissLabel={t("dismissToast")}
          />
        ) : null}

        <form ref={formRef} className="space-y-3" onSubmit={(e) => void handleSubmit(e)}>
          <Field label={t("fieldName")} htmlFor="wardrobe-name" required>
            <input
              id="wardrobe-name"
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("placeholderName")}
              autoComplete="off"
            />
          </Field>

          <Field label={t("fieldBrand")} htmlFor="wardrobe-brand" required>
            <input
              id="wardrobe-brand"
              className={inputClass}
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder={t("placeholderBrand")}
              autoComplete="off"
            />
          </Field>

          <Field label={t("fieldCategory")} htmlFor="wardrobe-category">
            <select
              id="wardrobe-category"
              className={inputClass}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">{t("categoryUnset")}</option>
              {CATEGORY_IDS.map((id) => (
                <option key={id} value={id}>
                  {t(`categories.${id}`)}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t("fieldOpenedAt")} htmlFor="wardrobe-opened">
            <input
              id="wardrobe-opened"
              type="date"
              className={inputClass}
              value={openedAt}
              onChange={(e) => setOpenedAt(e.target.value)}
            />
          </Field>

          <Field label={t("fieldNotes")} htmlFor="wardrobe-notes">
            <textarea
              id="wardrobe-notes"
              className={`${inputClass} min-h-[5rem] resize-y`}
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("placeholderNotes")}
            />
          </Field>

          {formError ? (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          ) : null}

          <Button type="submit" className="w-full min-h-11 sm:w-auto" disabled={isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {t("adding")}
              </>
            ) : (
              <>
                <Plus className="size-4" aria-hidden />
                {t("addCta")}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({
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
