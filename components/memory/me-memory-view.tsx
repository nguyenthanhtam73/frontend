"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Brain,
  ChevronDown,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { fetchUserMemory, userMemoryQueryKey } from "@/lib/api/user-memory";
import { getAccessToken } from "@/lib/auth-token";
import { useAuthStore } from "@/lib/stores/auth-store";
import { cn } from "@/lib/utils";

export function MeMemoryView() {
  const t = useTranslations("meMemory");
  const formatter = useFormatter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const hasAuth = !!user || !!getAccessToken();
  const [lastFetchFresh, setLastFetchFresh] = useState(false);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: userMemoryQueryKey(lastFetchFresh),
    queryFn: () => fetchUserMemory(lastFetchFresh),
    enabled: hasAuth,
    retry: 1,
  });

  const generatedLabel = useMemo(() => {
    const iso = data?.generated_at;
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return formatter.dateTime(d, { dateStyle: "medium", timeStyle: "short" });
  }, [data?.generated_at, formatter]);

  const memorySections = useMemo(
    () => (data?.memory_text ? splitMemorySections(data.memory_text) : []),
    [data?.memory_text],
  );

  if (!hasAuth) {
    return (
      <Card className="border-dashed border-primary/25">
        <CardContent className="space-y-3 p-6">
          <p className="text-sm text-muted-foreground">{t("needAuth")}</p>
          <Link href="/login" className={buttonVariants({ size: "sm" })}>
            {t("signIn")}
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return <MemorySkeleton />;
  }

  if (isError) {
    const needAuth = error instanceof Error && error.message === "auth";
    return (
      <Card className="border-destructive/30">
        <CardContent className="space-y-3 p-6">
          <p role="alert" className="flex items-start gap-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {needAuth ? t("needAuth") : t("loadError")}
          </p>
          {needAuth ? (
            <Link href="/login" className={buttonVariants({ size: "sm" })}>
              {t("signIn")}
            </Link>
          ) : (
            <Button type="button" size="sm" variant="outline" onClick={() => void refetch()}>
              {t("retry")}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const stats = data.stats;
  const sections = stats.sections_present ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Brain className="size-5 text-primary" aria-hidden />
            <h2 className="text-lg font-semibold tracking-tight">{t("previewTitle")}</h2>
          </div>
          <p className="text-sm text-muted-foreground">{t("previewSub")}</p>
          {generatedLabel ? (
            <p className="text-xs text-muted-foreground">
              {t("generatedAt", { when: generatedLabel })}
              {data.cached ? ` · ${t("cachedBadge")}` : ` · ${t("freshBadge")}`}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="min-h-10 shrink-0"
          disabled={isFetching}
          onClick={() => {
            void (async () => {
              setLastFetchFresh(true);
              await queryClient.fetchQuery({
                queryKey: userMemoryQueryKey(true),
                queryFn: () => fetchUserMemory(true),
              });
            })();
          }}
        >
          {isFetching ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="size-4" aria-hidden />
          )}
          {t("refreshCta")}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatPill label={t("statChecks")} value={String(stats.total_checks)} />
        <StatPill label={t("statFeedback")} value={String(stats.total_feedback)} />
        <StatPill
          label={t("statVotes")}
          value={`${stats.helpful_votes} / ${stats.not_helpful_votes}`}
        />
        <StatPill label={t("statChars")} value={formatter.number(stats.char_count)} />
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        {stats.prompt_version > 0 ? (
          <MetaChip label={t("metaPromptVersion", { v: stats.prompt_version })} />
        ) : null}
        {stats.has_monthly_digest ? <MetaChip label={t("metaMonthlyDigest")} /> : null}
        {stats.cache_ttl_seconds > 0 ? (
          <MetaChip
            label={t("metaCache", {
              entries: stats.cache_entries,
              ttl: Math.round(stats.cache_ttl_seconds),
            })}
          />
        ) : null}
      </div>

      {stats.adherence_tier ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="size-4 text-primary" aria-hidden />
          {t("adherenceLine", { tier: adherenceTierLabel(t, stats.adherence_tier) })}
        </p>
      ) : null}

      {sections.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {sections.map((s) => (
            <span
              key={s}
              className="rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
            >
              {sectionLabel(t, s)}
            </span>
          ))}
        </div>
      ) : null}

      {memorySections.length > 1 ? (
        <div className="space-y-2">
          {memorySections.map((block) => (
            <details
              key={block.title}
              open
              className="group rounded-xl border border-border/70 bg-card"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
                <span>{block.title}</span>
                <ChevronDown
                  className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                  aria-hidden
                />
              </summary>
              <pre
                className={cn(
                  "border-t border-border/60 px-4 py-3",
                  "whitespace-pre-wrap break-words font-mono text-xs leading-relaxed",
                  "text-foreground/90",
                )}
              >
                {block.body.trim() || t("emptySection")}
              </pre>
            </details>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <pre
              className={cn(
                "max-h-[min(70vh,32rem)] overflow-auto rounded-xl p-4 sm:p-5",
                "whitespace-pre-wrap break-words font-mono text-xs leading-relaxed",
                "bg-muted/40 text-foreground/90",
              )}
            >
              {data.memory_text.trim() || t("emptyMemory")}
            </pre>
          </CardContent>
        </Card>
      )}

      <p className="text-xs leading-relaxed text-muted-foreground">{t("footerNote")}</p>
    </div>
  );
}

type MemoryBlock = { title: string; body: string };

/** Split USER_MEMORY markdown on ## headings for accordion UI. */
function splitMemorySections(text: string): MemoryBlock[] {
  const lines = text.split("\n");
  const blocks: MemoryBlock[] = [];
  let current: MemoryBlock | null = null;

  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (current) blocks.push(current);
      current = { title: line.slice(3).trim(), body: "" };
      continue;
    }
    if (current) {
      current.body += (current.body ? "\n" : "") + line;
    } else {
      if (!blocks.length && line.trim()) {
        current = { title: "Overview", body: line };
      } else if (blocks.length === 0 && !current) {
        current = { title: "Overview", body: "" };
        if (line.trim()) current.body = line;
      }
    }
  }
  if (current) blocks.push(current);
  return blocks.filter((b) => b.title || b.body.trim());
}

const ADHERENCE_TIERS = ["strong", "moderate", "low", "none"] as const;
const MEMORY_SECTIONS = [
  "profile",
  "recent_checks",
  "monthly_digest",
  "feedback",
  "routine_adherence",
  "wardrobe",
] as const;

function adherenceTierLabel(
  t: ReturnType<typeof useTranslations<"meMemory">>,
  tier: string,
) {
  if ((ADHERENCE_TIERS as readonly string[]).includes(tier)) {
    return t(`adherence.${tier}` as "adherence.strong");
  }
  return tier;
}

function sectionLabel(t: ReturnType<typeof useTranslations<"meMemory">>, key: string) {
  if ((MEMORY_SECTIONS as readonly string[]).includes(key)) {
    return t(`sections.${key}` as "sections.profile");
  }
  return key;
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card px-3 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function MetaChip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-border bg-muted/30 px-2.5 py-1">{label}</span>
  );
}

function MemorySkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-3 sm:grid-cols-4">
        <Skeleton className="h-14" />
        <Skeleton className="h-14" />
        <Skeleton className="h-14" />
        <Skeleton className="h-14" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
