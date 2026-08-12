"use client";

import { useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { normalizePath } from "@/lib/site-nav";
import { useShowGuestNav } from "@/lib/use-show-guest-nav";

const linkClass =
  "inline-flex min-h-9 items-center hover:text-foreground focus-visible:outline-none focus-visible:underline";

/**
 * Footer links follow the same guest vs signed-in split as the header:
 * guests on marketing pages get the short funnel; app routes / logged-in
 * get product links (no admin — those stay in the header).
 */
export function SiteFooterNav() {
  const t = useTranslations("common");
  const pathname = usePathname();
  const showGuestNav = useShowGuestNav();

  const guestLinks = [
    { href: "/#how" as const, label: t("nav.howItWorks") },
    { href: "/pricing" as const, label: t("nav.pricing") },
    { href: "/#faq" as const, label: t("nav.faq") },
    { href: "/register" as const, label: t("register") },
    { href: "/login" as const, label: t("signIn") },
  ].filter((link) => normalizePath(link.href) !== normalizePath(pathname));

  const signedInLinks = [
    { href: "/onboarding" as const, label: t("nav.start") },
    { href: "/routine" as const, label: t("nav.routine") },
    { href: "/check-in" as const, label: t("nav.checkIn") },
    { href: "/cabinet" as const, label: t("nav.cabinet") },
    { href: "/progress" as const, label: t("nav.progress") },
    { href: "/pricing" as const, label: t("nav.pricing") },
    { href: "/settings" as const, label: t("nav.settings") },
    { href: "/feedback" as const, label: t("nav.feedback") },
  ];

  const links = showGuestNav ? guestLinks : signedInLinks;

  return (
    <nav
      aria-label={t("footer.navAria")}
      className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"
    >
      {links.map((link) => (
        <Link key={link.href} className={linkClass} href={link.href}>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
