"use client";

import { Camera } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

/**
 * First thing on the check-in form: one primary camera action and the
 * existing skip-to-submit path directly under it. Sized so both fit on a
 * 360×740 phone without scrolling past the page title.
 */
export function CheckInOpenActions({
  disabled,
  onTakePhoto,
  onSaveWithoutPhoto,
}: {
  disabled?: boolean;
  onTakePhoto: () => void;
  onSaveWithoutPhoto: () => void;
}) {
  const t = useTranslations("checkIn");

  return (
    <div data-testid="checkin-open-actions" className="space-y-2">
      <Button
        type="button"
        data-testid="checkin-open-take-photo"
        className="h-auto min-h-14 w-full gap-2 rounded-xl px-4 py-3.5 text-base font-semibold shadow-sm"
        disabled={disabled}
        onClick={onTakePhoto}
      >
        <Camera className="size-5 shrink-0" aria-hidden />
        {t("openTakePhoto")}
      </Button>
      <p
        data-testid="checkin-open-privacy"
        className="text-center text-xs leading-snug text-muted-foreground"
      >
        {t("openPhotoPrivacy")}
      </p>
      <Button
        type="button"
        variant="outline"
        data-testid="checkin-open-skip"
        className="h-auto min-h-12 w-full rounded-xl bg-background px-4 py-2.5 text-sm font-medium"
        disabled={disabled}
        onClick={onSaveWithoutPhoto}
      >
        {t("openSaveWithoutPhoto")}
      </Button>
    </div>
  );
}
