"use client";

import { Bell, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  commitDailyReminderTime,
  fetchPushOptInReminder,
  updateReminderSchedule,
  type PushOptInReminder,
} from "@/lib/api/reminder";
import { AUTH_CHANGED_EVENT, getAccessToken } from "@/lib/auth-token";
import {
  browserReminderTimezone,
  buildReminderEnabledPut,
  isReminderScheduleOn,
  readReminderSchedule,
  reminderTimeDraftDirty,
  reminderTimeInputValue,
  reminderTimezoneKind,
  type ReminderSchedule,
} from "@/lib/reminder/schedule";
import { cn } from "@/lib/utils";

type Placement = "check-in" | "settings";

type Props = {
  placement?: Placement;
  /**
   * Settled GET payload. When passed (including null), the card does not
   * fetch — tests render the form without a session.
   */
  prefetch?: PushOptInReminder | null;
};

/**
 * Signed-in control for the daily skin-photo reminder clock.
 * GET/PUT /api/v1/me/reminder `schedule` fields only — push opt-in stays separate.
 */
export function DailyReminderScheduleCard({ placement = "settings", prefetch }: Props) {
  const t = useTranslations("activation.reminder");
  const timeId = useId();
  const seeded = prefetch !== undefined;
  const [phase, setPhase] = useState<"gate" | "loading" | "ready">(seeded ? "ready" : "gate");
  const [schedule, setSchedule] = useState<ReminderSchedule | null>(() =>
    seeded ? readReminderSchedule(prefetch) : null,
  );
  const [enabled, setEnabled] = useState(() =>
    seeded ? isReminderScheduleOn(readReminderSchedule(prefetch)) : true,
  );
  const [time, setTime] = useState(() =>
    seeded ? reminderTimeInputValue(readReminderSchedule(prefetch)) : reminderTimeInputValue(null),
  );
  const [zone, setZone] = useState(() => browserReminderTimezone(null));
  const [zoneReady, setZoneReady] = useState(seeded);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<"ok" | "err" | null>(null);

  useEffect(() => {
    setZone(browserReminderTimezone());
    setZoneReady(true);
  }, []);

  useEffect(() => {
    if (seeded) return;
    let generation = 0;

    const load = () => {
      const id = ++generation;
      if (!getAccessToken()) {
        setPhase("gate");
        return;
      }
      setPhase("loading");
      void fetchPushOptInReminder().then((view) => {
        if (id !== generation) return;
        const next = readReminderSchedule(view);
        setSchedule(next);
        setEnabled(isReminderScheduleOn(next));
        setTime(reminderTimeInputValue(next));
        setPhase("ready");
      });
    };

    load();
    window.addEventListener(AUTH_CHANGED_EVENT, load);
    return () => {
      generation += 1;
      window.removeEventListener(AUTH_CHANGED_EVENT, load);
    };
  }, [seeded]);

  if (phase === "gate") return null;

  const hasSavedTime = Boolean(schedule?.time);
  const status = !enabled
    ? t("scheduleOff")
    : hasSavedTime && schedule?.time
      ? t("scheduleOn", { time: schedule.time })
      : t("scheduleOnPending");
  const dirty =
    zoneReady && reminderTimeDraftDirty({ time, timezone: zone, previous: schedule });
  const zoneKind = reminderTimezoneKind(zone);

  function applyView(view: PushOptInReminder) {
    const next = readReminderSchedule(view);
    setSchedule(next);
    setEnabled(isReminderScheduleOn(next));
    setTime(reminderTimeInputValue(next));
  }

  async function onToggle() {
    const next = !enabled;
    const body = buildReminderEnabledPut(next, schedule);
    setNotice(null);
    if (!body) {
      setEnabled(next);
      return;
    }
    const previousEnabled = enabled;
    setEnabled(next);
    setBusy(true);
    const view = await updateReminderSchedule(body);
    setBusy(false);
    if (!view) {
      setEnabled(previousEnabled);
      setNotice("err");
      return;
    }
    applyView(view);
  }

  async function onSave() {
    setNotice(null);
    setBusy(true);
    const view = await commitDailyReminderTime({
      time,
      timezone: zone,
      previous: schedule,
    });
    setBusy(false);
    if (!view) {
      setNotice("err");
      return;
    }
    applyView(view);
    setNotice("ok");
  }

  return (
    <section
      data-testid="daily-reminder-schedule"
      data-placement={placement}
      aria-busy={phase === "loading" || busy}
      className={cn(
        "max-w-full",
        placement === "check-in"
          ? "rounded-2xl border border-primary/30 bg-primary/[0.07] px-4 py-4 sm:px-5"
          : "rounded-xl border border-border/70 bg-card p-4",
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Bell className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold leading-snug">{t("scheduleTitle")}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{t("scheduleHelper")}</p>
          </div>

          {phase === "loading" ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {t("scheduleLoading")}
            </p>
          ) : (
            <>
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                aria-label={t("scheduleToggleLabel")}
                data-testid="daily-reminder-toggle"
                disabled={busy}
                onClick={() => void onToggle()}
                className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-border/70 bg-background px-3 py-2 text-left disabled:opacity-60"
              >
                <span className="min-w-0 text-sm font-medium leading-snug">{status}</span>
                <span
                  aria-hidden
                  className={cn(
                    "relative h-6 w-11 shrink-0 rounded-full",
                    enabled ? "bg-primary" : "bg-muted-foreground/30",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 size-5 rounded-full bg-background shadow",
                      enabled ? "left-5" : "left-0.5",
                    )}
                  />
                </span>
              </button>

              {enabled ? (
                <div className="space-y-2">
                  <label htmlFor={timeId} className="block space-y-1">
                    <span className="text-sm font-medium">{t("scheduleTimeLabel")}</span>
                    <input
                      id={timeId}
                      type="time"
                      step={60}
                      value={time}
                      data-testid="daily-reminder-time"
                      disabled={busy}
                      onChange={(event) => {
                        setTime(event.target.value);
                        setNotice(null);
                      }}
                      className="min-h-11 w-full max-w-full rounded-lg border border-border/80 bg-background px-3 text-base text-foreground outline-none ring-ring/40 focus:ring-2"
                    />
                  </label>
                  {zoneReady ? (
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {zoneKind === "vietnam" ? t("scheduleZoneVietnam") : t("scheduleZoneDevice")}
                    </p>
                  ) : null}
                  {!hasSavedTime ? (
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {t("scheduleDefaultHint")}
                    </p>
                  ) : null}
                  {dirty ? (
                    <Button
                      type="button"
                      data-testid="daily-reminder-save"
                      className="h-auto min-h-11 w-full px-3 sm:w-auto"
                      disabled={busy}
                      onClick={() => void onSave()}
                    >
                      {busy ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                      ) : null}
                      {busy ? t("scheduleSaving") : t("scheduleSave")}
                    </Button>
                  ) : null}
                </div>
              ) : null}

              {notice ? (
                <p
                  role={notice === "err" ? "alert" : "status"}
                  className={cn(
                    "text-xs leading-relaxed",
                    notice === "err" ? "text-destructive" : "text-primary",
                  )}
                >
                  {notice === "err" ? t("scheduleError") : t("scheduleSaved")}
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
