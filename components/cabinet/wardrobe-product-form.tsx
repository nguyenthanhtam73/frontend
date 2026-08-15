"use client";

import { Camera, ImagePlus, Loader2, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";

import {
  WardrobeCategorySelect,
  WardrobeField,
  wardrobeInputClass,
} from "@/components/cabinet/wardrobe-product-fields";
import { useWardrobe } from "@/components/cabinet/wardrobe-provider";
import { UpsellBanner } from "@/components/premium/upsell-banner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { scanWardrobeProductLabel } from "@/lib/api/wardrobe";
import { isWardrobeCategoryId } from "@/lib/cabinet/categories";
import { compressOnboardingPhoto, isLikelyImageFile } from "@/lib/onboarding/compress-photo";
import { Feature } from "@/lib/premium/features";
import { useFeatureGate } from "@/lib/premium/use-feature-gate";
import { FREE_WARDROBE_PRODUCT_LIMIT } from "@/lib/types/wardrobe";
import { cn } from "@/lib/utils";

type AiFilled = Partial<Record<"name" | "brand" | "category" | "notes", boolean>>;

export function WardrobeProductForm({ formId = "wardrobe-add-form" }: { formId?: string }) {
  const t = useTranslations("cabinet");
  const locale = useLocale();
  const formRef = useRef<HTMLFormElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const { hasAuth, createProduct, isCreating } = useWardrobe();
  const wardrobeGate = useFeatureGate(Feature.WardrobeFull);
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState<string>("");
  const [openedAt, setOpenedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [aiFilled, setAiFilled] = useState<AiFilled>({});
  const [isScanning, setIsScanning] = useState(false);
  const toast = useToast();

  const freeSlotsRemaining =
    !wardrobeGate.isPremium && !wardrobeGate.unlimited
      ? (wardrobeGate.remaining ||
          Math.max(0, (wardrobeGate.limit || FREE_WARDROBE_PRODUCT_LIMIT) - wardrobeGate.used))
      : null;

  function clearAiHighlight(field: keyof AiFilled) {
    setAiFilled((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function resetFormFields() {
    setName("");
    setBrand("");
    setCategory("");
    setOpenedAt("");
    setNotes("");
    setAiFilled({});
  }

  async function handleScanFile(fileList: FileList | null) {
    const raw = fileList?.[0];
    if (cameraRef.current) cameraRef.current.value = "";
    if (libraryRef.current) libraryRef.current.value = "";
    if (!raw) return;
    if (!isLikelyImageFile(raw)) {
      toast.error(t("scanInvalidImage"));
      return;
    }
    setFormError(null);
    setIsScanning(true);
    try {
      const { file } = await compressOnboardingPhoto(raw);
      const suggestion = await scanWardrobeProductLabel({ file, locale });
      const nextName = suggestion.name?.trim() ?? "";
      const nextBrand = suggestion.brand?.trim() ?? "";
      const nextCategory =
        suggestion.category && isWardrobeCategoryId(suggestion.category)
          ? suggestion.category
          : suggestion.category?.trim()
            ? "other"
            : "";
      const nextNotes = suggestion.notes?.trim() ?? "";

      if (!nextName && !nextBrand) {
        toast.error(t("scanUnreadable"));
        return;
      }

      setName(nextName);
      setBrand(nextBrand || "—");
      setCategory(nextCategory);
      if (nextNotes) setNotes(nextNotes);
      setAiFilled({
        name: !!nextName,
        brand: true,
        category: !!nextCategory,
        notes: !!nextNotes,
      });
      toast.success(t("scanSuccess"));
    } catch (err) {
      if (err instanceof Error && err.message === "auth") {
        toast.error(t("needAuth"));
        return;
      }
      if (
        err instanceof Error &&
        (err.message === "premium_required" || err.message === "quota_exceeded")
      ) {
        toast.error(t("premiumWardrobeBody"));
        return;
      }
      if (err instanceof Error && err.message === "rate_limited") {
        toast.error(t("scanRateLimited"));
        return;
      }
      toast.error(t("scanError"));
    } finally {
      setIsScanning(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (wardrobeGate.locked || isScanning) {
      return;
    }
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
      resetFormFields();
      toast.success(t("addSuccess"));
    } catch (err) {
      if (err instanceof Error && err.message === "auth") {
        setFormError(t("needAuth"));
        return;
      }
      if (
        err instanceof Error &&
        (err.message === "premium_required" || err.message === "quota_exceeded")
      ) {
        setFormError(t("premiumWardrobeBody"));
        return;
      }
      toast.error(t("addError"));
    }
  }

  const aiInputClass = (field: keyof AiFilled) =>
    cn(
      wardrobeInputClass,
      aiFilled[field] && "border-primary/50 bg-primary/5 ring-1 ring-primary/20",
    );

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

  if (wardrobeGate.isLoading) {
    return (
      <Card id={formId}>
        <CardContent className="space-y-3 p-5 sm:p-6">
          <h2 className="text-lg font-semibold tracking-tight">{t("addTitle")}</h2>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {t("addSub")}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (wardrobeGate.locked) {
    return (
      <Card id={formId} className="opacity-95">
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-tight">{t("addTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("addSub")}</p>
            <p className="text-sm text-muted-foreground">{t("freeLimitHint", { n: FREE_WARDROBE_PRODUCT_LIMIT })}</p>
          </div>
          <UpsellBanner
            id="upsell-wardrobe-full"
            feature={Feature.WardrobeFull}
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
          {freeSlotsRemaining != null ? (
            <p className="text-xs text-muted-foreground">
              {t("freeSlotsRemaining", {
                remaining: freeSlotsRemaining,
                n: FREE_WARDROBE_PRODUCT_LIMIT,
              })}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">{t("premiumUnlimitedHint")}</p>
          )}
        </div>

        <div className="space-y-2 rounded-xl border border-border/70 bg-muted/20 p-3">
          <p className="text-xs text-muted-foreground">{t("scanHint")}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="min-h-11 min-w-0 flex-1"
              disabled={isScanning || isCreating}
              onClick={() => cameraRef.current?.click()}
            >
              {isScanning ? (
                <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
              ) : (
                <Camera className="size-4 shrink-0" aria-hidden />
              )}
              <span className="truncate">{t("scanCameraCta")}</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="min-h-11 min-w-0 flex-1"
              disabled={isScanning || isCreating}
              onClick={() => libraryRef.current?.click()}
            >
              <ImagePlus className="size-4 shrink-0" aria-hidden />
              <span className="truncate">{t("scanLibraryCta")}</span>
            </Button>
          </div>
          {isScanning ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground" role="status">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              {t("scanLoading")}
            </p>
          ) : null}
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => void handleScanFile(e.target.files)}
          />
          <input
            ref={libraryRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/*"
            className="hidden"
            onChange={(e) => void handleScanFile(e.target.files)}
          />
        </div>

        <form ref={formRef} className="space-y-3" onSubmit={(e) => void handleSubmit(e)}>
          <WardrobeField label={t("fieldName")} htmlFor="wardrobe-name" required>
            <input
              id="wardrobe-name"
              className={aiInputClass("name")}
              value={name}
              onChange={(e) => {
                clearAiHighlight("name");
                setName(e.target.value);
              }}
              placeholder={t("placeholderName")}
              autoComplete="off"
              disabled={isScanning}
            />
          </WardrobeField>

          <WardrobeField label={t("fieldBrand")} htmlFor="wardrobe-brand" required>
            <input
              id="wardrobe-brand"
              className={aiInputClass("brand")}
              value={brand}
              onChange={(e) => {
                clearAiHighlight("brand");
                setBrand(e.target.value);
              }}
              placeholder={t("placeholderBrand")}
              autoComplete="off"
              disabled={isScanning}
            />
          </WardrobeField>

          <WardrobeField label={t("fieldCategory")} htmlFor="wardrobe-category">
            <div className={cn(aiFilled.category && "rounded-xl ring-1 ring-primary/20")}>
              <WardrobeCategorySelect
                id="wardrobe-category"
                value={category}
                onChange={(v) => {
                  clearAiHighlight("category");
                  setCategory(v);
                }}
              />
            </div>
          </WardrobeField>

          <WardrobeField label={t("fieldOpenedAt")} htmlFor="wardrobe-opened">
            <input
              id="wardrobe-opened"
              type="date"
              className={wardrobeInputClass}
              value={openedAt}
              onChange={(e) => setOpenedAt(e.target.value)}
              disabled={isScanning}
            />
          </WardrobeField>

          <WardrobeField label={t("fieldNotes")} htmlFor="wardrobe-notes">
            <textarea
              id="wardrobe-notes"
              className={cn(aiInputClass("notes"), "min-h-[5rem] resize-y")}
              rows={3}
              value={notes}
              onChange={(e) => {
                clearAiHighlight("notes");
                setNotes(e.target.value);
              }}
              placeholder={t("placeholderNotes")}
              disabled={isScanning}
            />
          </WardrobeField>

          {Object.keys(aiFilled).length > 0 ? (
            <p className="text-xs text-muted-foreground">{t("scanPrefillHint")}</p>
          ) : null}

          {formError ? (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          ) : null}

          <Button
            type="submit"
            className="w-full min-h-11 sm:w-auto"
            disabled={isCreating || isScanning}
          >
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
