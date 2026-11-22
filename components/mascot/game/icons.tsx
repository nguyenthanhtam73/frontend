import { mascotAssetUrl } from "@/lib/mascot/asset-url";

export const GAME_ICONS = {
  coin: mascotAssetUrl("/mascot/icons/xu_coin.svg"),
  flame: mascotAssetUrl("/mascot/icons/streak_flame.svg"),
  soundOn: mascotAssetUrl("/mascot/icons/sound_on.svg"),
  soundOff: mascotAssetUrl("/mascot/icons/sound_off.svg"),
  care: mascotAssetUrl("/mascot/icons/nav_cham_da.svg"),
  wardrobe: mascotAssetUrl("/mascot/icons/nav_tu_do.svg"),
  quests: mascotAssetUrl("/mascot/icons/nav_nhiem_vu.svg"),
  lobby: mascotAssetUrl("/mascot/icons/nav_sanh_chung.svg"),
  wave: mascotAssetUrl("/mascot/icons/wave.svg"),
  heart: mascotAssetUrl("/mascot/icons/heart.svg"),
  outfit: mascotAssetUrl("/mascot/icons/khen_do.svg"),
  check: mascotAssetUrl("/mascot/icons/quest_check.svg"),
  door: mascotAssetUrl("/mascot/icons/door.svg"),
  pin: mascotAssetUrl("/mascot/icons/minimap_pin.svg"),
  chestClosed: mascotAssetUrl("/mascot/icons/chest_closed.svg"),
  chestOpen: mascotAssetUrl("/mascot/icons/chest_open.svg"),
} as const;

export type GameIconName = keyof typeof GAME_ICONS;

/** Static CapCut icon. Cached with the rest of /mascot. Decorative, so no alt text. */
export function GameIcon({
  name,
  className = "beda-ico",
}: {
  name: GameIconName;
  className?: string;
}) {
  return <img src={GAME_ICONS[name]} alt="" className={className} decoding="async" draggable={false} />;
}

/** No shipped art for the back chevron. It stays a small stroke. */
export function IconBack({ className = "beda-ico-sm" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden>
      <path d="M18 8 10 16l8 8" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
