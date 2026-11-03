export const GAME_ICONS = {
  coin: "/mascot/icons/xu_coin.svg",
  flame: "/mascot/icons/streak_flame.svg",
  soundOn: "/mascot/icons/sound_on.svg",
  soundOff: "/mascot/icons/sound_off.svg",
  care: "/mascot/icons/nav_cham_da.svg",
  wardrobe: "/mascot/icons/nav_tu_do.svg",
  quests: "/mascot/icons/nav_nhiem_vu.svg",
  lobby: "/mascot/icons/nav_sanh_chung.svg",
  wave: "/mascot/icons/wave.svg",
  heart: "/mascot/icons/heart.svg",
  outfit: "/mascot/icons/khen_do.svg",
  check: "/mascot/icons/quest_check.svg",
  door: "/mascot/icons/door.svg",
  pin: "/mascot/icons/minimap_pin.svg",
  chestClosed: "/mascot/icons/chest_closed.svg",
  chestOpen: "/mascot/icons/chest_open.svg",
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
