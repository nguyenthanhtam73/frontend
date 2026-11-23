import { notFound } from "next/navigation";

import { SeedShot } from "@/components/mascot/game/seed-shot";

/** Local screenshots only. Production builds without the env answer 404. */
export default function TuiHatShotPage() {
  if (process.env.SEED_BAG_PREVIEW !== "1") notFound();
  return <SeedShot />;
}
