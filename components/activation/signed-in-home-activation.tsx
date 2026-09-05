"use client";

import { getAccessToken } from "@/lib/auth-token";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useClientMounted } from "@/lib/use-client-mounted";

import { ActivationStreakCard } from "./activation-streak-card";

/** Compact streak on marketing home for signed-in users (reminder lives in the shell banner). */
export function SignedInHomeActivation() {
  const mounted = useClientMounted();
  const user = useAuthStore((s) => s.user);
  const signedIn = Boolean(user || getAccessToken());

  if (!mounted || !signedIn) return null;

  return (
    <div
      className="mx-auto w-full max-w-6xl px-4 pt-4 sm:px-6 sm:pt-6"
      data-testid="signed-in-home-activation"
    >
      <ActivationStreakCard />
    </div>
  );
}
