"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale } from "next-intl";

import { BeDaIntroScreen } from "@/components/mascot/intro/be-da-intro-screen";
import { useRouter } from "@/i18n/navigation";
import { fetchMascot, mascotQueryKey, saveMascotIntro } from "@/lib/api/mascot";
import { fetchSkinProfile } from "@/lib/api/profile";
import { getAccessToken } from "@/lib/auth-token";
import { useMascotFeature } from "@/lib/hooks/use-mascot-feature";
import {
  BEDA_GAME_PATH,
  SAMPLE_FIRST_MARKS,
  introFaceMarks,
  introPageIndex,
  introShowsPicker,
  introShot,
  marksFromFirstSkin,
  leaveClosedMascotIntro,
  postIntroDone,
  readIntroBridge,
  type IntroPageId,
} from "@/lib/mascot/intro";
import { parseOnboardingSnapshot } from "@/lib/onboarding/snapshot";
import type { BeDaGender, SkinMark } from "@/lib/mascot/model";

/**
 * Góc bình yên intro. Access is the same as the game: `features.mascot` from
 * GET /me, which is true for admins and for any signed-in Android WebView
 * (the app adds X-DaDiary-Client: android-app on DaDiary requests).
 */
export function BeDaIntroRoute() {
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { enabled, pending } = useMascotFeature();
  const { search, ready } = useClientSearch();
  const shot = introShot(search);
  const replay = introShowsPicker(search);
  const [page, setPage] = useState(0);
  const [gender, setGender] = useState<BeDaGender>("female");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [left, setLeft] = useState(false);
  const hasAuth = enabled || (typeof window !== "undefined" && !!getAccessToken());

  const mascot = useQuery({
    queryKey: mascotQueryKey,
    queryFn: fetchMascot,
    enabled: !shot && hasAuth,
    retry: 1,
  });
  const profile = useQuery({
    queryKey: ["profile", "intro-marks"],
    queryFn: fetchSkinProfile,
    enabled: !shot && hasAuth,
    retry: 0,
  });

  const shownPage = shot ? shotPage(shot) : page;
  const shownGender: BeDaGender = shot === "male" ? "male" : gender;

  useEffect(() => {
    document.body.dataset.gameEmbed = "1";
    return () => {
      delete document.body.dataset.gameEmbed;
    };
  }, []);

  const savedGender = mascot.data?.gender === "male" ? "male" : "female";
  const introSeen = mascot.data?.introSeen === true;
  const firstMarks = useMemo(() => {
    if (shot) return [...SAMPLE_FIRST_MARKS];
    const snap = parseOnboardingSnapshot(profile.data?.onboarding_snapshot);
    const analysis = snap?.skin_analysis;
    return marksFromFirstSkin({
      concerns: profile.data?.concerns,
      analysis: analysis && typeof analysis === "object" ? analysis : null,
    });
  }, [profile.data, shot]);
  const marks: SkinMark[] = shot
    ? [...SAMPLE_FIRST_MARKS]
    : introFaceMarks(firstMarks, mascot.data?.skinMarks ?? []);

  useEffect(() => {
    if (shot || left || !mascot.isSuccess) return;
    // A stale introSeen:true must not skip the picker while a reset refetch is in flight.
    if (introSeen && mascot.isFetching && !replay) return;
    if (!introSeen || replay) {
      if (mascot.data?.gender) setGender(mascot.data.gender);
      return;
    }
    const bridge = readIntroBridge(window);
    postIntroDone(bridge, savedGender);
    if (!bridge) router.replace(BEDA_GAME_PATH);
    setLeft(true);
  }, [introSeen, left, mascot.data?.gender, mascot.isFetching, mascot.isSuccess, replay, router, savedGender, shot]);

  useEffect(() => {
    if (!ready || shot || pending) return;
    if (enabled) return;
    leaveClosedMascotIntro(readIntroBridge(window), (href) => router.replace(href));
  }, [enabled, pending, ready, router, shot]);

  async function finish() {
    if (shot) {
      router.replace(BEDA_GAME_PATH);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = await saveMascotIntro(gender);
      queryClient.setQueryData(mascotQueryKey, saved);
      const bridge = readIntroBridge(window);
      postIntroDone(bridge, gender);
      if (!bridge) router.replace(BEDA_GAME_PATH);
    } catch {
      setError(locale.toLowerCase().startsWith("en") ? "Couldn't save. Try again." : "Chưa lưu được. Thử lại nhé.");
    } finally {
      setSaving(false);
    }
  }

  if (!ready) return <IntroWait />;
  if (!shot && (pending || !enabled || left || (introSeen && !replay && !mascot.isError))) {
    return <IntroWait />;
  }
  if (!shot && mascot.isLoading) return <IntroWait />;

  return (
    <BeDaIntroScreen
      locale={locale}
      marks={marks}
      gender={shownGender}
      page={shownPage}
      saving={saving}
      error={error}
      onGender={setGender}
      onPage={setPage}
      onFinish={() => void finish()}
    />
  );
}

function shotPage(shot: IntroPageId | "male" | "female" | null): number {
  if (shot === "male" || shot === "female" || shot == null) return 0;
  return introPageIndex(shot);
}

function useClientSearch(): { search: string; ready: boolean } {
  const [search, setSearch] = useState("");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setSearch(window.location.search);
    setReady(true);
  }, []);
  return { search, ready };
}

function IntroWait() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#fff1f4] text-sm text-[#8a6572]" role="status">
      …
    </div>
  );
}
