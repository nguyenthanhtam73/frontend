import { notFound } from "next/navigation";

import { TreeShot } from "@/components/mascot/game/tree-shot";

/** Local screenshots only. Production builds without the env answer 404. */
export default function CayChungShotPage() {
  if (process.env.ROOM_TREE_PREVIEW !== "1") notFound();
  return <TreeShot />;
}
