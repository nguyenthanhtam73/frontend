import { ApiError, apiFetch } from "@/lib/api-client";

import { clearDeviceAfterAccountDeletion } from "./clear-device-after-delete";

/** Backend contract: DELETE /api/v1/me with JSON `{ "password": "..." }`. */
export const DELETE_ACCOUNT_API_PATH = "/api/v1/me";

export type DeleteAccountFailure = "invalid_password" | "rate_limited" | "failed";

export type DeleteAccountResult =
  | { ok: true }
  | { ok: false; reason: DeleteAccountFailure };

/** Confirm stays disabled until the password field has something in it. */
export function canConfirmDeleteAccount(password: string): boolean {
  return password.length > 0;
}

export function classifyDeleteAccountError(err: unknown): DeleteAccountFailure {
  if (err instanceof ApiError) {
    if (err.status === 401 && err.code === "invalid_password") return "invalid_password";
    if (err.kind === "rate_limited" || err.status === 429) return "rate_limited";
  }
  return "failed";
}

/**
 * DELETE the signed-in account. 204 resolves as success.
 * Wrong password and rate limits stay on the dialog — the access token is kept.
 */
export async function requestDeleteAccount(password: string): Promise<DeleteAccountResult> {
  try {
    await apiFetch<void>(DELETE_ACCOUNT_API_PATH, {
      method: "DELETE",
      body: { password },
      toastOnError: false,
      clearTokenOn401: false,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: classifyDeleteAccountError(err) };
  }
}

/**
 * After a 204, wipe tokens and device state locally.
 * Do not call `/auth/logout` or push unsubscribe — the account is already gone.
 */
export async function submitAccountDeletion(deps: {
  password: string;
  request?: (password: string) => Promise<DeleteAccountResult>;
  clearDevice?: () => Promise<void>;
}): Promise<DeleteAccountResult> {
  const request = deps.request ?? requestDeleteAccount;
  const result = await request(deps.password);
  if (!result.ok) return result;
  await (deps.clearDevice ?? clearDeviceAfterAccountDeletion)();
  return result;
}
