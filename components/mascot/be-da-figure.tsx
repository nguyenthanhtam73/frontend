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
    </span>
  );

  if (!interactive) {
    return (
      <span className={cn("relative block aspect-[220/250]", className)} data-testid="be-da-figure" data-mood={view.mood}>
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
      data-reaction={reaction ?? ""}
    >
      {art}
    </button>
  );
}

function LayerImage({ layer, tidy }: { layer: StackLayer; tidy: boolean }) {
  const tidyHair = tidy && layer.slot === "messy";
  return (
    <img
      src={layer.src}
      alt=""
      data-slot={layer.slot}
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
