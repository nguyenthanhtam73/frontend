import { getTranslations } from "next-intl/server";

import { Logo } from "./logo";
import { SiteFooterNav } from "./site-footer-nav";
import { SocialLinks } from "./social-links";

export async function SiteFooter() {
  const tFooter = await getTranslations("common.footer");
  const year = new Date().getFullYear();

  return (
    <footer className="min-w-0 border-t border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-8 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="flex min-w-0 items-start gap-3 sm:items-center">
          <Logo className="shrink-0" />
          <span className="min-w-0 text-pretty text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {tFooter("tagline")}
          </span>
        </div>
        <div className="flex flex-col gap-4">
          <SiteFooterNav />
          <SocialLinks />
        </div>
      </div>
      <div className="mx-auto w-full max-w-6xl border-t border-border/40 px-4 py-3 sm:px-6">
        <div className="space-y-1.5 text-center text-xs text-muted-foreground sm:text-left">
          <p className="leading-relaxed">{tFooter("disclaimer")}</p>
          <p className="leading-relaxed">{tFooter("betaContact")}</p>
          <p>{tFooter("copyright", { year })}</p>
        </div>
      </div>
    </footer>
  );
}
