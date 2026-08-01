"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import {
  WardrobeCategorySelect,
  WardrobeField,
  wardrobeInputClass,
} from "@/components/cabinet/wardrobe-product-fields";
import { useWardrobe } from "@/components/cabinet/wardrobe-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { WardrobeProductDTO } from "@/lib/types/wardrobe";

export function WardrobeProductEditDialog({
  product,
  open,
  onOpenChange,
}: {
  product: WardrobeProductDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("cabinet");
  const { updateProduct, isUpdating } = useWardrobe();
  const toast = useToast();
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [openedAt, setOpenedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!product || !open) return;
    setName(product.name ?? "");
    setBrand(product.brand ?? "");
    setCategory(product.category ?? "");
    setOpenedAt(product.opened_at ?? "");
    setNotes(product.notes ?? "");
    setFormError(null);
  }, [product, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!product) return;
    setFormError(null);
    if (!name.trim()) {
      setFormError(t("nameRequired"));
      return;
    }
    if (!brand.trim()) {
      setFormError(t("brandRequired"));
      return;
    }
    try {
      await updateProduct(product.id, {
        name: name.trim(),
        brand: brand.trim(),
        category: category || undefined,
        // Always send opened_at so clearing the date reaches the API.
        opened_at: openedAt.trim(),
        notes: notes.trim() || undefined,
      });
      toast.success(t("editSuccess"));
      onOpenChange(false);
    } catch (err) {
      if (err instanceof Error && err.message === "auth") {
        setFormError(t("needAuth"));
        return;
      }
      if (err instanceof Error && (err.message === "premium_required" || err.message === "quota_exceeded")) {
        setFormError(t("managePremiumRequired"));
        return;
      }
      toast.error(t("editError"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("editTitle")}</DialogTitle>
          <DialogDescription>{t("editSub")}</DialogDescription>
        </DialogHeader>

        <form className="space-y-3" onSubmit={(e) => void handleSubmit(e)}>
          <WardrobeField label={t("fieldName")} htmlFor="wardrobe-edit-name" required>
            <input
              id="wardrobe-edit-name"
              className={wardrobeInputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("placeholderName")}
              autoComplete="off"
            />
          </WardrobeField>

          <WardrobeField label={t("fieldBrand")} htmlFor="wardrobe-edit-brand" required>
            <input
              id="wardrobe-edit-brand"
              className={wardrobeInputClass}
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder={t("placeholderBrand")}
              autoComplete="off"
            />
          </WardrobeField>

          <WardrobeField label={t("fieldCategory")} htmlFor="wardrobe-edit-category">
            <WardrobeCategorySelect
              id="wardrobe-edit-category"
              value={category}
              onChange={setCategory}
            />
          </WardrobeField>

          <WardrobeField label={t("fieldOpenedAt")} htmlFor="wardrobe-edit-opened">
            <input
              id="wardrobe-edit-opened"
              type="date"
              className={wardrobeInputClass}
              value={openedAt}
              onChange={(e) => setOpenedAt(e.target.value)}
            />
          </WardrobeField>

          <WardrobeField label={t("fieldNotes")} htmlFor="wardrobe-edit-notes">
            <textarea
              id="wardrobe-edit-notes"
              className={`${wardrobeInputClass} min-h-[5rem] resize-y`}
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("placeholderNotes")}
            />
          </WardrobeField>

          {formError ? (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isUpdating}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={isUpdating || !product}>
              {isUpdating ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  {t("saving")}
                </>
              ) : (
                t("saveCta")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
