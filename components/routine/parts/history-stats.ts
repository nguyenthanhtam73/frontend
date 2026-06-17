import type { RoutineDTO } from "@/lib/types/routine";

export type ChartPoint = {
  date: string;
  pct: number;
  hasEntry: boolean;
};

export type Trend = "improving" | "declining" | "steady";

export type WeeklyAvg = {
  label: string;
  pct: number;
};

/** Completion ratio 0–100 for a single saved day. */
export function entryCompletionPct(entry: RoutineDTO): number {
  const total = entry.morning.length + entry.evening.length;
  if (total === 0) return 0;
  const done =
    entry.morning.filter((s) => s.completed).length +
    entry.evening.filter((s) => s.completed).length;
  return Math.round((done / total) * 100);
}

/** True when at least one step was ticked complete (matches backend streak logic). */
export function hasAnyCompleted(entry: RoutineDTO): boolean {
  return (
    entry.morning.some((s) => s.completed) || entry.evening.some((s) => s.completed)
  );
}

/** Average completion ratio 0–1 across entries that have steps. */
export function avgCompletion(entries: RoutineDTO[]): number {
  const ratios = entries
    .map((e) => {
      const total = e.morning.length + e.evening.length;
      if (total === 0) return null;
      const done =
        e.morning.filter((s) => s.completed).length +
        e.evening.filter((s) => s.completed).length;
      return done / total;
    })
    .filter((r): r is number => r !== null);
  if (ratios.length === 0) return 0;
  return ratios.reduce((a, b) => a + b, 0) / ratios.length;
}

export function addDaysUTC(iso: string, delta: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** Oldest → newest calendar dates covering the last `days` days including today. */
export function buildCalendarRange(todayISO: string, days: number): string[] {
  const result: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    result.push(addDaysUTC(todayISO, -i));
  }
  return result;
}

/** Longest run of consecutive calendar days with at least one tick. */
export function computeBestStreak(entries: RoutineDTO[], calendarDays: string[]): number {
  const byDate = new Map(entries.map((e) => [e.routine_date, e]));
  let best = 0;
  let current = 0;
  for (const day of calendarDays) {
    const entry = byDate.get(day);
    if (entry && hasAnyCompleted(entry)) {
      current++;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  }
  return best;
}

export function buildChartPoints(
  entries: RoutineDTO[],
  calendarDays: string[],
): ChartPoint[] {
  const byDate = new Map(entries.map((e) => [e.routine_date, e]));
  return calendarDays.map((date) => {
    const entry = byDate.get(date);
    if (!entry) return { date, pct: 0, hasEntry: false };
    return { date, pct: entryCompletionPct(entry), hasEntry: true };
  });
}

/** Compare first vs second half of the visible window (±5 pp threshold). */
export function computeTrend(points: ChartPoint[]): Trend {
  const withData = points.filter((p) => p.hasEntry);
  if (withData.length < 4) return "steady";
  const mid = Math.floor(withData.length / 2);
  const first = avgCompletionFromPcts(withData.slice(0, mid).map((p) => p.pct));
  const second = avgCompletionFromPcts(withData.slice(mid).map((p) => p.pct));
  const diff = second - first;
  if (diff >= 5) return "improving";
  if (diff <= -5) return "declining";
  return "steady";
}

function avgCompletionFromPcts(pcts: number[]): number {
  if (pcts.length === 0) return 0;
  return pcts.reduce((a, b) => a + b, 0) / pcts.length;
}

/** Group chart points into ISO weeks (Mon-start) and return average pct per week. */
export function buildWeeklyAverages(
  points: ChartPoint[],
  weekLabel: (index: number) => string,
): WeeklyAvg[] {
  const buckets = new Map<number, number[]>();
  for (const p of points) {
    if (!p.hasEntry) continue;
    const weekKey = isoWeekKey(p.date);
    const arr = buckets.get(weekKey) ?? [];
    arr.push(p.pct);
    buckets.set(weekKey, arr);
  }
  const keys = [...buckets.keys()].sort((a, b) => a - b);
  return keys.map((key, i) => {
    const pcts = buckets.get(key) ?? [];
    const pct = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
    return { label: weekLabel(i + 1), pct };
  });
}

function isoWeekKey(iso: string): number {
  const d = new Date(`${iso}T00:00:00Z`);
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return d.getUTCFullYear() * 100 + Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
