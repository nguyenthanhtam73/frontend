"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { AUTH_CHANGED_EVENT, AUTH_TOKEN_STORAGE_KEY, getAccessToken } from "@/lib/auth-token";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useClientMounted } from "@/lib/use-client-mounted";
import { useCurrentHash } from "@/lib/use-current-hash";
import { cn } from "@/lib/utils";

import { LocaleSwitcher } from "./locale-switcher";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";

function normalizePath(path: string) {
  const trimmed = path.split("?")[0].replace(/\/$/, "");
  return trimmed === "" ? "/" : trimmed;
}

/** Active when pathname matches route, or trailing segments (nested routes). Hash links compare `hash` (without #). */
function isNavLinkActive(pathname: string, hash: string, href: string) {
  if (href.includes("#")) {
    const [pathPart, fragment] = href.split("#");
    const base = normalizePath(pathPart === "" || pathPart === "/" ? "/" : pathPart);
    if (!fragment) return false;
    return normalizePath(pathname) === base && hash === fragment;
  }
  const routePath = normalizePath(href);
  const p = normalizePath(pathname);
  if (routePath === "/") return p === "/";
  if (p === routePath) return true;
  return p.startsWith(`${routePath}/`);
}

function AuthSkeleton() {
  return (
    <div
      data-testid="auth-skeleton"
      className="hidden h-9 min-w-[11rem] animate-pulse rounded-md bg-muted/60 sm:block"
      aria-hidden
    />
  );
}

function SignedInActions({
  accountLabel,
  email,
  onSignOut,
  signOutLabel,
  className,
  accountClassName,
}: {
  accountLabel: string;
  email: string;
  onSignOut: () => void;
  signOutLabel: string;
  className?: string;
  accountClassName?: string;
}) {
  return (
    <div
      data-testid="auth-signed-in"
      className={cn("flex shrink-0 items-center gap-1.5", className)}
    >
      <span
        className={cn("max-w-40 truncate text-xs text-muted-foreground", accountClassName)}
        title={email}
      >
        {accountLabel}
      </span>
      <Button
        type="button"
        data-testid="auth-sign-out"
        variant="ghost"
        size="sm"
        className="inline-flex min-w-[5.75rem] shrink-0 justify-center"
        onClick={onSignOut}
      >
        {signOutLabel}
      </Button>
    </div>
  );
}

function GuestActions({
  signInLabel,
  registerLabel,
  className,
  compact = false,
}: {
  signInLabel: string;
  registerLabel: string;
  className?: string;
  /** When true, both CTAs show on narrow screens (mobile header row). */
  compact?: boolean;
}) {
  return (
    <div
      data-testid="auth-guest"
      className={cn("flex shrink-0 items-center gap-1.5", className)}
    >
      <ButtonLink
        href="/login"
        prefetch
        variant="ghost"
        size="sm"
        data-testid="auth-sign-in"
        className={cn(
          "min-h-9 justify-center",
          compact ? "inline-flex px-2.5" : "hidden min-w-[4.5rem] lg:inline-flex",
        )}
      >
        {signInLabel}
      </ButtonLink>
      <ButtonLink
        href="/register"
        prefetch
        size="sm"
        className={cn(
          "min-h-9 justify-center",
          compact ? "inline-flex px-2.5" : "hidden min-w-[5.5rem] sm:inline-flex",
        )}
      >
        {registerLabel}
      </ButtonLink>
    </div>
  );
}

