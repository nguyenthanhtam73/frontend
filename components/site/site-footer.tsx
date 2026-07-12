import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

import { Logo } from "./logo";

export async function SiteFooter() {
  const tFooter = await getTranslations("common.footer");
  const tNav = await getTranslations("common.nav");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/60 bg-background/60">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <Logo />
          <span className="text-xs text-muted-foreground sm:text-sm">{tFooter("tagline")}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <Link className="hover:text-foreground" href="/onboarding">
            {tNav("start")}
          </Link>
          <Link className="hover:text-foreground" href="/cabinet">
            {tNav("cabinet")}
          </Link>
          <Link className="hover:text-foreground" href="/progress">
            {tNav("progress")}
          </Link>
          <Link className="hover:text-foreground" href="/check-in">
            {tNav("checkIn")}
          </Link>
          <Link className="hover:text-foreground" href="/#how">
            {tNav("howItWorks")}
          </Link>
        </div>
      </div>
      <div className="mx-auto w-full max-w-6xl space-y-1.5 border-t border-border/40 px-4 py-3 text-center text-xs text-muted-foreground sm:px-6 sm:text-left">
        <p className="leading-relaxed">{tFooter("disclaimer")}</p>
        <p>{tFooter("copyright", { year })}</p>
      </div>
    </footer>
  );
}
