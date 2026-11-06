"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";

import { useMascotFeature } from "@/lib/hooks/use-mascot-feature";
import { useRouter } from "@/i18n/navigation";

const BeDaGameScreen = dynamic(
  () => import("@/components/mascot/game/be-da-game-screen").then((mod) => mod.BeDaGameScreen),
  { ssr: false },
);

/**
 * Full-screen trial. The chunk stays unloaded unless GET /me says features.mascot.
 * `embed` is the Android WebView entry: hide site chrome immediately and keep touch as the primary input.
 */
export function BeDaGameGate({ roomCode = null, embed = false }: { roomCode?: string | null; embed?: boolean }) {
  const { enabled, pending } = useMascotFeature();
  const router = useRouter();

  useEffect(() => {
    if (!embed) return;
    document.body.dataset.gameEmbed = "1";
    const previous = document.body.style.touchAction;
    document.body.style.touchAction = "manipulation";
    return () => {
      delete document.body.dataset.gameEmbed;
      document.body.style.touchAction = previous;
    };
  }, [embed]);

  useEffect(() => {
    if (pending || enabled) return;
    router.replace("/check-in");
  }, [enabled, pending, router]);

  if (pending || !enabled) return null;
  return <BeDaGameScreen roomCode={roomCode} />;
}
