"use client";

import type { VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { trackLandingCtaClick, type LandingCtaButton } from "@/lib/analytics/register-landing";
import { LANDING_START_HREF } from "@/lib/landing/start-href";

type Props = Omit<React.ComponentProps<typeof ButtonLink>, "href"> &
  VariantProps<typeof buttonVariants> & {
    children: ReactNode;
    /** Set only on the home hero and bottom CTA. Other start links stay untracked. */
    trackAs?: Extract<LandingCtaButton, "hero_primary" | "bottom_cta">;
  };

/** Guest aha: photo → starter routine. Register happens on coach-welcome after. */
export function LandingStartCta({ children, trackAs, onClick, ...props }: Props) {
  return (
    <ButtonLink
      href={LANDING_START_HREF}
      onClick={(event) => {
        if (trackAs) trackLandingCtaClick(trackAs);
        onClick?.(event);
      }}
      {...props}
    >
      {children}
    </ButtonLink>
  );
}
