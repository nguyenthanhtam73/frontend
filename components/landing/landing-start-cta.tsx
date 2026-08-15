import type { VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { LANDING_START_HREF } from "@/lib/landing/start-href";

type Props = Omit<React.ComponentProps<typeof ButtonLink>, "href"> &
  VariantProps<typeof buttonVariants> & {
    children: ReactNode;
  };

/** Guest aha: photo → starter routine. Register happens on coach-welcome after. */
export function LandingStartCta({ children, ...props }: Props) {
  return (
    <ButtonLink href={LANDING_START_HREF} {...props}>
      {children}
    </ButtonLink>
  );
}
