"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { useRouter } from "@/i18n/navigation";
import { fetchMascot, mascotQueryKey } from "@/lib/api/mascot";
import { useMascotFeature } from "@/lib/hooks/use-mascot-feature";
import { BEDA_INTRO_PATH } from "@/lib/mascot/intro";
import { useAuthStore } from "@/lib/stores/auth-store";

/**
 * After onboarding, send a Bé Da account to the intro once.
 * `introSeen === false` means this server knows the page and it is still due.
 * A missing field (older API) does not redirect.
 */
export function BeDaIntroNudge() {
  const router = useRouter();
  const { enabled, pending } = useMascotFeature();
  const completed = useAuthStore((s) => s.user?.onboarding_completed === true);
  const query = useQuery({
    queryKey: mascotQueryKey,
    queryFn: fetchMascot,
    enabled: !pending && enabled && completed,
    staleTime: 30_000,
    retry: 0,
  });

  useEffect(() => {
    if (!enabled || !completed || !query.isSuccess) return;
    if (query.data?.introSeen !== false) return;
    router.replace(BEDA_INTRO_PATH);
  }, [completed, enabled, query.data?.introSeen, query.isSuccess, router]);

  return null;
}
