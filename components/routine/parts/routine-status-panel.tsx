"use client";

import type { RoutineHistoryDTO } from "@/lib/types/routine";

import type { RoutineSourceInfo } from "../routine-helpers";
import { MiniStreakStrip } from "./mini-streak-strip";
import { StatusBanner } from "./status-banner";
import type { RoutineSourceLabels } from "./routine-source-badge";

type MiniLabels = {
  streak: (n: number) => string;
  streakUnit: string;
  today: string;
  yesterday: string;
  openHistory: string;
};

/**
 * Status + mini streak: one compact card on mobile, separate blocks from sm+.
 */
export function RoutineStatusPanel({
  sourceInfo,
  sourceLabels,
  autoSaving,
  completed,
  total,
  progressPct,
  statusLabels,
  history,
  todayISO,
  miniLabels,
  onSelectDay,
  onOpenHistory,
}: {
  sourceInfo: RoutineSourceInfo;
  sourceLabels: RoutineSourceLabels;
  autoSaving: boolean;
  completed: number;
  total: number;
  progressPct: number;
  statusLabels: { autosaving: string };
  history: RoutineHistoryDTO | null;
  todayISO: string;
  miniLabels: MiniLabels;
  onSelectDay?: (date: string) => void;
  onOpenHistory?: () => void;
}) {
  const showMini =
    (history?.entries?.length ?? 0) > 0 || (history?.streak_days ?? 0) > 0;

  return (
    <>
      <div className="sm:hidden">
        <div className="space-y-2.5 rounded-xl border border-border/80 bg-card px-3 py-3 shadow-sm">
          <StatusBanner
            sourceInfo={sourceInfo}
            sourceLabels={sourceLabels}
            autoSaving={autoSaving}
            completed={completed}
            total={total}
            progressPct={progressPct}
            labels={statusLabels}
            compact
          />
          {showMini ? (
            <MiniStreakStrip
              history={history}
              todayISO={todayISO}
              labels={miniLabels}
              onSelectDay={onSelectDay}
              onOpenHistory={onOpenHistory}
              embedded
            />
          ) : null}
        </div>
      </div>

      <div className="hidden space-y-4 sm:block sm:space-y-5">
        <StatusBanner
          sourceInfo={sourceInfo}
          sourceLabels={sourceLabels}
          autoSaving={autoSaving}
          completed={completed}
          total={total}
          progressPct={progressPct}
          labels={statusLabels}
        />
        <MiniStreakStrip
          history={history}
          todayISO={todayISO}
          labels={miniLabels}
          onSelectDay={onSelectDay}
          onOpenHistory={onOpenHistory}
        />
      </div>
    </>
  );
}
