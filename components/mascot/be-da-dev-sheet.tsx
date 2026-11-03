"use client";

import { BeDaSheet } from "@/components/mascot/be-da-sheet";
import { useBeDaView } from "@/lib/hooks/use-mascot";

/** Static mood sheet. Hidden when GET /me/mascot is missing. */
export function BeDaDevSheet() {
  const { hidden } = useBeDaView();
  if (hidden) return null;
  return <BeDaSheet />;
}
