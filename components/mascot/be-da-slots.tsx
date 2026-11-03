"use client";

import dynamic from "next/dynamic";

import { useMascotFeature } from "@/lib/hooks/use-mascot-feature";

const BeDaRoutineBanner = dynamic(
  () => import("@/components/mascot/be-da-routine-banner").then((mod) => mod.BeDaRoutineBanner),
  { ssr: false },
);

const BeDaHomeLink = dynamic(
  () => import("@/components/mascot/be-da-home-link").then((mod) => mod.BeDaHomeLink),
  { ssr: false },
);

/**
 * Feature-gated. The mascot chunk stays unloaded unless GET /me says
 * `features.mascot`. A later 404 from /me/mascot hides the loaded UI.
 */
export function BeDaRoutineSlot() {
  const { enabled, pending } = useMascotFeature();
  if (pending || !enabled) return null;
  return <BeDaRoutineBanner />;
}

export function BeDaHomeSlot() {
  const { enabled, pending } = useMascotFeature();
  if (pending || !enabled) return null;
  return <BeDaHomeLink />;
}
