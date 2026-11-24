"use client";

import { Fragment, memo, useCallback, useEffect, useRef, useState } from "react";

import { mascotAssetUrl } from "@/lib/mascot/asset-url";
import { mascotStack } from "@/lib/mascot/layers";
import type { GameDress } from "@/lib/mascot/game/look";
import { idleSleeves } from "@/lib/mascot/game/sheet-arms";
import { startBeDaBlinkLoop } from "@/lib/mascot/idle";
import type { BeDaView, StepPose } from "@/lib/mascot/model";
import { cn } from "@/lib/utils";

const REACTIONS = ["laugh", "startled", "pouty"] as const;
type Reaction = (typeof REACTIONS)[number];

export function BeDaFigure({
  view,
  stepPose = null,
  locale,
  tidy = false,
  fliesExit = false,
  celebrate = false,
  glowCelebrate = false,
  interactive = false,
  tapLabel,
  dress = null,
  imageLoading = "eager",
  crowd = false,
  /** Skin marks on a crowd figure. The local player uses this in the lobby. */
  marks = false,
  /**
   * Room walk splits one figure into feet and a body so the legs can step.
   * `arms` is only the short sleeves. Home Bé Da leaves this unset.
   */
  parts = "all",
  /** Leg copies skip the blink clock. The body copy keeps it. */
  blink = true,
  /**
   * Shop try-on layer. Same 220×250 viewBox as the body, drawn inside the
   * breathe box so it shares the wardrobe anchors and does not shift her.
   */
  wearSrc = null,
  className,
}: {
  view: BeDaView;
  stepPose?: StepPose | null;
  locale: string;
  tidy?: boolean;
  fliesExit?: boolean;
  celebrate?: boolean;
  /** Short sparkle burst when `level_up` is acknowledged. */
  glowCelebrate?: boolean;
  interactive?: boolean;
  tapLabel?: string;
  /** Game closet outfit, hair, and clip. Home Bé Da leaves this unset. */
  dress?: GameDress | null;
  /** Lobby visitors off the screen can wait. The room figure stays eager. */
  imageLoading?: "eager" | "lazy";
  /** Shared lobby and spa. Happy open eyes, shadow, and name tag only. */
  crowd?: boolean;
  /** Draw skin marks on a crowd figure. */
  marks?: boolean;
  parts?: "all" | "body" | "arms";
  blink?: boolean;
  wearSrc?: string | null;
  className?: string;
}) {
  const [reaction, setReaction] = useState<Reaction | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const layers = mascotStack(view, { reaction, stepPose, locale, dress, crowd, marks: marks || undefined });
  const showExitFlies = fliesExit && !view.flies && !crowd;
  const showFace = layers.some((layer) => layer.slot === "face-eyes");
  const hasLids = layers.some((layer) => layer.slot === "fx-eyelids");
  const outfit = layers.find((layer) => layer.slot === "outfit");
  const hangingSleeves =
    outfit && /\/outfits\/outfit_/.test(outfit.src) && !layers.some((layer) => layer.slot === "arms")
      ? outfit.src
      : null;
  const floorSrc = !crowd && view.glowLevel >= 5 ? mascotAssetUrl(`/mascot/glow/level_${view.glowLevel}_floor.svg`) : null;
  const rootRef = useRef<HTMLElement | null>(null);
  const setRoot = useCallback((node: HTMLElement | null) => {
    rootRef.current = node;
  }, []);
  useBeDaIdleBlink(rootRef, view.glowLevel, blink && showFace && parts !== "arms", interactive);

  function tap() {
    if (!interactive) return;
    const next = REACTIONS[Math.floor(Math.random() * REACTIONS.length)]!;
    setReaction(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setReaction(null), 1200);
  }

  const art = (
    <>
      {floorSrc ? (
        <img
          src={floorSrc}
          alt=""
          data-slot="glow-floor"
          loading={imageLoading}
          decoding="async"
          className="pointer-events-none absolute inset-0 h-full w-full"
        />
      ) : null}
      <span className={cn("bd-breathe absolute inset-0", celebrate && "be-da-jump")}>
        {layers.map((layer) => (
          <Fragment key={`${layer.slot}:${layer.src}`}>
            <LayerImage
              src={layer.src}
              slot={layer.slot}
              opacity={layer.opacity}
              tidy={layer.slot === "messy" && tidy}
              loading={imageLoading}
            />
            {hangingSleeves && parts !== "body" && layer.slot === "outfit" ? <IdleSleeves outfitSrc={hangingSleeves} /> : null}
          </Fragment>
        ))}
        {showFace && !hasLids ? (
          <img
            src={mascotAssetUrl("/mascot/fx/eyelids.svg")}
            alt=""
            data-slot="fx-eyelids"
            decoding="async"
            className="bd-lids pointer-events-none absolute inset-0 h-full w-full"
          />
        ) : null}
        {showExitFlies ? (
          <img src={mascotAssetUrl("/mascot/fx/flies/flies.svg")} alt="" decoding="async" className="be-da-flies-exit absolute inset-0 h-full w-full" />
        ) : null}
        {glowCelebrate && view.glowLevel >= 6 ? (
          <img src={mascotAssetUrl("/mascot/fx/hearts.svg")} alt="" decoding="async" className="pointer-events-none absolute inset-0 h-full w-full" data-testid="be-da-hearts" />
        ) : null}
        {glowCelebrate ? <GlowBurst /> : null}
        {wearSrc ? (
          <img
            src={mascotAssetUrl(wearSrc)}
            alt=""
            data-testid="beda-xu-wear-layer"
            data-slot="shop-wear"
            decoding="async"
            className="pointer-events-none absolute inset-0 z-[3] h-full w-full"
          />
        ) : null}
      </span>
    </>
  );

  if (parts === "arms") {
    return (
      <span
        ref={setRoot}
        className={cn("bd-figure relative block aspect-[220/250]", className)}
        data-testid="be-da-figure"
        data-mood={view.mood}
        data-gender={view.gender}
        data-art="drawn"
        aria-hidden
      >
        {hangingSleeves ? <IdleSleeves outfitSrc={hangingSleeves} /> : null}
      </span>
    );
  }

  if (!interactive) {
    return (
      <span
        ref={setRoot}
        className={cn("bd-figure relative block aspect-[220/250]", className)}
        data-testid="be-da-figure"
        data-mood={view.mood}
        data-glow-level={view.glowLevel}
        data-level={view.glowLevel}
        data-gender={view.gender}
        data-art="drawn"
      >
        {art}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={tap}
      aria-label={tapLabel}
      ref={setRoot}
      className={cn("bd-figure relative block aspect-[220/250] cursor-pointer", className)}
      data-testid="be-da-figure"
      data-mood={view.mood}
      data-glow-level={view.glowLevel}
      data-level={view.glowLevel}
      data-gender={view.gender}
      data-art="drawn"
      data-reaction={reaction ?? ""}
    >
      {art}
    </button>
  );
}

/** One soft blink on this figure's own clock. Reduced motion leaves the eyes open. */
function useBeDaIdleBlink(
  rootRef: { readonly current: HTMLElement | null },
  level: number,
  enabled: boolean,
  interactive: boolean,
) {
  useEffect(() => {
    // `interactive` swaps the host between span and button, so the loop rebinds.
    if (!enabled) return;
    const root = rootRef.current;
    if (!root) return;
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    let stop = () => {};
    const sync = () => {
      stop();
      stop = startBeDaBlinkLoop({
        level,
        reducedMotion: media?.matches === true,
        blink(closedMs) {
          const lids = root.querySelector<HTMLElement>(".bd-lids");
          if (!lids) return;
          lids.style.setProperty("--bd-blink", `${closedMs}ms`);
          lids.classList.remove("bd-blink-run");
          // A reflow is required or the browser will not restart the opacity fade.
          void lids.offsetWidth;
          lids.classList.add("bd-blink-run");
        },
      });
    };
    sync();
    media?.addEventListener("change", sync);
    return () => {
      media?.removeEventListener("change", sync);
      stop();
      root.querySelector(".bd-lids")?.classList.remove("bd-blink-run");
    };
  }, [enabled, interactive, level, rootRef]);
}

/** Short hanging sleeves from the v2 sheet. Left is the same file, mirrored. */
function IdleSleeves({ outfitSrc }: { outfitSrc: string }) {
  const sleeves = idleSleeves(outfitSrc);
  return (
    <>
      <img
        alt=""
        src={sleeves.src}
        data-slot="arms"
        decoding="async"
        className="bd-sleeve"
        style={{ transform: `rotate(${sleeves.right}deg)` }}
      />
      <span className="bd-sleeve-mirror">
        <img
          alt=""
          src={sleeves.src}
          data-slot="arms"
          decoding="async"
          className="bd-sleeve"
          style={{ transform: `rotate(${sleeves.left}deg)` }}
        />
      </span>
    </>
  );
}

const LayerImage = memo(function LayerImage({
  src,
  slot,
  opacity,
  tidy,
  loading,
}: {
  src: string;
  slot: string;
  opacity: number;
  tidy: boolean;
  loading: "eager" | "lazy";
}) {
  const tidyHair = tidy && slot === "messy";
  const glow = slot === "glow" || slot === "glow-back" || slot === "glow-front";
  const lids = slot === "fx-eyelids";
  const [missing, setMissing] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    if (!glow) return;
    const img = ref.current;
    if (img?.complete && img.naturalWidth === 0) setMissing(true);
  }, [glow, src]);
  if (missing) return null;
  return (
    <img
      ref={ref}
      src={mascotAssetUrl(src)}
      alt=""
      data-slot={slot}
      loading={loading}
      decoding="async"
      onError={glow ? () => setMissing(true) : undefined}
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full",
        lids && "bd-lids",
        slot === "fx-yawn" && "be-da-yawn",
        slot === "fx-flies" && "be-da-fly",
        tidyHair && "be-da-tidy",
      )}
      style={tidyHair || lids ? undefined : { opacity }}
    />
  );
});

