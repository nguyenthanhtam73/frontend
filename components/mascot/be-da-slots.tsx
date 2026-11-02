"use client";

import dynamic from "next/dynamic";

import { useAdminGate } from "@/lib/hooks/use-admin-gate";

const BeDaRoutineBanner = dynamic(
  () => import("@/components/mascot/be-da-routine-banner").then((mod) => mod.BeDaRoutineBanner),
  { ssr: false },
);

const BeDaHomeLink = dynamic(
  () => import("@/components/mascot/be-da-home-link").then((mod) => mod.BeDaHomeLink),
  { ssr: false },
);

/**
 * Admin-only. The mascot chunk stays unloaded until `is_admin` is true,
 * so everyone else keeps the current page with no extra bundle.
 */
export function BeDaRoutineSlot() {
  const { isAdmin, authPending } = useAdminGate();
  if (authPending || !isAdmin) return null;
  return <BeDaRoutineBanner />;
}

export function BeDaHomeSlot() {
  const { isAdmin, authPending } = useAdminGate();
  if (authPending || !isAdmin) return null;
  return <BeDaHomeLink />;
}
