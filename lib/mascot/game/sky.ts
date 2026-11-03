/** Wall-clock sky for the room window and the lobby. Vietnam time, same as streaks. */
export const GAME_TIME_ZONE = "Asia/Ho_Chi_Minh";

export const SKY_PERIODS = ["night", "dawn", "morning", "afternoon", "evening"] as const;
export type SkyPeriod = (typeof SKY_PERIODS)[number];

/** Hour 0–23 in `timeZone`. Midnight reported as 24 is treated as 0. */
export function hourInTimeZone(date: Date, timeZone = GAME_TIME_ZONE): number {
  const raw = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    hourCycle: "h23",
  }).format(date);
  const hour = Number(raw);
  if (!Number.isFinite(hour)) return 0;
  if (hour === 24) return 0;
  return ((Math.trunc(hour) % 24) + 24) % 24;
}

/**
 * Night before 5 and from 19. Dawn 5–6, morning 7–10, afternoon 11–15, evening 16–18.
 */
export function skyPeriodFromHour(hour: number): SkyPeriod {
  const h = ((Math.trunc(hour) % 24) + 24) % 24;
  if (h < 5 || h >= 19) return "night";
  if (h < 7) return "dawn";
  if (h < 11) return "morning";
  if (h < 16) return "afternoon";
  return "evening";
}

export function skyPeriod(date: Date, timeZone = GAME_TIME_ZONE): SkyPeriod {
  return skyPeriodFromHour(hourInTimeZone(date, timeZone));
}
