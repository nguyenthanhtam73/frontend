import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder while the heavy check-in client bundle loads. */
export function CheckInFormSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-48 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="mx-auto h-12 w-full max-w-md rounded-full" />
    </div>
  );
}
