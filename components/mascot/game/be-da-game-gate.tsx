"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { useMascotFeature } from "@/lib/hooks/use-mascot-feature";
import { buildAuthHrefWithNext } from "@/lib/auth/return-path";
import { getAccessToken } from "@/lib/auth-token";
import { normalizeRoomCode, roomInvitePath } from "@/lib/mascot/game/spa-room";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useRouter } from "@/i18n/navigation";

/** How long the gate may stay on the opening line before offering another try. */
export const GAME_GATE_RETRY_MS = 8000;

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
    const code = roomCode ? normalizeRoomCode(roomCode) : null;
    if (!getAccessToken() && code) {
      router.replace(buildAuthHrefWithNext("/register", roomInvitePath(code)));
      return;
    }
    router.replace("/check-in");
  }, [enabled, pending, roomCode, router]);

  if (pending || !enabled) return <BeDaGameWait />;
  return <BeDaGameScreen roomCode={roomCode} />;
}

export function BeDaGameWait({ initialRetry = false }: { initialRetry?: boolean }) {
  const t = useTranslations("mascot");
  const [retry, setRetry] = useState(initialRetry);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (initialRetry) return;
    setRetry(false);
    const timer = window.setTimeout(() => setRetry(true), GAME_GATE_RETRY_MS);
    return () => window.clearTimeout(timer);
  }, [attempt, initialRetry]);

  async function onRetry() {
    setRetry(false);
    setAttempt((value) => value + 1);
    await useAuthStore.getState().refresh();
    const { user, loading } = useAuthStore.getState();
    if (!user && (loading || !!getAccessToken())) window.location.reload();
  }

  return (
    <div className="beda-gate-wait" data-testid="beda-gate-wait" data-retry={retry ? "1" : "0"}>
      <p>{t("game.opening")}</p>
      {retry ? (
        <button type="button" className="beda-gate-retry" data-testid="beda-gate-retry" onClick={() => void onRetry()}>
          {t("game.tryAgain")}
        </button>
      ) : null}
    </div>
  );
}
