import { notFound } from "next/navigation";

import { GiftShot } from "@/components/mascot/game/gift-shot";

/** Local screenshots only. Production builds without the env answer 404. */
export default function HopQuaShotPage() {
  if (process.env.GIFT_BOX_PREVIEW !== "1") notFound();
  return <GiftShot />;
}
