"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useQueryClient } from "@tanstack/react-query";

import { apiBaseUrl } from "@/lib/api";
import { authHeaders, getAccessToken } from "@/lib/auth-token";
import { redirectToLoginWithNext } from "@/lib/auth/redirect-to-login";
import { usageQueryKey } from "@/lib/api/usage";
import { streakDateKey } from "@/lib/streak/history";
import type {
  RoutineDTO,
  RoutineHistoryDTO,
  RoutineStepDTO,
} from "@/lib/types/routine";

import {
  cloneStepsForToday,
  emptyRoutine,
  isFreshlyEmpty,
  localId,
  overlayStepCompletions,
  stripStep,
  toLocal,
  type LocalRoutine,
  type StepSection,
} from "./routine-helpers";

/**
 * Data + mutation hook for the Routine editor.
 *
 * Structural edits (add/remove/rename/reorder/notes) set `dirty` and only
 * persist on explicit Save (Free edit quota). Completion ticks autosave with
 * `save_kind=tick_only` against the last persisted snapshot so dirty titles
 * cannot ride along.
 */
export type RoutineMessages = {
  needAuth: string;
  saveError: string;
  loadError: string;
  saveSuccess: string;
  autoSaved: string;
  /** Shown after tick autosave while structural edits are still dirty. */
  autoSavedDirty: string;
};

export type FetchStatus = "idle" | "loading" | "success" | "error";

function mapRoutineApiError(json: { error?: { code?: string; message?: string } }, fallback: string) {
  const code = json.error?.code;
  if (code === "quota_exceeded") return "quota_exceeded";
  if (code === "premium_required") return "premium_required";
  return typeof json.error?.message === "string" ? json.error.message : fallback;
}

export type RoutineSaveKind = "tick_only" | "manual_edit" | "preference_only";