export function SiteHeader() {
  const t = useTranslations("common");
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [, startTransition] = useTransition();
  const hash = useCurrentHash();
  const { user, logout } = useAuthStore();
  const mounted = useClientMounted();
  const [authReady, setAuthReady] = useState(false);

  const signOut = useCallback(() => {
    void (async () => {
      // logout() always runs clearPushSubscriptionOnLogout first.
      await logout();
      queryClient.clear();
      startTransition(() => {
        router.push("/login");
      });
    })();
  }, [logout, queryClient, router]);

  useEffect(() => {
    let alive = true;
    const run = () => {
      void useAuthStore
        .getState()
        .refresh()
        .finally(() => {
          if (alive) setAuthReady(true);
        });
    };
    run();
    const onStorage = (e: StorageEvent) => {
      if (e.key === AUTH_TOKEN_STORAGE_KEY || e.key === null) run();
    };
    window.addEventListener(AUTH_CHANGED_EVENT, run);
    window.addEventListener("storage", onStorage);
    return () => {
      alive = false;
      window.removeEventListener(AUTH_CHANGED_EVENT, run);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const accountLabel = user?.display_name?.trim() || user?.email || user?.username;
  const showAuthSkeleton =
    mounted && !authReady && Boolean(getAccessToken()) && !user;

  const desktopAuth =
    showAuthSkeleton ? (
      <AuthSkeleton />
    ) : user && accountLabel ? (
      <SignedInActions
        className="hidden sm:flex"
        accountClassName="hidden lg:inline"
        accountLabel={accountLabel}
        email={user.email}
        onSignOut={signOut}
        signOutLabel={t("signOut")}
      />
    ) : authReady ? (
      <GuestActions
        className="hidden sm:flex"
        signInLabel={t("signIn")}
        registerLabel={t("register")}
      />
    ) : null;

  const mobileAuth =
    user && accountLabel ? (
      <SignedInActions
        accountClassName="max-w-[min(100%,12rem)]"
        accountLabel={accountLabel}
        email={user.email}
        onSignOut={signOut}
        signOutLabel={t("signOut")}
      />
    ) : authReady ? (
      <GuestActions
        compact
        signInLabel={t("signIn")}
        registerLabel={t("register")}
      />
    ) : null;

  const navLinks = [
    { href: "/onboarding" as const, label: t("nav.start") },
    { href: "/routine" as const, label: t("nav.routine") },
    { href: "/check-in" as const, label: t("nav.checkIn") },
    { href: "/cabinet" as const, label: t("nav.cabinet") },
    { href: "/progress" as const, label: t("nav.progress") },
    { href: "/pricing" as const, label: t("nav.pricing") },
    { href: "/feedback" as const, label: t("nav.feedback") },
    { href: "/#how" as const, label: t("nav.howItWorks") },
    ...(user?.is_admin
      ? [
          { href: "/admin/payments" as const, label: t("nav.adminPayments") },
          { href: "/admin/users" as const, label: t("nav.adminUsers") },
          { href: "/admin/feedbacks" as const, label: t("nav.adminFeedbacks") },
        ]
      : []),
  ];

  // Mobile: denser chips but min-h-11 (≥44px) for touch. Desktop: roomier pills.
  const linkBase =
    "inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium leading-snug transition-colors sm:min-h-0 sm:px-3.5 sm:py-2 sm:text-base";

  function renderNavUl(
    ulClassName: string,
  ) {
    return (
      <ul className={ulClassName}>
        {navLinks.map((link) => {
          const active = isNavLinkActive(pathname, hash, link.href);
          return (
            <li key={link.href} className="shrink-0">
              <Link
                href={link.href}
                prefetch
                aria-current={active ? "page" : undefined}
                className={cn(
                  linkBase,
                  active
                    ? "bg-primary/15 text-primary shadow-sm shadow-primary/10"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    );
  }

  const navStrip = renderNavUl(
    "flex flex-nowrap items-center justify-start gap-0.5 sm:gap-1",
  );
  const navWrapped = renderNavUl(
    "flex flex-wrap items-center justify-center gap-x-2 gap-y-2",
  );

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-1.5 px-4 py-1.5 sm:gap-3 sm:px-6 sm:py-2 lg:gap-2 lg:py-3">
        <div className="flex min-h-11 items-center gap-2 sm:min-h-14 sm:gap-3">
          <Link
            href="/"
            prefetch
            className="shrink-0 self-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Logo />
          </Link>

          <div className="ml-auto flex min-h-9 shrink-0 items-center gap-1.5 self-center sm:gap-2">
            <LocaleSwitcher className="hidden md:inline-flex" />
            <ThemeToggle className="hidden sm:inline-flex" />
            {desktopAuth}
          </div>
        </div>

        <nav className="hidden lg:block" aria-label={t("mainNavAria")}>
          {navWrapped}
        </nav>
      </div>

      <nav
        className="border-t border-border/40 py-1 lg:hidden"
        aria-label={t("mainNavAria")}
      >
        <div className="mx-auto flex w-full max-w-6xl justify-start overflow-x-auto overscroll-x-contain px-3 [scrollbar-width:thin] sm:px-6">
          {navStrip}
        </div>
      </nav>

      <div className="theme-toggle-mobile-bar flex min-h-11 flex-nowrap items-center justify-start gap-1.5 overflow-x-auto border-t border-border/40 px-3 py-1 [scrollbar-width:none] sm:justify-center sm:px-6 sm:py-2 [&::-webkit-scrollbar]:hidden md:hidden">
        <LocaleSwitcher />
        <ThemeToggle className="theme-toggle--mobile-bar shrink-0" />
        {mobileAuth}
      </div>
    </header>
  );
}
