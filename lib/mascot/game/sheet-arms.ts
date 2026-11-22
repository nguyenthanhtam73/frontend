/**
 * Sleeve arms for the spritesheet. The files already exist
 * (`outfits/arm_wave_right__<outfit>.svg`); the capture was leaving them out.
 * Rotations are around the shoulder at 62.7% 63.2%. The left arm is that
 * same file mirrored, not a new drawing.
 */

/**
 * Degrees around the shoulder. The sleeve file is a short arm: 100 hangs it
 * above the hem, 0 is the small drawn wave. The chin rest is a separate bent
 * sleeve (`arm_chin__`), not a long rotation of this one.
 */
export const HANG_ARM = 100;
export const CHIN_ARM = 0;
/** Idle hangs both arms. 110 tucks them closer than the walk hang; 118 covers the shirt. */
export const IDLE_HANG = 110;
export const IDLE_ARM_RIGHT = IDLE_HANG;
export const IDLE_ARM_LEFT = IDLE_HANG;
export const WALK_ARM_SWING = 6;

/** The glow plate also draws a loose hand on the chest. The sleeve replaces it. */
const CHIN_HAND = /<path d="M7[67] 15[01][\s\S]*?\/>|<path d="M78 160[\s\S]*?\/>|<path d="M80 159[\s\S]*?\/>/g;

export function withoutChinHand(svg: string): string {
  return svg.replace(CHIN_HAND, "");
}

const WAVE_WAG = [-6, -2, 5, 1, -4, 3] as const;

export type ArmClip = "idle" | "walk" | "wave";

function sleeveId(outfitSrc: string): string {
  return outfitSrc.match(/outfit_([a-z0-9_]+)\.svg/)?.[1] ?? "pajamas";
}

export function sleeveArmSrc(outfitSrc: string): string {
  return `/mascot/outfits/arm_wave_right__${sleeveId(outfitSrc)}.svg`;
}

export function chinArmSrc(outfitSrc: string): string {
  return `/mascot/outfits/arm_chin__${sleeveId(outfitSrc)}.svg`;
}

/** Idle hangs both arms. Walk swings both arms opposite the legs. Wave lifts the right arm. */
export function armPose(clip: ArmClip, index: number): { right: number; left: number } {
  if (clip === "wave") return { right: WAVE_WAG[index] ?? 0, left: HANG_ARM };
  if (clip === "idle") return { right: IDLE_HANG, left: IDLE_HANG };
  const swing = Math.sin((index / 6) * Math.PI * 2);
  // Positive swing is the left leg stepping forward, so the right arm lifts and the left arm drops.
  return {
    right: HANG_ARM - swing * WALK_ARM_SWING,
    left: HANG_ARM + swing * WALK_ARM_SWING,
  };
}

function armImg(src: string, deg: number, side: "r" | "l"): string {
  const img = `<img class="arm arm-${side}" alt="" src="${src}" style="transform:rotate(${deg.toFixed(1)}deg)">`;
  return side === "l" ? `<div class="arm-mirror">${img}</div>` : img;
}

/** Two short sleeves. Idle uses the hanging arm on both sides (left is mirrored). */
export function armMarkup(outfitSrc: string, clip: ArmClip, index: number): string {
  const pose = armPose(clip, index);
  const hang = sleeveArmSrc(outfitSrc);
  const leftSrc = hang;
  return armImg(hang, pose.right, "r") + armImg(leftSrc, pose.left, "l");
}
