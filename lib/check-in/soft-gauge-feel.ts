/** Soft gauges are today's feel — not exam / diagnosis scores. */

export type SoftGaugeFeel = "low" | "mid" | "ok";

/** Map a 0–1 gauge to a qualitative feel bucket. */
export function softGaugeFeel(value: number): SoftGaugeFeel {
  const clamped = Math.min(1, Math.max(0, value));
  if (clamped < 0.4) return "low";
  if (clamped < 0.7) return "mid";
  return "ok";
}

export function softGaugeFeelKey(
  value: number,
): "gaugeFeelLow" | "gaugeFeelMid" | "gaugeFeelOk" {
  const feel = softGaugeFeel(value);
  if (feel === "low") return "gaugeFeelLow";
  if (feel === "mid") return "gaugeFeelMid";
  return "gaugeFeelOk";
}
