import { ApiError, apiPost } from "@/lib/api-client";
import type {
  BetaSignupCreateResponse,
  CreateBetaSignupPayload,
} from "@/lib/types/beta-signup";

/** POST /api/v1/beta-signups — public landing-page Beta waitlist signup. */
export async function submitBetaSignup(
  payload: CreateBetaSignupPayload,
): Promise<BetaSignupCreateResponse> {
  return apiPost<BetaSignupCreateResponse>("/api/v1/beta-signups", payload, {
    auth: false,
    toastOnError: false,
  });
}

/** Map backend error codes to i18n keys under the `betaSignup` namespace. */
export function betaSignupErrorKey(err: unknown): string {
  if (!(err instanceof ApiError)) return "errorGeneric";
  if (err.code === "email_already_registered") return "emailAlreadyRegistered";
  if (err.code === "invalid_email") return "invalidEmail";
  if (err.kind === "server" || err.status === 503) return "errorServer";
  return "errorGeneric";
}
