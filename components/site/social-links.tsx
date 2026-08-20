import { getTranslations } from "next-intl/server";

import { FACEBOOK_PROFILE_URL, TIKTOK_PROFILE_URL } from "@/lib/seo";
import { cn } from "@/lib/utils";

const SOCIAL_LINKS = [
  {
    id: "facebook" as const,
    href: FACEBOOK_PROFILE_URL,
    shortKey: "facebookShort" as const,
    icon: FacebookIcon,
  },
  {
    id: "tiktok" as const,
    href: TIKTOK_PROFILE_URL,
    shortKey: "tiktokShort" as const,
    icon: TikTokIcon,
  },
] as const;

type SocialLinksProps = {
  className?: string;
};

export async function SocialLinks({ className }: SocialLinksProps) {
  const t = await getTranslations("common.footer.social");

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <p
        id="footer-social-follow"
        className="text-[11px] font-medium tracking-wide text-muted-foreground"
      >
        {t("follow")}
      </p>
      <nav
        aria-labelledby="footer-social-follow"
        className="flex flex-wrap items-center gap-2"
      >
        {SOCIAL_LINKS.map(({ id, href, shortKey, icon: Icon }) => (
          <a
            key={id}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t(id)}
            className="inline-flex h-9 items-center gap-2 rounded-full border border-border/80 bg-background/70 px-3.5 text-xs font-medium text-foreground/80 shadow-sm shadow-primary/5 transition-colors hover:border-primary/35 hover:bg-primary/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Icon className="size-3.5" />
            <span>{t(shortKey)}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path d="M24 12.073c0-6.627-5.373-12-12-12S0 5.446 0 12.073c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}
