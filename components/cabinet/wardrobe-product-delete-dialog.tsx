"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

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

export function WardrobeProductDeleteDialog({
  product,
  open,
  onOpenChange,
}: {
  product: WardrobeProductDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("cabinet");
  const { deleteProduct, isDeleting } = useWardrobe();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!product) return;
    setError(null);
    try {
      await deleteProduct(product.id);
      toast.success(t("deleteSuccess"));
      onOpenChange(false);
    } catch (err) {
      if (err instanceof Error && err.message === "auth") {
        setError(t("needAuth"));
        return;
      }
      if (err instanceof Error && (err.message === "premium_required" || err.message === "quota_exceeded")) {
        setError(t("managePremiumRequired"));
        return;
      }
      toast.error(t("deleteError"));
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setError(null);
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("deleteTitle")}</DialogTitle>
          <DialogDescription>
            {t("deleteBody", {
              name: product?.name ?? "",
              brand: product?.brand ?? "",
            })}
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            {t("cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isDeleting || !product}
            onClick={() => void handleConfirm()}
          >
            {isDeleting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {t("deleting")}
              </>
            ) : (
              t("deleteConfirmCta")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
