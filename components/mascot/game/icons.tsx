import type { ReactNode } from "react";

type IconProps = { className?: string };

function Svg({ className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden>
      {children}
    </svg>
  );
}

export function IconBack({ className = "beda-ico-sm" }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M18 8 10 16l8 8" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconSound({ className = "beda-ico-sm", muted = false }: IconProps & { muted?: boolean }) {
  return (
    <Svg className={className}>
      <path d="M8 13h4l5-4v14l-5-4H8v-6Z" fill="currentColor" />
      {muted ? (
        <path d="m20 13 7 7M27 13l-7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      ) : (
        <path d="M21 12a6 6 0 0 1 0 8M24 9a10 10 0 0 1 0 14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      )}
    </Svg>
  );
}

export function IconCoin({ className = "beda-ico-sm" }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="16" cy="16" r="9" fill="#fff6d0" />
      <circle cx="16" cy="16" r="6" stroke="#c27c00" strokeWidth="1.6" />
    </Svg>
  );
}

export function IconFlame({ className = "beda-ico-sm" }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M16 5s5 4.5 5 9a5 5 0 0 1-10 0c0-2 1.2-3.4 1.2-3.4S11 14 13 15c0-3 3-6.5 3-10Z" fill="#fff" />
    </Svg>
  );
}

export function IconBottle({ className = "beda-ico" }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M13 6h6v3l2 2v12a3 3 0 0 1-3 3h-4a3 3 0 0 1-3-3V11l2-2V6Z" stroke="currentColor" strokeWidth="2.2" />
      <path d="M12 16h8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </Svg>
  );
}

export function IconDress({ className = "beda-ico" }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 7 16 10 20 7l3 4-3 2v11H12V13l-3-2 3-4Z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconScroll({ className = "beda-ico" }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M10 8h12v14a3 3 0 0 1-3 3H10a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="2.2" />
      <path d="M13 14h6M13 18h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

export function IconTree({ className = "beda-ico" }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="16" cy="13" r="7" stroke="currentColor" strokeWidth="2.2" />
      <path d="M16 20v6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </Svg>
  );
}

export function IconDoor({ className = "beda-ico" }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M11 7h10v18H11a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="2.2" />
      <circle cx="18.5" cy="16" r="1.2" fill="currentColor" />
    </Svg>
  );
}

export function IconCheck({ className = "beda-ico-sm" }: IconProps) {
  return (
    <Svg className={className}>
      <path d="m8 16 5 5 11-11" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconHand({ className = "beda-ico" }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 15V9.5a1.5 1.5 0 0 1 3 0V14M15 14V8.5a1.5 1.5 0 0 1 3 0V14M18 14v-3.5a1.5 1.5 0 0 1 3 0V18c0 4-2 7-6 7h-1c-3 0-5-2-6-4l-2-3a1.6 1.6 0 0 1 2.6-1.8L12 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconHeart({ className = "beda-ico" }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M16 26s-8-5.2-8-11a4.5 4.5 0 0 1 8-2 4.5 4.5 0 0 1 8 2c0 5.8-8 11-8 11Z" fill="currentColor" />
    </Svg>
  );
}

export function IconStar({ className = "beda-ico-sm" }: IconProps) {
  return (
    <Svg className={className}>
      <path d="m16 6 2.4 6.2H25l-5.2 4 2 6.3L16 19.2 10.2 22.5l2-6.3L7 12.2h6.6L16 6Z" fill="currentColor" />
    </Svg>
  );
}
