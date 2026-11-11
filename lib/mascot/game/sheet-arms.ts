/**
 * Sleeve arms for the spritesheet. The files already exist
 * (`outfits/arm_wave_right__<outfit>.svg`); the capture was leaving them out.
 * Rotations are around the shoulder at 62.7% 63.2%. The left arm is that
 * same file mirrored, not a new drawing.
 */

/** Degrees around the shoulder. 100 hangs the sleeve; 0 is the drawn wave; -112 rests the left hand under the chin. */
export const HANG_ARM = 100;
export const CHIN_ARM = -112;
export const IDLE_ARM_RIGHT = HANG_ARM;
export const IDLE_ARM_LEFT = CHIN_ARM;
export const WALK_ARM_SWING = 14;

/** The glow plate also draws a loose hand on the chest. The sleeve replaces it. */
const CHIN_HAND = /<path d="M7[67] 15[01][\s\S]*?\/>|<path d="M78 160[\s\S]*?\/>|<path d="M80 159[\s\S]*?\/>/g;

export function withoutChinHand(svg: string): string {
  return svg.replace(CHIN_HAND, "");
}

const WAVE_WAG = [-12, -4, 10, 2, -8, 6] as const;

export type ArmClip = "idle" | "walk" | "wave";

export function sleeveArmSrc(outfitSrc: string): string {
  const sleeve = outfitSrc.match(/outfit_([a-z0-9_]+)\.svg/)?.[1] ?? "pajamas";
  return `/mascot/outfits/arm_wave_right__${sleeve}.svg`;
}

/** Idle rests the left hand at the chin. Walk and wave do not. Walk swings both arms opposite the legs. */
export function armPose(clip: ArmClip, index: number): { right: number; left: number } {
  if (clip === "wave") return { right: WAVE_WAG[index] ?? 0, left: HANG_ARM };
  if (clip === "idle") return { right: HANG_ARM, left: CHIN_ARM };
  const swing = Math.sin((index / 6) * Math.PI * 2);
  // Positive swing is the left leg stepping forward, so the right arm lifts and the left arm drops.
  return {
    right: HANG_ARM - swing * WALK_ARM_SWING,
    left: HANG_ARM + swing * WALK_ARM_SWING,
  };
}

/** Two sleeve images, right and mirrored left, so a frame always has both arms. */
export function armMarkup(outfitSrc: string, clip: ArmClip, index: number): string {
  const src = sleeveArmSrc(outfitSrc);
  const pose = armPose(clip, index);
  return `<img class="arm arm-r" alt="" src="${src}" style="transform:rotate(${pose.right.toFixed(1)}deg)"><div class="arm-mirror"><img class="arm arm-l" alt="" src="${src}" style="transform:rotate(${pose.left.toFixed(1)}deg)"></div>`;
}
