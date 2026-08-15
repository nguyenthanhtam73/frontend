import { getTranslations } from "next-intl/server";

import { Logo } from "./logo";
import { SiteFooterNav } from "./site-footer-nav";
import { SocialLinks } from "./social-links";

export async function SiteFooter() {
  const tFooter = await getTranslations("common.footer");
  const year = new Date().getFullYear();

  return (
    <footer className="min-w-0 border-t border-border/60 bg-background/60">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 items-start gap-3 sm:items-center">
          <Logo className="shrink-0" />
          <span className="min-w-0 text-pretty text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {tFooter("tagline")}
          </span>
        </div>
        <SiteFooterNav />
      </div>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 border-t border-border/40 px-4 py-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6 sm:px-6">
        <div className="space-y-1.5 text-center text-xs text-muted-foreground sm:text-left">
          <p className="leading-relaxed">{tFooter("disclaimer")}</p>
          <p className="leading-relaxed">{tFooter("betaContact")}</p>
          <p>{tFooter("copyright", { year })}</p>
        </div>
        <SocialLinks className="justify-center sm:shrink-0 sm:justify-end" />
      </div>
    </footer>
  );
}
