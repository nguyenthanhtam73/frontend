"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useQueryClient } from "@tanstack/react-query";

import { apiBaseUrl } from "@/lib/api";
import { authHeaders, getAccessToken } from "@/lib/auth-token";
import { usageQueryKey } from "@/lib/api/usage";
import type {
  RoutineDTO,
  RoutineHistoryDTO,
  RoutineStepDTO,
} from "@/lib/types/routine";

import {
  emptyRoutine,
  isFreshlyEmpty,
  localId,
  stripStep,
  toLocal,
  type LocalRoutine,
  type StepSection,
} from "./routine-helpers";

/**
 * `useRoutine` centralises all data + mutation logic for the Routine editor.
 *
 * Why a custom hook instead of letting the editor own state directly:
 *   - separates network code from layout code (parts/ stay UI-only),
 *   - lets us add an *autosave* loop without sprinkling timers across files,
 *   - makes the editor testable (parts can be rendered with mock state).
 *
 * Autosave behaviour:
 *   - Runs only AFTER the routine has at least one saved snapshot OR the user
 *     has explicitly hit Save once. We never silently persist drafts on first
 *     load — beginners would be surprised by an unexpected row appearing.
 *   - Triggers on tick / untick of completion, but NOT on title edits (titles
 *     are still saved on the explicit Save button — typing churn would create
 *     way too many requests, and an unfinished title is a low-value snapshot).
 *   - Debounced 750ms; the latest tick wins.
 */
export type RoutineMessages = {
  needAuth: string;
  saveError: string;
  loadError: string;
  saveSuccess: string;
  autoSaved: string;
};

export type FetchStatus = "idle" | "loading" | "success" | "error";

function mapRoutineApiError(json: { error?: { code?: string; message?: string } }, fallback: string) {
  const code = json.error?.code;
  if (code === "quota_exceeded") return "quota_exceeded";
  if (code === "premium_required") return "premium_required";
  return typeof json.error?.message === "string" ? json.error.message : fallback;
}

