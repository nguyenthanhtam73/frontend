"use client";

import { RoutineEditorSkeleton } from "./routine-editor-skeleton";
import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo } from "react";

import {
  type RoutineCategory,
  type RoutineStepDTO,
} from "@/lib/types/routine";
import { PremiumUpsellBanner, UsageQuotaChip } from "@/components/premium/premium-upsell-banner";
import { useUsageQuota } from "@/lib/hooks/use-usage-quota";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { useSkillStore } from "@/lib/stores/skill-store";
import { cn } from "@/lib/utils";

import { AISuggestCard } from "./parts/ai-suggest-card";
import { Banner } from "./parts/banner";
import { CheckInContextCard } from "./parts/check-in-context-card";
import { EmptyHero } from "./parts/empty-hero";
import { HistoryStrip } from "./parts/history-strip";
import { NotesCard } from "./parts/notes-card";
import { SaveBar } from "./parts/save-bar";
import { SectionCard, type SectionLabels } from "./parts/section-card";
import { SkillModeBar } from "./parts/skill-mode-bar";
import { StatusBanner } from "./parts/status-banner";
import { SuggestionPreview } from "./parts/suggestion-preview";
import { countCompletion, validateRoutine } from "./routine-helpers";
import { useRoutine } from "./use-routine";

/**
 * Routine Management — main client component.
 *
 * The editor is intentionally thin: it composes parts/ and wires them to a
 * data hook (`useRoutine`). All network code, autosave, and validation live
 * outside this file so the layout reads like a recipe.
 *
 * Mobile-first principles applied here:
 *   - Sticky save bar with safe-area inset on phones, regular row on desktop
 *   - Touch targets ≥ 44px, comfortable spacing
 *   - Bottom-of-page padding so the sticky bar never covers content
 *
 * Beginner-mode contract (matches the requirement "rất đơn giản"):
 *   - Hides categories, per-step notes, drag-drop, and reorder arrows
 *   - Hides the day-level Notes card
 *   - Skill bar hint switches to a calmer copy
 */
