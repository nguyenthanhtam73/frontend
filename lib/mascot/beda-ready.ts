export type BedaEngine = "pixi" | "dom";

export type BedaBridge = {
  postMessage?: (message: string) => void;
};

/**
 * Same shape as the intro bridge: one JSON string, not a raw object.
 * `{"type":"beda_ready","engine":"pixi"|"dom"}`.
 */
export function bedaReadyMessage(engine: BedaEngine): string {
  return JSON.stringify({ type: "beda_ready", engine });
}

export function readBedaBridge(scope: object | null | undefined): BedaBridge | null {
  const bridge = (scope as { DaDiarySession?: BedaBridge } | null | undefined)?.DaDiarySession;
  if (!bridge || typeof bridge.postMessage !== "function") return null;
  return bridge;
}

/** One signal per mount. Browsers without the Android bridge still set the attribute. */
export function noteBedaReady(
  engine: BedaEngine,
  scope: object | null | undefined,
  body: { dataset: { bedaReady?: string } },
  sent: { current: boolean },
): boolean {
  if (sent.current) return false;
  sent.current = true;
  body.dataset.bedaReady = engine;
  readBedaBridge(scope)?.postMessage?.(bedaReadyMessage(engine));
  return true;
}
