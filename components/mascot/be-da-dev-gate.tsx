"use client";

import dynamic from "next/dynamic";

import { useAdminGate } from "@/lib/hooks/use-admin-gate";

const BeDaSheet = dynamic(
  () => import("@/components/mascot/be-da-sheet").then((mod) => mod.BeDaSheet),
  { ssr: false },
);

/** Review sheet. Same admin gate as the product surfaces. */
export function BeDaDevGate() {
  const { isAdmin, authPending } = useAdminGate();
  if (authPending || !isAdmin) return null;
  return <BeDaSheet />;
}
