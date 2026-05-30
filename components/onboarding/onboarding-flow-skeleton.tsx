import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder while the onboarding client bundle loads. */
export function OnboardingFlowSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-6" aria-hidden>
      <Skeleton className="h-8 w-2/3 rounded-lg" />
      <Skeleton className="h-4 w-full rounded-md" />
      <Skeleton className="h-64 w-full rounded-xl" />
      <div className="flex gap-3">
        <Skeleton className="h-11 flex-1 rounded-full" />
        <Skeleton className="h-11 w-28 rounded-full" />
      </div>
    </div>
  );
}
