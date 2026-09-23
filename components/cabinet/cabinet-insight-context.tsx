"use client";

import { useQuery } from "@tanstack/react-query";
import { createContext, useContext, useMemo, type ReactNode } from "react";

import { useWardrobe } from "@/components/cabinet/wardrobe-provider";
import { apiGet } from "@/lib/api-client";
import { fetchSkinProfile, skinProfileQueryKey } from "@/lib/api/profile";
import { concernsFromProfile, tagsFromTimeline } from "@/lib/cabinet/insight-signals";
import type { SkinProfileResponse } from "@/lib/types/profile";
import type { ProgressTimelineDTO } from "@/lib/types/progress";

export type CabinetInsightSnapshot = {
  skinType: string;
  concerns: string[];
  recentTags: string[];
};

export type CabinetInsightContextValue = CabinetInsightSnapshot & {
  isLoading: boolean;
  isError: boolean;
  reload: () => Promise<CabinetInsightSnapshot>;
};

const CabinetInsightContext = createContext<CabinetInsightContextValue | null>(null);
const recentCheckInsKey = ["cabinet", "insight-checkins"] as const;
const EMPTY_TAGS: string[] = [];

async function fetchRecentCheckInTags(): Promise<string[]> {
  const timeline = await apiGet<ProgressTimelineDTO>("/api/v1/progress?range=30&limit=5", {
    toastOnError: false,
  });
  return tagsFromTimeline(timeline);
}

function snapshotFrom(
  profile: SkinProfileResponse | null | undefined,
  recentTags: string[],
): CabinetInsightSnapshot {
  return {
    skinType: profile?.skin_type ?? "",
    concerns: concernsFromProfile(profile),
    recentTags,
  };
}

/** One profile + recent check-in read shared by every cabinet card. */
export function CabinetInsightProvider({ children }: { children: ReactNode }) {
  const { hasAuth, products } = useWardrobe();
  const enabled = hasAuth && products.length > 0;

  const profileQuery = useQuery({
    queryKey: skinProfileQueryKey,
    queryFn: fetchSkinProfile,
    enabled,
    staleTime: 60_000,
    retry: 1,
  });
  const recentQuery = useQuery({
    queryKey: recentCheckInsKey,
    queryFn: fetchRecentCheckInTags,
    enabled,
    staleTime: 60_000,
    retry: 1,
  });

  const profile = profileQuery.data;
  const profileLoading = profileQuery.isLoading;
  const profileError = profileQuery.isError;
  const refetchProfile = profileQuery.refetch;
  const recentTags = recentQuery.data ?? EMPTY_TAGS;
  const recentLoading = recentQuery.isLoading;
  const recentError = recentQuery.isError;
  const refetchRecent = recentQuery.refetch;

  const value = useMemo<CabinetInsightContextValue>(() => {
    const current = snapshotFrom(profile, recentTags);
    return {
      ...current,
      isLoading: enabled && (profileLoading || recentLoading),
      isError: profileError || recentError,
      reload: async () => {
        const [nextProfile, nextRecent] = await Promise.all([refetchProfile(), refetchRecent()]);
        if (nextProfile.isError || nextRecent.isError) throw new Error("insight_context");
        return snapshotFrom(nextProfile.data ?? null, nextRecent.data ?? EMPTY_TAGS);
      },
    };
  }, [
    enabled,
    profile,
    profileLoading,
    profileError,
    refetchProfile,
    recentTags,
    recentLoading,
    recentError,
    refetchRecent,
  ]);

  return <CabinetInsightContext.Provider value={value}>{children}</CabinetInsightContext.Provider>;
}

export function useCabinetInsight(): CabinetInsightContextValue {
  const ctx = useContext(CabinetInsightContext);
  if (!ctx) {
    throw new Error("useCabinetInsight must be used within CabinetInsightProvider");
  }
  return ctx;
}
