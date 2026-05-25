"use client";

import { Heart, ThumbsDown } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { MockSkinCheck } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

/**
 * SkinCheckCard: diary entry preview with soft reactions (like / dislike only).
 */
export function SkinCheckCard({ entry }: { entry: MockSkinCheck }) {
  const t = useTranslations("skinCard");
  const locale = useLocale();
  const [reaction, setReaction] = useState<MockSkinCheck["reaction"]>(
    entry.reaction ?? null,
  );
  const [likes, setLikes] = useState(entry.likes);
  const [dislikes, setDislikes] = useState(entry.dislikes);

  function applyReaction(next: "like" | "dislike") {
    if (reaction === next) {
      if (next === "like") setLikes((n) => n - 1);
      else setDislikes((n) => n - 1);
      setReaction(null);
      return;
    }
    if (reaction === "like") setLikes((n) => n - 1);
    if (reaction === "dislike") setDislikes((n) => n - 1);
    if (next === "like") setLikes((n) => n + 1);
    else setDislikes((n) => n + 1);
    setReaction(next);
  }

  return (
    <Card className="group overflow-hidden p-0 shadow-sm transition-shadow hover:shadow-md">
      <div
        className="relative aspect-[4/5] w-full"
        style={{
          background: `linear-gradient(160deg, oklch(${entry.gradient.from}) 0%, oklch(${entry.gradient.to}) 100%)`,
        }}
        aria-label={`${entry.title} — ${entry.focus}`}
        role="img"
      >
        <div className="absolute inset-x-3 top-3 flex items-center justify-between">
          <Badge variant="secondary" className="bg-white/90 text-foreground backdrop-blur">
            {entry.focus}
          </Badge>
          <Badge variant="secondary" className="bg-white/90 text-foreground backdrop-blur">
            {t("checkInBadge")}
          </Badge>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/35 to-transparent" />
        <div className="absolute inset-x-3 bottom-3 flex items-center gap-2">
          <Avatar name={entry.user.name} size="sm" />
          <div className="text-white drop-shadow-sm">
            <div className="text-sm font-medium leading-tight">{entry.user.name}</div>
            <div className="text-[11px] opacity-90">@{entry.user.handle}</div>
          </div>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">{entry.title}</h3>
          <p className="line-clamp-2 text-sm text-muted-foreground">{entry.note}</p>
          {entry.coachTip ? (
            <p className="mt-2 rounded-lg border border-primary/15 bg-primary/5 px-2.5 py-2 text-[11px] leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">{t("coachPrefix")} </span>
              {entry.coachTip}
            </p>
          ) : null}
          {entry.productGap ? (
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              <span className="font-medium text-foreground">{t("gapPrefix")} </span>
              {entry.productGap}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {entry.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-[11px]">
              #{tag}
            </Badge>
          ))}
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => applyReaction("like")}
              aria-pressed={reaction === "like"}
              aria-label={t("like")}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                reaction === "like"
                  ? "border-rose-300/60 bg-rose-500/10 text-rose-600 dark:text-rose-300"
                  : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Heart
                className={cn("size-3.5", reaction === "like" ? "fill-current" : "")}
                aria-hidden
              />
              {likes}
            </button>
            <button
              type="button"
              onClick={() => applyReaction("dislike")}
              aria-pressed={reaction === "dislike"}
              aria-label={t("dislike")}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                reaction === "dislike"
                  ? "border-sky-400/50 bg-sky-500/10 text-sky-800 dark:text-sky-200"
                  : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <ThumbsDown
                className={cn("size-3.5", reaction === "dislike" ? "fill-current" : "")}
                aria-hidden
              />
              {dislikes}
            </button>
          </div>
          <span className="text-[11px] text-muted-foreground">
            {new Date(entry.createdAt).toLocaleDateString(
              locale === "vi" ? "vi-VN" : "en-US",
            )}
          </span>
        </div>
      </div>
    </Card>
  );
}
