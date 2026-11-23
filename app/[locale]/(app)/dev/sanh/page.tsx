import { notFound } from "next/navigation";

import { LobbyShot } from "@/components/mascot/game/lobby-shot";

/** Local screenshots only. Production builds without the env answer 404. */
export default function SanhShotPage() {
  if (process.env.LOBBY_PILL_PREVIEW !== "1") notFound();
  return <LobbyShot />;
}