export function RoutineEditor({ locale }: { locale: string }) {
  const t = useTranslations("routine");
  const tPremium = useTranslations("premium");

  const skillMode = useSkillStore((s) => s.mode);
  const setSkillMode = useSkillStore((s) => s.setMode);
  const onboardingSkill = useOnboardingStore((s) => s.skillMode);

  // First visit: pull skill mode from onboarding so the editor opens in the
  // right depth without an extra tap.
  useEffect(() => {
    if (!skillMode && onboardingSkill) setSkillMode(onboardingSkill);
  }, [skillMode, onboardingSkill, setSkillMode]);

  const messages = useMemo(
    () => ({
      needAuth: t("needAuth"),
      saveError: t("saveError"),
      aiSuggestError: t("aiSuggestError"),
      loadError: t("aiSuggestError"),
      saveSuccess: t("saveSuccess"),
      autoSaved: t("autoSaved"),
    }),
    [t],
  );

  const r = useRoutine(locale, messages);
  const { setSkillModeRef } = r;
  const usage = useUsageQuota();
  const editLocked = !usage.isPremium && !usage.canRoutineManualEdit;
  const suggestDisabled = !usage.isPremium && !usage.canRoutineSuggest;

  const suggestQuotaLabel = usage.isPremium
    ? t("premiumUnlimited")
    : usage.routineSuggest
      ? t("quotaSuggest", {
          used: usage.routineSuggest.used,
          limit: usage.routineSuggest.limit,
        })
      : undefined;

  const editQuotaLabel = usage.isPremium
    ? undefined
    : usage.routineManualEdit
      ? t("quotaManualEdit", {
          used: usage.routineManualEdit.used,
          limit: usage.routineManualEdit.limit,
        })
      : undefined;

  const suggestLimit = usage.routineSuggest?.limit ?? 3;
  const editLimit = usage.routineManualEdit?.limit ?? 5;

  function resolveSuggestExceeded() {
    return t("quotaSuggestExceeded", { limit: suggestLimit });
  }

  function resolveEditExceeded() {
    return t("quotaEditExceeded", { limit: editLimit });
  }

  function resolveErrorMessage(code: string | null | undefined, kind: "suggest" | "edit") {
    if (code === "quota_exceeded") {
      return kind === "suggest" ? resolveSuggestExceeded() : resolveEditExceeded();
    }
    return code ?? "";
  }

  // Keep the data hook informed of the current skill mode without making it
  // a dependency of the autosave loop (refs > recreating callbacks).
  // We destructure `setSkillModeRef` because `r` is a fresh object every render
  // — depending on it directly would trigger this effect every commit.
  useEffect(() => {
    setSkillModeRef(skillMode ?? null);
  }, [skillMode, setSkillModeRef]);

  const beginnerSimple = skillMode === "beginner";

  const validationLabels = useMemo(
    () => ({
      noStepsBlocker: t("validateNoSteps"),
      noTitleBlocker: t("validateNoTitle"),
      amSpfWarning: t("validateSpfMissing"),
    }),
    [t],
  );
  const validation = useMemo(
    () => validateRoutine(r.routine, validationLabels),
    [r.routine, validationLabels],
  );

  const completion = useMemo(() => countCompletion(r.routine), [r.routine]);

  // Today (UTC) ISO — used by the history strip to label "today/yesterday".
  const todayISO = useMemo(() => {
    const now = new Date();
    const utc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    return utc.toISOString().slice(0, 10);
  }, []);

  if (r.status === "loading" && !r.routine.routineDate) {
    return <RoutineEditorSkeleton />;
  }

  return (
    <div className="space-y-5 pb-32 lg:pb-0">
      {r.loadError ? (
        <Banner kind="err" message={r.loadError} onClose={r.dismissLoadError} />
      ) : null}

      <SkillModeBar
        value={skillMode}
        onChange={setSkillMode}
        labels={{
          beginner: t("modeBeginner"),
          intermediate: t("modeIntermediate"),
          advanced: t("modeAdvanced"),
        }}
        hint={beginnerSimple ? t("modeBeginnerHint") : t("modeHint")}
        ariaLabel={t("modeAriaLabel")}
      />

      {/* Most recent check-in summary — shows the user what skin context
          (conditions / symptoms / soft score) the AI suggestion is based on
          and offers a one-tap link back to /check-in. */}
      <CheckInContextCard />

      {!usage.isPremium && (suggestDisabled || editLocked) ? (
        <PremiumUpsellBanner
          title={
            suggestDisabled
              ? tPremium("quotaSuggestTitle", { limit: suggestLimit })
              : tPremium("quotaEditTitle")
          }
          body={
            suggestDisabled
              ? tPremium("quotaSuggestBody")
              : tPremium("quotaEditBody", { limit: editLimit })
          }
          cta={tPremium("cta")}
        />
      ) : null}

      {editQuotaLabel ? (
        <div className="flex justify-end">
          <UsageQuotaChip label={editQuotaLabel} />
        </div>
      ) : null}

      {r.fresh ? (
        <EmptyHero
          suggesting={r.suggesting}
          onSuggest={() => void r.requestSuggestion(skillMode ?? null)}
          labels={{
            title: t("emptyHeroTitle"),
            body: t("emptyHeroBody"),
            cta: t("emptyHeroCta"),
            loading: t("aiSuggesting"),
            or: t("emptyHeroOr"),
            am: t("morningTitle"),
            pm: t("eveningTitle"),
            amHint: t("morningDesc"),
            pmHint: t("eveningDesc"),
            safety: t("safetyTile"),
          }}
        />
      ) : (
        <StatusBanner
          saved={r.routine.saved}
          source={r.routine.source}
          autoSaving={r.autoSaving}
          completed={completion.completed}
          total={completion.total}
          progressPct={completion.pct}
          labels={{
            saved: t("savedBadge"),
            carried: t("carriedBadge"),
            ai: t("aiSuggestedBadge"),
            autosaving: t("autoSaving"),
          }}
        />
      )}

      {/* Compact AI suggest card — kept out of the way on first run (the
          EmptyHero is already the primary CTA). */}
      {!r.fresh || r.suggestError ? (
        <AISuggestCard
          suggesting={r.suggesting}
          hasSuggestion={!!r.suggestion}
          focusNote={r.focusNote}
          onFocusChange={r.setFocusNote}
          onSuggest={() => void r.requestSuggestion(skillMode ?? null)}
          disabled={suggestDisabled}
          quotaLabel={suggestQuotaLabel}
          error={
            r.suggestError ? resolveErrorMessage(r.suggestError, "suggest") : null
          }
          onDismissError={r.dismissSuggestError}
          labels={{
            title: t("aiSuggestTitle"),
            body: t("aiSuggestBody"),
            cta: t("aiSuggestCta"),
            retry: t("aiRetry"),
            loading: t("aiSuggesting"),
            focusLabel: t("aiFocusLabel"),
            focusPlaceholder: t("aiFocusPlaceholder"),
            closeError: t("dismiss"),
          }}
        />
      ) : null}

      {r.suggestion ? (
        <SuggestionPreview
          suggestion={r.suggestion}
          retrying={r.suggesting}
          onApply={r.applySuggestion}
          onRetry={() => void r.requestSuggestion(skillMode ?? null)}
          onDismiss={r.dismissSuggestion}
          labels={{
            title: t("aiPreviewTitle"),
            hint: t("aiPreviewHint"),
            apply: t("aiApply"),
            retry: t("aiRetry"),
            retrying: t("aiSuggesting"),
            dismiss: t("aiDismiss"),
            morning: t("morningTitle"),
            evening: t("eveningTitle"),
            encouragement: t("aiEncouragement"),
            rationale: t("aiRationale"),
            week: t("aiWeekNotes"),
            safety: t("aiSafety"),
            closing: t("aiClosing"),
          }}
          categoryLabels={catLabels(t)}
        />
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard
          section="morning"
          title={t("morningTitle")}
          desc={t("morningDesc")}
          icon={<Sun className="size-4 text-amber-500" aria-hidden />}
          steps={r.routine.morning}
          beginnerSimple={beginnerSimple}
          accent="am"
          onAdd={() => r.addStep("morning")}
          onRemove={(id) => r.removeStep("morning", id)}
          onMove={(id, delta) => r.moveStep("morning", id, delta)}
          onReorder={(from, to) => r.reorder("morning", from, to)}
          onUpdate={(id, patch) => r.updateStep("morning", id, patch)}
          onToggle={(id) => r.toggleComplete("morning", id)}
          labels={editorLabels(t)}
          editLocked={editLocked}
        />
        <SectionCard
          section="evening"
          title={t("eveningTitle")}
          desc={t("eveningDesc")}
          icon={<Moon className="size-4 text-indigo-500" aria-hidden />}
          steps={r.routine.evening}
          beginnerSimple={beginnerSimple}
          accent="pm"
          onAdd={() => r.addStep("evening")}
          onRemove={(id) => r.removeStep("evening", id)}
          onMove={(id, delta) => r.moveStep("evening", id, delta)}
          onReorder={(from, to) => r.reorder("evening", from, to)}
          onUpdate={(id, patch) => r.updateStep("evening", id, patch)}
          onToggle={(id) => r.toggleComplete("evening", id)}
          labels={editorLabels(t)}
          editLocked={editLocked}
        />
      </div>

      {!beginnerSimple ? (
        <NotesCard
          value={r.routine.notes}
          onChange={r.setNotes}
          readOnly={editLocked}
          labels={{ title: t("notesTitle"), placeholder: t("notesPlaceholder") }}
        />
      ) : null}

      <HistoryStrip
        history={r.history}
        todayISO={todayISO}
        labels={{
          title: t("historyTitle"),
          hint: t("historyHint"),
          empty: t("historyEmpty"),
          streak: (n: number) => t("historyStreak", { n }),
          avg: t("historyCompletionAvg"),
          today: t("historyToday"),
          yesterday: t("historyYesterday"),
          done: (done: number, total: number) => t("historyDone", { done, total }),
        }}
      />

      {r.saveMsg ? (
        <Banner
          kind={r.saveMsg.kind}
          message={resolveErrorMessage(r.saveMsg.text, "edit") || r.saveMsg.text}
          onClose={r.dismissSaveMsg}
          closeLabel={t("dismiss")}
        />
      ) : null}

      {/* Inline blockers — soft, conversational, never red unless serious. */}
      {validation.blockers.length > 0 ? (
        <div
          role="alert"
          className={cn(
            "rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 text-xs text-amber-800 dark:text-amber-200 sm:text-sm",
          )}
        >
          {validation.blockers[0]}
        </div>
      ) : null}

      <SaveBar
        saving={r.saving}
        autoSaving={r.autoSaving}
        canSave={validation.canSave && !editLocked}
        hasUnsaved={!r.routine.saved}
        warningHint={validation.warnings[0] ?? null}
        onReset={() => void r.reload()}
        onSave={() => void r.save(skillMode)}
        labels={{
          save: t("save"),
          saving: t("saving"),
          reset: t("reset"),
          autosaving: t("autoSaving"),
          unsavedHint: t("unsavedHint"),
          cleanHint: t("cleanHint"),
        }}
      />
    </div>
  );
}

// ---- label helpers ------------------------------------------------------

type TFn = ReturnType<typeof useTranslations<"routine">>;

function catLabels(t: TFn): Record<RoutineCategory, string> {
  return {
    cleanser: t("categories.cleanser"),
    toner: t("categories.toner"),
    serum: t("categories.serum"),
    treatment: t("categories.treatment"),
    moisturizer: t("categories.moisturizer"),
    spf: t("categories.spf"),
    eye: t("categories.eye"),
    mask: t("categories.mask"),
    other: t("categories.other"),
  };
}

function editorLabels(t: TFn): SectionLabels {
  return {
    add: t("stepAdd"),
    remove: t("stepRemove"),
    moveUp: t("stepMoveUp"),
    moveDown: t("stepMoveDown"),
    completeOn: t("stepCompleteOn"),
    completeOff: t("stepCompleteOff"),
    category: t("stepCategory"),
    notesLabel: t("stepNotesLabel"),
    notesPlaceholder: t("stepNotesPlaceholder"),
    placeholder: t("stepPlaceholder"),
    emptyAddMorning: t("emptyAddMorning"),
    emptyAddEvening: t("emptyAddEvening"),
    categories: catLabels(t),
  };
}

// Re-export the type so consumers (e.g. tests) can import it from this module.
export type { RoutineStepDTO };
