"use client";

import { Check, Loader2, Moon, RefreshCw, Sun, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { IconDismissButton } from "@/components/ui/icon-dismiss-button";
import { FeedbackButtons } from "@/components/ui/feedback-buttons";
import { ProductSuggestionsCard } from "@/components/coach/product-suggestions-card";
import {
  normalizeCategory,
  type RoutineCategory,
  type SuggestRoutineDTO,
} from "@/lib/types/routine";

/**
 * Read-only preview card for an AI-generated routine. Shows the AM/PM steps
 * + the coach's supportive copy (encouragement / rationale / week / safety /
 * closing). User can:
 *   - Apply  → swaps the editor's working set with these steps (manual review
 *              expected before they save).
 *   - Retry  → re-rolls the suggestion (pulls a fresh take from Claude).
 *   - Dismiss → drops the preview.
 */
export function SuggestionPreview({
  suggestion,
  retrying,
  onApply,
  onRetry,
  onDismiss,
  labels,
  categoryLabels,
}: {
  suggestion: SuggestRoutineDTO;
  retrying: boolean;
  onApply: () => void;
  onRetry: () => void;
  onDismiss: () => void;
  labels: {
    title: string;
    hint: string;
    apply: string;
    retry: string;
    retrying: string;
    dismiss: string;
    morning: string;
    evening: string;
    encouragement: string;
    rationale: string;
    week: string;
    safety: string;
    closing: string;
  };
  categoryLabels: Record<RoutineCategory, string>;
}) {
  const sections: Array<{ key: "morning" | "evening"; title: string; icon: React.ReactNode }> = [
    { key: "morning", title: labels.morning, icon: <Sun className="size-4" aria-hidden /> },
    { key: "evening", title: labels.evening, icon: <Moon className="size-4" aria-hidden /> },
  ];
  return (
    <Card className="border-primary/30 in-animate animate-in fade-in slide-in-from-top-2 duration-300">
      <CardContent className="space-y-4 p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-tight">{labels.title}</p>
            <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{labels.hint}</p>
          </div>
          <IconDismissButton
            onClick={onDismiss}
            ariaLabel={labels.dismiss}
            className="text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" aria-hidden />
          </IconDismissButton>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {sections.map(({ key, title, icon }) => (
            <div key={key} className="rounded-xl border bg-card/50 p-3 sm:p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-foreground/80">
                <span className="inline-flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                  {icon}
                </span>
                {title}
              </div>
              {suggestion[key]?.length ? (
                <ol className="space-y-1.5 text-sm">
                  {suggestion[key].map((s, i) => {
                    const cat = normalizeCategory(s.category);
                    return (
                      <li key={s.id || i} className="flex gap-2">
                        <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold tabular-nums">
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="leading-snug">{s.title}</p>
                          <p className="text-xs text-muted-foreground">{categoryLabels[cat]}</p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className="text-xs text-muted-foreground">—</p>
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {suggestion.encouragement ? (
            <PreviewBlock title={labels.encouragement} body={suggestion.encouragement} />
          ) : null}
          {suggestion.rationale ? (
            <PreviewBlock title={labels.rationale} body={suggestion.rationale} />
          ) : null}
          {suggestion.week_notes ? (
            <PreviewBlock title={labels.week} body={suggestion.week_notes} />
          ) : null}
          {suggestion.safety_notes ? (
            <PreviewBlock title={labels.safety} body={suggestion.safety_notes} />
          ) : null}
        </div>
        {suggestion.closing_reminder ? (
          <p className="rounded-xl bg-muted/40 px-3 py-2 text-xs italic leading-relaxed text-muted-foreground">
            {labels.closing}: {suggestion.closing_reminder}
          </p>
        ) : null}

        <ProductSuggestionsCard
          suggestions={suggestion.product_suggestions}
          source="routine_suggest"
          contextId={suggestion.feedback_target_id}
        />

        <div className="flex flex-wrap gap-2">
          <Button type="button" size="default" onClick={onApply}>
            <Check className="size-4" aria-hidden />
            <span>{labels.apply}</span>
          </Button>
          <Button
            type="button"
            size="default"
            variant="outline"
            onClick={onRetry}
            disabled={retrying}
          >
            {retrying ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                <span>{labels.retrying}</span>
              </>
            ) : (
              <>
                <RefreshCw className="size-4" aria-hidden />
                <span>{labels.retry}</span>
              </>
            )}
          </Button>
          <Button type="button" size="default" variant="ghost" onClick={onDismiss}>
            {labels.dismiss}
          </Button>
        </div>

        {/* Feedback loop — votes here feed back into the routine suggest
            prompt loop so the next "AI gợi ý cho tôi" call adapts to the
            user's tone preferences. The id is fresh per suggestion. */}
        <FeedbackButtons
          targetType="suggested_routine"
          targetId={suggestion.feedback_target_id}
        />
      </CardContent>
    </Card>
  );
}

function PreviewBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border bg-card/50 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-foreground/85 sm:text-sm">{body}</p>
    </div>
  );
}
