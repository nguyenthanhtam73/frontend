import { notFound } from "next/navigation";

/**
 * Screenshot routes. A production build never serves them.
 * `next dev` is the only place they render.
 */
export default function DevPreviewLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production") notFound();
  return children;
}
