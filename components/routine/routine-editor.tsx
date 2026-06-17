"use client";

import { RoutineEditorSkeleton } from "./routine-editor-skeleton";
import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  type RoutineCategory,
  type RoutineStepDTO,
} from "@/lib/types/routine";
import { PremiumUpsellBanner, UsageQuotaChip } from "@/components/premium/premium-upsell-banner";
import { ToastBanner } from "@/components/ui/toast-banner";
import { useUsageQuota } from "@/lib/hooks/use-usage-quota";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { useSkillStore } from "@/lib/stores/skill-store";

import { Banner } from "./parts/banner";
import { CheckInContextCard } from "./parts/check-in-context-card";
import { EmptyHero } from "./parts/empty-hero";
import { HistoryStrip } from "./parts/history-strip";
import { NotesCard } from "./parts/notes-card";
import { SaveBar, useSaveFlash } from "./parts/save-bar";
import { SectionCard, type SectionLabels } from "./parts/section-card";
import { SkillModeBar } from "./parts/skill-mode-bar";
import { StatusBanner } from "./parts/status-banner";
import { ValidationPanel, getVisibleValidationIssues } from "./parts/validation-panel";
import { countCompletion, localId, resolveRoutineSource, validateRoutine } from "./routine-helpers";
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
export function RoutineEditor() {
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
      loadError: t("loadError"),
      saveSuccess: t("saveSuccess"),
      autoSaved: t("autoSaved"),
    }),
    [t],
  );

  const r = useRoutine(messages);
  const { setSkillModeRef } = r;
  const usage = useUsageQuota();
  const editLocked = !usage.isPremium && !usage.canRoutineManualEdit;

  const editQuotaLabel = usage.isPremium
    ? undefined
    : usage.routineManualEdit
      ? t("quotaManualEdit", {
          used: usage.routineManualEdit.used,
          limit: usage.routineManualEdit.limit,
        })
      : undefined;

  const editLimit = usage.routineManualEdit?.limit ?? 5;

  function resolveEditExceeded() {
    return t("quotaEditExceeded", { limit: editLimit });
  }

  function resolveErrorMessage(code: string | null | undefined) {
    if (code === "quota_exceeded") {
      return resolveEditExceeded();
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

  const editorTopRef = useRef<HTMLDivElement>(null);
  const editorGridRef = useRef<HTMLDivElement>(null);
  const [validationEngaged, setValidationEngaged] = useState(false);
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [editQuotaEngaged, setEditQuotaEngaged] = useState(false);
  const [applyHintsToast, setApplyHintsToast] = useState<string | null>(null);
  const engageValidation = useCallback(() => setValidationEngaged(true), []);
  const engageEditQuota = useCallback(() => setEditQuotaEngaged(true), []);

  const validationLabels = useMemo(
    () => ({
      noStepsBlocker: t("validateNoSteps"),
      noStepsBlockerBeginner: t("validateNoStepsBeginner"),
      noTitleBlocker: t("validateNoTitle"),
      noTitleBlockerBeginner: t("validateNoTitleBeginner"),
      amSpfWarning: t("validateSpfMissing"),
      amSpfWarningBeginner: t("validateSpfMissingBeginner"),
    }),
    [t],
  );
  const validation = useMemo(
    () => validateRoutine(r.routine, validationLabels, { beginnerSimple }),
    [r.routine, validationLabels, beginnerSimple],
  );

  const visibleValidationIssues = useMemo(
    () =>
      getVisibleValidationIssues(validation.issues, {
        beginnerSimple,
        engaged: validationEngaged,
        saveAttempted,
      }),
    [validation.issues, beginnerSimple, validationEngaged, saveAttempted],
  );

  const [saveFlashTick, setSaveFlashTick] = useState(0);
  useEffect(() => {
    if (r.saveMsg?.kind === "ok") setSaveFlashTick((n) => n + 1);
  }, [r.saveMsg]);
  const savedFlash = useSaveFlash(saveFlashTick);

  const completion = useMemo(() => countCompletion(r.routine), [r.routine]);

  const sourceInfo = useMemo(
    () => resolveRoutineSource(r.routine, r.history),
    [r.routine, r.history],
  );

  const sourceLabels = useMemo(
    () => ({
      savedToday: t("sourceSavedToday"),
      savedTodayHint: t("sourceSavedTodayHint"),
      carriedFrom: (date: string) => t("sourceCarriedFrom", { date }),
      carriedSubtitle: t("sourceCarriedSubtitle"),
      carriedHint: t("sourceCarriedHint"),
      onboardingSeed: t("sourceOnboardingSeed"),
      onboardingSubtitle: t("sourceOnboardingSubtitle"),
      onboardingHint: t("sourceOnboardingHint"),
      onboardingEditLink: t("sourceOnboardingEditLink"),
      aiSuggested: t("aiSuggestedBadge"),
      aiHint: t("sourceAiHint"),
      infoToggle: t("sourceInfoToggle"),
    }),
    [t],
  );

  // Today (UTC) ISO — used by the history strip to label "today/yesterday".
  const todayISO = useMemo(() => {
    const now = new Date();
    const utc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    return utc.toISOString().slice(0, 10);
  }, []);

  const hasEditorContent = useMemo(
    () =>
      r.routine.morning.length > 0 ||
      r.routine.evening.length > 0 ||
      !!r.routine.notes.trim(),
    [r.routine],
  );

  if (r.status === "loading" && !r.routine.routineDate) {
    return <RoutineEditorSkeleton />;
  }

  return (
    <div ref={editorTopRef} className="space-y-4 pb-40 sm:space-y-5 lg:pb-0">
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

      {!r.fresh ? (
        <StatusBanner
          sourceInfo={sourceInfo}
          sourceLabels={sourceLabels}
          autoSaving={r.autoSaving}
          completed={completion.completed}
          total={completion.total}
          progressPct={completion.pct}
          labels={{
            autosaving: t("autoSaving"),
          }}
        />
      ) : null}

      {/* Latest check-in — links skin journal to today's routine. */}
      {applyHintsToast ? (
        <ToastBanner
          kind="ok"
          message={applyHintsToast}
          onDismiss={() => setApplyHintsToast(null)}
          dismissLabel={t("dismiss")}
          className="shadow-sm"
        />
      ) : null}

      <CheckInContextCard
        editLocked={editLocked}
        beginnerSimple={beginnerSimple}
        hasEditorContent={hasEditorContent}
        onApplyHints={(morning, evening) => {
          r.applySuggestedSteps(morning, evening);
          engageValidation();
        }}
        onApplySuccess={() => {
          setApplyHintsToast(t("checkInContext.applySuccess"));
          window.setTimeout(() => setApplyHintsToast(null), 3500);
          editorGridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      />

      {!usage.isPremium && editLocked && editQuotaEngaged ? (
        <PremiumUpsellBanner
          title={tPremium("quotaEditTitle")}
          body={tPremium("quotaEditBody", { limit: editLimit })}
          cta={tPremium("cta")}
          onDismiss={() => setEditQuotaEngaged(false)}
          dismissLabel={t("dismiss")}
        />
      ) : null}

      {editQuotaLabel ? (
        <div className="flex justify-end">
          <UsageQuotaChip
            label={editQuotaLabel}
            variant={editLocked ? "warning" : "default"}
            onClick={editLocked ? engageEditQuota : undefined}
          />
        </div>
      ) : null}

      {r.fresh ? (
        <EmptyHero
          beginnerSimple={beginnerSimple}
          labels={{
            title: t("emptyHeroTitle"),
            body: t("emptyHeroBody"),
            beginnerBody: t("emptyHeroBeginnerBody"),
            scrollHint: t("emptyHeroScrollHint"),
            am: t("morningTitle"),
            pm: t("eveningTitle"),
            amHint: t("morningDesc"),
            pmHint: t("eveningDesc"),
            safety: t("safetyTile"),
          }}
        />
      ) : null}

      <ValidationPanel
        issues={visibleValidationIssues}
        beginnerSimple={beginnerSimple}
        labels={{
          addMorning: t("validateAddMorning"),
          addEvening: t("validateAddEvening"),
          addSpf: t("validateAddSpf"),
          blockerLabel: t("validateBlockerLabel"),
          warningLabel: t("validateWarningLabel"),
        }}
        onAddMorning={() => {
          engageValidation();
          r.addStep("morning");
        }}
        onAddEvening={() => {
          engageValidation();
          r.addStep("evening");
        }}
        onAddSpf={() => {
          engageValidation();
          r.addStep("morning", {
            id: localId(),
            title: t("categories.spf"),
            category: "spf",
            completed: false,
          });
        }}
      />

      <div ref={editorGridRef} className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2 lg:gap-4">
        <SectionCard
          section="morning"
          title={t("morningTitle")}
          desc={t("morningDesc")}
          icon={<Sun className="size-4 text-amber-500" aria-hidden />}
          steps={r.routine.morning}
          beginnerSimple={beginnerSimple}
          accent="am"
          highlightEmptyTitles={validation.hasEmptyTitles && validationEngaged}
          sectionAlert={
            validation.missingSpf && !beginnerSimple && validationEngaged
              ? {
                  message: t("validateSpfSection"),
                  actionLabel: t("validateAddSpf"),
                  onAction: () => {
                    engageValidation();
                    r.addStep("morning", {
                      id: localId(),
                      title: t("categories.spf"),
                      category: "spf",
                      completed: false,
                    });
                  },
                }
              : null
          }
          onAdd={() => {
            engageValidation();
            r.addStep("morning");
          }}
          onRemove={(id) => {
            engageValidation();
            r.removeStep("morning", id);
          }}
          onMove={(id, delta) => {
            engageValidation();
            r.moveStep("morning", id, delta);
          }}
          onReorder={(from, to) => {
            engageValidation();
            r.reorder("morning", from, to);
          }}
          onUpdate={(id, patch) => {
            engageValidation();
            r.updateStep("morning", id, patch);
          }}
          onToggle={(id) => r.toggleComplete("morning", id)}
          labels={editorLabels(t)}
          editLocked={editLocked}
          onEditLockedAttempt={engageEditQuota}
        />
        <SectionCard
          section="evening"
          title={t("eveningTitle")}
          desc={t("eveningDesc")}
          icon={<Moon className="size-4 text-indigo-500" aria-hidden />}
          steps={r.routine.evening}
          beginnerSimple={beginnerSimple}
          accent="pm"
          highlightEmptyTitles={validation.hasEmptyTitles && validationEngaged}
          onAdd={() => {
            engageValidation();
            r.addStep("evening");
          }}
          onRemove={(id) => {
            engageValidation();
            r.removeStep("evening", id);
          }}
          onMove={(id, delta) => {
            engageValidation();
            r.moveStep("evening", id, delta);
          }}
          onReorder={(from, to) => {
            engageValidation();
            r.reorder("evening", from, to);
          }}
          onUpdate={(id, patch) => {
            engageValidation();
            r.updateStep("evening", id, patch);
          }}
          onToggle={(id) => r.toggleComplete("evening", id)}
          labels={editorLabels(t)}
          editLocked={editLocked}
          onEditLockedAttempt={engageEditQuota}
        />
      </div>

      {!beginnerSimple ? (
        <NotesCard
          value={r.routine.notes}
          onChange={(notes) => {
            engageValidation();
            r.setNotes(notes);
          }}
          readOnly={editLocked}
          onLockedAttempt={engageEditQuota}
          labels={{ title: t("notesTitle"), placeholder: t("notesPlaceholder") }}
        />
      ) : null}

      <HistoryStrip
        history={r.history}
        todayISO={todayISO}
        editAllowed={!editLocked}
        onEditLockedAttempt={engageEditQuota}
        onEditDay={(entry) => {
          r.loadFromEntry(entry);
          engageValidation();
          editorGridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        onSelectToday={() =>
          editorTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
        }
        labels={{
          title: t("historyTitle"),
          hint: t("historyHint"),
          empty: t("historyEmpty"),
          streak: (n: number) => t("historyStreak", { n }),
          avg: t("historyCompletionAvg"),
          today: t("historyToday"),
          yesterday: t("historyYesterday"),
          done: (done: number, total: number) => t("historyDone", { done, total }),
          tapHint: t("historyTapHint"),
          detailAm: t("historyAm"),
          detailPm: t("historyPm"),
          detailEmpty: t("historyDetailEmpty"),
          detailTitle: (date: string) => t("historyDetailTitle", { date }),
          detailClose: t("historyDetailClose"),
          detailPct: (pct: number) => t("historyDetailPct", { pct }),
          detailNotes: t("historyDetailNotes"),
          detailEdit: t("historyDetailEdit"),
          detailEditToday: t("historyDetailEditToday"),
          sheetSwipeHint: t("historySheetSwipeHint"),
          editLocked: t("historyEditLocked"),
        }}
      />

      {r.saveMsg ? (
        <Banner
          kind={r.saveMsg.kind}
          message={resolveErrorMessage(r.saveMsg.text) || r.saveMsg.text}
          onClose={r.dismissSaveMsg}
          closeLabel={t("dismiss")}
        />
      ) : null}

      <SaveBar
        saving={r.saving}
        autoSaving={r.autoSaving}
        canSave={validation.canSave && !editLocked}
        hasUnsaved={!r.routine.saved}
        warningHint={
          beginnerSimple ? null : (validation.warnings[0] ?? null)
        }
        savedFlash={savedFlash}
        onReset={() => {
          setSaveAttempted(false);
          setValidationEngaged(false);
          setEditQuotaEngaged(false);
          void r.reload();
        }}
        onSave={() => {
          setSaveAttempted(true);
          engageValidation();
          if (editLocked) engageEditQuota();
          void r.save(skillMode);
        }}
        labels={{
          save: t("save"),
          saving: t("saving"),
          reset: t("reset"),
          autosaving: t("autoSaving"),
          saved: t("saveSuccess"),
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
    emptySectionHint: t("emptySectionHint"),
    emptySectionBeginnerHint: t("emptySectionBeginnerHint"),
    categories: catLabels(t),
  };
}

// Re-export the type so consumers (e.g. tests) can import it from this module.
export type { RoutineStepDTO };
