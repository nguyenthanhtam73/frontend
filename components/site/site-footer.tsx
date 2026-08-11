import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

import { Logo } from "./logo";
import { SocialLinks } from "./social-links";

export async function SiteFooter() {
  const tFooter = await getTranslations("common.footer");
  const tNav = await getTranslations("common.nav");
  const t = await getTranslations("common");
  const tFaq = await getTranslations("landingFaq");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/60 bg-background/60">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <Logo />
          <span className="text-xs text-muted-foreground sm:text-sm">{tFooter("tagline")}</span>
        </div>
        <nav
          aria-label={tFooter("navAria")}
          className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground"
        >
          <Link className="hover:text-foreground" href="/pricing">
            {tNav("pricing")}
          </Link>
          <Link className="hover:text-foreground" href="/#faq">
            {tFaq("sectionTitle")}
          </Link>
          <Link className="hover:text-foreground" href="/#how">
            {tNav("howItWorks")}
          </Link>
          <Link className="hover:text-foreground" href="/register">
            {t("register")}
          </Link>
          <Link className="hover:text-foreground" href="/login">
            {t("signIn")}
          </Link>
          <Link className="hover:text-foreground" href="/onboarding">
            {tNav("start")}
          </Link>
          <Link className="hover:text-foreground" href="/feedback">
            {tNav("feedback")}
          </Link>
          <Link className="hover:text-foreground" href="/check-in">
            {tNav("checkIn")}
          </Link>
          <Link className="hover:text-foreground" href="/cabinet">
            {tNav("cabinet")}
          </Link>
          <Link className="hover:text-foreground" href="/progress">
            {tNav("progress")}
          </Link>
        </nav>
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
