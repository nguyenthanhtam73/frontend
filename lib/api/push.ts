import { ApiError, apiDelete, apiGet, apiPost } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth-token";
import type {
  PushSubscriptionResponse,
  PushTestResponse,
  PushUnsubscribeResponse,
  SubscribePushPayload,
} from "@/lib/types/push";

/** Persist a browser Web Push subscription for the authenticated user. */
export async function subscribePush(
  payload: SubscribePushPayload,
): Promise<PushSubscriptionResponse> {
  if (!getAccessToken()) {
    throw new Error("auth");
  }
  try {
    return await apiPost<PushSubscriptionResponse>("/api/v1/me/push/subscribe", payload, {
      toastOnError: false,
    });
  } catch (err) {
    if (err instanceof ApiError && (err.kind === "unauthorized" || err.kind === "forbidden")) {
      throw new Error("auth");
    }
    throw err;
  }
}

/** Remove all push subscriptions for the authenticated user. */
export async function unsubscribePush(): Promise<PushUnsubscribeResponse> {
  if (!getAccessToken()) {
    throw new Error("auth");
  }
  try {
    return await apiDelete<PushUnsubscribeResponse>("/api/v1/me/push/unsubscribe", {
      toastOnError: false,
    });
  } catch (err) {
    if (err instanceof ApiError && (err.kind === "unauthorized" || err.kind === "forbidden")) {
      throw new Error("auth");
    }
    throw err;
  }
}

/**
 * Ask the backend to send a test Web Push to the authenticated user's
 * active subscription (Phase 2.2).
 */
export async function sendTestPush(): Promise<PushTestResponse> {
  if (!getAccessToken()) {
    throw new Error("auth");
  }
  try {
    return await apiPost<PushTestResponse>("/api/v1/me/push/test", undefined, {
      toastOnError: false,
    });
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.kind === "unauthorized" || err.kind === "forbidden") {
        throw new Error("auth");
      }
      if (err.status === 404 || err.code === "not_found") {
        throw new Error("not_found");
      }
      if (err.code === "push_not_configured") {
        throw new Error("not_configured");
      }
    }
    throw err;
  }
}

/**
 * Fetch the user's active subscription, or `null` when none exists (404).
 * Used by Settings to sync enabled/disabled state with the backend.
 */
export async function fetchActivePushSubscription(): Promise<PushSubscriptionResponse | null> {
  if (!getAccessToken()) {
    throw new Error("auth");
  }
  try {
    return await apiGet<PushSubscriptionResponse>("/api/v1/me/push/subscription", {
      toastOnError: false,
    });
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.kind === "unauthorized" || err.kind === "forbidden") {
        throw new Error("auth");
      }
      if (err.status === 404 || err.code === "not_found") {
        return null;
      }
    }
    throw err;
  }
}
