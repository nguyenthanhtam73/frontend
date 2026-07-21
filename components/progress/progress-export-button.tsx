"use client";

import { Download, Loader2, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";

import { UpsellBanner } from "@/components/premium/upsell-banner";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ApiError } from "@/lib/api-client";
import { downloadUserDataExport, isExportFeatureDenied } from "@/lib/api/user-data";
import { Feature } from "@/lib/premium/features";
import { useFeatureGate } from "@/lib/premium/use-feature-gate";
import { cn } from "@/lib/utils";

type ProgressExportButtonProps = {
  className?: string;
};

/**
 * Progress/Timeline export control.
 * Locked Free users get UpsellBanner → /pricing; Premium downloads JSON safely.
 */
export function ProgressExportButton({ className }: ProgressExportButtonProps) {
  const t = useTranslations("progress.export");
  const { success: toastSuccess, error: toastError } = useToast();
  const gate = useFeatureGate(Feature.ExportData);
  const [busy, setBusy] = useState(false);
  const [showUpsell, setShowUpsell] = useState(false);

  const onExport = useCallback(async () => {
    if (gate.isLoading || busy) return;

    if (gate.locked) {
      setShowUpsell(true);
      // Scroll banner into view after paint.
      requestAnimationFrame(() => {
        document.getElementById("upsell-export-data")?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      });
      return;
    }

    setShowUpsell(false);
    setBusy(true);
    try {
      const filename = await downloadUserDataExport();
      toastSuccess({
        title: t("successTitle"),
        description: t("successBody", { filename }),
      });
    } catch (err) {
      if (isExportFeatureDenied(err)) {
        setShowUpsell(true);
        return;
      }
      if (err instanceof ApiError && err.status === 401) {
        toastError({ title: t("errorTitle"), description: t("needAuth") });
        return;
      }
      toastError({
        title: t("errorTitle"),
        description: err instanceof ApiError ? err.userMessage(t("errorBody")) : t("errorBody"),
      });
    } finally {
      setBusy(false);
    }
  }, [gate.isLoading, gate.locked, busy, t, toastSuccess, toastError]);

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={cn("min-h-9 gap-1.5", className)}
        disabled={busy || gate.isLoading}
        aria-busy={busy}
        title={gate.locked ? t("lockedHint") : t("cta")}
        onClick={() => void onExport()}
      >
        {busy ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
        ) : gate.locked ? (
          <Lock className="size-3.5 opacity-70" aria-hidden />
        ) : (
          <Download className="size-3.5" aria-hidden />
        )}
        {busy ? t("exporting") : t("cta")}
      </Button>

      {showUpsell && gate.locked ? (
        <div className="basis-full">
          <UpsellBanner
            id="upsell-export-data"
            feature={Feature.ExportData}
            hideWhenAllowed={false}
            compact
            onDismiss={() => setShowUpsell(false)}
          />
        </div>
      ) : null}
    </>
  );
}