export function useRoutine(msg: RoutineMessages) {
  const queryClient = useQueryClient();
  const [routine, setRoutine] = useState<LocalRoutine>(emptyRoutine);
  const [history, setHistory] = useState<RoutineHistoryDTO | null>(null);
  const [status, setStatus] = useState<FetchStatus>("idle");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // We keep the most recent server snapshot in a ref so the autosave loop can
  // POST the latest state without depending on the React state closure (which
  // would otherwise need to be a dependency of the debounce, retriggering it).
  const latestRef = useRef<LocalRoutine>(routine);
  latestRef.current = routine;

  const skillModeRef = useRef<string | null>(null);

  // Track whether the user has saved at least once — gates the autosave loop.
  const everSavedRef = useRef(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        setLoadError(msg.needAuth);
        setRoutine(emptyRoutine);
        setStatus("error");
        return;
      }
      const routineJson = await routineRes.json().catch(() => ({}));
      if (routineRes.ok && routineJson?.success && routineJson?.data) {
        const next = toLocal(routineJson.data as RoutineDTO);
        setRoutine(next);
        if (next.saved) everSavedRef.current = true;
      } else {
        setRoutine(emptyRoutine);
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
      setStatus("error");
    }
  }, [msg.loadError, msg.needAuth]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // ---- step CRUD ----------------------------------------------------------

  const patchSteps = useCallback(
    (section: StepSection, fn: (cur: RoutineStepDTO[]) => RoutineStepDTO[]) => {
      setRoutine((cur) => ({ ...cur, [section]: fn(cur[section]) }));
    },
    [],
  );

  const addStep = useCallback(
    (section: StepSection, fromAI?: RoutineStepDTO) => {
      const next: RoutineStepDTO = fromAI
        ? { ...fromAI, id: localId(), completed: false }
        : { id: localId(), title: "", category: "other", completed: false };
      patchSteps(section, (cur) => [...cur, next]);
    },
    [patchSteps],
  );

  const removeStep = useCallback(
    (section: StepSection, id: string) => {
      patchSteps(section, (cur) => cur.filter((s) => s.id !== id));
    },
    [patchSteps],
  );

  const moveStep = useCallback(
    (section: StepSection, id: string, delta: -1 | 1) => {
      patchSteps(section, (cur) => {
        const idx = cur.findIndex((s) => s.id === id);
        if (idx < 0) return cur;
        const target = idx + delta;
        if (target < 0 || target >= cur.length) return cur;
        const copy = [...cur];
        const [removed] = copy.splice(idx, 1);
        copy.splice(target, 0, removed);
        return copy;
      });
    },
    [patchSteps],
  );

  const reorder = useCallback(
    (section: StepSection, fromIdx: number, toIdx: number) => {
      if (fromIdx === toIdx) return;
      patchSteps(section, (cur) => {
        if (fromIdx < 0 || fromIdx >= cur.length) return cur;
        const copy = [...cur];
        const [moved] = copy.splice(fromIdx, 1);
        const insertAt = Math.max(0, Math.min(copy.length, toIdx));
        copy.splice(insertAt, 0, moved);
        return copy;
      });
    },
    [patchSteps],
  );

  const updateStep = useCallback(
    (section: StepSection, id: string, patch: Partial<RoutineStepDTO>) => {
      patchSteps(section, (cur) =>
        cur.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      );
    },
    [patchSteps],
  );

  const setNotes = useCallback((notes: string) => {
    setRoutine((cur) => ({ ...cur, notes }));
  }, []);

  // ---- save / autosave ----------------------------------------------------

  const persist = useCallback(
    async (opts: {
      silent?: boolean;
      skillMode?: string | null;
      saveKind?: "tick_only" | "manual_edit";
    } = {}) => {
      const cur = latestRef.current;
      const hasSteps = cur.morning.length > 0 || cur.evening.length > 0;
      if (!hasSteps) return null;
      if (!getAccessToken()) {
        if (!opts.silent) setSaveMsg({ kind: "err", text: msg.needAuth });
        return null;
      }
      const body = {
        morning: cur.morning.map(stripStep),
        evening: cur.evening.map(stripStep),
        notes: cur.notes,
        source: cur.source === "ai_suggested" ? "ai_suggested" : "manual",
        skill_mode: opts.skillMode ?? skillModeRef.current ?? cur.skillMode ?? "",
        save_kind: opts.saveKind ?? "manual_edit",
        ...(cur.routineDate ? { routine_date: cur.routineDate } : {}),
      };
      try {
        const res = await fetch(`${apiBaseUrl}/api/v1/routines`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify(body),
        });
        const json = await res.json().catch(() => ({}));
        if (res.ok && json?.success && json?.data) {
          const next = toLocal(json.data as RoutineDTO);
          setRoutine(next);
          everSavedRef.current = true;
          void queryClient.invalidateQueries({ queryKey: usageQueryKey });
          if (!opts.silent) setSaveMsg({ kind: "ok", text: msg.saveSuccess });
          return next;
        }
        const mapped = mapRoutineApiError(json, msg.saveError);
        const text =
          mapped === "quota_exceeded" ? "quota_exceeded" : mapped === "premium_required" ? mapped : mapped;
        if (!opts.silent) setSaveMsg({ kind: "err", text });
        return null;
      } catch {
        if (!opts.silent) setSaveMsg({ kind: "err", text: msg.saveError });
        return null;
      }
    },
    [msg.needAuth, msg.saveError, msg.saveSuccess, queryClient],
  );

  const save = useCallback(
    async (skillMode?: string | null) => {
      setSaving(true);
      setSaveMsg(null);
      const result = await persist({ skillMode });
      setSaving(false);
      if (result) {
        // Refresh history strip so streak/avg update right away.
        try {
          const headers = authHeaders();
          const historyRes = await fetch(
            `${apiBaseUrl}/api/v1/routines/history?range=30`,
            { headers },
          );
          if (historyRes.ok) {
            const historyJson = await historyRes.json().catch(() => ({}));
            if (historyJson?.success && historyJson?.data) {
              setHistory(historyJson.data as RoutineHistoryDTO);
            }
          }
        } catch {
          /* non-fatal: history refresh failure shouldn't block UX. */
        }
      }
    },
    [persist],
  );

  /**
   * Toggle a step's completion. When the user has already saved at least once,
   * this kicks off a debounced silent autosave (so completion ticks survive
   * a refresh / accidental close without the user having to re-press Save).
   */
  const toggleComplete = useCallback(
    (section: StepSection, id: string) => {
      patchSteps(section, (cur) =>
        cur.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s)),
      );
      if (!everSavedRef.current) return;
      if (!getAccessToken()) return;
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => {
        setAutoSaving(true);
        void persist({ silent: true, saveKind: "tick_only" }).finally(() => {
          setAutoSaving(false);
          setSaveMsg({ kind: "ok", text: msg.autoSaved });
          // Autosave toast self-dismisses fast — this is a tertiary signal.
          setTimeout(() => setSaveMsg((m) => (m?.text === msg.autoSaved ? null : m)), 1800);
        });
      }, 750);
    },
    [patchSteps, persist, msg.autoSaved],
  );

  // Cancel any pending autosave on unmount so we don't leak a timer.
  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, []);

  const dismissLoadError = useCallback(() => setLoadError(null), []);
  const dismissSaveMsg = useCallback(() => setSaveMsg(null), []);

  /** Replace AM/PM steps with coach hints from the latest check-in. */
  const applySuggestedSteps = useCallback(
    (morning: RoutineStepDTO[], evening: RoutineStepDTO[]) => {
      setRoutine((cur) => ({
        ...cur,
        morning: morning.map((s) => ({ ...s, id: localId(), completed: false })),
        evening: evening.map((s) => ({ ...s, id: localId(), completed: false })),
        source: "ai_suggested",
        saved: false,
      }));
    },
    [],
  );

  /** Load a historical (or today) entry into the editor for editing. */
  const loadFromEntry = useCallback((entry: RoutineDTO) => {
    const next = toLocal(entry);
    setRoutine({ ...next, saved: true });
    everSavedRef.current = true;
  }, []);

  /** Allow the editor to inform the hook of the current skill mode without
   *  forcing it as a dependency on every callback (would invalidate refs). */
  const setSkillModeRef = useCallback((mode: string | null) => {
    skillModeRef.current = mode;
  }, []);

  const fresh = useMemo(() => isFreshlyEmpty(routine), [routine]);

  return {
    // state
    routine,
    history,
    status,
    loadError,
    saving,
    autoSaving,
    saveMsg,
    fresh,
    // actions
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
    loadFromEntry,
    dismissLoadError,
    dismissSaveMsg,
    setSkillModeRef,
    applySuggestedSteps,
  };
}
