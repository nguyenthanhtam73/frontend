import { cn } from "@/lib/utils";

/** Pulse placeholder for loading layouts — decorative only. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted/80", className)} aria-hidden />;
}
