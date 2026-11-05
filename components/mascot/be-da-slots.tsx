"use client";

import dynamic from "next/dynamic";

import { useMascotFeature } from "@/lib/hooks/use-mascot-feature";

const BeDaDiaryChip = dynamic(
  () => import("@/components/mascot/be-da-diary-chip").then((mod) => mod.BeDaDiaryChip),
  { ssr: false },
);

/**
 * Feature-gated. The mascot chunk stays unloaded unless GET /me says
 * `features.mascot`. A later 404 from /me/mascot hides the loaded UI.
 */
export function BeDaRoutineSlot() {
  const { enabled, pending } = useMascotFeature();
  if (pending || !enabled) return null;
  return <BeDaDiaryChip />;
}

export function BeDaHomeSlot() {
  const { enabled, pending } = useMascotFeature();
  if (pending || !enabled) return null;
  return <BeDaDiaryChip />;
}
