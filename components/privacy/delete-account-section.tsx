"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useLayoutEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";

import { DeleteAccountDialogPanel } from "@/components/privacy/delete-account-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter } from "@/i18n/navigation";
import {
  submitAccountDeletion,
  type DeleteAccountFailure,
} from "@/lib/account/delete-account-flow";
import { clearLocalUserData } from "@/lib/clear-local-user-data";
import { useAuthStore } from "@/lib/stores/auth-store";

/** Signed-in settings control. Leaves the existing "delete my data" flow alone. */
export function DeleteAccountSection() {
  const t = useTranslations("privacy");
  const router = useRouter();
  const queryClient = useQueryClient();
  const logout = useAuthStore((s) => s.logout);
  const [, startTransition] = useTransition();

  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<DeleteAccountFailure | null>(null);
  const [busy, setBusy] = useState(false);

  const portalRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const close = useCallback(() => {
    if (busy) return;
    setOpen(false);
    setPassword("");
    setError(null);
  }, [busy]);

  useLayoutEffect(() => {
    if (!open) return;
    const portal = portalRef.current;
    if (!portal) return;

    const inerted: HTMLElement[] = [];
    for (const child of Array.from(document.body.children)) {
      if (!(child instanceof HTMLElement) || child === portal) continue;
      if (child.hasAttribute("inert")) continue;
      child.setAttribute("inert", "");
      inerted.push(child);
    }

    dialogRef.current
      ?.querySelector<HTMLElement>("#delete-account-password")
      ?.focus();

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        event.preventDefault();
        setOpen(false);
        setPassword("");
        setError(null);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const trigger = triggerRef.current;
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      for (const el of inerted) el.removeAttribute("inert");
      requestAnimationFrame(() => trigger?.focus());
    };
  }, [open, busy]);

  const confirm = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await submitAccountDeletion({
        password,
        logout,
        clearClientState: () => {
          clearLocalUserData();
          queryClient.clear();
        },
      });
      if (result.ok) {
        startTransition(() => {
          router.push({ pathname: "/", query: { accountDeleted: "1" } });
        });
        return;
      }
      setError(result.reason);
      setBusy(false);
    } catch {
      setError("failed");
      setBusy(false);
    }
  }, [logout, password, queryClient, router]);

  const copy = {
    title: t("deleteAccountConfirmTitle"),
    body: t("deleteAccountConfirmBody"),
    passwordLabel: t("deleteAccountPasswordLabel"),
    confirm: t("deleteAccountConfirmCta"),
    cancel: t("deleteAccountCancel"),
    closeAria: t("deleteAccountCloseAria"),
    working: t("deleteAccountWorking"),
    invalidPassword: t("deleteAccountInvalidPassword"),
    rateLimited: t("deleteAccountRateLimited"),
    failed: t("deleteAccountFailed"),
  };

  return (
    <Card className="border-destructive/30">
      <CardContent className="space-y-3 p-5 sm:p-6">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-destructive">{t("deleteAccountRowTitle")}</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t("deleteAccountRowSub")}
          </p>
        </div>
        <Button
          ref={triggerRef}
          type="button"
          variant="destructive"
          data-testid="delete-account-open"
          className="h-11 min-h-11"
          onClick={() => {
            setPassword("");
            setError(null);
            setOpen(true);
          }}
        >
          <Trash2 className="size-4" aria-hidden />
          {t("deleteAccountCta")}
        </Button>
      </CardContent>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={portalRef}
              className="fixed inset-0 z-[70] flex items-end justify-center p-3 sm:items-center sm:p-4"
            >
              <button
                type="button"
                aria-label={copy.closeAria}
                className="absolute inset-0 bg-black/50"
                onClick={close}
              />
              <div ref={dialogRef} className="relative flex max-h-full min-h-0 w-full max-w-md">
                <DeleteAccountDialogPanel
                  copy={copy}
                  password={password}
                  error={error}
                  busy={busy}
                  onPasswordChange={(value) => {
                    setPassword(value);
                    setError(null);
                  }}
                  onConfirm={() => void confirm()}
                  onClose={close}
                />
              </div>
            </div>,
            document.body,
          )
        : null}
    </Card>
  );
}
