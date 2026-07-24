import { Benefits } from "@/components/landing/benefits";
import { BetaSignup } from "@/components/landing/beta-signup";
import { Cta } from "@/components/landing/cta";
import { Features } from "@/components/landing/features";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Problem } from "@/components/landing/problem";
import { ProgressPreview } from "@/components/landing/progress-preview";
import { Solution } from "@/components/landing/solution";
import { Testimonials } from "@/components/landing/testimonials";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Problem />
      <Solution />
      <Features />
      <ProgressPreview />
      <HowItWorks />
      <Testimonials />
      <BetaSignup />
      <Benefits />
      <Cta />
    </>
  );
}
