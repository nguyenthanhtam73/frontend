/**
 * Suspense fallback for any navigation inside `/[locale]`.
 *
 * Renders an instant, ultra-thin progress bar pinned to the top of the viewport
 * (above the sticky header at `z-30`). Gives immediate feedback when the user
 * clicks a Link, even if the new page's RSC payload hasn't streamed yet.
 *
 * Avoids replacing existing layout content with a heavy skeleton — for prefetched
 * routes the swap happens within a frame or two, so a content skeleton would just
 * flash and feel jankier than nothing.
 */
export default function LocaleLoading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[2px] overflow-hidden bg-primary/15"
    >
      <span className="sr-only">Loading…</span>
      <div className="nav-progress h-full w-1/3 rounded-r-full bg-primary motion-reduce:animate-none motion-reduce:opacity-60" />
    </div>
  );
}
