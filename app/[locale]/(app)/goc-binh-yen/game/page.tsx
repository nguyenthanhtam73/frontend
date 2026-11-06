import type { Metadata } from "next";

import { BeDaGameGate } from "@/components/mascot/game/be-da-game-gate";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Góc bình yên",
};

/** WebView entry. Same login session as the site. The token stays out of the URL. */
export default function GocBinhYenGamePage() {
  return <BeDaGameGate embed />;
}
