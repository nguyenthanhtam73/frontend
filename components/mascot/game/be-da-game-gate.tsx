"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";

import { useMascotFeature } from "@/lib/hooks/use-mascot-feature";
import { useRouter } from "@/i18n/navigation";

const BeDaGameScreen = dynamic(
  () => import("@/components/mascot/game/be-da-game-screen").then((mod) => mod.BeDaGameScreen),
  { ssr: false },
);

/** Full-screen trial. The chunk stays unloaded unless GET /me says features.mascot. */
export function BeDaGameGate({ roomCode = null }: { roomCode?: string | null }) {
  const { enabled, pending } = useMascotFeature();
  const router = useRouter();

  useEffect(() => {
    if (pending || enabled) return;
    router.replace("/check-in");
  }, [enabled, pending, router]);

  if (pending || !enabled) return null;
  return <BeDaGameScreen roomCode={roomCode} />;
}
