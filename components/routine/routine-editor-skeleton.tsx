import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton layout for RoutineEditor initial fetch. */
export function RoutineEditorSkeleton() {
  return (
    <div className="space-y-5 pb-32 lg:pb-0" aria-hidden>
      <Skeleton className="h-12 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-56 w-full rounded-xl" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
      <Skeleton className="h-14 w-full rounded-xl" />
    </div>
  );
}
