"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { useTranslations } from "next-intl";

import { GameIcon, GAME_ICONS } from "@/components/mascot/game/icons";
import { mascotAssetUrl } from "@/lib/mascot/asset-url";
import { formatGameCoins } from "@/lib/mascot/game/coins";
import {
  claimClick,
  coinAt,
  normalizeQuestGrant,
  QUEST_CHEST_LID_MS,
  questChestOpenMs,
  type QuestChestGrant,
} from "@/lib/mascot/game/quest-chest";

const STARS = [
  { dx: "-92px", dy: "-78px", delay: "0.4s" },
  { dx: "88px", dy: "-72px", delay: "0.48s" },
  { dx: "-36px", dy: "-104px", delay: "0.44s" },
  { dx: "40px", dy: "-100px", delay: "0.54s" },
  { dx: "104px", dy: "-18px", delay: "0.58s" },
  { dx: "-108px", dy: "-12px", delay: "0.5s" },
];

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useCoinTicker(from: number | null | undefined, to: number | null): number | null {
  const fromRef = useRef(from);
  fromRef.current = from;
  const [value, setValue] = useState<number | null>(null);
  useEffect(() => {
    if (to == null) {
      setValue(null);
      return;
    }
    const startFrom = fromRef.current == null || !Number.isFinite(fromRef.current) ? to : fromRef.current;
    if (startFrom === to) {
      setValue(to);
      return;
    }
    const t0 = performance.now();
    const dur = 700;
    let frame = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      setValue(coinAt(startFrom, to, p));
      if (p < 1) frame = requestAnimationFrame(step);
    };
    setValue(startFrom);
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [to]);
  return value;
}