/** Fixed burst so the celebration does not jump between renders. */
const GLOW_BITS = [
  { dx: "-36px", dy: "-42px", color: "#FFE08A", delay: "0s", size: 7 },
  { dx: "30px", dy: "-38px", color: "#FFFFFF", delay: "0.05s", size: 6 },
  { dx: "-14px", dy: "-56px", color: "#FFB3D4", delay: "0.08s", size: 5 },
  { dx: "12px", dy: "-50px", color: "#FFE08A", delay: "0.02s", size: 8 },
  { dx: "42px", dy: "-16px", color: "#FFFFFF", delay: "0.1s", size: 5 },
  { dx: "-44px", dy: "-12px", color: "#F48FB1", delay: "0.06s", size: 6 },
  { dx: "4px", dy: "-22px", color: "#FFF6C8", delay: "0.12s", size: 4 },
  { dx: "-22px", dy: "10px", color: "#FFE08A", delay: "0.07s", size: 5 },
  { dx: "24px", dy: "8px", color: "#FFD0E4", delay: "0.09s", size: 5 },
] as const;

function GlowBurst() {
  return (
    <span className="pointer-events-none absolute inset-0" data-testid="be-da-glow-burst" aria-hidden>
      {GLOW_BITS.map((bit) => (
        <span
          key={`${bit.dx}:${bit.dy}`}
          className="be-da-spark"
          style={{
            width: bit.size,
            height: bit.size,
            background: bit.color,
            animationDelay: bit.delay,
            ["--be-da-dx" as string]: bit.dx,
            ["--be-da-dy" as string]: bit.dy,
          }}
        />
      ))}
    </span>
  );
}