export function useRoutine(msg: RoutineMessages, locale = "vi") {
  const queryClient = useQueryClient();
  const [routine, setRoutine] = useState<LocalRoutine>(emptyRoutine);
  const [history, setHistory] = useState<RoutineHistoryDTO | null>(null);
  const [status, setStatus] = useState<FetchStatus>("idle");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [saveSuccessTick, setSaveSuccessTick] = useState(0);
  const [dirty, setDirty] = useState(false);

  const latestRef = useRef<LocalRoutine>(routine);
  latestRef.current = routine;

  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;

  const lastPersistedRef = useRef<LocalRoutine | null>(null);

  const skillModeRef = useRef<string | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSavePromiseRef = useRef<Promise<unknown> | null>(null);
  const persistGenerationRef = useRef(0);
  const savingRef = useRef(false);
  const skillSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const redirectingRef = useRef(false);

  const clearPersistBaseline = useCallback(() => {
    lastPersistedRef.current = null;
    persistGenerationRef.current += 1;
  }, []);

  const handleUnauthorized = useCallback(() => {
    if (redirectingRef.current) return;
    redirectingRef.current = true;
    redirectToLoginWithNext(locale, "/routine");
  }, [locale]);

  const refreshHistorySilent = useCallback(async () => {
    if (!getAccessToken()) return;
    try {
      const historyRes = await fetch(`${apiBaseUrl}/api/v1/routines/history?range=30`, {
        headers: authHeaders(),
      });
      if (historyRes.status === 401) {
        handleUnauthorized();
        return;
      }
      if (historyRes.ok) {
        const historyJson = await historyRes.json().catch(() => ({}));
        if (historyJson?.success && historyJson?.data) {
          setHistory(historyJson.data as RoutineHistoryDTO);
        }
      }
    } catch {
      /* non-fatal */
    }
  }, [handleUnauthorized]);

  const rememberPersisted = useCallback((next: LocalRoutine) => {
    if (!next.saved) {
      clearPersistBaseline();
      return;
    }
    lastPersistedRef.current = next;
  }, [clearPersistBaseline]);

  const reload = useCallback(async () => {
    setStatus("loading");
    setLoadError(null);
    try {
      const headers = authHeaders();
      const [routineRes, historyRes] = await Promise.all([
        fetch(`${apiBaseUrl}/api/v1/routines`, { headers }),
        fetch(`${apiBaseUrl}/api/v1/routines/history?range=30`, { headers }),
      ]);
      if (routineRes.status === 401) {
        handleUnauthorized();
        clearPersistBaseline();
        return;
      }
      const routineJson = await routineRes.json().catch(() => ({}));
      if (routineRes.ok && routineJson?.success && routineJson?.data) {
        const next = toLocal(routineJson.data as RoutineDTO);
        setRoutine(next);
        setDirty(false);
        rememberPersisted(next);
      } else {
        setRoutine(emptyRoutine);
        setDirty(false);
        clearPersistBaseline();
      }
      if (historyRes.ok) {
        const historyJson = await historyRes.json().catch(() => ({}));
        if (historyJson?.success && historyJson?.data) {
          setHistory(historyJson.data as RoutineHistoryDTO);
        }
      }
      setStatus("success");
    } catch {
      setLoadError(msg.loadError);
      setRoutine(emptyRoutine);
      setDirty(false);
      clearPersistBaseline();
      setStatus("error");
    }
  }, [msg.loadError, rememberPersisted, handleUnauthorized, clearPersistBaseline]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const patchSteps = useCallback(
    (section: StepSection, fn: (cur: RoutineStepDTO[]) => RoutineStepDTO[], structural: boolean) => {
      setRoutine((cur) => ({ ...cur, [section]: fn(cur[section]) }));
      if (structural) setDirty(true);
    },
    [],
  );

  const addStep = useCallback(
    (section: StepSection, fromAI?: RoutineStepDTO) => {
      const next: RoutineStepDTO = fromAI
        ? { ...fromAI, id: localId(), completed: false }
        : { id: localId(), title: "", category: "other", completed: false };
      patchSteps(section, (cur) => [...cur, next], true);
    },
    [patchSteps],
  );

  const removeStep = useCallback(
    (section: StepSection, id: string) => {
      patchSteps(section, (cur) => cur.filter((s) => s.id !== id), true);
    },
    [patchSteps],
  );

  const moveStep = useCallback(
    (section: StepSection, id: string, delta: -1 | 1) => {
      patchSteps(
        section,
        (cur) => {
          const idx = cur.findIndex((s) => s.id === id);
          if (idx < 0) return cur;
          const target = idx + delta;
          if (target < 0 || target >= cur.length) return cur;
          const copy = [...cur];
          const [removed] = copy.splice(idx, 1);
          copy.splice(target, 0, removed);
          return copy;
        },
        true,
      );
    },
    [patchSteps],
  );

  const reorder = useCallback(
    (section: StepSection, fromIdx: number, toIdx: number) => {
      if (fromIdx === toIdx) return;
      patchSteps(
        section,
        (cur) => {
          if (fromIdx < 0 || fromIdx >= cur.length) return cur;
          const copy = [...cur];
          const [moved] = copy.splice(fromIdx, 1);
          const insertAt = Math.max(0, Math.min(copy.length, toIdx));
          copy.splice(insertAt, 0, moved);
          return copy;
        },
        true,
      );
    },
    [patchSteps],
  );

  const updateStep = useCallback(
    (section: StepSection, id: string, patch: Partial<RoutineStepDTO>) => {
      patchSteps(
        section,
        (cur) => cur.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        true,
      );
    },
    [patchSteps],
  );

  const setNotes = useCallback((notes: string) => {
    setRoutine((cur) => ({ ...cur, notes }));
    setDirty(true);
  }, []);

  const persist = useCallback(
    async (opts: {
      silent?: boolean;
      skillMode?: string | null;
      saveKind?: RoutineSaveKind;
    } = {}) => {
      const cur = latestRef.current;
      const saveKind = opts.saveKind ?? "manual_edit";
      const tickOnly = saveKind === "tick_only";
      const preferenceOnly = saveKind === "preference_only";

      let payload = cur;
      if (tickOnly) {
        if (savingRef.current) return null;
        const snap = lastPersistedRef.current;
        if (!snap?.saved) return null;
        payload = dirtyRef.current ? overlayStepCompletions(snap, cur) : cur;
      }

      const hasSteps = payload.morning.length > 0 || payload.evening.length > 0;
      if (!preferenceOnly && !hasSteps) return null;
      if (!getAccessToken()) {
        if (!opts.silent) setSaveMsg({ kind: "err", text: msg.needAuth });
        return null;
      }
      const body = {
        morning: payload.morning.map(stripStep),
        evening: payload.evening.map(stripStep),
        notes: payload.notes,
        source: payload.source === "ai_suggested" ? "ai_suggested" : "manual",
        skill_mode: opts.skillMode ?? skillModeRef.current ?? payload.skillMode ?? "",
        save_kind: saveKind,
        ...(payload.routineDate ? { routine_date: payload.routineDate } : {}),
      };
      try {
        const res = await fetch(`${apiBaseUrl}/api/v1/routines`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify(body),
        });
        const json = await res.json().catch(() => ({}));
        if (res.status === 401) {
          handleUnauthorized();
          return null;
        }
        if (res.ok && json?.success && json?.data) {
          const next = toLocal(json.data as RoutineDTO);
          rememberPersisted(next);
          void queryClient.invalidateQueries({ queryKey: usageQueryKey });
          if (tickOnly) {
            void refreshHistorySilent();
          }
          if (tickOnly && dirtyRef.current) {
            // Keep dirty titles/order in the editor; ticks already match local.
            return next;
          }
          if (preferenceOnly) {
            setRoutine((prev) => ({
              ...prev,
              skillMode: next.skillMode ?? prev.skillMode,
            }));
            return next;
          }
          setRoutine(next);
          setDirty(false);
          return next;
        }
        const mapped = mapRoutineApiError(json, msg.saveError);
        if (!opts.silent) setSaveMsg({ kind: "err", text: mapped });
        return null;
      } catch {
        if (!opts.silent) setSaveMsg({ kind: "err", text: msg.saveError });
        return null;
      }
    },
    [msg.needAuth, msg.saveError, queryClient, rememberPersisted, handleUnauthorized, refreshHistorySilent],
  );

  const save = useCallback(
    async (skillMode?: string | null) => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = null;
      }
      persistGenerationRef.current += 1;
      if (autoSavePromiseRef.current) {
        await autoSavePromiseRef.current.catch(() => undefined);
        autoSavePromiseRef.current = null;
      }
      savingRef.current = true;
      setSaving(true);
      setSaveMsg(null);
      try {
        const result = await persist({ skillMode, saveKind: "manual_edit" });
        if (result) {
          setSaveSuccessTick((n) => n + 1);
          await refreshHistorySilent();
        }
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    },
    [persist, refreshHistorySilent],
  );

  const toggleComplete = useCallback(
    (section: StepSection, id: string) => {
      patchSteps(
        section,
        (cur) =>
          cur.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s)),
        false,
      );
      if (!lastPersistedRef.current?.saved) return;
      if (!getAccessToken()) return;
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      const generation = persistGenerationRef.current;
      autoSaveTimer.current = setTimeout(() => {
        if (generation !== persistGenerationRef.current) return;
        if (savingRef.current) return;
        if (!lastPersistedRef.current?.saved) return;
        setAutoSaving(true);
        const tickPromise = persist({ silent: true, saveKind: "tick_only" }).finally(() => {
          setAutoSaving(false);
          autoSavePromiseRef.current = null;
        });
        autoSavePromiseRef.current = tickPromise;
        void tickPromise.then((result) => {
          if (!result) return;
          const tickMsg = dirtyRef.current ? msg.autoSavedDirty : msg.autoSaved;
          setSaveMsg({ kind: "ok", text: tickMsg });
          setTimeout(() => setSaveMsg((m) => (m?.text === tickMsg ? null : m)), 2800);
        });
      }, 750);
    },
    [patchSteps, persist, msg.autoSaved, msg.autoSavedDirty],
  );

  const persistSkillMode = useCallback(
    (mode: string | null) => {
      if (!mode) return;
      if (!lastPersistedRef.current?.saved) return;
      if (!getAccessToken()) return;
      if (skillSaveTimer.current) clearTimeout(skillSaveTimer.current);
      skillSaveTimer.current = setTimeout(() => {
        void persist({ silent: true, saveKind: "preference_only", skillMode: mode });
      }, 400);
    },
    [persist],
  );

  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      if (skillSaveTimer.current) clearTimeout(skillSaveTimer.current);
    };
  }, []);

  const dismissLoadError = useCallback(() => setLoadError(null), []);
  const dismissSaveMsg = useCallback(() => setSaveMsg(null), []);

  const applySuggestedSteps = useCallback(
    (morning: RoutineStepDTO[], evening: RoutineStepDTO[]) => {
      setRoutine((cur) => ({
        ...cur,
        morning: morning.map((s) => ({ ...s, id: localId(), completed: false })),
        evening: evening.map((s) => ({ ...s, id: localId(), completed: false })),
        source: "ai_suggested",
        saved: false,
      }));
      clearPersistBaseline();
      setDirty(true);
    },
    [clearPersistBaseline],
  );

  /** Copy a past day's steps into *today's* draft. Never writes that past row. */
  const applyHistoryAsTodayDraft = useCallback((entry: RoutineDTO) => {
    const today = streakDateKey();
    setRoutine((cur) => ({
      ...cur,
      morning: cloneStepsForToday(entry.morning ?? []),
      evening: cloneStepsForToday(entry.evening ?? []),
      notes: entry.notes ?? "",
      source: "manual",
      saved: false,
      routineDate: today,
      carriedFromDate: entry.routine_date ?? "",
    }));
    clearPersistBaseline();
    setDirty(true);
  }, [clearPersistBaseline]);

  const setSkillModeRef = useCallback((mode: string | null) => {
    skillModeRef.current = mode;
  }, []);

  const fresh = useMemo(() => isFreshlyEmpty(routine), [routine]);

  return {
    routine,
    history,
    status,
    loadError,
    saving,
    autoSaving,
    saveMsg,
    saveSuccessTick,
    dirty,
    fresh,
    setRoutine,
    setNotes,
    addStep,
    removeStep,
    moveStep,
    reorder,
    updateStep,
    toggleComplete,
    save,
    reload,
    persistSkillMode,
    applyHistoryAsTodayDraft,
    dismissLoadError,
    dismissSaveMsg,
    setSkillModeRef,
    applySuggestedSteps,
  };
}
