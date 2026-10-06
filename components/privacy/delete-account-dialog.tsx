import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { canConfirmDeleteAccount, type DeleteAccountFailure } from "@/lib/account/delete-account-flow";

export type DeleteAccountDialogCopy = {
  title: string;
  body: string;
  premium: string;
  passwordLabel: string;
  confirm: string;
  cancel: string;
  closeAria: string;
  working: string;
  invalidPassword: string;
  rateLimited: string;
  failed: string;
};

type DeleteAccountDialogPanelProps = {
  copy: DeleteAccountDialogCopy;
  password: string;
  error: DeleteAccountFailure | null;
  busy: boolean;
  onPasswordChange: (value: string) => void;
  onConfirm: () => void;
  onClose: () => void;
};

const errorText: Record<DeleteAccountFailure, keyof DeleteAccountDialogCopy> = {
  invalid_password: "invalidPassword",
  rate_limited: "rateLimited",
  failed: "failed",
};

/**
 * Confirm dialog body. The overlay lives in the settings section so this
 * panel can render in tests without a DOM portal.
 * At 390px the card scrolls inside the viewport and actions stay ≥44px.
 */
export function DeleteAccountDialogPanel({
  copy,
  password,
  error,
  busy,
  onPasswordChange,
  onConfirm,
  onClose,
}: DeleteAccountDialogPanelProps) {
  const canConfirm = canConfirmDeleteAccount(password);
  const message = error ? copy[errorText[error]] : null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-account-title"
      aria-describedby={
        error
          ? "delete-account-body delete-account-premium delete-account-error"
          : "delete-account-body delete-account-premium"
      }
      aria-busy={busy}
      data-testid="delete-account-dialog"
      className="relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border-2 border-destructive/40 bg-background shadow-2xl"
    >
      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          if (!canConfirm || busy) return;
          onConfirm();
        }}
      >
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          <h2
            id="delete-account-title"
            className="text-sm font-semibold leading-snug text-destructive"
          >
            {copy.title}
          </h2>
          <p id="delete-account-body" className="text-sm leading-relaxed text-muted-foreground">
            {copy.body}
          </p>
          <p
            id="delete-account-premium"
            data-testid="delete-account-premium"
            className="text-sm leading-relaxed text-muted-foreground"
          >
            {copy.premium}
          </p>
          <div className="space-y-1.5">
            <label
              htmlFor="delete-account-password"
              className="text-xs font-medium text-muted-foreground"
            >
              {copy.passwordLabel}
            </label>
            <input
              id="delete-account-password"
              data-testid="delete-account-password"
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              disabled={busy}
              className="w-full min-h-11 rounded-xl border border-destructive/40 bg-background px-3 py-2 text-base outline-none focus-visible:border-destructive focus-visible:ring-[3px] focus-visible:ring-destructive/25"
            />
          </div>
          {message ? (
            <p id="delete-account-error" role="alert" className="text-sm text-destructive">
              {message}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col gap-2 border-t border-border/70 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button
            type="submit"
            variant="destructive"
            data-testid="delete-account-confirm"
            className="h-11 min-h-11 w-full"
            disabled={!canConfirm || busy}
          >
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {copy.working}
              </>
            ) : (
              copy.confirm
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            data-testid="delete-account-cancel"
            className="h-11 min-h-11 w-full"
            onClick={onClose}
            disabled={busy}
          >
            {copy.cancel}
          </Button>
        </div>
      </form>
    </div>
  );
}