export function BeDaQuestChest({
  locale,
  hearts,
  onClaim,
  onClose,
  onBalance,
  initialPhase = "ready",
  preview = null,
}: {
  locale: string;
  hearts: number;
  onClaim: () => void | Promise<QuestChestGrant | void>;
  onClose: () => void;
  onBalance?: (balance: number) => void;
  initialPhase?: "ready" | "opening" | "reward" | "error";
  preview?: QuestChestGrant | null;
}) {
  const t = useTranslations("mascot");
  const [phase, setPhase] = useState(initialPhase);
  const [grant, setGrant] = useState<QuestChestGrant | null>(initialPhase === "reward" ? preview : null);
  const [lid, setLid] = useState<"closed" | "open">(initialPhase === "opening" ? "closed" : "closed");
  const [reduced, setReduced] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(initialPhase === "reward");
  const alive = useRef(true);
  const takeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (phase !== "opening" || reduced) return;
    const id = window.setTimeout(() => setLid("open"), QUEST_CHEST_LID_MS);
    return () => window.clearTimeout(id);
  }, [phase, reduced]);

  useEffect(() => {
    if (phase === "reward") takeRef.current?.focus();
  }, [phase]);

  useEffect(() => {
    if (phase === "opening") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, onClose]);

  async function claim() {
    if (claimClick({ pending: lock.current, done: phase === "reward" }) === "ignore") return;
    lock.current = true;
    setBusy(true);
    setPhase("opening");
    setLid("closed");
    const reducedNow = prefersReducedMotion();
    setReduced(reducedNow);
    try {
      const next = normalizeQuestGrant(await onClaim());
      await wait(questChestOpenMs(reducedNow));
      if (!alive.current) return;
      if (next.balance != null) onBalance?.(next.balance);
      setGrant(next);
      setPhase("reward");
    } catch {
      if (!alive.current) return;
      lock.current = false;
      setPhase("error");
    } finally {
      if (alive.current) setBusy(false);
    }
  }

  function retry() {
    lock.current = false;
    setLid("closed");
    setPhase("ready");
  }

  function onBackdrop() {
    if (phase === "opening") return;
    onClose();
  }

  const artClass = [
    "beda-chest-art",
    phase === "ready" ? "is-wiggle" : "",
    phase === "opening" && !reduced && lid === "closed" ? "is-shake" : "",
    phase === "opening" && !reduced && lid === "open" ? "is-pop" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div
      className="beda-chest"
      data-testid="beda-chest"
      data-phase={phase}
      data-reduced={reduced ? "1" : "0"}
      role="dialog"
      aria-modal="true"
      aria-labelledby="beda-chest-title"
      aria-busy={phase === "opening"}
    >
      <button
        type="button"
        className="beda-chest-shade"
        data-testid="beda-chest-backdrop"
        aria-label={t("game.careClose")}
        onClick={onBackdrop}
      />
      <div className="beda-chest-card">
        {phase === "reward" ? null : (
          <h2 id="beda-chest-title" role={phase === "error" ? "alert" : undefined} data-testid={phase === "error" ? "beda-chest-error" : undefined}>
            {phase === "error" ? t("game.chestFail") : t("game.chestTitle")}
          </h2>
        )}
        {phase === "ready" ? <p className="beda-chest-sub">{t("game.chestSub")}</p> : null}
        {phase === "ready" || phase === "opening" ? (
          <div className="beda-chest-stage" aria-hidden>
            {phase === "opening" && !reduced ? <span className="beda-chest-glow" /> : null}
            {phase === "opening" && !reduced
              ? STARS.map((star) => (
                  <i
                    key={star.dx}
                    className="beda-chest-star"
                    style={{ ["--dx" as string]: star.dx, ["--dy" as string]: star.dy, animationDelay: star.delay }}
                  />
                ))
              : null}
            <img
              className={artClass}
              alt=""
              src={lid === "open" ? GAME_ICONS.chestOpen : GAME_ICONS.chestClosed}
              decoding="async"
            />
          </div>
        ) : null}
        {phase === "ready" ? (
          <button
            type="button"
            className="beda-chest-take"
            data-testid="beda-chest-open"
            disabled={busy}
            onClick={() => void claim()}
          >
            {t("game.chestOpenBtn")}
          </button>
        ) : null}
        {phase === "opening" ? <p className="beda-chest-wait">{t("game.chestOpening")}</p> : null}
        {phase === "reward" ? (
          <Reward grant={grant} hearts={hearts} locale={locale} takeRef={takeRef} onClose={onClose} />
        ) : null}
        {phase === "error" ? (
          <button type="button" className="beda-chest-take" data-testid="beda-chest-retry" onClick={retry}>
            {t("game.tryAgain")}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function Reward({
  grant,
  hearts,
  locale,
  takeRef,
  onClose,
}: {
  grant: QuestChestGrant | null;
  hearts: number;
  locale: string;
  takeRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}) {
  const t = useTranslations("mascot");
  const coins = grant?.coins ?? 0;
  const item = grant?.item ?? null;
  return (
    <>
      {item ? (
        <>
          <img className="beda-chest-prize" data-testid="beda-chest-item" alt="" src={mascotAssetUrl(item.src)} />
          <p className="beda-chest-item-name">{item.name}</p>
        </>
      ) : null}
      {coins > 0 ? (
        <>
          {item ? null : <img className="beda-chest-prize" alt="" src={GAME_ICONS.coin} />}
          <p className="beda-chest-plus" data-testid="beda-chest-plus">
            {t("game.chestPlus", { count: formatGameCoins(coins, locale) })}
          </p>
        </>
      ) : null}
      {!item && coins <= 0 ? (
        <>
          <GameIcon name="heart" className="beda-chest-prize" />
          <p className="beda-chest-plus" data-testid="beda-chest-hearts">
            {t("game.chestHearts", { count: hearts })}
          </p>
        </>
      ) : null}
      <p id="beda-chest-title" className="beda-chest-line" data-testid="beda-chest-line">
        {t("game.chestLine")}
      </p>
      <button
        ref={takeRef}
        type="button"
        className="beda-chest-take"
        data-testid="beda-chest-take"
        onClick={onClose}
      >
        {t("game.chestTake")}
      </button>
    </>
  );
}
