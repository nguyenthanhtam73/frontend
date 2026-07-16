/** Response from GET /api/v1/me/streak (soft-expire applied on read). */
export type StreakDTO = {
  /** Effective streak after soft-expire (0 if gap ≥2 without protection). */
  current_streak: number;
  longest_streak: number;
  last_check_in_date?: string | null;
  /**
   * Earliest SkinCheck day (YYYY-MM-DD, Vietnam calendar).
   * Mini-history must not mark earlier days as "missed".
   */
  first_check_in_date?: string | null;
  /** Active freeze day (today or later only). */
  protected_until?: string | null;
  /** Most recent freeze-covered day (kept after ProtectedUntil clear). */
  last_freeze_date?: string | null;
  /** Recent freeze-covered days (oldest→newest) for mini-history. */
  freeze_dates?: string[] | null;
  freezes_available: number;
  /** True when last check-in was yesterday (or freeze-bridged) and today still open. */
  is_at_risk: boolean;
  /** True when an active freeze covers today (or later). */
  is_protected: boolean;
  /** Calendar days since last_check_in_date; omitted when never checked in. */
  days_since_last_check_in?: number | null;
};

export type StreakStatus = "idle" | "maintaining" | "at_risk" | "protected";

export type StreakDayCell = {
  /** YYYY-MM-DD (Vietnam calendar) */
  date: string;
  /** Short weekday label key handled by UI (Mon…Sun) — ISO weekday 1–7 */
  weekday: number;
  state: "checked" | "missed" | "protected" | "empty";
  isToday: boolean;
};
