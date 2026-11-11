/**
 * Sleeve arms for the spritesheet. The files already exist
 * (`outfits/arm_wave_right__<outfit>.svg`); the capture was leaving them out.
 * Rotations are around the shoulder at 62.7% 63.2%. The left arm is that
 * same file mirrored, not a new drawing.
 */

/** Degrees around the shoulder. 100 hangs the sleeve beside the dress; 0 is the drawn wave. */
export const IDLE_ARM_RIGHT = 100;
export const IDLE_ARM_LEFT = 100;
export const WALK_ARM_SWING = 14;

const WAVE_WAG = [-12, -4, 10, 2, -8, 6] as const;

export type ArmClip = "idle" | "walk" | "wave";

export function sleeveArmSrc(outfitSrc: string): string {
  const sleeve = outfitSrc.match(/outfit_([a-z0-9_]+)\.svg/)?.[1] ?? "pajamas";
  return `/mascot/outfits/arm_wave_right__${sleeve}.svg`;
}

/** Both sleeves hang at rest. Walk swings them opposite the legs. Wave lifts the right arm. */
export function armPose(clip: ArmClip, index: number): { right: number; left: number } {
  if (clip === "wave") {
    return { right: WAVE_WAG[index] ?? 0, left: IDLE_ARM_LEFT };
  }
  const swing = clip === "walk" ? Math.sin((index / 6) * Math.PI * 2) : 0;
  // Positive swing is the left leg stepping forward, so the right arm lifts and the left arm drops.
  return {
    right: IDLE_ARM_RIGHT - swing * WALK_ARM_SWING,
    left: IDLE_ARM_LEFT + swing * WALK_ARM_SWING,
  };
}

/** Two sleeve images, right and mirrored left, so a frame always has both arms. */
export function armMarkup(outfitSrc: string, clip: ArmClip, index: number): string {
  const src = sleeveArmSrc(outfitSrc);
  const pose = armPose(clip, index);
  return `<img class="arm arm-r" alt="" src="${src}" style="transform:rotate(${pose.right.toFixed(1)}deg)"><div class="arm-mirror"><img class="arm arm-l" alt="" src="${src}" style="transform:rotate(${pose.left.toFixed(1)}deg)"></div>`;
}
