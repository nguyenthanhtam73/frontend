"use client";

import { useEffect, useRef, useState } from "react";

import { mascotStack, type StackLayer } from "@/lib/mascot/layers";
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
  className?: string;
}) {
  const [reaction, setReaction] = useState<Reaction | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const layers = mascotStack(view, { reaction, stepPose, locale });
  const showExitFlies = fliesExit && !view.flies;

  function tap() {
    if (!interactive) return;
    const next = REACTIONS[Math.floor(Math.random() * REACTIONS.length)]!;
    setReaction(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setReaction(null), 1200);
  }

  const art = (
    <span className={cn("be-da-breathe absolute inset-0", celebrate && "be-da-jump")}>
      {layers.map((layer) => (
        <LayerImage key={`${layer.slot}:${layer.src}`} layer={layer} tidy={tidy} />
      ))}
      {showExitFlies ? (
        <img src="/mascot/fx/flies/flies.svg" alt="" className="be-da-flies-exit absolute inset-0 h-full w-full" />
      ) : null}
      {glowCelebrate ? <GlowBurst /> : null}
    </span>
  );

  if (!interactive) {
    return (
      <span className={cn("relative block aspect-[220/250]", className)} data-testid="be-da-figure" data-mood={view.mood} data-glow-level={view.glowLevel}>
        {art}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={tap}
      aria-label={tapLabel}
      className={cn("relative block aspect-[220/250] cursor-pointer", className)}
      data-testid="be-da-figure"
      data-mood={view.mood}
      data-glow-level={view.glowLevel}
      data-reaction={reaction ?? ""}
    >
      {art}
    </button>
  );
}

function LayerImage({ layer, tidy }: { layer: StackLayer; tidy: boolean }) {
  const tidyHair = tidy && layer.slot === "messy";
  const glow = layer.slot === "glow" || layer.slot === "glow-back" || layer.slot === "glow-front";
  const [missing, setMissing] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    if (!glow) return;
    const img = ref.current;
    if (img?.complete && img.naturalWidth === 0) setMissing(true);
  }, [glow, layer.src]);
  if (missing) return null;
  return (
    <img
      ref={ref}
      src={layer.src}
      alt=""
      data-slot={layer.slot}
      onError={glow ? () => setMissing(true) : undefined}
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full",
        layer.slot === "fx-eyelids" && "be-da-blink",
        layer.slot === "fx-yawn" && "be-da-yawn",
        layer.slot === "fx-flies" && "be-da-fly",
        tidyHair && "be-da-tidy",
      )}
      style={tidyHair ? undefined : { opacity: layer.opacity }}
    />
  );
}

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
