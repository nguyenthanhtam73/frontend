"use client";

import dynamic from "next/dynamic";

import { useMascotFeature } from "@/lib/hooks/use-mascot-feature";

const BeDaSheet = dynamic(
  () => import("@/components/mascot/be-da-dev-sheet").then((mod) => mod.BeDaDevSheet),
  { ssr: false },
);

/** Review sheet. Same feature gate as the product surfaces. */
export function BeDaDevGate() {
  const { enabled, pending } = useMascotFeature();
  if (pending || !enabled) return null;
  return <BeDaSheet />;
}
